import { IElement } from '../../../interface/Element'
import { Draw } from '../../draw/Draw'

/** 根据鼠标位置解析命中元素（含表格内） */
export function getHitElementByEvent(
  draw: Draw,
  evt: MouseEvent
): IElement | undefined {
  const target = evt.target as HTMLDivElement
  const pageIndex = target.dataset.index
  if (pageIndex) {
    draw.setPageNo(Number(pageIndex))
  }
  const position = draw.getPosition()
  const positionResult = position.getPositionByXY({
    x: evt.offsetX,
    y: evt.offsetY
  })
  if (!~positionResult.index) return undefined
  const elementList = draw.getOriginalElementList()
  if (positionResult.isTable && positionResult.tdValueIndex !== undefined) {
    const td = position.getTableTdByContext(elementList, {
      ...positionResult,
      isTable: true
    })
    return td?.value[positionResult.tdValueIndex]
  }
  return elementList[positionResult.index]
}

/** 非设计模式下，元素是否禁止获取焦点/编辑 */
export function isElementFocusDisabled(
  element: IElement | undefined,
  draw: Draw
): boolean {
  return !!(element?.disabled && !draw.isDesignMode())
}

/** 更新画布悬停光标：禁用元素为 not-allowed */
export function updateDisabledHoverCursor(draw: Draw, evt: MouseEvent) {
  const target = evt.target as HTMLElement
  if (!target?.style) return
  // 格式刷模式保持 copy 光标
  if (draw.getPainterStyle()) return
  const element = getHitElementByEvent(draw, evt)
  target.style.cursor = isElementFocusDisabled(element, draw)
    ? 'not-allowed'
    : 'text'
}
