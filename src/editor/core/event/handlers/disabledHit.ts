import { AreaMode } from '../../../dataset/enum/Area'
import { ZERO } from '../../../dataset/constant/Common'
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
  if (!element || draw.isDesignMode()) return false
  if (element.disabled || element.title?.disabled) return true
  return element.area?.mode === AreaMode.READONLY
}

/**
 * 删除该换行是否会导致正文与禁用标题并排同一行。
 * 场景：光标在标题后的段首，Backspace/Delete 试图删掉标题与正文之间的换行。
 */
export function isDisabledTitleLineMerge(
  elementList: IElement[],
  lineBreakIndex: number,
  draw: Draw
): boolean {
  if (draw.isDesignMode()) return false
  const lineBreak = elementList[lineBreakIndex]
  if (!lineBreak || lineBreak.value !== ZERO) return false
  // 换行本身属于禁用标题：由焦点禁用逻辑处理
  if (isElementFocusDisabled(lineBreak, draw)) return false
  const prev = elementList[lineBreakIndex - 1]
  const next = elementList[lineBreakIndex + 1]
  // 前一个是禁用标题，后一个不是同一标题 → 删掉此换行会并排
  return !!(
    prev?.title?.disabled &&
    prev.titleId &&
    (!next || next.titleId !== prev.titleId)
  )
}

/**
 * 按方向跳过禁用元素，返回可落点索引。
 * Delete：向后跳过；Backspace：向前跳过。
 */
export function getSkipFocusDisabledIndex(
  elementList: IElement[],
  index: number,
  direction: 1 | -1,
  draw: Draw
): number {
  let i = index
  if (direction === 1) {
    while (i < elementList.length && isElementFocusDisabled(elementList[i], draw)) {
      i++
    }
    // 光标落在跳过段最后一个字符之后（即下一个可编辑元素之前）
    return i > index ? i - 1 : index
  }
  while (i >= 0 && isElementFocusDisabled(elementList[i], draw)) {
    i--
  }
  return i
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
