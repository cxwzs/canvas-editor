import { IEditorOption } from '../../interface/Editor'
import { debounce } from '../../utils'
import { Draw } from '../draw/Draw'

export interface IElementVisibleInfo {
  intersectionHeight: number
}

export interface IPageVisibleInfo {
  intersectionPageNo: number
  visiblePageNoList: number[]
}

export class ScrollObserver {
  private draw: Draw
  private options: Required<IEditorOption>
  private scrollContainer: Element | Document
  private rafId: number | null

  constructor(draw: Draw) {
    this.draw = draw
    this.options = draw.getOptions()
    this.scrollContainer = this.getScrollContainer()
    this.rafId = null
    // 监听滚轮
    setTimeout(() => {
      if (!window.scrollY) {
        this._observer()
      }
    })
    this._addEvent()
  }

  public getScrollContainer(): Element | Document {
    return this.options.scrollContainerSelector
      ? document.querySelector(this.options.scrollContainerSelector) || document
      : document
  }

  private _addEvent() {
    this.scrollContainer.addEventListener('scroll', this._observer)
  }

  public removeEvent() {
    this.scrollContainer.removeEventListener('scroll', this._observer)
    if (this.rafId !== null) {
      window.cancelAnimationFrame(this.rafId)
      this.rafId = null
    }
  }

  public getElementVisibleInfo(element: Element): IElementVisibleInfo {
    const rect = element.getBoundingClientRect()
    const viewHeight =
      this.scrollContainer === document
        ? Math.max(document.documentElement.clientHeight, window.innerHeight)
        : (<Element>this.scrollContainer).clientHeight
    const visibleHeight =
      Math.min(rect.bottom, viewHeight) - Math.max(rect.top, 0)
    return {
      intersectionHeight: visibleHeight > 0 ? visibleHeight : 0
    }
  }

  private _getViewportRange(): { viewTop: number; viewBottom: number } {
    if (this.scrollContainer === document) {
      return {
        viewTop: 0,
        viewBottom: Math.max(
          document.documentElement.clientHeight,
          window.innerHeight
        )
      }
    }
    const rect = (<Element>this.scrollContainer).getBoundingClientRect()
    return {
      viewTop: rect.top,
      viewBottom: rect.bottom
    }
  }

  /**
   * 虚拟滚动：按页面布局偏移计算可视页，不依赖已挂载 canvas
   */
  public getVirtualPageVisibleInfo(): IPageVisibleInfo {
    const pageCount = this.draw.getPageCount()
    const visiblePageNoList: number[] = []
    let intersectionPageNo = 0
    let intersectionMaxHeight = 0
    if (!pageCount) {
      return { intersectionPageNo, visiblePageNoList }
    }
    const { viewTop, viewBottom } = this._getViewportRange()
    const containerTop = this.draw.getContainer().getBoundingClientRect().top
    for (let i = 0; i < pageCount; i++) {
      const { y } = this.draw.getPageOffset(i)
      const height = this.draw.getHeight(this.draw.getPageDirection(i))
      const pageTop = containerTop + y
      const pageBottom = pageTop + height
      if (pageTop > viewBottom && intersectionMaxHeight) break
      const intersectionHeight =
        Math.min(pageBottom, viewBottom) - Math.max(pageTop, viewTop)
      const visibleHeight = intersectionHeight > 0 ? intersectionHeight : 0
      if (visibleHeight) {
        visiblePageNoList.push(i)
      }
      if (visibleHeight > intersectionMaxHeight) {
        intersectionMaxHeight = visibleHeight
        intersectionPageNo = i
      }
    }
    return {
      intersectionPageNo,
      visiblePageNoList
    }
  }

  public getPageVisibleInfo(): IPageVisibleInfo {
    // 分页虚拟滚动按布局偏移计算，避免仅 3 页 canvas 导致可视页判断失真
    if (this.draw.getIsVirtualPageMode()) {
      return this.getVirtualPageVisibleInfo()
    }
    const pageList = this.draw.getPageList()
    const visiblePageNoList: number[] = []
    let intersectionPageNo = 0
    let intersectionMaxHeight = 0
    for (let i = 0; i < pageList.length; i++) {
      const curPage = pageList[i]
      const pageNo = Number(curPage.dataset.index)
      const logicalPageNo = Number.isNaN(pageNo) ? i : pageNo
      const { intersectionHeight } = this.getElementVisibleInfo(curPage)
      // 之前页存在交叉 && 当前页不交叉则后续均不交叉，结束循环
      if (intersectionMaxHeight && !intersectionHeight) break
      if (intersectionHeight) {
        visiblePageNoList.push(logicalPageNo)
      }
      if (intersectionHeight > intersectionMaxHeight) {
        intersectionMaxHeight = intersectionHeight
        intersectionPageNo = logicalPageNo
      }
    }
    return {
      intersectionPageNo,
      visiblePageNoList
    }
  }

  private _emitVisibleChange = debounce((info: IPageVisibleInfo) => {
    this.draw.setIntersectionPageNo(info.intersectionPageNo)
    this.draw.setVisiblePageNoList(info.visiblePageNoList)
  }, 150)

  private _observer = () => {
    if (this.rafId !== null) {
      window.cancelAnimationFrame(this.rafId)
    }
    this.rafId = window.requestAnimationFrame(() => {
      this.rafId = null
      const info = this.getPageVisibleInfo()
      // 虚拟页窗口需即时同步，避免滚动空白
      if (this.draw.getIsVirtualPageMode()) {
        this.draw.syncVirtualPages(info.intersectionPageNo, {
          isDraw: true
        })
      }
      this._emitVisibleChange(info)
    })
  }
}
