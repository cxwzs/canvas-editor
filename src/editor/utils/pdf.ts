import type { PDFDocumentProxy } from 'pdfjs-dist'

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

function canvasToPngFile(
  canvas: HTMLCanvasElement,
  fileName: string
): Promise<File> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(blob => {
      if (!blob) {
        reject(new Error('pdf page toBlob failed'))
        return
      }
      resolve(new File([blob], fileName, { type: 'image/png' }))
    }, 'image/png')
  })
}

async function renderPdfPages(
  pdf: PDFDocumentProxy,
  baseName: string,
  scale: number
): Promise<File[]> {
  const files: File[] = []
  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum)
    const viewport = page.getViewport({ scale })
    const canvas = document.createElement('canvas')
    canvas.width = Math.max(1, Math.floor(viewport.width))
    canvas.height = Math.max(1, Math.floor(viewport.height))
    const ctx = canvas.getContext('2d')
    if (!ctx) {
      throw new Error('canvas context unavailable')
    }
    await page
      .render({
        canvas,
        canvasContext: ctx,
        viewport
      })
      .promise
    files.push(
      await canvasToPngFile(canvas, `${baseName}-page-${pageNum}.png`)
    )
  }
  return files
}

/**
 * 将 PDF 每一页渲染为 PNG 图片文件（用于后续预览/上传插入）。
 * @param scale 渲染倍率，默认 2，兼顾清晰度与体积
 */
export async function pdfFileToImageFiles(
  file: File,
  scale = 2
): Promise<File[]> {
  const { getDocument } = await loadPdfjs()
  const data = await file.arrayBuffer()
  const pdf = await getDocument({ data }).promise
  const baseName = file.name.replace(/\.pdf$/i, '') || 'pdf'
  try {
    return await renderPdfPages(pdf, baseName, scale)
  } finally {
    await pdf.cleanup()
  }
}
