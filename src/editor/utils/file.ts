import { IFileUpload } from '../interface/File'
import { IMenuUploadOption } from '../interface/Menu'

export function fileToDataURL(file: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })
}

export async function urlToFile(
  url: string,
  fileName = `paste-${Date.now()}.png`
): Promise<File> {
  const response = await fetch(url)
  const blob = await response.blob()
  return new File([blob], fileName, {
    type: blob.type || 'image/png'
  })
}

function toUploadFile(file: File | Blob, fileName?: string): File {
  if (file instanceof File) return file
  return new File([file], fileName || `paste-${Date.now()}.png`, {
    type: file.type || 'image/png'
  })
}

/**
 * 有 onFileUpload 时走上传返回地址，否则转为 base64 dataURL。
 */
export async function resolveUploadOrBase64(
  file: File | Blob,
  onFileUpload?: IFileUpload | null,
  fileName?: string
): Promise<string> {
  if (onFileUpload) {
    const uploadFile = toUploadFile(file, fileName)
    const url = await onFileUpload(uploadFile, {
      onProgress: () => undefined
    })
    if (!url || typeof url !== 'string') {
      throw new Error('onFileUpload must return an image url string')
    }
    return url
  }
  return fileToDataURL(file)
}

/** 判断粘贴 HTML 中的图片地址是否需要本地解析（非可直接访问的 http(s)） */
export function isLocalPasteImageSrc(src: string): boolean {
  return (
    src.startsWith('data:') ||
    src.startsWith('blob:') ||
    src.startsWith('file:') ||
    !/^https?:\/\//i.test(src)
  )
}

/** 将菜单 image/pdf 配置归一为上传选项；false 表示隐藏 */
export function resolveMenuUploadOption(
  value: boolean | IMenuUploadOption | undefined
): false | IMenuUploadOption {
  if (value === false) return false
  if (value === true || value == null) return {}
  return value
}

/** 按上传限制生成菜单按钮 title；未配置对象时返回 basename */
export function buildMenuUploadTitle(
  baseTitle: string,
  option: boolean | IMenuUploadOption | undefined
): string {
  if (option === true || option === false || option == null) return baseTitle
  const parts: string[] = []
  if (option.accept?.trim()) {
    parts.push(option.accept.trim())
  }
  if (option.maxSize != null && option.maxSize > 0) {
    parts.push(`≤${formatFileSize(option.maxSize)}`)
  }
  if (!parts.length) return baseTitle
  return `${baseTitle}（${parts.join('，')}）`
}

/** 判断文件是否匹配 accept（扩展名 / MIME，含 image/*） */
export function isFileAcceptMatch(file: File, accept?: string): boolean {
  if (!accept?.trim()) return true
  const tokens = accept
    .split(',')
    .map(item => item.trim().toLowerCase())
    .filter(Boolean)
  if (!tokens.length) return true
  const name = file.name.toLowerCase()
  const type = (file.type || '').toLowerCase()
  const ext = name.includes('.') ? `.${name.split('.').pop()}` : ''
  return tokens.some(token => {
    if (token.startsWith('.')) return ext === token
    if (token.endsWith('/*')) {
      const prefix = token.slice(0, -1)
      return type.startsWith(prefix)
    }
    if (token.includes('/')) return type === token
    return ext === `.${token}`
  })
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`
  if (bytes < 1024 * 1024) {
    const kb = bytes / 1024
    return `${Number.isInteger(kb) ? kb : kb.toFixed(1)}KB`
  }
  const mb = bytes / (1024 * 1024)
  return `${Number.isInteger(mb) ? mb : mb.toFixed(1)}MB`
}

export interface IFileUploadFilterResult {
  valid: File[]
  invalidType: File[]
  invalidSize: File[]
}

/** 按 accept / maxSize 过滤文件 */
export function filterFilesByUploadLimit(
  files: File[],
  option?: IMenuUploadOption
): IFileUploadFilterResult {
  const valid: File[] = []
  const invalidType: File[] = []
  const invalidSize: File[] = []
  const accept = option?.accept
  const maxSize = option?.maxSize
  files.forEach(file => {
    if (!isFileAcceptMatch(file, accept)) {
      invalidType.push(file)
      return
    }
    if (maxSize != null && maxSize > 0 && file.size > maxSize) {
      invalidSize.push(file)
      return
    }
    valid.push(file)
  })
  return { valid, invalidType, invalidSize }
}
