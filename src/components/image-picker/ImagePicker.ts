import { EditorComponent } from '../../editor/dataset/enum/Editor'
import { EDITOR_COMPONENT } from '../../editor/dataset/constant/Editor'
import type { IFileUpload } from '../../editor/interface/File'
import './image-picker.css'

export interface IImagePickerResult {
  value: string
  width: number
  height: number
  fileName: string
}

export interface IImagePickerOptions {
  files: File[]
  onFileUpload?: IFileUpload | null
  onClose?: () => void
  onCancel?: () => void
  onConfirm?: (payload: IImagePickerResult[]) => void
}

interface ICropRect {
  x: number
  y: number
  width: number
  height: number
}

interface IImageItem {
  id: string
  file: File
  url: string
  naturalWidth: number
  naturalHeight: number
  /** 相对原图像素的裁剪区域 */
  crop: ICropRect
}

type DragMode = 'move' | 'nw' | 'ne' | 'sw' | 'se'

export class ImagePicker {
  private static idSeed = 0
  private options: IImagePickerOptions
  private mask: HTMLDivElement
  private container: HTMLDivElement
  private listEl: HTMLDivElement
  private stageEl: HTMLDivElement
  private imageEl: HTMLImageElement
  private boxEl: HTMLDivElement
  private maskSvg: SVGSVGElement
  private progressWrap: HTMLDivElement
  private progressText: HTMLDivElement
  private progressBar: HTMLDivElement
  private confirmBtn: HTMLButtonElement
  private cancelBtn: HTMLButtonElement
  private addInput: HTMLInputElement
  private items: IImageItem[] = []
  private activeId: string | null = null
  private displayScale = 1
  private displayOffsetX = 0
  private displayOffsetY = 0
  private dragMode: DragMode | null = null
  private dragStartX = 0
  private dragStartY = 0
  private dragStartCrop: ICropRect | null = null
  private submitting = false
  private disposed = false

  constructor(options: IImagePickerOptions) {
    this.options = options
    const nodes = this._render()
    this.mask = nodes.mask
    this.container = nodes.container
    this.listEl = nodes.listEl
    this.stageEl = nodes.stageEl
    this.imageEl = nodes.imageEl
    this.boxEl = nodes.boxEl
    this.maskSvg = nodes.maskSvg
    this.progressWrap = nodes.progressWrap
    this.progressText = nodes.progressText
    this.progressBar = nodes.progressBar
    this.confirmBtn = nodes.confirmBtn
    this.cancelBtn = nodes.cancelBtn
    this.addInput = nodes.addInput
    this._bindEvent()
    void this._loadFiles(options.files)
    document.documentElement.classList.add('overflow-hidden')
    document.body.classList.add('overflow-hidden')
  }

  private _render() {
    const { onClose, onCancel } = this.options
    const mask = document.createElement('div')
    mask.classList.add('image-picker-mask')
    mask.setAttribute(EDITOR_COMPONENT, EditorComponent.COMPONENT)
    document.body.append(mask)

    const container = document.createElement('div')
    container.classList.add('image-picker-container')
    container.setAttribute(EDITOR_COMPONENT, EditorComponent.COMPONENT)

    const picker = document.createElement('div')
    picker.classList.add('image-picker')
    container.append(picker)

    const title = document.createElement('div')
    title.classList.add('image-picker-title')
    const titleSpan = document.createElement('span')
    titleSpan.append(document.createTextNode('图片'))
    const titleClose = document.createElement('i')
    titleClose.onclick = () => {
      onClose?.()
      this._dispose()
    }
    title.append(titleSpan, titleClose)
    picker.append(title)

    const body = document.createElement('div')
    body.classList.add('image-picker-body')

    const listEl = document.createElement('div')
    listEl.classList.add('image-picker-list')

    const addInput = document.createElement('input')
    addInput.type = 'file'
    addInput.accept = '.png, .jpg, .jpeg, .svg, .gif'
    addInput.multiple = true
    addInput.hidden = true
    addInput.onchange = () => {
      const files = Array.from(addInput.files || [])
      addInput.value = ''
      if (!files.length) return
      void this._appendFiles(files)
    }

    const crop = document.createElement('div')
    crop.classList.add('image-picker-crop')

    const stageEl = document.createElement('div')
    stageEl.classList.add('image-picker-crop__stage')

    const imageEl = document.createElement('img')
    imageEl.classList.add('image-picker-crop__image')
    imageEl.draggable = false

    const maskSvg = document.createElementNS(
      'http://www.w3.org/2000/svg',
      'svg'
    )
    maskSvg.classList.add('image-picker-crop__mask')
    maskSvg.setAttribute('width', '100%')
    maskSvg.setAttribute('height', '100%')

    const boxEl = document.createElement('div')
    boxEl.classList.add('image-picker-crop__box')
    ;(['nw', 'ne', 'sw', 'se'] as const).forEach(pos => {
      const handle = document.createElement('div')
      handle.classList.add('image-picker-crop__handle', pos)
      handle.dataset.handle = pos
      boxEl.append(handle)
    })

    stageEl.append(imageEl, maskSvg, boxEl)
    const tip = document.createElement('div')
    tip.classList.add('image-picker-crop__tip')
    tip.append(document.createTextNode('拖动裁剪框调整区域，可切换左侧列表或继续添加图片'))
    crop.append(stageEl, tip)
    body.append(listEl, crop)
    picker.append(body, addInput)

    // 进度条仅在配置 onFileUpload 且上传时通过 .visible 展示
    const progressWrap = document.createElement('div')
    progressWrap.classList.add('image-picker-progress')
    const progressText = document.createElement('div')
    progressText.classList.add('image-picker-progress__text')
    const progressBarOuter = document.createElement('div')
    progressBarOuter.classList.add('image-picker-progress__bar')
    const progressBar = document.createElement('div')
    progressBar.classList.add('image-picker-progress__bar-inner')
    progressBarOuter.append(progressBar)
    progressWrap.append(progressText, progressBarOuter)
    picker.append(progressWrap)

    const menu = document.createElement('div')
    menu.classList.add('image-picker-menu')
    const cancelBtn = document.createElement('button')
    cancelBtn.classList.add('image-picker-menu__cancel')
    cancelBtn.type = 'button'
    cancelBtn.append(document.createTextNode('取消'))
    cancelBtn.onclick = () => {
      if (this.submitting) return
      onCancel?.()
      this._dispose()
    }
    const confirmBtn = document.createElement('button')
    confirmBtn.type = 'submit'
    confirmBtn.append(document.createTextNode('确定'))
    confirmBtn.onclick = () => {
      void this._handleConfirm()
    }
    menu.append(cancelBtn, confirmBtn)
    picker.append(menu)

    document.body.append(container)
    return {
      mask,
      container,
      listEl,
      stageEl,
      imageEl,
      boxEl,
      maskSvg,
      progressWrap,
      progressText,
      progressBar,
      confirmBtn,
      cancelBtn,
      addInput
    }
  }

  private _bindEvent() {
    this.boxEl.onmousedown = evt => {
      if (this.submitting) return
      const target = evt.target as HTMLElement
      const handle = target.dataset.handle as DragMode | undefined
      this.dragMode = handle || 'move'
      this.dragStartX = evt.clientX
      this.dragStartY = evt.clientY
      const item = this._getActiveItem()
      if (!item) return
      this.dragStartCrop = { ...item.crop }
      evt.preventDefault()
      evt.stopPropagation()
    }

    const onMouseMove = (evt: MouseEvent) => {
      if (!this.dragMode || !this.dragStartCrop) return
      const item = this._getActiveItem()
      if (!item) return
      const dx = (evt.clientX - this.dragStartX) / this.displayScale
      const dy = (evt.clientY - this.dragStartY) / this.displayScale
      item.crop = this._applyDrag(
        this.dragStartCrop,
        this.dragMode,
        dx,
        dy,
        item.naturalWidth,
        item.naturalHeight
      )
      this._syncCropUI()
    }

    const onMouseUp = () => {
      this.dragMode = null
      this.dragStartCrop = null
    }

    const onResize = () => {
      this._layoutActiveImage()
    }

    document.addEventListener('mousemove', onMouseMove)
    document.addEventListener('mouseup', onMouseUp)
    window.addEventListener('resize', onResize)
    this.disposeList = [
      () => document.removeEventListener('mousemove', onMouseMove),
      () => document.removeEventListener('mouseup', onMouseUp),
      () => window.removeEventListener('resize', onResize)
    ]
  }

  private disposeList: Array<() => void> = []

  private async _loadFiles(files: File[]) {
    await this._appendFiles(files)
    if (!this.items.length) {
      this._renderList()
    }
  }

  private async _appendFiles(files: File[]) {
    if (this.submitting || !files.length) return
    const loaded = await Promise.all(
      files.map(file => this._createItem(file))
    )
    const nextItems = loaded.filter((item): item is IImageItem => !!item)
    if (!nextItems.length) return
    const shouldActivate = !this.activeId
    this.items.push(...nextItems)
    this._renderList()
    if (shouldActivate) {
      this._setActive(nextItems[0].id)
    } else {
      this._setActive(nextItems[nextItems.length - 1].id)
    }
  }

  private _createItem(file: File): Promise<IImageItem | null> {
    return new Promise(resolve => {
      const url = URL.createObjectURL(file)
      const img = new Image()
      img.onload = () => {
        const width = img.naturalWidth
        const height = img.naturalHeight
        resolve({
          id: `img_${++ImagePicker.idSeed}`,
          file,
          url,
          naturalWidth: width,
          naturalHeight: height,
          crop: { x: 0, y: 0, width, height }
        })
      }
      img.onerror = () => {
        URL.revokeObjectURL(url)
        resolve(null)
      }
      img.src = url
    })
  }

  private _renderList() {
    this.listEl.innerHTML = ''
    this.items.forEach(item => {
      const el = document.createElement('div')
      el.classList.add('image-picker-list__item')
      if (item.id === this.activeId) {
        el.classList.add('active')
      }
      el.dataset.id = item.id
      const thumb = document.createElement('img')
      thumb.src = item.url
      thumb.alt = item.file.name
      const remove = document.createElement('div')
      remove.classList.add('image-picker-list__item-remove')
      remove.append(document.createTextNode('×'))
      remove.onclick = evt => {
        evt.stopPropagation()
        this._removeItem(item.id)
      }
      el.append(thumb, remove)
      el.onclick = () => this._setActive(item.id)
      this.listEl.append(el)
    })
    const addBtn = document.createElement('div')
    addBtn.classList.add('image-picker-list__add')
    addBtn.title = '添加图片'
    addBtn.append(document.createTextNode('+'))
    addBtn.onclick = () => {
      if (this.submitting) return
      this.addInput.click()
    }
    this.listEl.append(addBtn)
    this.confirmBtn.disabled = this.submitting || !this.items.length
  }

  private _removeItem(id: string) {
    if (this.submitting) return
    const index = this.items.findIndex(item => item.id === id)
    if (!~index) return
    const [removed] = this.items.splice(index, 1)
    URL.revokeObjectURL(removed.url)
    if (!this.items.length) {
      this.activeId = null
      this.imageEl.removeAttribute('src')
      this.boxEl.style.display = 'none'
      this.maskSvg.innerHTML = ''
      this._renderList()
      return
    }
    this.boxEl.style.display = ''
    if (this.activeId === id) {
      const next = this.items[Math.min(index, this.items.length - 1)]
      this.activeId = null
      this._renderList()
      this._setActive(next.id)
      return
    }
    this._renderList()
  }

  private _setActive(id: string) {
    this.activeId = id
    this._renderList()
    this._layoutActiveImage()
  }

  private _getActiveItem() {
    return this.items.find(item => item.id === this.activeId) || null
  }

  private _layoutActiveImage() {
    const item = this._getActiveItem()
    if (!item) return
    this.boxEl.style.display = ''
    const stageWidth = this.stageEl.clientWidth
    const stageHeight = this.stageEl.clientHeight
    const scale = Math.min(
      stageWidth / item.naturalWidth,
      stageHeight / item.naturalHeight,
      1
    )
    this.displayScale = scale
    const displayWidth = item.naturalWidth * scale
    const displayHeight = item.naturalHeight * scale
    this.displayOffsetX = (stageWidth - displayWidth) / 2
    this.displayOffsetY = (stageHeight - displayHeight) / 2
    this.imageEl.src = item.url
    this.imageEl.style.width = `${displayWidth}px`
    this.imageEl.style.height = `${displayHeight}px`
    this.imageEl.style.left = `${this.displayOffsetX}px`
    this.imageEl.style.top = `${this.displayOffsetY}px`
    this._syncCropUI()
  }

  private _syncCropUI() {
    const item = this._getActiveItem()
    if (!item) return
    const { crop } = item
    const left = this.displayOffsetX + crop.x * this.displayScale
    const top = this.displayOffsetY + crop.y * this.displayScale
    const width = crop.width * this.displayScale
    const height = crop.height * this.displayScale
    this.boxEl.style.left = `${left}px`
    this.boxEl.style.top = `${top}px`
    this.boxEl.style.width = `${width}px`
    this.boxEl.style.height = `${height}px`

    const stageWidth = this.stageEl.clientWidth
    const stageHeight = this.stageEl.clientHeight
    const path = [
      `M0 0H${stageWidth}V${stageHeight}H0Z`,
      `M${left} ${top}H${left + width}V${top + height}H${left}Z`
    ].join(' ')
    this.maskSvg.innerHTML = `<path d="${path}" fill="rgba(0,0,0,0.45)" fill-rule="evenodd"></path>`
  }

  private _applyDrag(
    start: ICropRect,
    mode: DragMode,
    dx: number,
    dy: number,
    maxW: number,
    maxH: number
  ): ICropRect {
    const minSize = 20
    let { x, y, width, height } = start
    if (mode === 'move') {
      x = Math.min(Math.max(0, start.x + dx), maxW - width)
      y = Math.min(Math.max(0, start.y + dy), maxH - height)
      return { x, y, width, height }
    }
    if (mode === 'se') {
      width = Math.min(Math.max(minSize, start.width + dx), maxW - start.x)
      height = Math.min(Math.max(minSize, start.height + dy), maxH - start.y)
    } else if (mode === 'sw') {
      const nextWidth = Math.min(
        Math.max(minSize, start.width - dx),
        start.x + start.width
      )
      x = start.x + start.width - nextWidth
      width = nextWidth
      height = Math.min(Math.max(minSize, start.height + dy), maxH - start.y)
    } else if (mode === 'ne') {
      width = Math.min(Math.max(minSize, start.width + dx), maxW - start.x)
      const nextHeight = Math.min(
        Math.max(minSize, start.height - dy),
        start.y + start.height
      )
      y = start.y + start.height - nextHeight
      height = nextHeight
    } else if (mode === 'nw') {
      const nextWidth = Math.min(
        Math.max(minSize, start.width - dx),
        start.x + start.width
      )
      const nextHeight = Math.min(
        Math.max(minSize, start.height - dy),
        start.y + start.height
      )
      x = start.x + start.width - nextWidth
      y = start.y + start.height - nextHeight
      width = nextWidth
      height = nextHeight
    }
    x = Math.min(Math.max(0, x), maxW - minSize)
    y = Math.min(Math.max(0, y), maxH - minSize)
    width = Math.min(width, maxW - x)
    height = Math.min(height, maxH - y)
    return { x, y, width, height }
  }

  private _setProgress(visible: boolean, text = '', percent = 0) {
    if (!this.options.onFileUpload) return
    this.progressWrap.classList.toggle('visible', visible)
    this.progressText.textContent = text
    this.progressBar.style.width = `${Math.min(100, Math.max(0, percent))}%`
  }

  private _setSubmitting(submitting: boolean) {
    this.submitting = submitting
    this.confirmBtn.disabled = submitting || !this.items.length
    this.cancelBtn.disabled = submitting
  }

  private async _handleConfirm() {
    if (this.submitting || !this.items.length) return
    this._setSubmitting(true)
    try {
      const results: IImagePickerResult[] = []
      const total = this.items.length
      const onFileUpload = this.options.onFileUpload
      for (let i = 0; i < this.items.length; i++) {
        const item = this.items[i]
        const file = await this._exportCroppedFile(item)
        // 裁剪导出尺寸已知，避免依赖远程 URL 再读宽高（跨域/鉴权等会导致确认中断）
        const width = Math.max(1, Math.round(item.crop.width))
        const height = Math.max(1, Math.round(item.crop.height))
        let value: string
        if (onFileUpload) {
          this._setProgress(
            true,
            `正在上传 ${i + 1}/${total}：${item.file.name}`,
            (i / total) * 100
          )
          value = await onFileUpload(file, {
            onProgress: percent => {
              const overall = ((i + percent / 100) / total) * 100
              this._setProgress(
                true,
                `正在上传 ${i + 1}/${total}：${item.file.name}`,
                overall
              )
            }
          })
          if (!value || typeof value !== 'string') {
            throw new Error('onFileUpload must return an image url string')
          }
        } else {
          value = await this._fileToDataURL(file)
        }
        results.push({
          value,
          width,
          height,
          fileName: item.file.name
        })
      }
      if (onFileUpload) {
        this._setProgress(true, '上传完成', 100)
      }
      this.options.onConfirm?.(results)
      this._dispose()
    } catch (error) {
      if (this.options.onFileUpload) {
        this._setProgress(true, '上传失败，请重试', 0)
      }
      this._setSubmitting(false)
      console.error(error)
    }
  }

  private _exportCroppedFile(item: IImageItem): Promise<File> {
    return new Promise((resolve, reject) => {
      const { crop } = item
      const canvas = document.createElement('canvas')
      const width = Math.max(1, Math.round(crop.width))
      const height = Math.max(1, Math.round(crop.height))
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext('2d')
      if (!ctx) {
        reject(new Error('canvas context unavailable'))
        return
      }
      const img = new Image()
      img.onload = () => {
        ctx.drawImage(
          img,
          crop.x,
          crop.y,
          crop.width,
          crop.height,
          0,
          0,
          width,
          height
        )
        canvas.toBlob(
          blob => {
            if (!blob) {
              reject(new Error('image crop failed'))
              return
            }
            const name = this._buildCroppedName(item.file.name)
            resolve(new File([blob], name, { type: 'image/png' }))
          },
          'image/png'
        )
      }
      img.onerror = () => reject(new Error('image load failed'))
      img.src = item.url
    })
  }

  private _buildCroppedName(name: string) {
    const idx = name.lastIndexOf('.')
    if (!~idx) return `${name}.png`
    return `${name.slice(0, idx)}.png`
  }

  private _fileToDataURL(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = () => reject(reader.error)
      reader.readAsDataURL(file)
    })
  }

  private _dispose() {
    if (this.disposed) return
    this.disposed = true
    this.disposeList.forEach(fn => fn())
    this.items.forEach(item => URL.revokeObjectURL(item.url))
    this.items = []
    this.mask.remove()
    this.container.remove()
    document.documentElement.classList.remove('overflow-hidden')
    document.body.classList.remove('overflow-hidden')
  }
}
