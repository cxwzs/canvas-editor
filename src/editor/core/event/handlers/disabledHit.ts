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
 * 默认不跨 area 边界。
 */
export function getSkipFocusDisabledIndex(
  elementList: IElement[],
  index: number,
  direction: 1 | -1,
  draw: Draw,
  options?: { allowCrossArea?: boolean }
): number {
  const allowCrossArea = options?.allowCrossArea ?? false
  const boundaryAreaId = elementList[index]?.areaId
  let i = index
  if (direction === 1) {
    while (i < elementList.length && isElementFocusDisabled(elementList[i], draw)) {
      if (
        !allowCrossArea &&
        elementList[i].areaId !== boundaryAreaId
      ) {
        break
      }
      i++
    }
    // 光标落在跳过段最后一个字符之后（即下一个可编辑元素之前）
    return i > index ? i - 1 : index
  }
  while (i >= 0 && isElementFocusDisabled(elementList[i], draw)) {
    if (
      !allowCrossArea &&
      elementList[i].areaId !== boundaryAreaId
    ) {
      break
    }
    i--
  }
  return i
}

/** 是否为区域正文占位换行（标题尾换行后的可编辑空行） */
export function isAreaBodyPlaceholderBreak(
  elementList: IElement[],
  index: number
): boolean {
  const cur = elementList[index]
  const prev = elementList[index - 1]
  return !!(
    cur?.value === ZERO &&
    !cur.title?.disabled &&
    cur.areaId &&
    prev?.value === ZERO &&
    prev.title?.disabled &&
    prev.areaId === cur.areaId
  )
}

/**
 * 是否为区域标题与正文交界的禁用尾换行。
 * 光标可落在此处（段首、首字符之前），但不可编辑/删除该换行本身。
 */
export function isAreaTitleBodyBoundaryBreak(
  elementList: IElement[],
  index: number
): boolean {
  const cur = elementList[index]
  const next = elementList[index + 1]
  return !!(
    cur?.value === ZERO &&
    cur.title?.disabled &&
    cur.areaId &&
    next &&
    next.areaId === cur.areaId &&
    !next.title?.disabled
  )
}

/** 区域元素是否可编辑（非只读） */
export function isEditableAreaElement(
  element: IElement | undefined
): boolean {
  return !!element?.areaId && element.area?.mode !== AreaMode.READONLY
}

/**
 * 焦点禁用元素是否仍允许作为光标锚点（不跳过）。
 * 仅可编辑 area 的标题→正文交界换行可作为段首锚点；只读区域整段跳过。
 */
export function isFocusDisabledCursorHost(
  elementList: IElement[],
  index: number
): boolean {
  return (
    isAreaTitleBodyBoundaryBreak(elementList, index) &&
    isEditableAreaElement(elementList[index])
  )
}

/**
 * 获取 area 内可落点光标索引。
 * start：正文段首（标题交界换行优先）；end：正文末尾。
 */
export function getEditableAreaCaretIndex(
  elementList: IElement[],
  areaIndex: number,
  edge: 'start' | 'end',
  draw: Draw
): number | null {
  const areaId = elementList[areaIndex]?.areaId
  if (!areaId || !isEditableAreaElement(elementList[areaIndex])) {
    return null
  }
  let start = areaIndex
  while (start > 0 && elementList[start - 1]?.areaId === areaId) {
    start--
  }
  let end = areaIndex
  while (
    end < elementList.length - 1 &&
    elementList[end + 1]?.areaId === areaId
  ) {
    end++
  }
  if (edge === 'start') {
    for (let i = start; i <= end; i++) {
      if (isFocusDisabledCursorHost(elementList, i)) return i
      if (!isElementFocusDisabled(elementList[i], draw)) {
        return i > start ? i - 1 : i
      }
    }
    return null
  }
  for (let i = end; i >= start; i--) {
    if (
      !isElementFocusDisabled(elementList[i], draw) ||
      isFocusDisabledCursorHost(elementList, i)
    ) {
      return i
    }
  }
  return null
}

/**
 * 从 fromIndex 按方向寻找相邻可编辑 area 的落点光标（跳过只读区域）。
 */
export function getAdjacentEditableAreaCaretIndex(
  elementList: IElement[],
  fromIndex: number,
  direction: 1 | -1,
  draw: Draw
): number | null {
  if (fromIndex < 0 || fromIndex >= elementList.length) return null
  const fromAreaId = elementList[fromIndex]?.areaId
  let i = fromIndex + direction
  // 先离开当前 area
  while (
    i >= 0 &&
    i < elementList.length &&
    elementList[i]?.areaId &&
    elementList[i].areaId === fromAreaId
  ) {
    i += direction
  }
  while (i >= 0 && i < elementList.length) {
    const el = elementList[i]
    if (!el.areaId) {
      if (!isElementFocusDisabled(el, draw)) return i
      i += direction
      continue
    }
    if (!isEditableAreaElement(el)) {
      const skipId = el.areaId
      while (
        i >= 0 &&
        i < elementList.length &&
        elementList[i]?.areaId === skipId
      ) {
        i += direction
      }
      continue
    }
    const caret = getEditableAreaCaretIndex(
      elementList,
      i,
      direction === 1 ? 'start' : 'end',
      draw
    )
    if (caret !== null) return caret
    const skipId = el.areaId
    while (
      i >= 0 &&
      i < elementList.length &&
      elementList[i]?.areaId === skipId
    ) {
      i += direction
    }
  }
  return null
}

/**
 * 箭头键落点修正：跨区域时衔接到可编辑正文；跳过只读区域。
 * @param options.rawIndex 跳过禁用元素前的原始落点（用于区分上移命中标题 vs 左移到段首）
 * @param options.isVertical 上下键：从正文上移到同 area 标题时离开当前 area
 */
export function resolveArrowAreaLandingIndex(
  elementList: IElement[],
  fromIndex: number,
  landingIndex: number,
  direction: 1 | -1,
  draw: Draw,
  options?: { rawIndex?: number; isVertical?: boolean }
): number {
  let index = landingIndex
  if (index < 0) index = 0
  if (index >= elementList.length) index = elementList.length - 1
  if (index < 0) return landingIndex

  const fromEl = elementList[fromIndex]
  const landEl = elementList[index]
  const fromAreaId = fromEl?.areaId
  const landAreaId = landEl?.areaId
  const rawIndex = options?.rawIndex
  const rawEl = rawIndex !== undefined ? elementList[rawIndex] : undefined

  // 上移时原始落点落在同 area 标题上：离开当前 area，衔接到上一可编辑正文
  const leaveCurrentAreaTitle =
    !!options?.isVertical &&
    direction === -1 &&
    !!fromAreaId &&
    !fromEl?.title?.disabled &&
    !!rawEl?.title?.disabled &&
    rawEl.areaId === fromAreaId

  if (leaveCurrentAreaTitle) {
    const adjacent = getAdjacentEditableAreaCaretIndex(
      elementList,
      fromIndex,
      direction,
      draw
    )
    if (adjacent !== null) return adjacent
  }

  const isValidLanding =
    !!landEl &&
    (!isElementFocusDisabled(landEl, draw) ||
      isFocusDisabledCursorHost(elementList, index)) &&
    landEl.area?.mode !== AreaMode.READONLY

  // 可编辑正文（非标题）：保持落点（含上下行 X 对齐）
  if (isValidLanding && !landEl.title?.disabled) {
    return index
  }

  // 同 area 段首锚点（如左移到首字符前）：保留
  if (
    isFocusDisabledCursorHost(elementList, index) &&
    landAreaId === fromAreaId
  ) {
    return index
  }

  // 跨入可编辑 area：衔接到正文段首/段末
  if (
    landAreaId &&
    landAreaId !== fromAreaId &&
    isEditableAreaElement(landEl)
  ) {
    const caret = getEditableAreaCaretIndex(
      elementList,
      index,
      direction === 1 ? 'start' : 'end',
      draw
    )
    if (caret !== null) return caret
  }

  // 只读或仍不可落点：跳到相邻可编辑 area
  if (
    !isValidLanding ||
    landEl?.area?.mode === AreaMode.READONLY ||
    fromAreaId !== landAreaId
  ) {
    const adjacent = getAdjacentEditableAreaCaretIndex(
      elementList,
      fromIndex,
      direction,
      draw
    )
    if (adjacent !== null) return adjacent
  }

  return index
}

/** 更新画布悬停光标：禁用元素为 not-allowed */
export function updateDisabledHoverCursor(draw: Draw, evt: MouseEvent) {
  const target = evt.target as HTMLElement
  if (!target?.style) return
  // 格式刷模式保持 copy 光标
  if (draw.getPainterStyle()) return
  const element = getHitElementByEvent(draw, evt)
  if (
    element?.value === ZERO &&
    element.title?.disabled &&
    element.areaId
  ) {
    // 标题尾换行：正文交界 / 正文占位 / 空 area 时显示文本光标
    const elementList = draw.getElementList()
    const index = elementList.indexOf(element)
    if (~index) {
      const next = elementList[index + 1]
      if (
        !next ||
        next.areaId !== element.areaId ||
        (isAreaTitleBodyBoundaryBreak(elementList, index) &&
          isEditableAreaElement(element))
      ) {
        target.style.cursor = 'text'
        return
      }
    }
  }
  target.style.cursor = isElementFocusDisabled(element, draw)
    ? 'not-allowed'
    : 'text'
}
