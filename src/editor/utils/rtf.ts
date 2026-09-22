export interface IRtfImageData {
  hex: string
  type: string
}

/**
 * 将 RTF 中的十六进制图片数据转为 base64。
 * 参考 CKEditor paste-from-office，兼容 Word / WPS。
 */
export function convertHexToBase64(hexString: string): string {
  const bytes = hexString.match(/\w{2}/g)
  if (!bytes) return ''
  return btoa(
    bytes
      .map(char => String.fromCharCode(parseInt(char, 16)))
      .join('')
  )
}

function getImageTypeFromRtfBlock(block: string): string | null {
  if (block.includes('\\pngblip')) return 'image/png'
  if (block.includes('\\jpegblip') || block.includes('\\jpgblip')) {
    return 'image/jpeg'
  }
  return null
}

/**
 * 按花括号配对提取全部 {\\pict ... } 组（避免嵌套 } 截断）。
 */
function extractPictGroups(rtfData: string): string[] {
  const groups: string[] = []
  let searchFrom = 0
  while (searchFrom < rtfData.length) {
    const start = rtfData.indexOf('{\\pict', searchFrom)
    if (!~start) break
    let depth = 0
    let end = -1
    for (let i = start; i < rtfData.length; i++) {
      const ch = rtfData[i]
      if (ch === '{') depth++
      else if (ch === '}') {
        depth--
        if (depth === 0) {
          end = i
          break
        }
      }
    }
    if (!~end) break
    groups.push(rtfData.slice(start, end + 1))
    searchFrom = end + 1
  }
  return groups
}

/**
 * 从 pict 组中提取真正的图片 hex。
 * 必须从 PNG/JPEG 文件头开始截取，否则 \\picw100 等控制字里的数字会污染载荷。
 */
function extractImageHexFromPictBlock(
  block: string,
  type: string
): string | null {
  const blipMatch = block.match(/\\(?:pngblip|jpegblip|jpgblip)/i)
  if (!blipMatch || blipMatch.index === undefined) return null
  const rest = block.slice(blipMatch.index + blipMatch[0].length)

  // PNG: 89 50 4E 47；JPEG: FF D8 FF
  const magic =
    type === 'image/png'
      ? /89504e47[0-9a-fA-F\s]+/i
      : /ffd8ff[0-9a-fA-F\s]+/i
  const magicMatch = rest.match(magic)
  if (magicMatch) {
    return magicMatch[0].replace(/[^\da-fA-F]/g, '')
  }

  // 无文件头时：跳过控制字后取连续 hex（兼容部分 WPS）
  const skipped = rest.replace(/^[\s\S]*?(?=[0-9a-fA-F]{8})/, '')
  const hex = skipped.replace(/[^\da-fA-F]/g, '')
  return hex.length >= 40 ? hex : null
}

/**
 * 从 RTF 中提取嵌入图片（按出现顺序）。
 * 仅保留 png/jpeg（跳过 wmf/emf）。
 */
export function extractImageDataFromRtf(rtfData: string): IRtfImageData[] {
  if (!rtfData) return []

  const result: IRtfImageData[] = []
  const seen = new Set<string>()
  const pictGroups = extractPictGroups(rtfData)

  for (const block of pictGroups) {
    const type = getImageTypeFromRtfBlock(block)
    if (!type) continue
    const hex = extractImageHexFromPictBlock(block, type)
    if (!hex || seen.has(hex)) continue
    seen.add(hex)
    result.push({ hex, type })
  }

  return result
}

export function rtfImageToDataURL(image: IRtfImageData): string {
  return `data:${image.type};base64,${convertHexToBase64(image.hex)}`
}
