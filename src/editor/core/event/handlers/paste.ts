import { ZERO } from '../../../dataset/constant/Common'
import { VIRTUAL_ELEMENT_TYPE } from '../../../dataset/constant/Element'
import { ElementType } from '../../../dataset/enum/Element'
import { IElement } from '../../../interface/Element'
import { IPasteOption } from '../../../interface/Event'
import { IFileUpload } from '../../../interface/File'
import {
  getClipboardData,
  getIsClipboardContainFile,
  removeClipboardData
} from '../../../utils/clipboard'
import {
  formatElementContext,
  getElementListByHTML,
  visitElementTree
} from '../../../utils/element'
import {
  fileToDataURL,
  isLocalPasteImageSrc,
  resolveUploadOrBase64,
  urlToFile
} from '../../../utils/file'
import {
  extractImageDataFromRtf,
  rtfImageToDataURL
} from '../../../utils/rtf'
import { CanvasEvent } from '../CanvasEvent'
import { IOverrideResult } from '../../override/Override'
import { normalizeLineBreak } from '../../../utils'
import { IToastHandle, showToast } from '../../toast/Toast'
import { Draw } from '../../draw/Draw'

export function pasteElement(host: CanvasEvent, elementList: IElement[]) {
  const draw = host.getDraw()
  if (
    draw.isReadonly() ||
    draw.isDisabled() ||
    draw.getControl().getIsDisabledPasteControl()
  ) {
    return
  }
  const rangeManager = draw.getRange()
  const { startIndex } = rangeManager.getRange()
  const originalElementList = draw.getElementList()
  // 全选粘贴无需格式化上下文
  if (~startIndex && !rangeManager.getIsSelectAll()) {
    // 如果是复制到虚拟元素里，则粘贴列表的虚拟元素需扁平化处理，避免产生新的虚拟元素
    const anchorElement = originalElementList[startIndex]
    if (anchorElement?.titleId || anchorElement?.listId) {
      let start = 0
      while (start < elementList.length) {
        const pasteElement = elementList[start]
        if (anchorElement.titleId && /^\n/.test(pasteElement.value)) {
          break
        }
        if (VIRTUAL_ELEMENT_TYPE.includes(pasteElement.type!)) {
          elementList.splice(start, 1)
          if (pasteElement.valueList) {
            for (let v = 0; v < pasteElement.valueList.length; v++) {
              const element = pasteElement.valueList[v]
              if (element.value === ZERO || element.value === '\n') {
                continue
              }
              elementList.splice(start, 0, element)
              start++
            }
          }
          start--
        }
        start++
      }
    }
    formatElementContext(originalElementList, elementList, startIndex, {
      isBreakWhenWrap: true,
      editorOptions: draw.getOptions()
    })
  }
  // 粘贴是一次新的插入操作，不继承来源元素的留痕作者和时间
  visitElementTree(elementList, element => {
    delete element.trace
  })
  draw.insertElementList(elementList)
}

/** 去掉 HTML 中同 src 的重复 img（Word/WPS 常同时产出 VML 兜底与标准 img） */
function dedupeHtmlImagesBySrc(doc: Document) {
  const seen = new Set<string>()
  const imgs = Array.from(doc.querySelectorAll('img'))
  for (const img of imgs) {
    const src =
      img.getAttribute('src') || img.getAttribute('data-src') || ''
    if (!src) continue
    if (seen.has(src)) {
      img.remove()
      continue
    }
    seen.add(src)
  }
}

/**
 * WPS/Word 图文粘贴：HTML 中图片多为 file://，真实数据在 text/rtf。
 * 将本地图片替换为 dataURL，便于后续回显或上传。
 */
async function resolveLocalImagesInHtml(
  htmlText: string,
  options: {
    rtfData?: string
    clipboardImageFiles?: File[]
  } = {}
): Promise<string> {
  const doc = new DOMParser().parseFromString(htmlText, 'text/html')
  dedupeHtmlImagesBySrc(doc)
  const imgs = Array.from(doc.querySelectorAll('img'))
  if (!imgs.length) return htmlText

  const rtfImages = extractImageDataFromRtf(options.rtfData || '')
  let rtfIndex = 0
  let clipboardFileIndex = 0

  for (let i = 0; i < imgs.length; i++) {
    const img = imgs[i]
    const src =
      img.getAttribute('src') || img.getAttribute('data-src') || ''

    // 远程地址 / 已是 data:：保留（data: 交后续上传阶段处理）
    if (/^https?:\/\//i.test(src) || src.startsWith('data:')) {
      continue
    }

    if (src.startsWith('blob:')) {
      try {
        const blob = await (await fetch(src)).blob()
        img.setAttribute('src', await fileToDataURL(blob))
      } catch (error) {
        console.error(error)
      }
      continue
    }

    // file:// / 空 / 相对路径：按本地图出现顺序对齐 RTF 嵌入图
    const rtfImage = rtfImages[rtfIndex]
    if (rtfImage?.hex) {
      img.setAttribute('src', rtfImageToDataURL(rtfImage))
      rtfIndex++
      continue
    }

    const file = options.clipboardImageFiles?.[clipboardFileIndex++]
    if (file) {
      try {
        img.setAttribute('src', await fileToDataURL(file))
      } catch (error) {
        console.error(error)
      }
    }
  }

  return doc.body?.innerHTML || htmlText
}

function removeEmptyImageElements(list: IElement[]) {
  for (let i = list.length - 1; i >= 0; i--) {
    const el = list[i]
    if (el.type === ElementType.IMAGE && !el.value) {
      list.splice(i, 1)
      continue
    }
    if (el.type === ElementType.TABLE) {
      for (const tr of el.trList || []) {
        for (const td of tr.tdList) {
          removeEmptyImageElements(td.value)
        }
      }
    }
    if (el.valueList) {
      removeEmptyImageElements(el.valueList)
    }
  }
}

/** 去掉连续且 value 相同的重复图片（剪贴板多格式/重复 img 导致） */
function dedupeAdjacentSameImages(list: IElement[]) {
  for (let i = list.length - 1; i > 0; i--) {
    const cur = list[i]
    const prev = list[i - 1]
    if (
      cur.type === ElementType.IMAGE &&
      prev.type === ElementType.IMAGE &&
      cur.value &&
      cur.value === prev.value
    ) {
      list.splice(i, 1)
    }
  }
  for (const el of list) {
    if (el.type === ElementType.TABLE) {
      for (const tr of el.trList || []) {
        for (const td of tr.tdList) {
          dedupeAdjacentSameImages(td.value)
        }
      }
    }
    if (el.valueList) {
      dedupeAdjacentSameImages(el.valueList)
    }
  }
}

/**
 * 将粘贴得到的图片元素统一走上传或保留 base64。
 */
async function resolvePasteImageElements(
  elementList: IElement[],
  onFileUpload?: IFileUpload | null
) {
  const pendingList: { element: IElement; src: string }[] = []

  visitElementTree(elementList, element => {
    if (element.type !== ElementType.IMAGE || !element.value) return
    const src = element.value
    if (src.startsWith('data:')) {
      if (onFileUpload) {
        pendingList.push({ element, src })
      }
      return
    }
    if (src.startsWith('blob:')) {
      pendingList.push({ element, src })
      return
    }
    // file:// 等本地地址解析失败，标记删除
    if (isLocalPasteImageSrc(src)) {
      element.value = ''
    }
  })
  removeEmptyImageElements(elementList)

  if (!pendingList.length) {
    dedupeAdjacentSameImages(elementList)
    return
  }

  await Promise.all(
    pendingList.map(async (item, index) => {
      try {
        const file = await urlToFile(
          item.src,
          `paste-${Date.now()}-${index}.png`
        )
        item.element.value = await resolveUploadOrBase64(
          file,
          onFileUpload,
          file.name
        )
      } catch (error) {
        console.error(error)
        item.element.value = ''
      }
    })
  )
  removeEmptyImageElements(elementList)
  dedupeAdjacentSameImages(elementList)
}

function createPasteLoading(draw: Draw): {
  show: () => void
  close: () => void
} {
  let toast: IToastHandle | null = null
  const message =
    draw.getI18n().t('toast.pasting') || '正在粘贴，请稍候…'

  return {
    show() {
      if (toast) return
      toast = showToast(draw.getContainer(), message, { duration: 0 })
    },
    close() {
      toast?.close()
      toast = null
    }
  }
}

/** 等 toast 完成绘制后再跑重任务，避免主线程阻塞导致提示不出现 */
function waitForToastPaint(): Promise<void> {
  return new Promise(resolve => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => resolve())
    })
  })
}

export function pasteHTML(
  host: CanvasEvent,
  htmlText: string,
  clipboardImageFiles: File[] = [],
  rtfData = ''
) {
  const draw = host.getDraw()
  if (draw.isReadonly() || draw.isDisabled()) return
  const onFileUpload = draw.getOptions().onFileUpload
  // 一开始处理就立刻提示，等 toast 上屏后再解析，避免被重计算卡住
  const loading = createPasteLoading(draw)
  loading.show()

  waitForToastPaint()
    .then(() =>
      resolveLocalImagesInHtml(htmlText, {
        rtfData,
        clipboardImageFiles
      })
    )
    .then(resolvedHtml => {
      const elementList = getElementListByHTML(resolvedHtml, {
        innerWidth: draw.getOriginalInnerWidth()
      })
      return resolvePasteImageElements(elementList, onFileUpload).then(
        () => elementList
      )
    })
    .then(elementList => {
      pasteElement(host, elementList)
    })
    .catch(error => {
      console.error(error)
    })
    .finally(() => {
      loading.close()
    })
}

export function pasteImage(host: CanvasEvent, file: File | Blob) {
  const draw = host.getDraw()
  if (draw.isReadonly() || draw.isDisabled()) return
  // 自定义粘贴图片事件
  const { pasteImage: overridePasteImage } = draw.getOverride()
  if (overridePasteImage) {
    const overrideResult = overridePasteImage(file)
    if ((<IOverrideResult>overrideResult)?.preventDefault !== false) return
  }
  const rangeManager = draw.getRange()
  const { startIndex } = rangeManager.getRange()
  const elementList = draw.getElementList()
  const onFileUpload = draw.getOptions().onFileUpload
  const loading = createPasteLoading(draw)
  loading.show()
  // 用本地 blob 读宽高，避免上传后跨域 URL 无法读取尺寸
  const objectUrl = URL.createObjectURL(file)
  const image = new Image()
  image.onload = () => {
    URL.revokeObjectURL(objectUrl)
    const width = image.width
    const height = image.height
    waitForToastPaint()
      .then(() => resolveUploadOrBase64(file, onFileUpload))
      .then(value => {
        const imageElement: IElement = {
          value,
          type: ElementType.IMAGE,
          width,
          height
        }
        if (~startIndex) {
          formatElementContext(elementList, [imageElement], startIndex, {
            editorOptions: draw.getOptions()
          })
        }
        draw.insertElementList([imageElement])
      })
      .catch(error => {
        console.error(error)
      })
      .finally(() => {
        loading.close()
      })
  }
  image.onerror = () => {
    URL.revokeObjectURL(objectUrl)
    loading.close()
  }
  image.src = objectUrl
}

function getClipboardImageFiles(clipboardData: DataTransfer): File[] {
  const files: File[] = []
  const seen = new Set<string>()
  const isImageFile = (file: File) => {
    if (file.type.includes('image')) return true
    // Word/WPS 有时 type 为空，按扩展名兜底
    if (!file.type && /\.(png|jpe?g|gif|bmp|webp)$/i.test(file.name)) {
      return true
    }
    return false
  }
  const pushFile = (file: File | null) => {
    if (!file || !isImageFile(file)) return
    const key = `${file.name}-${file.size}-${file.lastModified}`
    if (seen.has(key)) return
    seen.add(key)
    files.push(file)
  }
  for (let i = 0; i < clipboardData.items.length; i++) {
    const item = clipboardData.items[i]
    if (item.kind === 'file') {
      pushFile(item.getAsFile())
    }
  }
  if (clipboardData.files) {
    for (let i = 0; i < clipboardData.files.length; i++) {
      pushFile(clipboardData.files[i])
    }
  }
  return files
}

/** 同一张图常有 png + bmp 双格式，优先取 png/jpeg */
function pickBestImageFile(files: File[]): File {
  const byType = (type: string) =>
    files.find(f => f.type.includes(type))
  return (
    byType('png') ||
    byType('jpeg') ||
    byType('jpg') ||
    byType('webp') ||
    byType('gif') ||
    files[0]
  )
}

/**
 * 判断是否为“纯图片”粘贴：有图片文件，且 HTML/纯文本没有实质正文。
 * 用于避免 HTML 重复 img + png/bmp 双格式导致插入两张相同图。
 */
function isImageOnlyPaste(
  htmlText: string,
  plainText: string,
  imageFiles: File[]
): boolean {
  if (!imageFiles.length) return false
  const text = (plainText || '').replace(/\u00a0/g, ' ').trim()
  if (text) {
    // 复制图片时纯文本可能是文件名
    const isFileName = imageFiles.some(
      f => f.name && (text === f.name || text.includes(f.name))
    )
    if (!isFileName) return false
  }
  if (!htmlText) return true
  const doc = new DOMParser().parseFromString(htmlText, 'text/html')
  const clone = doc.body.cloneNode(true) as HTMLElement
  clone.querySelectorAll('img, style, script, meta, link').forEach(el => {
    el.remove()
  })
  const bodyText = (clone.innerText || '').replace(/\u00a0/g, ' ').trim()
  return !bodyText
}

function getClipboardRtf(clipboardData: DataTransfer): string {
  return (
    clipboardData.getData('text/rtf') ||
    clipboardData.getData('application/rtf') ||
    ''
  )
}

export function pasteByEvent(host: CanvasEvent, evt: ClipboardEvent) {
  const draw = host.getDraw()
  if (draw.isReadonly() || draw.isDisabled()) return
  const clipboardData = evt.clipboardData
  if (!clipboardData) return
  // 自定义粘贴事件
  const { paste } = draw.getOverride()
  if (paste) {
    const overrideResult = paste(evt)
    // 默认阻止默认事件
    if ((<IOverrideResult>overrideResult)?.preventDefault !== false) return
  }
  // 优先读取编辑器内部粘贴板数据（粘贴板不包含文件时）
  if (!getIsClipboardContainFile(clipboardData)) {
    const clipboardText = clipboardData.getData('text')
    const editorClipboardData = getClipboardData()
    // 不同系统间默认换行符不同 windows:\r\n mac:\n
    if (
      editorClipboardData &&
      normalizeLineBreak(clipboardText) ===
        normalizeLineBreak(editorClipboardData.text)
    ) {
      pasteElement(host, editorClipboardData.elementList)
      return
    }
  }
  removeClipboardData()

  const htmlText = clipboardData.getData('text/html')
  const plainText = clipboardData.getData('text/plain')
  const imageFiles = getClipboardImageFiles(clipboardData)
  const rtfData = getClipboardRtf(clipboardData)

  // 纯图片：只插入一张（优先 png），避免 HTML 重复标签 + bmp 副本
  if (isImageOnlyPaste(htmlText, plainText, imageFiles)) {
    pasteImage(host, pickBestImageFile(imageFiles))
    return
  }

  // 图文混排：走 HTML，并用 RTF / 剪贴板文件修复本地图片
  if (htmlText) {
    pasteHTML(host, htmlText, imageFiles, rtfData)
    return
  }

  if (plainText) {
    host.input(plainText)
    return
  }

  if (imageFiles.length) {
    pasteImage(host, pickBestImageFile(imageFiles))
  }
}

export async function pasteByApi(host: CanvasEvent, options?: IPasteOption) {
  const draw = host.getDraw()
  if (draw.isReadonly() || draw.isDisabled()) return
  // 自定义粘贴事件
  const { paste } = draw.getOverride()
  if (paste) {
    const overrideResult = paste()
    // 默认阻止默认事件
    if ((<IOverrideResult>overrideResult)?.preventDefault !== false) return
  }
  // 优先读取编辑器内部粘贴板数据
  const clipboardText = await navigator.clipboard.readText()
  const editorClipboardData = getClipboardData()
  if (
    editorClipboardData &&
    normalizeLineBreak(clipboardText) ===
      normalizeLineBreak(editorClipboardData.text)
  ) {
    pasteElement(host, editorClipboardData.elementList)
    return
  }
  removeClipboardData()
  // 从内存粘贴板获取数据
  if (options?.isPlainText) {
    if (clipboardText) {
      host.input(clipboardText)
    }
    return
  }

  const clipboardData = await navigator.clipboard.read()
  let isHTML = false
  for (const item of clipboardData) {
    if (item.types.includes('text/html')) {
      isHTML = true
      break
    }
  }
  const clipboardImageFiles: File[] = []
  let rtfData = ''
  let htmlText = ''
  let plainText = ''
  for (const item of clipboardData) {
    if (item.types.includes('text/rtf')) {
      rtfData = await (await item.getType('text/rtf')).text()
    } else if (item.types.includes('application/rtf')) {
      rtfData = await (await item.getType('application/rtf')).text()
    }
    if (item.types.includes('text/html')) {
      htmlText = await (await item.getType('text/html')).text()
    }
    if (item.types.includes('text/plain')) {
      plainText = await (await item.getType('text/plain')).text()
    }
    const imageType = item.types.find(type => type.startsWith('image/'))
    if (imageType) {
      const imageBlob = await item.getType(imageType)
      clipboardImageFiles.push(
        new File([imageBlob], `paste-${Date.now()}.png`, {
          type: imageType
        })
      )
    }
  }

  if (isImageOnlyPaste(htmlText, plainText, clipboardImageFiles)) {
    pasteImage(host, pickBestImageFile(clipboardImageFiles))
    return
  }

  if (isHTML && htmlText) {
    pasteHTML(host, htmlText, clipboardImageFiles, rtfData)
    return
  }

  if (plainText) {
    host.input(plainText)
    return
  }

  if (clipboardImageFiles.length) {
    pasteImage(host, pickBestImageFile(clipboardImageFiles))
  }
}
