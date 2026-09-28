import type { PDFDocumentProxy, PDFPageProxy } from 'pdfjs-dist'

/** 默认渲染倍率；再结合 MAX_EDGE 限制，避免大页爆炸 */
const DEFAULT_SCALE = 1.5
/** 单边最大像素，超出则等比缩小（兼顾清晰度与编码耗时） */
const MAX_EDGE = 1600
/** JPEG 质量：体积小、编码远快于 PNG，文档页足够清晰 */
const JPEG_QUALITY = 0.85

let workerReady = false

async function loadPdfjs() {
  const pdfjs = await import('pdfjs-dist')
  if (!workerReady) {
    const { default: pdfWorkerSrc } = await import(
      'pdfjs-dist/build/pdf.worker.min.mjs?url'
    )
    pdfjs.GlobalWorkerOptions.workerSrc = pdfWorkerSrc
    workerReady = true
  }
  return pdfjs
}

function yieldToMain(): Promise<void> {
  // 让出主线程，避免多页连续渲染时 toast/UI 卡死
  return new Promise(resolve => setTimeout(resolve, 0))
}

function resolvePageScale(page: PDFPageProxy, scale: number): number {
  const base = page.getViewport({ scale: 1 })
  const maxSide = Math.max(base.width, base.height)
  if (maxSide <= 0) return scale
  return Math.min(scale, MAX_EDGE / maxSide)
}

function canvasToJpegFile(
  canvas: HTMLCanvasElement,
  fileName: string
): Promise<File> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      blob => {
        if (!blob) {
          reject(new Error('pdf page toBlob failed'))
          return
        }
        resolve(new File([blob], fileName, { type: 'image/jpeg' }))
      },
      'image/jpeg',
      JPEG_QUALITY
    )
  })
}

function releaseCanvas(canvas: HTMLCanvasElement) {
  canvas.width = 0
  canvas.height = 0
}

export interface IPdfConvertProgress {
  current: number
  total: number
}

export interface IPdfToImageOptions {
  /** 渲染倍率，默认 1.5 */
  scale?: number
  onProgress?: (progress: IPdfConvertProgress) => void
}

async function renderPdfPages(
  pdf: PDFDocumentProxy,
  baseName: string,
  scale: number,
  onProgress?: (progress: IPdfConvertProgress) => void
): Promise<File[]> {
  const files: File[] = []
  const total = pdf.numPages
  for (let pageNum = 1; pageNum <= total; pageNum++) {
    onProgress?.({ current: pageNum, total })
    const page = await pdf.getPage(pageNum)
    const pageScale = resolvePageScale(page, scale)
    const viewport = page.getViewport({ scale: pageScale })
    const canvas = document.createElement('canvas')
    canvas.width = Math.max(1, Math.floor(viewport.width))
    canvas.height = Math.max(1, Math.floor(viewport.height))
    const ctx = canvas.getContext('2d', { alpha: false })
    if (!ctx) {
      page.cleanup()
      throw new Error('canvas context unavailable')
    }
    // JPEG 无透明通道，先铺白底避免透明区变黑
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    try {
      await page
        .render({
          canvas,
          canvasContext: ctx,
          viewport
        })
        .promise
      files.push(
        await canvasToJpegFile(canvas, `${baseName}-page-${pageNum}.jpg`)
      )
    } finally {
      page.cleanup()
      releaseCanvas(canvas)
    }
    if (pageNum < total) {
      await yieldToMain()
    }
  }
  return files
}

/**
 * 将 PDF 每一页渲染为 JPEG 图片文件（用于后续预览/上传插入）。
 * 默认 1.5x 渲染并限制单边 ≤1600px，编码远快于 PNG。
 */
export async function pdfFileToImageFiles(
  file: File,
  scaleOrOptions: number | IPdfToImageOptions = DEFAULT_SCALE
): Promise<File[]> {
  const options: IPdfToImageOptions =
    typeof scaleOrOptions === 'number'
      ? { scale: scaleOrOptions }
      : scaleOrOptions
  const scale = options.scale ?? DEFAULT_SCALE
  const { getDocument } = await loadPdfjs()
  // 拷贝一份，避免 ArrayBuffer 被 worker 转移后不可用
  const data = new Uint8Array(await file.arrayBuffer())
  const pdf = await getDocument({ data }).promise
  const baseName = file.name.replace(/\.pdf$/i, '') || 'pdf'
  try {
    return await renderPdfPages(pdf, baseName, scale, options.onProgress)
  } finally {
    await pdf.cleanup()
  }
}
