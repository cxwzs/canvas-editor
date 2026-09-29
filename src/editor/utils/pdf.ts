import type { PDFDocumentProxy, PDFPageProxy } from 'pdfjs-dist'

/** 默认渲染倍率；再结合 MAX_EDGE 限制，避免大页爆炸 */
const DEFAULT_SCALE = 1.5
/** 单边最大像素，超出则等比缩小（兼顾清晰度与编码耗时） */
const MAX_EDGE = 1600
/** JPEG 质量：体积小、编码远快于 PNG，文档页足够清晰 */
const JPEG_QUALITY = 0.85

let workerReady = false
let workerObjectUrl: string | null = null

type WasmFileName =
  | 'openjpeg.wasm'
  | 'jbig2.wasm'
  | 'qcms_bg.wasm'
  | 'openjpeg_nowasm_fallback.js'
  | 'jbig2_nowasm_fallback.js'

const wasmLoaders: Record<
  WasmFileName,
  () => Promise<{ default: string }>
> = {
  'openjpeg.wasm': () => import('pdfjs-dist/wasm/openjpeg.wasm?url'),
  'jbig2.wasm': () => import('pdfjs-dist/wasm/jbig2.wasm?url'),
  'qcms_bg.wasm': () => import('pdfjs-dist/wasm/qcms_bg.wasm?url'),
  'openjpeg_nowasm_fallback.js': () =>
    import('pdfjs-dist/wasm/openjpeg_nowasm_fallback.js?url'),
  'jbig2_nowasm_fallback.js': () =>
    import('pdfjs-dist/wasm/jbig2_nowasm_fallback.js?url')
}

const wasmBytesCache = new Map<string, Uint8Array>()

/**
 * Vite lib 模式会把 `?url` 资源内联成 data: URL（assetsInlineLimit 在 lib 下无效）。
 * pdf.js 以 `type: "module"` 创建 Worker，浏览器不支持 data: 作为 module worker，
 * 因此需要转成同 origin 的 blob: URL。
 */
async function resolveWorkerSrc(workerUrl: string): Promise<string> {
  if (!workerUrl.startsWith('data:')) {
    return workerUrl
  }
  if (workerObjectUrl) {
    return workerObjectUrl
  }
  const response = await fetch(workerUrl)
  const buffer = await response.arrayBuffer()
  workerObjectUrl = URL.createObjectURL(
    new Blob([buffer], { type: 'text/javascript' })
  )
  return workerObjectUrl
}

async function loadWasmBytes(filename: string): Promise<Uint8Array> {
  const cached = wasmBytesCache.get(filename)
  if (cached) {
    return cached
  }
  const loader = wasmLoaders[filename as WasmFileName]
  if (!loader) {
    throw new Error(`Unknown pdfjs wasm asset: ${filename}`)
  }
  const { default: assetUrl } = await loader()
  const bytes = new Uint8Array(await (await fetch(assetUrl)).arrayBuffer())
  wasmBytesCache.set(filename, bytes)
  return bytes
}

/**
 * 内嵌 wasm，避免打包进业务项目后 worker 无法按相对路径拉取
 * openjpeg/jbig2（否则 JPEG2000/JBIG2 图会触发 ignoring XObject）。
 */
class EmbeddedPdfBinaryDataFactory {
  cMapUrl: string | null
  standardFontDataUrl: string | null
  wasmUrl: string | null

  constructor({
    cMapUrl = null,
    standardFontDataUrl = null,
    wasmUrl = null
  }: {
    cMapUrl?: string | null
    standardFontDataUrl?: string | null
    wasmUrl?: string | null
  } = {}) {
    this.cMapUrl = cMapUrl
    this.standardFontDataUrl = standardFontDataUrl
    this.wasmUrl = wasmUrl
  }

  async fetch({
    kind,
    filename
  }: {
    kind: string
    filename: string
  }): Promise<Uint8Array> {
    if (kind === 'wasmUrl') {
      return loadWasmBytes(filename)
    }
    let base: string | null = null
    if (kind === 'cMapUrl') {
      base = this.cMapUrl
    } else if (kind === 'standardFontDataUrl') {
      base = this.standardFontDataUrl
    }
    if (!base) {
      throw new Error(`Ensure that the \`${kind}\` API parameter is provided.`)
    }
    const url = `${base}${filename}`
    const response = await fetch(url)
    if (!response.ok) {
      throw new Error(`Unable to load ${kind} data at: ${url}`)
    }
    return new Uint8Array(await response.arrayBuffer())
  }
}

async function loadPdfjs() {
  const pdfjs = await import('pdfjs-dist')
  if (!workerReady) {
    const { default: pdfWorkerSrc } = await import(
      'pdfjs-dist/build/pdf.worker.min.mjs?url'
    )
    pdfjs.GlobalWorkerOptions.workerSrc = await resolveWorkerSrc(pdfWorkerSrc)
    workerReady = true
  }
  return pdfjs
}

function resolvePdfjsAssetBase(version: string): string {
  return `https://cdn.jsdelivr.net/npm/pdfjs-dist@${version}/`
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
  const pdfjs = await loadPdfjs()
  const { getDocument, version } = pdfjs
  const assetBase = resolvePdfjsAssetBase(version)
  // 拷贝一份，避免 ArrayBuffer 被 worker 转移后不可用
  const data = new Uint8Array(await file.arrayBuffer())
  const pdf = await getDocument({
    data,
    // worker 内动态 import 回退脚本仍需要可访问的 wasm 目录
    wasmUrl: `${assetBase}wasm/`,
    cMapUrl: `${assetBase}cmaps/`,
    cMapPacked: true,
    standardFontDataUrl: `${assetBase}standard_fonts/`,
    iccUrl: `${assetBase}iccs/`,
    // 走主线程 BinaryDataFactory，内嵌 wasm，不依赖业务项目静态资源路径
    useWorkerFetch: false,
    // pdfjs 类型未导出该工厂，运行时支持
    BinaryDataFactory: EmbeddedPdfBinaryDataFactory
  } as Parameters<typeof getDocument>[0]).promise
  const baseName = file.name.replace(/\.pdf$/i, '') || 'pdf'
  try {
    return await renderPdfPages(pdf, baseName, scale, options.onProgress)
  } finally {
    await pdf.cleanup()
  }
}
