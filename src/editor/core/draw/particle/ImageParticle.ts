import { EDITOR_PREFIX } from '../../../dataset/constant/Editor'
import { ImageDisplay } from '../../../dataset/enum/Common'
import { ElementType } from '../../../dataset/enum/Element'
import { DeepRequired } from '../../../interface/Common'
import { IEditorOption } from '../../../interface/Editor'
import { IElement } from '../../../interface/Element'
import { convertStringToBase64 } from '../../../utils'
import { applyImageMaxSize } from '../../../utils/element'
import { Draw } from '../Draw'

export class ImageParticle {
  private draw: Draw
  protected options: DeepRequired<IEditorOption>
  protected imageCache: Map<string, HTMLImageElement>
  private container: HTMLDivElement
  private floatImageContainer: HTMLDivElement | null
  private floatImage: HTMLImageElement | null
  private imageRelayoutTimer: number | null
  private loadingSrcSet: Set<string>

  constructor(draw: Draw) {
    this.draw = draw
    this.options = draw.getOptions()
    this.container = draw.getContainer()
    this.imageCache = new Map()
    this.floatImageContainer = null
    this.floatImage = null
    this.imageRelayoutTimer = null
    this.loadingSrcSet = new Set()
  }

  public getOriginalMainImageList(): IElement[] {
    const imageList: IElement[] = []
    const getImageList = (elementList: IElement[]) => {
      for (const element of elementList) {
        if (element.type === ElementType.TABLE) {
          const trList = element.trList!
          for (let r = 0; r < trList.length; r++) {
            const tr = trList[r]
            for (let d = 0; d < tr.tdList.length; d++) {
              const td = tr.tdList[d]
              getImageList(td.value)
            }
          }
        } else if (element.type === ElementType.IMAGE) {
          imageList.push(element)
        }
      }
    }
    // 获取正文图片列表
    getImageList(this.draw.getOriginalMainElementList())
    return imageList
  }

  public getAllImageList(): IElement[] {
    const imageList: IElement[] = []
    const collect = (elementList: IElement[]) => {
      for (const element of elementList) {
        if (element.type === ElementType.TABLE) {
          const trList = element.trList!
          for (const tr of trList) {
            for (const td of tr.tdList) {
              collect(td.value)
            }
          }
        } else if (element.type === ElementType.IMAGE) {
          imageList.push(element)
        }
      }
    }
    collect(this.draw.getHeaderElementList())
    collect(this.draw.getOriginalMainElementList())
    collect(this.draw.getFooterElementList())
    return imageList
  }

  private _countImagesBeforeTarget(
    elementList: IElement[],
    targetElement: IElement
  ): number {
    let count = 0
    for (const element of elementList) {
      if (element === targetElement) break
      if (element.type === ElementType.TABLE) {
        const trList = element.trList!
        for (const tr of trList) {
          for (const td of tr.tdList) {
            count += this._countImagesBeforeTarget(td.value, targetElement)
          }
        }
      } else if (element.type === ElementType.IMAGE) {
        count++
      }
    }
    return count
  }

  public createFloatImage(element: IElement) {
    const { scale } = this.options
    // 复用浮动元素
    let floatImageContainer = this.floatImageContainer
    let floatImage = this.floatImage
    if (!floatImageContainer) {
      floatImageContainer = document.createElement('div')
      floatImageContainer.classList.add(`${EDITOR_PREFIX}-float-image`)
      this.container.append(floatImageContainer)
      this.floatImageContainer = floatImageContainer
    }
    if (!floatImage) {
      floatImage = document.createElement('img')
      floatImageContainer.append(floatImage)
      this.floatImage = floatImage
    }
    floatImageContainer.style.display = 'none'
    floatImage.style.width = `${element.width! * scale}px`
    floatImage.style.height = `${element.height! * scale}px`
    // 浮动图片初始信息
    const { x: preX, y: preY } = this.draw.getPageOffset(this.draw.getPageNo())
    const position = this.draw.getPosition()
    const floatPosition = position.getFloatPositionByElement(element)
    if (!floatPosition) return
    const { x, y } = position.getFloatPositionCoordinate(floatPosition)
    floatImageContainer.style.left = `${x + preX}px`
    floatImageContainer.style.top = `${preY + y}px`
    floatImage.src = element.value
  }

  public dragFloatImage(movementX: number, movementY: number) {
    if (!this.floatImageContainer) return
    this.floatImageContainer.style.display = 'block'
    // 之前的坐标加移动长度
    const x = parseFloat(this.floatImageContainer.style.left) + movementX
    const y = parseFloat(this.floatImageContainer.style.top) + movementY
    this.floatImageContainer.style.left = `${x}px`
    this.floatImageContainer.style.top = `${y}px`
  }

  public destroyFloatImage() {
    if (this.floatImageContainer) {
      this.floatImageContainer.style.display = 'none'
    }
  }

  protected addImageObserver(promise: Promise<unknown>) {
    this.draw.getImageObserver().add(promise)
  }

  protected getFallbackImage(width: number, height: number): HTMLImageElement {
    const tileSize = 8
    const x = (width - Math.ceil(width / tileSize) * tileSize) / 2
    const y = (height - Math.ceil(height / tileSize) * tileSize) / 2
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
                  <rect width="${width}" height="${height}" fill="url(#mosaic)" />
                  <defs>
                    <pattern id="mosaic" x="${x}" y="${y}" width="${
                      tileSize * 2
                    }" height="${tileSize * 2}" patternUnits="userSpaceOnUse">
                      <rect width="${tileSize}" height="${tileSize}" fill="#cccccc" />
                      <rect width="${tileSize}" height="${tileSize}" fill="#cccccc" transform="translate(${tileSize}, ${tileSize})" />
                    </pattern>
                  </defs>
                </svg>`
    const fallbackImage = new Image()
    fallbackImage.src = `data:image/svg+xml;base64,${convertStringToBase64(
      svg
    )}`
    return fallbackImage
  }

  /** 静态加载占位（无动画，避免频繁重绘卡顿） */
  private _drawLoadingPlaceholder(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number
  ) {
    if (!width || !height) return
    const { scale } = this.options
    ctx.save()
    ctx.fillStyle = '#f0f0f0'
    ctx.fillRect(x, y, width, height)
    ctx.strokeStyle = '#d9d9d9'
    ctx.lineWidth = 1
    ctx.strokeRect(x + 0.5, y + 0.5, width - 1, height - 1)
    const fontSize = Math.min(14 * scale, Math.max(10 * scale, height / 4))
    ctx.font = `${fontSize}px sans-serif`
    ctx.fillStyle = '#999999'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText('图片加载中', x + width / 2, y + height / 2)
    ctx.restore()
  }

  private _drawImageWithCrop(
    ctx: CanvasRenderingContext2D,
    img: HTMLImageElement,
    element: IElement,
    x: number,
    y: number,
    width: number,
    height: number
  ) {
    if (element.imgCrop) {
      const {
        x: cropX,
        y: cropY,
        width: cropWidth,
        height: cropHeight
      } = element.imgCrop
      ctx.drawImage(
        img,
        cropX,
        cropY,
        cropWidth,
        cropHeight,
        x,
        y,
        width,
        height
      )
    } else {
      ctx.drawImage(img, x, y, width, height)
    }
  }

  private _renderImageBorder(
    ctx: CanvasRenderingContext2D,
    element: IElement,
    x: number,
    y: number,
    width: number,
    height: number
  ) {
    if (!element.imgBorder || !element.imgBorderWidth || !width || !height) {
      return
    }
    const { scale } = this.options
    const lineWidth = element.imgBorderWidth * scale
    ctx.save()
    ctx.strokeStyle = element.imgBorderColor || '#000000'
    ctx.lineWidth = lineWidth
    const offset = lineWidth / 2
    ctx.strokeRect(
      x + offset,
      y + offset,
      Math.max(0, width - lineWidth),
      Math.max(0, height - lineWidth)
    )
    ctx.restore()
  }

  private _renderCaption(
    ctx: CanvasRenderingContext2D,
    element: IElement,
    x: number,
    y: number,
    width: number,
    height: number
  ) {
    if (!element.imgCaption?.value) return
    const { scale, imgCaption } = this.options
    let captionText = element.imgCaption.value
    // 替换特殊字符
    if (captionText.includes('{imageNo}')) {
      const elementList = this.draw.getOriginalMainElementList()
      const imageNo = this._countImagesBeforeTarget(elementList, element) + 1
      captionText = captionText.replace(/\{imageNo\}/g, String(imageNo))
    }
    const fontSize = (element.imgCaption.size || imgCaption.size) * scale
    const fontFamily = element.imgCaption.font || imgCaption.font
    const color = element.imgCaption.color || imgCaption.color
    ctx.save()
    ctx.font = `${fontSize}px ${fontFamily}`
    ctx.fillStyle = color
    ctx.textAlign = 'center'
    // 超出图片宽度后省略
    let displayText = captionText
    const textMetrics = ctx.measureText(captionText)
    if (textMetrics.width > width) {
      let left = 0
      let right = captionText.length
      while (left < right) {
        const mid = Math.ceil((left + right) / 2)
        const truncated = captionText.substring(0, mid)
        if (ctx.measureText(truncated + '...').width <= width) {
          left = mid
        } else {
          right = mid - 1
        }
      }
      displayText = captionText.substring(0, left) + '...'
    }
    const captionTop = (element.imgCaption.top ?? imgCaption.top) * scale
    const captionY =
      y + height + captionTop + textMetrics.actualBoundingBoxAscent
    const captionX = x + width / 2
    ctx.fillText(displayText, captionX, captionY)
    ctx.restore()
  }

  /**
   * 图片加载后按自然尺寸与 max 约束修正元素宽高。
   * 仅处理尺寸待定（HTML 无宽高）的图片，避免覆盖用户已设定尺寸。
   * @returns 是否需要重新排版
   */
  private _resolveElementSizeAfterLoad(
    element: IElement,
    img: HTMLImageElement
  ): boolean {
    if (!element.imgSizePending && element.width && element.height) {
      return false
    }
    const naturalWidth = img.naturalWidth
    const naturalHeight = img.naturalHeight
    if (!naturalWidth || !naturalHeight) return false

    const maxWidth = element.imgMaxWidth || this.draw.getOriginalInnerWidth()
    const maxHeight = element.imgMaxHeight
    const sized = applyImageMaxSize(
      naturalWidth,
      naturalHeight,
      maxWidth,
      maxHeight
    )

    const needRelayout =
      !!element.imgSizePending ||
      !element.width ||
      !element.height ||
      Math.abs((element.width || 0) - sized.width) > 1 ||
      Math.abs((element.height || 0) - sized.height) > 1

    element.width = sized.width
    element.height = sized.height
    if (element.imgSizePending) {
      delete element.imgSizePending
    }
    return needRelayout
  }

  private _scheduleImageRelayout() {
    if (this.imageRelayoutTimer !== null) {
      window.clearTimeout(this.imageRelayoutTimer)
    }
    // 多图并发加载合并为一次重排，避免页码反复跳动
    this.imageRelayoutTimer = window.setTimeout(() => {
      this.imageRelayoutTimer = null
      this._runImageRelayout()
    }, 80)
  }

  private _runImageRelayout() {
    this.draw.render({
      isCompute: true,
      isSetCursor: false,
      isSubmitHistory: false
    })
  }

  /** 立即执行待定的图片尺寸重排（导出/打印前调用） */
  public flushImageRelayout() {
    if (this.imageRelayoutTimer === null) return
    window.clearTimeout(this.imageRelayoutTimer)
    this.imageRelayoutTimer = null
    this._runImageRelayout()
  }

  /**
   * 预加载尺寸待定的图片（页眉/正文/页脚，不依赖虚拟页是否挂载）。
   */
  public preloadPendingImages() {
    const imageList = this.getAllImageList()
    for (let i = 0; i < imageList.length; i++) {
      this._ensureImageSize(imageList[i])
    }
  }

  private _ensureImageSize(element: IElement) {
    if (!element.imgSizePending && element.width && element.height) return
    if (!element.value) return
    if (this.imageCache.has(element.value)) {
      const img = this.imageCache.get(element.value)!
      if (this._resolveElementSizeAfterLoad(element, img)) {
        this._scheduleImageRelayout()
      }
      return
    }
    if (this.loadingSrcSet.has(element.value)) return
    this.loadingSrcSet.add(element.value)
    const imageLoadPromise = new Promise((resolve, reject) => {
      const img = new Image()
      img.setAttribute('crossOrigin', 'Anonymous')
      img.onload = () => {
        this.loadingSrcSet.delete(element.value)
        this.imageCache.set(element.value, img)
        resolve(element)
        if (this._resolveElementSizeAfterLoad(element, img)) {
          this._scheduleImageRelayout()
        }
      }
      img.onerror = error => {
        this.loadingSrcSet.delete(element.value)
        if (element.imgSizePending) {
          delete element.imgSizePending
        }
        reject(error)
      }
      img.src = element.value
    })
    this.addImageObserver(imageLoadPromise)
  }

  public render(
    ctx: CanvasRenderingContext2D,
    element: IElement,
    x: number,
    y: number
  ) {
    const { scale } = this.options
    const width = (element.width || 0) * scale
    const height = (element.height || 0) * scale
    if (this.imageCache.has(element.value)) {
      const img = this.imageCache.get(element.value)!
      // 缓存命中但仍待纠正尺寸时，补一次排版
      if (
        element.imgSizePending &&
        this._resolveElementSizeAfterLoad(element, img)
      ) {
        this._scheduleImageRelayout()
        return
      }
      this._drawImageWithCrop(ctx, img, element, x, y, width, height)
      this._renderImageBorder(ctx, element, x, y, width, height)
      this._renderCaption(ctx, element, x, y, width, height)
      return
    }
    // 尺寸待定：预加载并绘制静态占位（兼容虚拟滚动未挂载页）
    if (element.imgSizePending || !element.width || !element.height) {
      this._ensureImageSize(element)
      this._drawLoadingPlaceholder(ctx, x, y, width, height)
      return
    }
    // 加载中：仅绘制静态占位，不触发重复请求
    if (this.loadingSrcSet.has(element.value)) {
      this._drawLoadingPlaceholder(ctx, x, y, width, height)
      return
    }
    this.loadingSrcSet.add(element.value)
    this._drawLoadingPlaceholder(ctx, x, y, width, height)
    const cacheRenderCount = this.draw.getRenderCount()
    const imageLoadPromise = new Promise((resolve, reject) => {
      const img = new Image()
      img.setAttribute('crossOrigin', 'Anonymous')
      img.src = element.value
      img.onload = () => {
        this.loadingSrcSet.delete(element.value)
        this.imageCache.set(element.value, img)
        resolve(element)
        const needRelayout = this._resolveElementSizeAfterLoad(element, img)
        if (needRelayout) {
          this._scheduleImageRelayout()
          return
        }
        if (cacheRenderCount !== this.draw.getRenderCount()) return
        if (element.imgDisplay === ImageDisplay.FLOAT_BOTTOM) {
          this.draw.render({
            isCompute: false,
            isSetCursor: false,
            isSubmitHistory: false
          })
        } else {
          this._drawImageWithCrop(ctx, img, element, x, y, width, height)
          this._renderImageBorder(ctx, element, x, y, width, height)
          this._renderCaption(ctx, element, x, y, width, height)
        }
      }
      img.onerror = error => {
        this.loadingSrcSet.delete(element.value)
        const fallbackImage = this.getFallbackImage(width, height)
        fallbackImage.onload = () => {
          this._drawImageWithCrop(
            ctx,
            fallbackImage,
            element,
            x,
            y,
            width,
            height
          )
          this._renderImageBorder(ctx, element, x, y, width, height)
          this.imageCache.set(element.value, fallbackImage)
          this._renderCaption(ctx, element, x, y, width, height)
        }
        reject(error)
      }
    })
    this.addImageObserver(imageLoadPromise)
  }
}
