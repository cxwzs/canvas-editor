import { IElement } from '../../..'
import { EDITOR_PREFIX } from '../../../dataset/constant/Editor'
import { IEditorOption } from '../../../interface/Editor'
import { IElementPosition } from '../../../interface/Element'
import { IRowElement } from '../../../interface/Row'
import {
  getAnchorTitleId,
  isAnchorHyperlink,
  locationCatalogByTitleId
} from '../../../utils/catalog'
import { Draw } from '../Draw'

export class HyperlinkParticle {
  private draw: Draw
  private options: Required<IEditorOption>
  private container: HTMLDivElement
  private hyperlinkPopupContainer: HTMLDivElement
  private hyperlinkDom: HTMLAnchorElement

  constructor(draw: Draw) {
    this.draw = draw
    this.options = draw.getOptions()
    this.container = draw.getContainer()
    const { hyperlinkPopupContainer, hyperlinkDom } =
      this._createHyperlinkPopupDom()
    this.hyperlinkDom = hyperlinkDom
    this.hyperlinkPopupContainer = hyperlinkPopupContainer
  }

  private _createHyperlinkPopupDom() {
    const hyperlinkPopupContainer = document.createElement('div')
    hyperlinkPopupContainer.classList.add(`${EDITOR_PREFIX}-hyperlink-popup`)
    const hyperlinkDom = document.createElement('a')
    hyperlinkDom.target = '_blank'
    hyperlinkDom.rel = 'noopener'
    hyperlinkDom.onclick = evt => {
      const url = hyperlinkDom.getAttribute('href') || ''
      if (isAnchorHyperlink(url)) {
        evt.preventDefault()
        locationCatalogByTitleId(this.draw, getAnchorTitleId(url))
        this.clearHyperlinkPopup()
      }
    }
    hyperlinkPopupContainer.append(hyperlinkDom)
    this.container.append(hyperlinkPopupContainer)
    return { hyperlinkPopupContainer, hyperlinkDom }
  }

  public drawHyperlinkPopup(element: IElement, position: IElementPosition) {
    const {
      coordinate: {
        leftTop: [left, top]
      },
      lineHeight
    } = position
    const { x: preX, y: preY } = this.draw.getPageOffset(this.draw.getPageNo())
    // 位置
    this.hyperlinkPopupContainer.style.display = 'block'
    this.hyperlinkPopupContainer.style.left = `${left + preX}px`
    this.hyperlinkPopupContainer.style.top = `${top + preY + lineHeight}px`
    // 标签
    const url = element.url || '#'
    this.hyperlinkDom.href = url
    this.hyperlinkDom.title = url
    this.hyperlinkDom.innerText = url
    // 交叉引用锚点不新开页签
    if (isAnchorHyperlink(url)) {
      this.hyperlinkDom.removeAttribute('target')
    } else {
      this.hyperlinkDom.target = '_blank'
    }
  }

  public clearHyperlinkPopup() {
    this.hyperlinkPopupContainer.style.display = 'none'
  }

  public openHyperlink(element: IElement) {
    const url = element.url || ''
    // 交叉引用：#titleId → 定位到对应目录标题，不影响普通超链接
    if (isAnchorHyperlink(url)) {
      locationCatalogByTitleId(this.draw, getAnchorTitleId(url))
      return
    }
    const newTab = window.open(url, '_blank')
    if (newTab) {
      newTab.opener = null
    }
  }

  public render(
    ctx: CanvasRenderingContext2D,
    element: IRowElement,
    x: number,
    y: number
  ) {
    ctx.save()
    ctx.font = element.style
    if (!element.color) {
      element.color = this.options.defaultHyperlinkColor
    }
    ctx.fillStyle = element.color
    if (element.underline === undefined) {
      element.underline = true
    }
    ctx.fillText(element.value, x, y)
    ctx.restore()
  }
}
