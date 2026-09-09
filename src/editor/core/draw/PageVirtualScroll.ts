import { Draw } from './Draw'

export const PAGE_VIRTUAL_WINDOW_SIZE = 3

export class PageVirtualScroll {
  private draw: Draw
  private windowPageNos: number[] = []
  private materialized = false
  private structureActive = false

  constructor(draw: Draw) {
    this.draw = draw
  }

  public isEnabled(): boolean {
    return (
      !this.materialized &&
      this.draw.getIsPagingMode() &&
      !!this.draw.getOptions().pageVirtualScroll
    )
  }

  public isStructureActive(): boolean {
    return this.structureActive
  }

  public getTotalHeight(): number {
    const pageCount = this.draw.getPageRowList().length
    if (!pageCount) return 0
    const lastPageNo = pageCount - 1
    const { y } = this.draw.getPageOffset(lastPageNo)
    const { height } = this.draw.getPageSize(lastPageNo)
    return y + height + this.draw.getPageGap()
  }

  public getWindow(centerPageNo: number, pageCount: number): number[] {
    if (pageCount <= 0) return []
    if (pageCount <= PAGE_VIRTUAL_WINDOW_SIZE) {
      return Array.from({ length: pageCount }, (_, i) => i)
    }
    const start = Math.max(
      0,
      Math.min(centerPageNo - 1, pageCount - PAGE_VIRTUAL_WINDOW_SIZE)
    )
    const end = Math.min(pageCount - 1, start + PAGE_VIRTUAL_WINDOW_SIZE - 1)
    const pageNos: number[] = []
    for (let i = start; i <= end; i++) {
      pageNos.push(i)
    }
    return pageNos
  }

  public syncStructure() {
    const pageCount = Math.max(this.draw.getPageRowList().length, 1)
    const slotCount = Math.min(PAGE_VIRTUAL_WINDOW_SIZE, pageCount)
    const pageList = this.draw.getPageList()
    const ctxList = this.draw.getCtxList()
    while (pageList.length < slotCount) {
      this.draw.createPage(pageList.length)
    }
    if (pageList.length > slotCount) {
      const deleteCount = pageList.length - slotCount
      ctxList.splice(slotCount, deleteCount)
      pageList.splice(slotCount, deleteCount).forEach(page => page.remove())
    }
    const pageContainer = this.draw.getPageContainer()
    pageContainer.style.position = 'relative'
    pageContainer.style.height = `${this.getTotalHeight()}px`
    pageList.forEach(canvas => {
      canvas.style.position = 'absolute'
      canvas.style.marginLeft = '0'
      canvas.style.marginRight = '0'
      canvas.style.marginBottom = '0'
    })
    this.structureActive = true
  }

  public disableStructure() {
    if (!this.structureActive && !this.materialized) return
    const pageContainer = this.draw.getPageContainer()
    pageContainer.style.height = ''
    pageContainer.style.position = ''
    const pageGap = this.draw.getPageGap()
    this.draw.getPageList().forEach(canvas => {
      canvas.style.position = ''
      canvas.style.top = ''
      canvas.style.left = ''
      canvas.style.marginLeft = 'auto'
      canvas.style.marginRight = 'auto'
      canvas.style.marginBottom = `${pageGap}px`
    })
    this.structureActive = false
    this.materialized = false
    this.windowPageNos = []
  }

  public applyWindow(centerPageNo: number, forceDraw = false) {
    if (!this.isEnabled()) return
    this.syncStructure()
    const pageCount = this.draw.getPageRowList().length
    if (!pageCount) return
    const pageNos = this.getWindow(centerPageNo, pageCount)
    const isSameWindow =
      pageNos.length === this.windowPageNos.length &&
      pageNos.every((pageNo, index) => pageNo === this.windowPageNos[index])
    this.windowPageNos = pageNos
    const pageList = this.draw.getPageList()
    const dpr = this.draw.getPagePixelRatio()
    pageNos.forEach((pageNo, slotIndex) => {
      const canvas = pageList[slotIndex]
      if (!canvas) return
      const { width, height } = this.draw.getPageSize(pageNo)
      const { x, y } = this.draw.getPageOffset(pageNo)
      canvas.setAttribute('data-index', String(pageNo))
      canvas.style.top = `${y}px`
      canvas.style.left = `${x}px`
      canvas.style.width = `${width}px`
      canvas.style.height = `${height}px`
      const pixelWidth = Math.floor(width * dpr)
      const pixelHeight = Math.floor(height * dpr)
      if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
        canvas.width = pixelWidth
        canvas.height = pixelHeight
        this.draw.initPageContext(this.draw.getCtxList()[slotIndex])
      }
      if (!isSameWindow || forceDraw) {
        this.draw.drawLogicalPage(pageNo)
      }
    })
  }

  public updateFromScroll() {
    if (!this.isEnabled()) return
    const { intersectionPageNo } = this.draw
      .getScrollObserver()
      .getPageVisibleInfo()
    this.applyWindow(intersectionPageNo, false)
  }

  public updateContainerHeight() {
    if (!this.isEnabled() && !this.materialized) return
    this.draw.getPageContainer().style.height = `${this.getTotalHeight()}px`
  }

  public materializeAll() {
    if (!this.draw.getIsPagingMode() || !this.draw.getOptions().pageVirtualScroll) {
      return
    }
    this.materialized = true
    const pageCount = this.draw.getPageRowList().length
    const pageList = this.draw.getPageList()
    const ctxList = this.draw.getCtxList()
    while (pageList.length < pageCount) {
      this.draw.createPage(pageList.length)
    }
    if (pageList.length > pageCount) {
      const deleteCount = pageList.length - pageCount
      ctxList.splice(pageCount, deleteCount)
      pageList.splice(pageCount, deleteCount).forEach(page => page.remove())
    }
    const pageContainer = this.draw.getPageContainer()
    pageContainer.style.position = 'relative'
    pageContainer.style.height = `${this.getTotalHeight()}px`
    const dpr = this.draw.getPagePixelRatio()
    pageList.forEach((canvas, pageNo) => {
      const { width, height } = this.draw.getPageSize(pageNo)
      const { x, y } = this.draw.getPageOffset(pageNo)
      canvas.setAttribute('data-index', String(pageNo))
      canvas.style.position = 'absolute'
      canvas.style.top = `${y}px`
      canvas.style.left = `${x}px`
      canvas.style.marginLeft = '0'
      canvas.style.marginRight = '0'
      canvas.style.marginBottom = '0'
      canvas.style.width = `${width}px`
      canvas.style.height = `${height}px`
      const pixelWidth = Math.floor(width * dpr)
      const pixelHeight = Math.floor(height * dpr)
      if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
        canvas.width = pixelWidth
        canvas.height = pixelHeight
        this.draw.initPageContext(ctxList[pageNo])
      }
    })
    this.windowPageNos = Array.from({ length: pageCount }, (_, i) => i)
    this.structureActive = true
  }

  public releaseMaterialize(centerPageNo?: number) {
    if (!this.materialized) return
    this.materialized = false
    this.syncStructure()
    this.applyWindow(
      centerPageNo ?? this.draw.getIntersectionPageNo(),
      true
    )
  }

  public getWindowPageNos(): number[] {
    return this.windowPageNos
  }

  public getSlotIndexByPageNo(pageNo: number): number {
    return this.draw
      .getPageList()
      .findIndex(page => Number(page.dataset.index) === pageNo)
  }
}
