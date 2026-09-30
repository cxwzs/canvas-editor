import { ZERO } from '../dataset/constant/Common'
import { TEXT_INDENT_STEP } from '../dataset/constant/Element'
import { AreaMode } from '../dataset/enum/Area'
import { ElementType } from '../dataset/enum/Element'
import { QuickFormatAction } from '../dataset/enum/QuickFormat'
import { IElement } from '../interface/Element'
import { isTextLikeElement } from './element'

/** 首行缩进用的全角空格 */
export const INDENT_SPACE_CHAR = '\u3000'

/**
 * 是否为标题元素（H 标签 / data-title 等，含 titleId、level）
 */
export function isTitleElement(element: IElement | undefined): boolean {
  if (!element) return false
  if (element.type === ElementType.TITLE) return true
  if (element.level != null) return true
  if (element.titleId) return true
  if (element.title) return true
  return false
}

/**
 * 快速格式类操作应跳过：标题、图片、只读 area、disabled 元素
 * （仅正文受影响）
 */
export function isFormatProtectedElement(
  element: IElement | undefined
): boolean {
  if (!element) return false
  if (element.type === ElementType.IMAGE) return true
  if (isTitleElement(element)) return true
  if (element.disabled === true) return true
  if (element.area?.mode === AreaMode.READONLY) return true
  return false
}

/**
 * 段落是否受保护。
 * 以段内首个有效内容为准，避免「标题→正文」交界 ZERO（自身带 titleId）
 * 把紧邻正文段误判为受保护。
 */
function isParagraphProtected(
  elementList: IElement[],
  paraStart: number
): boolean {
  const paraStartEl = elementList[paraStart]
  if (paraStartEl?.disabled === true) return true
  if (paraStartEl?.area?.mode === AreaMode.READONLY) return true

  const contentEnd = paragraphContentEnd(
    elementList,
    paraStart,
    elementList.length
  )
  for (let i = paraStart + 1; i < contentEnd; i++) {
    const el = elementList[i]
    if (isSpaceElement(el)) continue
    return isFormatProtectedElement(el)
  }
  // 空段：标题交界换行不可删/改
  return isTitleElement(paraStartEl)
}

/** 段内元素是否可改；段首 ZERO 即使带标题交界属性也允许随正文段处理 */
function canMutateParagraphElement(
  element: IElement,
  isParaStart: boolean
): boolean {
  if (isParaStart) return true
  return !isFormatProtectedElement(element)
}

const MANUAL_NUMBER_PATTERNS: RegExp[] = [
  // 多级编号：1.1 / 1.1.1 / 1.1.1. 等（需优先于单级匹配）
  /^[0-9]+(?:[\.．][0-9]+)+(?:[\.．、\)）])?\s*/,
  /^[0-9]+[\.．、\)）]\s*/,
  /^[（(][0-9]+[）)]\s*/,
  /^[一二三四五六七八九十百千零〇两]+[\.．、\)）]\s*/,
  /^[（(][一二三四五六七八九十百千零〇两]+[）)]\s*/,
  /^[A-Za-z][\.．、\)）]\s*/,
  /^[（(][A-Za-z][）)]\s*/,
  /^[①②③④⑤⑥⑦⑧⑨⑩⑪⑫⑬⑭⑮⑯⑰⑱⑲⑳]\s*/
]

export function isSpaceChar(value: string): boolean {
  return (
    value === ' ' ||
    value === '\u00a0' ||
    value === '\u3000' ||
    value === '\t'
  )
}

export function isSpaceElement(element: IElement): boolean {
  if (element.type === ElementType.TAB) return true
  if (element.value === ZERO) return false
  if (!isTextLikeElement(element)) return false
  return typeof element.value === 'string' && isSpaceChar(element.value)
}

/** 段落起始 ZERO（非 listWrap） */
export function isParagraphBreak(element: IElement | undefined): boolean {
  return !!element && element.value === ZERO && !element.listWrap
}

/**
 * 收集 [start, end) 内段落起始下标（ZERO 位置）
 */
export function collectParagraphStarts(
  elementList: IElement[],
  start = 0,
  end = elementList.length
): number[] {
  const starts: number[] = []
  const from = Math.max(0, start)
  const to = Math.min(end, elementList.length)
  for (let i = from; i < to; i++) {
    if (isParagraphBreak(elementList[i])) {
      starts.push(i)
    }
  }
  return starts
}

function copyContextAttrs(source: IElement): Partial<IElement> {
  const attrs: Partial<IElement> = {}
  if (source.tableId) attrs.tableId = source.tableId
  if (source.trId) attrs.trId = source.trId
  if (source.tdId) attrs.tdId = source.tdId
  if (source.areaId) attrs.areaId = source.areaId
  if (source.area) attrs.area = source.area
  if (source.listId) {
    attrs.listId = source.listId
    attrs.listType = source.listType
    attrs.listStyle = source.listStyle
    attrs.listLevel = source.listLevel
  }
  // 不继承标题属性，避免正文缩进空格被标成标题
  return attrs
}

function createIndentSpaceElements(anchor: IElement, count: number): IElement[] {
  const ctx = copyContextAttrs(anchor)
  const list: IElement[] = []
  for (let i = 0; i < count; i++) {
    list.push({
      value: INDENT_SPACE_CHAR,
      ...ctx
    })
  }
  return list
}

function paragraphContentEnd(
  elementList: IElement[],
  paraStart: number,
  rangeEnd: number
): number {
  let i = paraStart + 1
  while (i < rangeEnd && i < elementList.length) {
    if (isParagraphBreak(elementList[i])) break
    i++
  }
  return i
}

function isBlankParagraphContent(
  elementList: IElement[],
  contentStart: number,
  contentEnd: number
): boolean {
  for (let i = contentStart; i < contentEnd; i++) {
    const el = elementList[i]
    if (el.type === ElementType.TABLE) return false
    if (el.type === ElementType.IMAGE) return false
    if (el.type === ElementType.SEPARATOR) return false
    if (el.type === ElementType.PAGE_BREAK) return false
    if (el.type === ElementType.CONTROL) return false
    if (el.type === ElementType.BLOCK) return false
    if (el.type === ElementType.LATEX) return false
    if (el.type === ElementType.CHECKBOX) return false
    if (el.type === ElementType.RADIO) return false
    if (isSpaceElement(el)) continue
    if (isTextLikeElement(el) && el.value && el.value !== ZERO) {
      return false
    }
    if (!isTextLikeElement(el) && el.value !== ZERO) {
      return false
    }
  }
  return true
}

/** 删除段首空格（含 TAB） */
export function removeLeadingSpacesInRange(
  elementList: IElement[],
  start = 0,
  end = elementList.length
): boolean {
  const paraStarts = collectParagraphStarts(elementList, start, end)
  let changed = false
  // 从后往前删，避免索引错位
  for (let p = paraStarts.length - 1; p >= 0; p--) {
    const paraStart = paraStarts[p]
    if (isParagraphProtected(elementList, paraStart)) continue
    const contentEnd = paragraphContentEnd(elementList, paraStart, end)
    const removeStart = paraStart + 1
    let removeEnd = removeStart
    while (
      removeEnd < contentEnd &&
      isSpaceElement(elementList[removeEnd]) &&
      !isFormatProtectedElement(elementList[removeEnd])
    ) {
      removeEnd++
    }
    if (removeEnd > removeStart) {
      elementList.splice(removeStart, removeEnd - removeStart)
      changed = true
    }
  }
  return changed
}

/** 删除范围内所有空格 */
export function removeSpacesInRange(
  elementList: IElement[],
  start = 0,
  end = elementList.length
): boolean {
  let changed = false
  const to = Math.min(end, elementList.length)
  for (let i = to - 1; i >= start; i--) {
    const el = elementList[i]
    if (isFormatProtectedElement(el)) continue
    if (isSpaceElement(el)) {
      elementList.splice(i, 1)
      changed = true
    }
  }
  return changed
}

/** 删除空白段落 */
export function deleteBlankParagraphsInRange(
  elementList: IElement[],
  start = 0,
  end = elementList.length
): boolean {
  const paraStarts = collectParagraphStarts(elementList, start, end)
  if (!paraStarts.length) return false
  let changed = false
  // 从后往前处理；至少保留文档中一个 ZERO
  for (let p = paraStarts.length - 1; p >= 0; p--) {
    const paraStart = paraStarts[p]
    if (isParagraphProtected(elementList, paraStart)) continue
    const contentEnd = paragraphContentEnd(
      elementList,
      paraStart,
      elementList.length
    )
    if (!isBlankParagraphContent(elementList, paraStart + 1, contentEnd)) {
      continue
    }
    // 统计剩余段落起始，避免删空文档
    const remainingBreaks = elementList.filter(el => isParagraphBreak(el)).length
    if (remainingBreaks <= 1 && paraStart === 0) {
      // 仅清空白内容，保留唯一段落标记
      if (contentEnd > paraStart + 1) {
        elementList.splice(paraStart + 1, contentEnd - paraStart - 1)
        changed = true
      }
      continue
    }
    // 删除该段 ZERO 及其空白内容
    elementList.splice(paraStart, contentEnd - paraStart)
    changed = true
  }
  // 保证至少有一个段落标记
  if (!elementList.length || !isParagraphBreak(elementList[0])) {
    elementList.unshift({ value: ZERO })
    changed = true
  }
  return changed
}

/** 段落首行缩进 2em */
export function indent2EmInRange(
  elementList: IElement[],
  start = 0,
  end = elementList.length
): boolean {
  const paraStarts = collectParagraphStarts(elementList, start, end)
  let changed = false
  for (let p = 0; p < paraStarts.length; p++) {
    const paraStart = paraStarts[p]
    if (isParagraphProtected(elementList, paraStart)) continue
    const contentEnd = paragraphContentEnd(elementList, paraStart, end)
    // 空段不缩进
    if (isBlankParagraphContent(elementList, paraStart + 1, contentEnd)) {
      continue
    }
    for (let i = paraStart; i < contentEnd; i++) {
      if (!canMutateParagraphElement(elementList[i], i === paraStart)) continue
      if (elementList[i].textIndent !== TEXT_INDENT_STEP) {
        elementList[i].textIndent = TEXT_INDENT_STEP
        changed = true
      }
    }
  }
  return changed
}

/**
 * 段落首行缩进空格：清除 textIndent，在段首插入 2 个全角空格
 */
export function indentSpaceInRange(
  elementList: IElement[],
  start = 0,
  end = elementList.length
): boolean {
  const paraStarts = collectParagraphStarts(elementList, start, end)
  let changed = false
  // 从后往前插入
  for (let p = paraStarts.length - 1; p >= 0; p--) {
    const paraStart = paraStarts[p]
    if (isParagraphProtected(elementList, paraStart)) continue
    const contentEnd = paragraphContentEnd(elementList, paraStart, end)
    if (isBlankParagraphContent(elementList, paraStart + 1, contentEnd)) {
      continue
    }
    // 清除缩进属性
    for (let i = paraStart; i < contentEnd; i++) {
      if (!canMutateParagraphElement(elementList[i], i === paraStart)) continue
      if (elementList[i].textIndent != null) {
        delete elementList[i].textIndent
        changed = true
      }
    }
    // 已有段首全角空格则补齐到 2 个，否则插入 2 个
    let existing = 0
    let idx = paraStart + 1
    while (
      idx < contentEnd &&
      elementList[idx].value === INDENT_SPACE_CHAR &&
      isTextLikeElement(elementList[idx])
    ) {
      existing++
      idx++
    }
    const need = TEXT_INDENT_STEP - existing
    if (need > 0) {
      const spaces = createIndentSpaceElements(elementList[paraStart], need)
      elementList.splice(paraStart + 1 + existing, 0, ...spaces)
      changed = true
    }
  }
  return changed
}

function matchManualNumberLength(text: string): number {
  for (let i = 0; i < MANUAL_NUMBER_PATTERNS.length; i++) {
    const match = text.match(MANUAL_NUMBER_PATTERNS[i])
    if (match) return match[0].length
  }
  return 0
}

/** 清除段落前手工编号 */
export function removeNumberInRange(
  elementList: IElement[],
  start = 0,
  end = elementList.length
): boolean {
  const paraStarts = collectParagraphStarts(elementList, start, end)
  let changed = false
  for (let p = paraStarts.length - 1; p >= 0; p--) {
    const paraStart = paraStarts[p]
    if (isParagraphProtected(elementList, paraStart)) continue
    const contentEnd = paragraphContentEnd(elementList, paraStart, end)
    const cursor = paraStart + 1
    const maxProbe = Math.min(contentEnd, cursor + 32)
    let text = ''
    for (let i = cursor; i < maxProbe; i++) {
      const el = elementList[i]
      if (isFormatProtectedElement(el)) break
      if (!isTextLikeElement(el) || el.value === ZERO) break
      text += el.value
    }
    let remaining = matchManualNumberLength(text)
    if (!remaining) continue
    while (remaining > 0) {
      const el = elementList[paraStart + 1]
      if (!el || isFormatProtectedElement(el)) break
      const elLen = el.value.length
      if (elLen <= remaining) {
        elementList.splice(paraStart + 1, 1)
        remaining -= elLen
        changed = true
      } else {
        el.value = el.value.slice(remaining)
        remaining = 0
        changed = true
      }
    }
  }
  return changed
}

function applyActionToFlatList(
  elementList: IElement[],
  action: QuickFormatAction,
  start: number,
  end: number
): boolean {
  switch (action) {
    case QuickFormatAction.REMOVE_LEADING_SPACES:
      return removeLeadingSpacesInRange(elementList, start, end)
    case QuickFormatAction.REMOVE_SPACES:
      return removeSpacesInRange(elementList, start, end)
    case QuickFormatAction.DELETE_BLANK_PARAGRAPHS:
      return deleteBlankParagraphsInRange(elementList, start, end)
    case QuickFormatAction.INDENT_2_EM:
      return indent2EmInRange(elementList, start, end)
    case QuickFormatAction.INDENT_SPACE:
      return indentSpaceInRange(elementList, start, end)
    case QuickFormatAction.REMOVE_NUMBER:
      return removeNumberInRange(elementList, start, end)
    case QuickFormatAction.SMART_FORMAT: {
      const a = removeLeadingSpacesInRange(elementList, start, end)
      // 段首空格删除后 end 可能缩短，但我们按当前列表长度处理段落
      const b = indent2EmInRange(
        elementList,
        start,
        Math.min(end, elementList.length)
      )
      return a || b
    }
    default:
      return false
  }
}

/** 递归处理表格单元格 */
function applyToTablesInRange(
  elementList: IElement[],
  action: QuickFormatAction,
  start: number,
  end: number
): boolean {
  let changed = false
  const to = Math.min(end, elementList.length)
  for (let i = start; i < to; i++) {
    const el = elementList[i]
    if (el?.type !== ElementType.TABLE || !el.trList) continue
    if (isFormatProtectedElement(el)) continue
    for (let r = 0; r < el.trList.length; r++) {
      const tr = el.trList[r]
      for (let c = 0; c < tr.tdList.length; c++) {
        const td = tr.tdList[c]
        if (td.disabled) continue
        if (!td.value?.length) continue
        if (applyQuickFormat(td.value, action, 0, td.value.length)) {
          changed = true
        }
      }
    }
  }
  return changed
}

/**
 * 在元素列表的 [start, end) 上执行快速格式操作（含表格内递归）
 */
export function applyQuickFormat(
  elementList: IElement[],
  action: QuickFormatAction,
  start = 0,
  end = elementList.length
): boolean {
  const tableChanged = applyToTablesInRange(elementList, action, start, end)
  const listChanged = applyActionToFlatList(elementList, action, start, end)
  return tableChanged || listChanged
}

export function isQuickFormatAction(value: string): value is QuickFormatAction {
  return (Object.values(QuickFormatAction) as string[]).includes(value)
}
