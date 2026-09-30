import { describe, it, expect } from 'vitest'
import { ZERO } from '@/editor/dataset/constant/Common'
import { QuickFormatAction } from '@/editor/dataset/enum/QuickFormat'
import type { IElement } from '@/editor/interface/Element'
import {
  INDENT_SPACE_CHAR,
  applyQuickFormat,
  deleteBlankParagraphsInRange,
  indent2EmInRange,
  indentSpaceInRange,
  removeLeadingSpacesInRange,
  removeNumberInRange,
  removeSpacesInRange
} from '@/editor/utils/quickFormat'

function el(value: string, extra?: Partial<IElement>): IElement {
  return { value, ...extra }
}

function textOf(list: IElement[]): string {
  return list.map(e => (e.value === ZERO ? '\n' : e.value)).join('')
}

describe('quickFormat utils', () => {
  it('removeLeadingSpaces 删除段首空格', () => {
    const list = [
      el(ZERO),
      el(' '),
      el(' '),
      el('a'),
      el(ZERO),
      el('\u3000'),
      el('b')
    ]
    expect(removeLeadingSpacesInRange(list)).toBe(true)
    expect(textOf(list)).toBe('\na\nb')
  })

  it('removeSpaces 删除所有空格', () => {
    const list = [el(ZERO), el('a'), el(' '), el('b'), el('\u3000'), el('c')]
    expect(removeSpacesInRange(list)).toBe(true)
    expect(textOf(list)).toBe('\nabc')
  })

  it('deleteBlankParagraphs 删除空白段落', () => {
    const list = [
      el(ZERO),
      el('a'),
      el(ZERO),
      el(ZERO),
      el(' '),
      el(ZERO),
      el('b')
    ]
    expect(deleteBlankParagraphsInRange(list)).toBe(true)
    expect(textOf(list)).toBe('\na\nb')
  })

  it('indent2Em 设置首行缩进', () => {
    const list = [el(ZERO), el('a'), el(ZERO), el('b')]
    expect(indent2EmInRange(list)).toBe(true)
    expect(list[0].textIndent).toBe(2)
    expect(list[1].textIndent).toBe(2)
    expect(list[2].textIndent).toBe(2)
    expect(list[3].textIndent).toBe(2)
  })

  it('indentSpace 转为全角空格缩进', () => {
    const list = [el(ZERO, { textIndent: 2 }), el('a')]
    expect(indentSpaceInRange(list)).toBe(true)
    expect(list[0].textIndent).toBeUndefined()
    expect(list[1].value).toBe(INDENT_SPACE_CHAR)
    expect(list[2].value).toBe(INDENT_SPACE_CHAR)
    expect(list[3].value).toBe('a')
  })

  it('removeNumber 清除手工编号', () => {
    const list = [
      el(ZERO),
      el('1'),
      el('.'),
      el(' '),
      el('标'),
      el('题'),
      el(ZERO),
      el('一'),
      el('、'),
      el('内'),
      el('容')
    ]
    expect(removeNumberInRange(list)).toBe(true)
    expect(textOf(list)).toBe('\n标题\n内容')
  })

  it('removeNumber 清除多级编号 1.1.1', () => {
    const list = [
      el(ZERO),
      el('1'),
      el('.'),
      el('1'),
      el('.'),
      el('1'),
      el(' '),
      el('章'),
      el('节'),
      el(ZERO),
      el('2'),
      el('.'),
      el('3'),
      el('.'),
      el('标'),
      el('题')
    ]
    expect(removeNumberInRange(list)).toBe(true)
    expect(textOf(list)).toBe('\n章节\n标题')
  })

  it('smartFormat = 删段首空格 + 缩进2em', () => {
    const list = [el(ZERO), el(' '), el('a')]
    expect(applyQuickFormat(list, QuickFormatAction.SMART_FORMAT)).toBe(true)
    expect(textOf(list)).toBe('\na')
    expect(list[0].textIndent).toBe(2)
    expect(list[1].textIndent).toBe(2)
  })

  it('递归处理表格单元格', () => {
    const list: IElement[] = [
      el(ZERO),
      {
        value: '',
        type: 'table' as any,
        trList: [
          {
            height: 40,
            tdList: [
              {
                colspan: 1,
                rowspan: 1,
                value: [el(ZERO), el(' '), el('x')]
              }
            ]
          }
        ]
      } as IElement
    ]
    expect(
      applyQuickFormat(list, QuickFormatAction.REMOVE_LEADING_SPACES)
    ).toBe(true)
    const tdValue = list[1].trList![0].tdList[0].value
    expect(textOf(tdValue)).toBe('\nx')
  })
})
