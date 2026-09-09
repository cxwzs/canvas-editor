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
  private rafId: number | null = null

  constructor(draw: Draw) {
    this.draw = draw
    this.options = draw.getOptions()
    this.scrollContainer = this.getScrollContainer()
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
    this.scrollContainer.addEventListener('scroll', this._handleScroll)
  }

  public removeEvent() {
    this.scrollContainer.removeEventListener('scroll', this._handleScroll)
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId)
      this.rafId = null
    }
  }

  public getElementVisibleInfo(element: Element): IElementVisibleInfo {
    const rect = element.getBoundingClientRect()
    const viewHeight = this.getViewHeight()
    const visibleHeight =
      Math.min(rect.bottom, viewHeight) - Math.max(rect.top, 0)
    return {
      intersectionHeight: visibleHeight > 0 ? visibleHeight : 0
    }
  }

  private getViewHeight(): number {
    return this.scrollContainer === document
      ? Math.max(document.documentElement.clientHeight, window.innerHeight)
      : (<Element>this.scrollContainer).clientHeight
  }

  private getViewTop(): number {
    return this.scrollContainer === document
      ? 0
      : (<Element>this.scrollContainer).getBoundingClientRect().top
  }

  public getPageVisibleInfo(): IPageVisibleInfo {
    if (this.draw.getPageVirtualScroll().isEnabled()) {
      return this.getVirtualPageVisibleInfo()
    }
    const pageList = this.draw.getPageList()
    const visiblePageNoList: number[] = []
    let intersectionPageNo = 0
    let intersectionMaxHeight = 0
    for (let i = 0; i < pageList.length; i++) {
      const curPage = pageList[i]
      const { intersectionHeight } = this.getElementVisibleInfo(curPage)
      // 之前页存在交叉 && 当前页不交叉则后续均不交叉，结束循环
      if (intersectionMaxHeight && !intersectionHeight) break
      if (intersectionHeight) {
        // 虚拟关闭时 pageList 下标即逻辑页号
        visiblePageNoList.push(Number(curPage.dataset.index) || i)
      }
      if (intersectionHeight > intersectionMaxHeight) {
        intersectionMaxHeight = intersectionHeight
        intersectionPageNo = Number(curPage.dataset.index) || i
      }
    }
    return {
      intersectionPageNo,
      visiblePageNoList
    }
  }

  private getVirtualPageVisibleInfo(): IPageVisibleInfo {
    const pageCount = this.draw.getPageCount()
    const pageContainer = this.draw.getPageContainer()
    const containerRect = pageContainer.getBoundingClientRect()
    const viewTop = this.getViewTop()
    const viewBottom = viewTop + this.getViewHeight()
    const visiblePageNoList: number[] = []
    let intersectionPageNo = 0
    let intersectionMaxHeight = 0
    for (let i = 0; i < pageCount; i++) {
      const { y } = this.draw.getPageOffset(i)
      const { height } = this.draw.getPageSize(i)
      const pageTop = containerRect.top + y
      const pageBottom = pageTop + height
      const visibleHeight =
        Math.min(pageBottom, viewBottom) - Math.max(pageTop, viewTop)
      const intersectionHeight = visibleHeight > 0 ? visibleHeight : 0
      if (intersectionMaxHeight && !intersectionHeight) break
      if (intersectionHeight) {
        visiblePageNoList.push(i)
      }
      if (intersectionHeight > intersectionMaxHeight) {
        intersectionMaxHeight = intersectionHeight
        intersectionPageNo = i
      }
    }
    return {
      intersectionPageNo,
      visiblePageNoList
    }
  }

  private _handleScroll = () => {
    if (this.draw.getPageVirtualScroll().isEnabled()) {
      if (this.rafId === null) {
        this.rafId = requestAnimationFrame(() => {
          this.rafId = null
          this.draw.getPageVirtualScroll().updateFromScroll()
        })
      }
    }
    this._observer()
  }

  private _observer = debounce(() => {
    const { intersectionPageNo, visiblePageNoList } = this.getPageVisibleInfo()
    this.draw.setIntersectionPageNo(intersectionPageNo)
    this.draw.setVisiblePageNoList(visiblePageNoList)
  }, 150)
}
