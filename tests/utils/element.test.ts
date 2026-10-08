import { describe, it, expect } from 'vitest'
import {
  formatElementList,
  unzipElementList,
  zipElementList,
  pickElementAttr,
  getAnchorElement,
  isTextLikeElement,
  isTextElement,
  getElementListText,
  getTextFromElementList,
  clearImageAutoLayoutBlockIfAdjacentToText,
  classifyParagraphLayout,
  createDomFromElementList,
  getElementListByHTML,
  isSameElementExceptValue,
  getIsBlockElement,
  getSlimCloneElementList,
  convertTextAlignToRowFlex,
  convertRowFlexToTextAlign,
  convertRowFlexToJustifyContent,
  replaceHTMLElementTag,
  scanToOwner,
  getOutermostOwner,
  getNonDeletedElementList,
  getNonTraceElementList,
  isElementTraceDeleted
} from '@/editor/utils/element'
import { ElementType } from '@/editor/dataset/enum/Element'
import { AreaMode } from '@/editor/dataset/enum/Area'
import { TraceType } from '@/editor/dataset/enum/Trace'
import { RowFlex } from '@/editor/dataset/enum/Row'
import { ImageDisplay } from '@/editor/dataset/enum/Common'
import { ControlType, ControlComponent } from '@/editor/dataset/enum/Control'
import { ListType, ListStyle } from '@/editor/dataset/enum/List'
import { TitleLevel } from '@/editor/dataset/enum/Title'
import type { IElement } from '@/editor/interface/Element'

const mockOptions = {
  defaultSize: 16,
  defaultFont: 'Microsoft YaHei',
  defaultColor: '#000000',
  defaultBasicRowMarginHeight: 8,
  defaultRowMargin: 8,
  defaultTabWidth: 32,
  minSize: 8,
  maxSize: 72,
  width: 794,
  height: 1123,
  scale: 1,
  pageGap: 20,
  underlineColor: '#000000',
  strikeoutColor: '#000000',
  defaultBorderType: 'all',
  rangeColor: '#000000',
  rangeAlpha: 0.3,
  rangeMinWidth: 2,
  searchMatchColor: '#000000',
  searchNavigateMatchColor: '#000000',
  searchMatchAlpha: 0.3,
  highlightAlpha: 0.3,
  highlightMarginHeight: 2,
  resizerColor: '#000000',
  resizerSize: 5,
  marginIndicatorSize: 5,
  marginIndicatorColor: '#000000',
  margins: [100, 120, 100, 120] as [number, number, number, number],
  pageMode: 'pagination',
  renderMode: 'painter',
  defaultHyperlinkColor: '#0000ff',
  paperDirection: 'portrait',
  defaultType: 'text',
  locale: 'zh-CN',
  mode: 'edit',
  defaultTypewriterMode: false,
  placeholderData: [],
  pageNumber: {
    bottom: 40,
    size: 12,
    font: 'Microsoft YaHei',
    color: '#000000',
    rowFlex: 'center',
    format: '{pageNo}/{pageCount}'
  },
  watermark: {
    data: '',
    color: '#000000',
    size: 12,
    font: 'Microsoft YaHei',
    opacity: 0.1,
    repeat: true,
    gap: [200, 200]
  },
  control: {
    prefix: '{',
    suffix: '}',
    placeholderColor: '#000000',
    bracketColor: '#000000',
    valueSize: 12,
    valueFont: 'Microsoft YaHei',
    deletable: true
  },
  checkbox: {
    width: 12,
    height: 12,
    gap: 5,
    lineWidth: 1,
    fillStyle: '#000000',
    strokeStyle: '#000000'
  },
  radio: {
    width: 12,
    height: 12,
    gap: 5,
    lineWidth: 1,
    fillStyle: '#000000',
    strokeStyle: '#000000'
  },
  cursor: {
    width: 1,
    color: '#000000'
  },
  title: {
    defaultFirstSize: 26,
    defaultSecondSize: 24,
    defaultThirdSize: 22,
    defaultFourthSize: 20,
    defaultFifthSize: 18,
    defaultSixthSize: 16
  },
  list: {
    defaultSize: 16,
    defaultFont: 'Microsoft YaHei',
    defaultColor: '#000000',
    defaultLineDash: [],
    defaultRowFlex: 'left'
  },
  table: {
    tdPadding: 5,
    defaultBorderType: 'all',
    defaultTdBorderColor: '#000000',
    defaultTdBorderWidth: 1,
    defaultTdBackgroundColor: ''
  },
  header: {
    top: 50,
    maxHeightRadio: 1
  },
  footer: {
    bottom: 50,
    maxHeightRadio: 1
  },
  pageBreak: {
    font: 'Microsoft YaHei',
    size: 12,
    color: '#000000'
  },
  superscript: {
    fontSizeRatio: 0.6,
    offsetRatio: 0.4,
    lineWidth: 1
  },
  subscript: {
    fontSizeRatio: 0.6,
    offsetRatio: 0.4,
    lineWidth: 1
  },
  separator: {
    lineWidth: 1,
    strokeStyle: '#000000',
    dash: [5, 5]
  },
  lineBreak: {
    width: 12,
    height: 12,
    color: '#000000'
  },
  background: {
    color: '#ffffff',
    repeat: 'no-repeat',
    size: 'cover'
  },
  placeholder: {
    color: '#000000',
    size: 12,
    font: 'Microsoft YaHei'
  },
  group: {
    backgroundColor: ''
  },
  lineNumber: {
    size: 12,
    font: 'Microsoft YaHei',
    color: '#000000',
    disabled: false,
    right: 10,
    type: 'continuous'
  },
  pageBorder: {
    color: '#000000',
    lineWidth: 1,
    padding: [10, 10, 10, 10]
  },
  badge: {
    size: 10,
    font: 'Microsoft YaHei',
    color: '#000000',
    backgroundColor: '#000000'
  },
  iframeBlock: {
    src: '',
    width: 300,
    height: 200
  },
  block: {
    src: '',
    width: 300,
    height: 200
  },
  label: {
    size: 12,
    font: 'Microsoft YaHei',
    color: '#000000',
    valueStyle: {}
  },
  whiteSpace: {
    size: 12,
    font: 'Microsoft YaHei',
    color: '#000000'
  },
  magnifier: {
    size: 12,
    font: 'Microsoft YaHei',
    color: '#000000'
  },
  wordBreak: 'break-all',
  dragDisable: false,
  historyMaxRecordCount: 100,
  i18nLangItems: [],
  letterClass: [],
  textareaBorderColor: '#000000',
  imageMaxWidth: 100,
  imageMaxHeight: 100,
  imageViewer: {
    zIndex: 1000
  },
  defaultAlpha: 1,
  hoverOpacity: 0.7,
  activeOpacity: 1,
  strikethrough: {
    lineWidth: 1,
    color: '#000000'
  },
  underline: {
    lineWidth: 1,
    color: '#000000',
    style: 'solid'
  }
} as any

describe('formatElementList', () => {
  it('空数组会补偿零宽字符', () => {
    const list: any[] = []
    formatElementList(list, { editorOptions: mockOptions })
    expect(list.length).toBeGreaterThan(0)
    expect(list[0].value).toBe('\u200B')
  })

  it('普通文本元素应用默认值', () => {
    const list = [{ value: 'hello' }]
    formatElementList(list as any, { editorOptions: mockOptions })
    expect(list.length).toBeGreaterThan(1)
    expect(list[0].value).toBe('\u200B')
  })

  it('isForceCompensation 强制补偿首字符', () => {
    const list = [{ value: 'a' }]
    formatElementList(list as any, {
      isForceCompensation: true,
      editorOptions: mockOptions
    })
    expect(list[0].value).toBe('\u200B')
  })

  it('isHandleFirstElement false 跳过首字符补偿', () => {
    const list = [{ value: 'hello' }]
    formatElementList(list as any, {
      isHandleFirstElement: false,
      editorOptions: mockOptions
    })
    expect(list[0].value).not.toBe('\u200B')
  })
})

describe('unzipElementList', () => {
  it('单字符元素直接返回', () => {
    const list = [{ value: 'a' }]
    const result = unzipElementList(list as any)
    expect(result.length).toBe(1)
    expect(result[0].value).toBe('a')
  })

  it('多字符元素拆分为单字符', () => {
    const list = [{ value: 'abc', bold: true }]
    const result = unzipElementList(list as any)
    expect(result.length).toBe(3)
    expect(result[0].value).toBe('a')
    expect(result[0].bold).toBe(true)
    expect(result[1].value).toBe('b')
    expect(result[2].value).toBe('c')
  })
})

describe('zipElementList', () => {
  it('相邻文本元素合并', () => {
    const list = [
      { value: 'a', type: ElementType.TEXT },
      { value: 'b', type: ElementType.TEXT }
    ]
    const result = zipElementList(list as any)
    expect(result.length).toBe(1)
    expect(result[0].value).toBe('ab')
  })

  it('相同 trace 的相邻文本元素合并', () => {
    const trace = [{ type: TraceType.DELETED, author: 'hufe', timestamp: 1 }]
    const list = [
      { value: 'a', type: ElementType.TEXT, size: 16, trace },
      { value: 'b', type: ElementType.TEXT, size: 16, trace: [...trace] }
    ]
    const result = zipElementList(list as any)
    expect(result.length).toBe(1)
    expect(result[0].value).toBe('ab')
    expect(result[0].trace).toEqual(trace)
  })

  it('不同 trace 的相邻文本元素不合并', () => {
    const list = [
      {
        value: 'a',
        type: ElementType.TEXT,
        trace: [{ type: TraceType.DELETED, author: 'hufe', timestamp: 1 }]
      },
      {
        value: 'b',
        type: ElementType.TEXT,
        trace: [{ type: TraceType.DELETED, author: 'hufe', timestamp: 2 }]
      }
    ]
    const result = zipElementList(list as any)
    expect(result.length).toBe(2)
  })

  it('先插入后删除的相邻元素合并，保留两条记录', () => {
    const trace = [
      { type: TraceType.INSERTED, author: 'hufe', timestamp: 1 },
      { type: TraceType.DELETED, author: 'hufe', timestamp: 2 }
    ]
    const list = [
      { value: 'a', type: ElementType.TEXT, size: 16, trace },
      { value: 'b', type: ElementType.TEXT, size: 16, trace: [...trace] }
    ]
    const result = zipElementList(list as any)
    expect(result.length).toBe(1)
    expect(result[0].value).toBe('ab')
    expect(result[0].trace).toHaveLength(2)
    expect(result[0].trace?.[0].type).toBe(TraceType.INSERTED)
    expect(result[0].trace?.[1].type).toBe(TraceType.DELETED)
  })

  it('area 内表格压缩时单元格不因继承 areaId 变成嵌套 area', () => {
    const list: IElement[] = [
      {
        type: ElementType.AREA,
        value: '',
        areaId: 'area-1',
        area: { mode: AreaMode.EDIT },
        valueList: [
          {
            type: ElementType.TABLE,
            value: '',
            colgroup: [{ width: 100 }, { width: 100 }],
            trList: [
              {
                height: 40,
                tdList: [
                  {
                    colspan: 1,
                    rowspan: 1,
                    value: [{ value: '单元格' }]
                  }
                ]
              }
            ]
          }
        ]
      }
    ]
    formatElementList(list, { editorOptions: mockOptions as any })
    const zipped = zipElementList(list, { isClassifyArea: true })
    const area = zipped.find(el => el.type === ElementType.AREA)
    const table = area?.valueList?.find(el => el.type === ElementType.TABLE)
    expect(table).toBeTruthy()
    const cellValue = table!.trList![0].tdList[0].value
    expect(cellValue.some(el => el.type === ElementType.AREA)).toBe(false)
    expect(cellValue.some(el => el.value?.includes('单元格'))).toBe(true)
  })

  it('表格单元格内独立 area 仍可正常归类', () => {
    const list: IElement[] = [
      {
        type: ElementType.TABLE,
        value: '',
        colgroup: [{ width: 100 }],
        trList: [
          {
            height: 40,
            tdList: [
              {
                colspan: 1,
                rowspan: 1,
                value: [
                  {
                    type: ElementType.AREA,
                    value: '',
                    areaId: 'cell-area',
                    area: { mode: AreaMode.EDIT },
                    valueList: [{ value: '区内文本' }]
                  }
                ]
              }
            ]
          }
        ]
      }
    ]
    formatElementList(list, { editorOptions: mockOptions as any })
    const zipped = zipElementList(list, { isClassifyArea: true })
    const table = zipped.find(el => el.type === ElementType.TABLE)
    const cellValue = table!.trList![0].tdList[0].value
    expect(cellValue.some(el => el.type === ElementType.AREA)).toBe(true)
    expect(cellValue.find(el => el.type === ElementType.AREA)?.areaId).toBe(
      'cell-area'
    )
  })
})

describe('trace element filter', () => {
  it('仅过滤最后一条留痕为删除的元素', () => {
    const insertedThenDeleted: IElement = {
      value: 'a',
      trace: [{ type: TraceType.INSERTED }, { type: TraceType.DELETED }]
    }
    const deletedThenInserted: IElement = {
      value: 'b',
      trace: [{ type: TraceType.DELETED }, { type: TraceType.INSERTED }]
    }

    expect(isElementTraceDeleted(insertedThenDeleted)).toBe(true)
    expect(isElementTraceDeleted(deletedThenInserted)).toBe(false)
    expect(
      getNonDeletedElementList([insertedThenDeleted, deletedThenInserted])
    ).toEqual([deletedThenInserted])
  })

  it('递归过滤嵌套内容且不修改原始元素', () => {
    const elementList: IElement[] = [
      {
        type: ElementType.TABLE,
        value: '',
        colgroup: [],
        trList: [
          {
            height: 0,
            tdList: [
              {
                colspan: 1,
                rowspan: 1,
                value: [
                  { value: 'visible' },
                  {
                    value: 'deleted',
                    trace: [{ type: TraceType.DELETED }]
                  }
                ]
              }
            ]
          }
        ]
      },
      {
        type: ElementType.CONTROL,
        value: '',
        control: {
          type: ControlType.TEXT,
          value: [
            { value: 'kept' },
            {
              value: 'removed',
              trace: [{ type: TraceType.DELETED }]
            }
          ]
        }
      }
    ]

    const result = getNonDeletedElementList(elementList)

    expect(result[0].trList![0].tdList[0].value).toHaveLength(1)
    expect(result[1].control!.value).toHaveLength(1)
    expect(elementList[0].trList![0].tdList[0].value).toHaveLength(2)
    expect(elementList[1].control!.value).toHaveLength(2)
  })
})

describe('getNonTraceElementList', () => {
  it('剥离全部留痕记录并剔除软删除元素', () => {
    const elementList: IElement[] = [
      { value: 'kept', trace: [{ type: TraceType.INSERTED }] },
      { value: 'gone', trace: [{ type: TraceType.DELETED }] },
      {
        type: ElementType.CONTROL,
        value: '',
        control: {
          type: ControlType.TEXT,
          value: [
            { value: 'inner', trace: [{ type: TraceType.INSERTED }] },
            { value: 'removed', trace: [{ type: TraceType.DELETED }] }
          ]
        }
      },
      {
        type: ElementType.TABLE,
        value: '',
        trList: [
          {
            height: 30,
            tdList: [
              {
                colspan: 1,
                rowspan: 1,
                value: [
                  { value: 'cell', trace: [{ type: TraceType.INSERTED }] }
                ]
              }
            ]
          }
        ]
      }
    ]

    const result = getNonTraceElementList(elementList)

    expect(result).toHaveLength(3)
    expect(result[0].trace).toBeUndefined()
    expect(result[1].control!.value).toEqual([{ value: 'inner' }])
    expect(result[2].trList![0].tdList[0].value).toEqual([{ value: 'cell' }])
    // 不污染入参
    expect(elementList[0].trace).toHaveLength(1)
    expect(elementList[2].control!.value).toHaveLength(2)
  })
})

describe('pickElementAttr', () => {
  it('返回默认压缩属性', () => {
    const el = { value: 'hello', bold: true, size: 16, color: '#f00' }
    const result = pickElementAttr(el as any)
    expect(result).toHaveProperty('value')
    expect(result).toHaveProperty('bold')
    expect(result).toHaveProperty('size')
  })
})

describe('getAnchorElement', () => {
  it('从列表中获取指定索引的锚点元素', () => {
    const list = [{ value: 'hello' }, { value: 'world' }]
    const result = getAnchorElement(list as any, 0)
    expect(result).toBeTruthy()
  })

  it('空列表返回 null', () => {
    const result = getAnchorElement([], 0)
    expect(result).toBeNull()
  })
})

describe('isTextLikeElement', () => {
  it('纯文本返回 true', () => {
    expect(isTextLikeElement({ value: 'hello' } as any)).toBe(true)
  })

  it('图片返回 false', () => {
    expect(
      isTextLikeElement({ value: '', type: ElementType.IMAGE } as any)
    ).toBe(false)
  })
})

describe('isTextElement', () => {
  it('纯文本返回 true', () => {
    expect(
      isTextElement({ value: 'hello', type: ElementType.TEXT } as any)
    ).toBe(true)
  })

  it('无 type 的文本返回 true', () => {
    expect(isTextElement({ value: 'hello' } as any)).toBe(true)
  })
})

describe('getElementListText', () => {
  it('提取元素列表文本', () => {
    const list = [{ value: 'hello' }, { value: 'world' }]
    expect(getElementListText(list as any)).toBe('helloworld')
  })
})

describe('getTextFromElementList', () => {
  it('从元素列表提取纯文本', () => {
    const list = [{ value: 'hello' }, { value: '\n' }, { value: 'world' }]
    const result = getTextFromElementList(list as any)
    expect(result).toContain('hello')
    expect(result).toContain('world')
  })
})

describe('createDomFromElementList', () => {
  it('将元素列表转为 DOM', () => {
    const list = [{ value: 'hello' }]
    const dom = createDomFromElementList(list as any)
    expect(dom).toBeTruthy()
    expect(dom.tagName).toBe('DIV')
  })

  it('回车拆成 p 标签，并保留图文并排在同一段', () => {
    const list: IElement[] = [
      { value: '前缀' },
      {
        type: ElementType.IMAGE,
        value: 'data:image/png;base64,abc',
        width: 40,
        height: 20
      },
      { value: '后缀\n下一行' }
    ]
    const dom = createDomFromElementList(list)
    const paragraphs = Array.from(dom.querySelectorAll('p'))
    expect(paragraphs.length).toBe(2)
    // 拖入文本段：图文同属第一段
    expect(paragraphs[0].querySelector('img')).toBeTruthy()
    expect(paragraphs[0].textContent).toBe('前缀后缀')
    expect(paragraphs[1].textContent).toBe('下一行')
    expect(paragraphs[1].querySelector('img')).toBeNull()
  })

  it('HTML 图文同行回显仍为单个 p（拖入文本段）', () => {
    const html =
      '<p style="margin: 0px;"><span style="font-family: 微软雅黑; color: rgb(0, 0, 0); font-size: 16px;">12344444</span><img src="https://example.com/a.png" width="111" height="99"></p>'
    const parsed = getElementListByHTML(html, { innerWidth: 500 })
    const out = createDomFromElementList(parsed)
    const paragraphs = [...out.querySelectorAll('p')]
    expect(paragraphs.length).toBe(1)
    expect(paragraphs[0].textContent).toContain('12344444')
    expect(paragraphs[0].querySelector('img')).toBeTruthy()
  })

  it('独立图片与正文分开成 p；一键排版相邻图共用 p', () => {
    const standalone: IElement[] = [
      { value: '正文' },
      { value: '\n' },
      {
        type: ElementType.IMAGE,
        value: 'https://example.com/a.png',
        width: 100,
        height: 80
      }
    ]
    const standaloneDom = createDomFromElementList(standalone)
    expect(standaloneDom.querySelectorAll('p').length).toBe(2)
    expect(
      standaloneDom.querySelectorAll('p')[1].querySelector('img')
    ).toBeTruthy()

    const laidOut: IElement[] = [
      { value: '正文' },
      { value: '\n' },
      {
        type: ElementType.IMAGE,
        value: 'https://example.com/1.png',
        width: 50,
        height: 40,
        imgDisplay: ImageDisplay.BLOCK,
        rowFlex: RowFlex.LEFT
      },
      {
        type: ElementType.IMAGE,
        value: 'https://example.com/2.png',
        width: 50,
        height: 40,
        imgDisplay: ImageDisplay.BLOCK,
        rowFlex: RowFlex.LEFT
      }
    ]
    const laidDom = createDomFromElementList(laidOut)
    const ps = [...laidDom.querySelectorAll('p')]
    expect(ps.length).toBe(2)
    expect(ps[0].textContent).toBe('正文')
    expect(ps[1].querySelectorAll('img').length).toBe(2)
  })

  it('一键排版 BLOCK 图与紧邻文字分成两个 p', () => {
    const before: IElement[] = [
      { value: '1111111' },
      {
        type: ElementType.IMAGE,
        value: 'https://example.com/a.png',
        width: 111,
        height: 82,
        imgDisplay: ImageDisplay.BLOCK,
        rowFlex: RowFlex.LEFT
      }
    ]
    const beforeDom = createDomFromElementList(before)
    const beforePs = [...beforeDom.querySelectorAll('p')]
    expect(beforePs.length).toBe(2)
    expect(beforePs[0].textContent).toBe('1111111')
    expect(beforePs[0].querySelector('img')).toBeNull()
    expect(beforePs[1].querySelector('img')).toBeTruthy()

    const after: IElement[] = [
      {
        type: ElementType.IMAGE,
        value: 'https://example.com/a.png',
        width: 111,
        height: 82,
        imgDisplay: ImageDisplay.BLOCK,
        rowFlex: RowFlex.LEFT
      },
      { value: '后缀' }
    ]
    const afterDom = createDomFromElementList(after)
    const afterPs = [...afterDom.querySelectorAll('p')]
    expect(afterPs.length).toBe(2)
    expect(afterPs[0].querySelector('img')).toBeTruthy()
    expect(afterPs[1].textContent).toBe('后缀')
  })

  it('已带 rowFlex:left 的图片与无 rowFlex 文字仍同段', () => {
    const list: IElement[] = [
      { value: '12344444' },
      {
        type: ElementType.IMAGE,
        value: 'https://example.com/a.png',
        width: 111,
        height: 99,
        rowFlex: RowFlex.LEFT
      }
    ]
    const dom = createDomFromElementList(list)
    expect(dom.querySelectorAll('p').length).toBe(1)
  })

  it('紧邻正文时清除一键排版 BLOCK，与换行分隔时保留', () => {
    const adjacent: IElement[] = [
      { value: '正文' },
      {
        type: ElementType.IMAGE,
        value: 'https://example.com/a.png',
        width: 100,
        height: 80,
        imgDisplay: ImageDisplay.BLOCK
      }
    ]
    clearImageAutoLayoutBlockIfAdjacentToText(adjacent)
    expect(adjacent[1].imgDisplay).toBeUndefined()
    expect(createDomFromElementList(adjacent).querySelectorAll('p').length).toBe(
      1
    )

    const separated: IElement[] = [
      { value: '正文' },
      { value: '\n' },
      {
        type: ElementType.IMAGE,
        value: 'https://example.com/a.png',
        width: 100,
        height: 80,
        imgDisplay: ImageDisplay.BLOCK
      }
    ]
    clearImageAutoLayoutBlockIfAdjacentToText(separated)
    expect(separated[2].imgDisplay).toBe(ImageDisplay.BLOCK)
  })

  it('连续回车产生空段落', () => {
    const list: IElement[] = [{ value: 'A\n\nB' }]
    const dom = createDomFromElementList(list)
    const paragraphs = Array.from(dom.querySelectorAll('p'))
    expect(paragraphs.length).toBe(3)
    expect(paragraphs[0].textContent).toBe('A')
    expect(paragraphs[1].textContent).toBe('')
    expect(paragraphs[2].textContent).toBe('B')
  })

  it('行首补偿 \\n 不导出为空段落', () => {
    // getValue 压缩后常见形态：行首 ZERO 与正文合并成 "\nhello"
    const merged: IElement[] = [{ value: '\nhello' }]
    const mergedDom = createDomFromElementList(merged)
    expect([...mergedDom.querySelectorAll('p')].map(p => p.textContent)).toEqual(
      ['hello']
    )

    // 独立的行首换行元素
    const leading: IElement[] = [{ value: '\n' }, { value: 'hello' }]
    const leadingDom = createDomFromElementList(leading)
    expect(
      [...leadingDom.querySelectorAll('p')].map(p => p.textContent)
    ).toEqual(['hello'])
  })

  it('area 去掉 data-title 后正文行首 \\n 不导出空 p', () => {
    const list: IElement[] = [
      {
        type: ElementType.AREA,
        value: '',
        areaId: 'p1',
        area: {},
        valueList: [
          {
            type: ElementType.TITLE,
            value: '',
            level: TitleLevel.FIRST,
            titleId: 'p1',
            title: { disabled: true, deletable: false },
            valueList: [{ value: '标题' }, { value: '\n' }]
          },
          { value: '\n' },
          { value: 'hello' }
        ]
      }
    ]
    const dom = createDomFromElementList(list)
    const texts = [...dom.querySelectorAll('[paraId] p')].map(p => p.textContent)
    expect(texts).toEqual(['hello'])
  })

  it('p 段落导出可回显为换行', () => {
    const list: IElement[] = [{ value: 'hello\nworld' }]
    const html = createDomFromElementList(list).innerHTML
    expect(html).toContain('<p')
    const parsed = getElementListByHTML(html, { innerWidth: 500 })
    expect(parsed.map(el => el.value).join('')).toBe('hello\nworld')
  })

  it('标题导出时带出 id（titleId）', () => {
    const list: IElement[] = [
      {
        type: ElementType.TITLE,
        value: '',
        level: TitleLevel.FIRST,
        titleId: 'title-abc',
        valueList: [{ value: '章节一' }]
      }
    ]
    const dom = createDomFromElementList(list)
    const h1 = dom.querySelector('h1')
    expect(h1?.id).toBe('title-abc')
    expect(h1?.textContent).toContain('章节一')
  })

  it('区域导出时带出 paraId 与 data-title', () => {
    const html =
      '<div paraId="para-title" data-disabled="true" data-title="章节标题"><p>body text</p></div>'
    const parsed = getElementListByHTML(html, { innerWidth: 500 })
    const dom = createDomFromElementList(parsed)
    const areaDom = dom.querySelector('[paraId="para-title"]') as HTMLElement
    expect(areaDom).toBeTruthy()
    expect(areaDom.getAttribute('data-title')).toBe('章节标题')
    expect(areaDom.getAttribute('data-disabled')).toBe('true')
    expect(areaDom.textContent).toContain('body text')
    expect(areaDom.querySelector('h1')).toBeNull()
  })
})

describe('titleId round-trip', () => {
  it('getValue zip 保留 titleId', () => {
    const list: IElement[] = [
      {
        value: '标题',
        titleId: 't-1',
        level: TitleLevel.FIRST
      },
      {
        value: '\n',
        titleId: 't-1',
        level: TitleLevel.FIRST
      },
      { value: '正文' }
    ]
    const zipped = zipElementList(list, { isClassifyArea: true })
    const title = zipped.find(el => el.type === ElementType.TITLE)
    expect(title?.titleId).toBe('t-1')
  })
})

describe('getElementListByHTML', () => {
  it('从 HTML 解析元素列表', () => {
    const html = '<p>hello world</p>'
    const result = getElementListByHTML(html, { innerWidth: 500 })
    expect(Array.isArray(result)).toBe(true)
    expect(result.length).toBeGreaterThan(0)
  })

  it('带 paraId 的外层 div 解析为 AREA', () => {
    const html =
      '<div paraId="para-1"><p>section one</p></div><div paraId="para-2"><p>section two</p></div>'
    const result = getElementListByHTML(html, { innerWidth: 500 })
    const areas = result.filter(el => el.type === ElementType.AREA)
    expect(areas.length).toBe(2)
    expect(areas[0].areaId).toBe('para-1')
    expect(areas[0].area?.mode).toBe(AreaMode.EDIT)
    expect(areas[0].valueList?.length).toBeGreaterThan(0)
    expect(areas[1].areaId).toBe('para-2')
  })

  it('data-disabled="true" 时 AREA 为 readonly', () => {
    const html =
      '<div paraId="locked" data-disabled="true"><p>locked text</p></div>'
    const result = getElementListByHTML(html, { innerWidth: 500 })
    const area = result.find(el => el.type === ElementType.AREA)
    expect(area?.areaId).toBe('locked')
    expect(area?.area?.mode).toBe(AreaMode.READONLY)
  })

  it('data-title 解析为区域禁用标题', () => {
    const html =
      '<div paraId="para-title" data-title="章节标题"><p>body text</p></div>'
    const result = getElementListByHTML(html, { innerWidth: 500 })
    const area = result.find(el => el.type === ElementType.AREA)
    expect(area?.areaId).toBe('para-title')
    expect(area?.area?.mode).toBe(AreaMode.EDIT)
    const title = area?.valueList?.[0]
    expect(title?.type).toBe(ElementType.TITLE)
    expect(title?.titleId).toBe('para-title')
    expect(title?.title?.disabled).toBe(true)
    expect(title?.title?.deletable).toBe(false)
    expect(title?.valueList?.[0]?.value).toBe('章节标题')
    // 标题自带换行，保证独占一行
    expect(title?.valueList?.[1]?.value).toBe('\n')
  })

  it('h1 带 id 时解析为 titleId', () => {
    const html = '<h1 id="title-1">锁定标题</h1><p>body</p>'
    const result = getElementListByHTML(html, { innerWidth: 500 })
    const title = result.find(el => el.type === ElementType.TITLE)
    expect(title?.titleId).toBe('title-1')
  })

  it('h1 data-disabled 解析为禁用标题', () => {
    const html = '<h1 data-disabled="true">锁定标题</h1><p>body</p>'
    const result = getElementListByHTML(html, { innerWidth: 500 })
    const title = result.find(el => el.type === ElementType.TITLE)
    expect(title?.title?.disabled).toBe(true)
    expect(title?.title?.deletable).toBe(false)
    expect(title?.valueList?.some(v => v.value.includes('锁定标题'))).toBe(
      true
    )
  })

  it('无 paraId 的普通 div 不产生 AREA', () => {
    const html = '<div><p>plain</p></div>'
    const result = getElementListByHTML(html, { innerWidth: 500 })
    expect(result.some(el => el.type === ElementType.AREA)).toBe(false)
    expect(result.length).toBeGreaterThan(0)
  })

  it('HTML 标签 partid 解析为 partId', () => {
    const html =
      '<p partid="p-1">hello</p><img partid="img-1" src="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7" width="10" height="10"><table partid="tb-1"><tr><td>a</td></tr></table>'
    const result = getElementListByHTML(html, { innerWidth: 500 })
    const text = result.find(el => el.value?.includes('hello'))
    const image = result.find(el => el.type === ElementType.IMAGE)
    const table = result.find(el => el.type === ElementType.TABLE)
    expect(text?.partId).toBe('p-1')
    expect(image?.partId).toBe('img-1')
    expect(table?.partId).toBe('tb-1')
  })

  it('空段落 partid 也能保留', () => {
    const html = '<p partid="empty-1"></p>'
    const result = getElementListByHTML(html, { innerWidth: 500 })
    expect(result.some(el => el.partId === 'empty-1')).toBe(true)
  })

  it('break-after: page 的空 div 解析为分页符', () => {
    const html =
      '<p>before</p><div style="break-after: page;"></div><p>after</p>'
    const result = getElementListByHTML(html, { innerWidth: 500 })
    const pageBreak = result.find(el => el.type === ElementType.PAGE_BREAK)
    expect(pageBreak).toBeTruthy()
    expect(pageBreak?.value).toBe('\n')
    // 不应把分页符当成普通空段落（无 type 的 \\n）夹在中间
    const pageBreakIndex = result.findIndex(
      el => el.type === ElementType.PAGE_BREAK
    )
    expect(pageBreakIndex).toBeGreaterThan(-1)
    expect(result[pageBreakIndex].type).toBe(ElementType.PAGE_BREAK)
  })

  it('style line-height 解析为 rowMargin', () => {
    const html =
      '<p style="line-height: 1.75;">一、竞标函</p><p style="text-indent:2em;">无行高</p>'
    const result = getElementListByHTML(html, { innerWidth: 500 })
    const withLineHeight = result.find(el => el.value?.includes('竞标函'))
    const withoutLineHeight = result.find(el => el.value?.includes('无行高'))
    expect(withLineHeight?.rowMargin).toBe(1.75)
    expect(withoutLineHeight?.rowMargin).toBeUndefined()
  })

  it('居中/右对齐外层 div 与段首 br 不叠出多余空段', () => {
    const html =
      '<div style="text-align: center;"><span partid="a"><br>111</span></div><div style="text-align: right;"><span partid="b"><br>222</span></div><span partid="c"><br>333</span>'
    const result = getElementListByHTML(html, { innerWidth: 500 })
    const values = result.map(el => el.value)
    // 仅三段之间各一个换行，不应出现连续 \\n\\n 空段
    let consecutiveBreaks = 0
    for (let i = 0; i < values.length - 1; i++) {
      if (
        (values[i] === '\n' || values[i] === '\r\n') &&
        (values[i + 1] === '\n' || values[i + 1] === '\r\n')
      ) {
        consecutiveBreaks++
      }
    }
    expect(consecutiveBreaks).toBe(0)
    expect(values.join('')).toContain('111')
    expect(values.join('')).toContain('222')
    expect(values.join('')).toContain('333')
  })

  it('无段首 br 的相邻块级 div 仍补一个换行', () => {
    const html = '<div>111</div><div>222</div>'
    const result = getElementListByHTML(html, { innerWidth: 500 })
    const joined = result.map(el => el.value).join('')
    expect(joined).toBe('111\n222')
  })

  it('空块级 div 保留为空段落换行', () => {
    const html = '<div>111</div><div></div><div>333</div>'
    const result = getElementListByHTML(html, { innerWidth: 500 })
    const joined = result.map(el => el.value).join('')
    expect(joined).toBe('111\n\n333')
  })

  it('text-align:both 解析为两端对齐', () => {
    const html = '<p style="text-align:both;">hello</p>'
    const result = getElementListByHTML(html, { innerWidth: 500 })
    const text = result.find(el => el.value?.includes('hello'))
    expect(text?.rowFlex).toBe(RowFlex.ALIGNMENT)
  })

  it('对齐段落导出不应逐段包 div', () => {
    const html =
      '<p style="text-align:justify;">title</p>' +
      '<p style="text-align:justify;text-indent:2em;">addr</p>' +
      '<p style="text-align:justify;text-indent:2em;">body</p>'
    const parsed = getElementListByHTML(html, { innerWidth: 500 })
    // 段间换行应继承对齐，避免 group 被拆开
    const breaks = parsed.filter(el => el.value === '\n')
    expect(breaks.length).toBeGreaterThan(0)
    expect(breaks.every(el => el.rowFlex === RowFlex.ALIGNMENT)).toBe(true)

    const dom = createDomFromElementList(parsed)
    const paragraphs = [...dom.querySelectorAll('p')]
    expect(paragraphs.length).toBe(3)
    expect(
      paragraphs.every(p => p.style.textAlign === 'justify')
    ).toBe(true)
    expect(paragraphs[0].style.textIndent).toBe('')
    expect(paragraphs[1].style.textIndent).toBe('2em')
    expect(paragraphs[2].style.textIndent).toBe('2em')
    // 对齐写在 p 上，不再包一层布局 div
    expect(
      [...dom.children].every(child => child.nodeName === 'P')
    ).toBe(true)
  })

  it('相同对齐的连续布局 div 回显时合并为同一段落', () => {
    // 模拟 createDomFromElementList 把同一段样式片段拆成多个 div 的产物
    const html =
      '<div style="text-align: justify;"><span style="font-weight: 600;">公司概况：</span></div>' +
      '<div style="text-align: justify;"><span>许继电气股份有限公司</span></div>' +
      '<div style="text-align: justify;"><span style="color: rgb(255, 0, 0); font-weight: 600;">整体解决方案能力</span></div>' +
      '<div style="text-align: justify;"><span>。</span></div>' +
      '<div style="text-align: justify;"><span><br></span></div>' +
      '<div style="text-align: justify;"><span style="font-weight: 600;">品牌实力。</span></div>' +
      '<div style="text-align: justify;"><span>许继电气是我国</span></div>'
    const result = getElementListByHTML(html, { innerWidth: 500 })
    const joined = result.map(el => el.value).join('')
    // 前四个样式片段应连成一段，不应被拆成多行
    expect(joined).toContain('公司概况：许继电气股份有限公司整体解决方案能力。')
    expect(joined).toContain('品牌实力。许继电气是我国')
    // <br> 处分段
    expect(joined).toMatch(/。\n品牌实力/)
    // 不应把每个 span 都拆成独立空段
    const onlyBreaks = result.filter(el => el.value === '\n')
    expect(onlyBreaks.length).toBe(1)
  })
})

describe('partId round-trip', () => {
  it('getValue zip 保留 partId，createDom 还原 partid 属性', () => {
    const list: IElement[] = [
      { value: 'hello', partId: 'p-1' },
      {
        type: ElementType.IMAGE,
        value: 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
        width: 10,
        height: 10,
        partId: 'img-1'
      }
    ]
    const zipped = zipElementList(list)
    expect(zipped.find(el => el.value === 'hello')?.partId).toBe('p-1')
    expect(zipped.find(el => el.type === ElementType.IMAGE)?.partId).toBe(
      'img-1'
    )
    const dom = createDomFromElementList(list)
    expect(dom.querySelector('[partid="p-1"]')).toBeTruthy()
    expect(dom.querySelector('img[partid="img-1"]')).toBeTruthy()
  })

  it('未设置 partId 时 zip 输出默认为 null，createDom 写出 partid="null"', () => {
    const zipped = zipElementList([{ value: 'plain' }])
    expect(zipped[0].partId).toBeNull()
    expect(pickElementAttr({ value: 'x' }).partId).toBeNull()
    const dom = createDomFromElementList([{ value: 'plain', partId: null }])
    expect(dom.querySelector('[partid="null"]')).toBeTruthy()
    const imgDom = createDomFromElementList([
      {
        type: ElementType.IMAGE,
        value:
          'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
        width: 10,
        height: 10,
        partId: null
      }
    ])
    expect(imgDom.querySelector('img[partid="null"]')).toBeTruthy()
  })

  it('HTML partid="null" 解析为 partId null', () => {
    const result = getElementListByHTML('<p partid="null">hi</p>', {
      innerWidth: 500
    })
    const text = result.find(el => el.value?.includes('hi'))
    // 解析阶段可不挂 partId，zip 后统一为 null
    expect(text?.partId == null).toBe(true)
    const zipped = zipElementList(result.filter(el => el.value?.includes('hi')))
    expect(zipped[0]?.partId).toBeNull()
  })

  it('formatElementList 兼容 JSON 小写 partid', () => {
    const list: any[] = [{ value: 'x', partid: 'legacy-1' }]
    formatElementList(list, { editorOptions: mockOptions as any })
    const el = list.find(item => item.value === 'x')
    expect(el?.partId).toBe('legacy-1')
    expect(el?.partid).toBeUndefined()
  })
})

describe('isSameElementExceptValue', () => {
  it('相同属性不同 value 返回 true', () => {
    const a = { value: 'hello', bold: true, size: 16 }
    const b = { value: 'world', bold: true, size: 16 }
    expect(isSameElementExceptValue(a as any, b as any)).toBe(true)
  })

  it('不同属性返回 false', () => {
    const a = { value: 'hello', bold: true }
    const b = { value: 'world', bold: false }
    expect(isSameElementExceptValue(a as any, b as any)).toBe(false)
  })
})

describe('getIsBlockElement', () => {
  it('表格是块级元素', () => {
    expect(getIsBlockElement({ type: ElementType.TABLE } as any)).toBe(true)
  })

  it('纯文本不是块级元素', () => {
    expect(getIsBlockElement({ value: 'hello' } as any)).toBe(false)
  })

  it('undefined 返回 false', () => {
    expect(getIsBlockElement(undefined)).toBe(false)
  })
})

describe('getSlimCloneElementList', () => {
  it('返回浅拷贝列表', () => {
    const list = [{ value: 'hello' }, { value: 'world' }]
    const result = getSlimCloneElementList(list as any)
    expect(result).toHaveLength(2)
    expect(result[0].value).toBe('hello')
    expect(result).not.toBe(list)
  })
})

describe('convertTextAlignToRowFlex', () => {
  it('center 转 center', () => {
    const el = document.createElement('div')
    el.style.textAlign = 'center'
    expect(convertTextAlignToRowFlex(el)).toBe(RowFlex.CENTER)
  })

  it('right 转 right', () => {
    const el = document.createElement('div')
    el.style.textAlign = 'right'
    expect(convertTextAlignToRowFlex(el)).toBe(RowFlex.RIGHT)
  })
})

describe('convertRowFlexToTextAlign', () => {
  it('center 转 center', () => {
    expect(convertRowFlexToTextAlign(RowFlex.CENTER)).toBe('center')
  })

  it('right 转 right', () => {
    expect(convertRowFlexToTextAlign(RowFlex.RIGHT)).toBe('right')
  })
})

describe('convertRowFlexToJustifyContent', () => {
  it('center 转 center', () => {
    expect(convertRowFlexToJustifyContent(RowFlex.CENTER)).toBe('center')
  })

  it('left 转 flex-start', () => {
    expect(convertRowFlexToJustifyContent(RowFlex.LEFT)).toBe('flex-start')
  })
})

describe('replaceHTMLElementTag', () => {
  it('创建新标签并复制属性内容', () => {
    const parent = document.createElement('div')
    parent.innerHTML = '<b>bold</b>'
    const node = parent.querySelector('b')!
    const newNode = replaceHTMLElementTag(node, 'strong')
    expect(newNode.tagName).toBe('STRONG')
    expect(newNode.innerHTML).toBe('bold')
  })
})

describe('scanToOwner', () => {
  const buildEl = (
    controlId: string,
    controlComponent: ControlComponent,
    value = ''
  ): IElement => ({
    type: ElementType.CONTROL,
    value,
    controlId,
    controlComponent,
    control: { type: ControlType.TEXT, value: null } as any
  })

  const list = [
    buildEl('OUT', ControlComponent.PREFIX, '{'),
    buildEl('OUT', ControlComponent.VALUE, 'a'),
    buildEl('IN', ControlComponent.PREFIX, '{'),
    buildEl('IN', ControlComponent.VALUE, 'x'),
    buildEl('IN', ControlComponent.POSTFIX, '}'),
    buildEl('OUT', ControlComponent.VALUE, 'b'),
    buildEl('OUT', ControlComponent.POSTFIX, '}')
  ]

  it('向右步进跳过内层段', () => {
    expect(scanToOwner(list, 1, 1, 'OUT')).toBe(5)
  })

  it('向左步进跳过内层段落', () => {
    expect(scanToOwner(list, 5, -1, 'OUT')).toBe(1)
  })

  it('同 ownerId 时正常单步', () => {
    expect(scanToOwner(list, 0, 1, 'OUT')).toBe(1)
  })

  it('越界返回边界', () => {
    expect(scanToOwner(list, 6, 1, 'OUT')).toBe(7)
    expect(scanToOwner(list, 0, -1, 'OUT')).toBe(-1)
  })
})

describe('getOutermostOwner', () => {
  const buildEl = (
    controlId: string,
    controlComponent: ControlComponent,
    value = ''
  ): IElement => ({
    type: ElementType.CONTROL,
    value,
    controlId,
    controlComponent,
    control: { type: ControlType.TEXT, value: null } as any
  })

  it('无嵌套时返回当前 controlId', () => {
    const list = [
      buildEl('A', ControlComponent.PREFIX),
      buildEl('A', ControlComponent.VALUE, 'x'),
      buildEl('A', ControlComponent.POSTFIX)
    ]
    expect(getOutermostOwner(list, 1)).toBe('A')
  })

  it('嵌套时返回最外层 controlId', () => {
    const list = [
      buildEl('OUT', ControlComponent.PREFIX),
      buildEl('OUT', ControlComponent.VALUE, 'a'),
      buildEl('MID', ControlComponent.PREFIX),
      buildEl('MID', ControlComponent.VALUE, 'b'),
      buildEl('IN', ControlComponent.PREFIX),
      buildEl('IN', ControlComponent.VALUE, 'c'),
      buildEl('IN', ControlComponent.POSTFIX),
      buildEl('MID', ControlComponent.POSTFIX),
      buildEl('OUT', ControlComponent.POSTFIX)
    ]
    expect(getOutermostOwner(list, 5)).toBe('OUT')
    expect(getOutermostOwner(list, 3)).toBe('OUT')
  })

  it('非控件位置返回 null', () => {
    const list = [{ value: 'plain text' }]
    expect(getOutermostOwner(list, 0)).toBeNull()
  })
})

describe('formatElementList - 嵌套控件', () => {
  it('外层 TEXT 的 value 含内层控件时保留内层 controlId', () => {
    const input: IElement[] = [
      {
        type: ElementType.CONTROL,
        value: '',
        control: {
          type: ControlType.TEXT,
          value: [
            { value: '结婚年龄：' },
            {
              type: ElementType.CONTROL,
              value: '',
              control: {
                type: ControlType.TEXT,
                value: null,
                placeholder: '年龄'
              }
            },
            { value: ' 岁' }
          ],
          placeholder: '结婚年龄'
        }
      }
    ]
    formatElementList(input, {
      editorOptions: mockOptions as any,
      isForceCompensation: true
    })
    const innerControlIds = new Set(
      input
        .filter(el => el.controlComponent === ControlComponent.PREFIX)
        .map(el => el.controlId)
    )
    expect(innerControlIds.size).toBe(2)
  })
})

describe('zipElementList - 嵌套控件', () => {
  it('外层 TEXT 含内层控件时正确压缩为嵌套结构', () => {
    const outerId = 'out-1'
    const innerId = 'in-1'
    const flat: IElement[] = [
      {
        type: ElementType.CONTROL,
        value: '{',
        controlId: outerId,
        controlComponent: ControlComponent.PREFIX,
        control: { type: ControlType.TEXT, value: null }
      },
      {
        type: ElementType.CONTROL,
        value: 'a',
        controlId: outerId,
        controlComponent: ControlComponent.VALUE,
        control: { type: ControlType.TEXT, value: null }
      },
      {
        type: ElementType.CONTROL,
        value: '{',
        controlId: innerId,
        controlComponent: ControlComponent.PREFIX,
        control: { type: ControlType.TEXT, value: null }
      },
      {
        type: ElementType.CONTROL,
        value: 'x',
        controlId: innerId,
        controlComponent: ControlComponent.VALUE,
        control: { type: ControlType.TEXT, value: null }
      },
      {
        type: ElementType.CONTROL,
        value: '}',
        controlId: innerId,
        controlComponent: ControlComponent.POSTFIX,
        control: { type: ControlType.TEXT, value: null }
      },
      {
        type: ElementType.CONTROL,
        value: 'b',
        controlId: outerId,
        controlComponent: ControlComponent.VALUE,
        control: { type: ControlType.TEXT, value: null }
      },
      {
        type: ElementType.CONTROL,
        value: '}',
        controlId: outerId,
        controlComponent: ControlComponent.POSTFIX,
        control: { type: ControlType.TEXT, value: null }
      }
    ]
    const zipped = zipElementList(flat)
    expect(zipped.length).toBe(1)
    expect(zipped[0].control).toBeDefined()
    expect(zipped[0].control!.value!.length).toBe(3)
    const innerElement = zipped[0].control!.value![1]
    expect(innerElement.type).toBe(ElementType.CONTROL)
    expect(innerElement.control).toBeDefined()
    expect(innerElement.control!.value!.length).toBe(1)
    expect(innerElement.control!.value![0].value).toBe('x')
  })

  it('外层含多个并列内层控件时不重复嵌套', () => {
    const outerId = 'out-1'
    const in1Id = 'in-1'
    const in2Id = 'in-2'
    const make = (
      id: string,
      comp: ControlComponent,
      value = ''
    ): IElement => ({
      type: ElementType.CONTROL,
      value,
      controlId: id,
      controlComponent: comp,
      control: { type: ControlType.TEXT, value: null }
    })
    const flat: IElement[] = [
      make(outerId, ControlComponent.PREFIX, '{'),
      make(outerId, ControlComponent.VALUE, 'a'),
      make(in1Id, ControlComponent.PREFIX, '{'),
      make(in1Id, ControlComponent.VALUE, 'x'),
      make(in1Id, ControlComponent.POSTFIX, '}'),
      make(outerId, ControlComponent.VALUE, 'b'),
      make(in2Id, ControlComponent.PREFIX, '{'),
      make(in2Id, ControlComponent.VALUE, 'y'),
      make(in2Id, ControlComponent.POSTFIX, '}'),
      make(outerId, ControlComponent.VALUE, 'c'),
      make(outerId, ControlComponent.POSTFIX, '}')
    ]
    const zipped = zipElementList(flat)
    expect(zipped.length).toBe(1)
    const outerValue = zipped[0].control!.value!
    // 期望结构: ['a', IN1, 'b', IN2, 'c']
    expect(outerValue.length).toBe(5)
    expect(outerValue[0].value).toBe('a')
    expect(outerValue[1].type).toBe(ElementType.CONTROL)
    expect(outerValue[1].control!.value!.length).toBe(1)
    expect(outerValue[1].control!.value![0].value).toBe('x')
    expect(outerValue[2].value).toBe('b')
    expect(outerValue[3].type).toBe(ElementType.CONTROL)
    expect(outerValue[3].control!.value!.length).toBe(1)
    expect(outerValue[3].control!.value![0].value).toBe('y')
    expect(outerValue[4].value).toBe('c')
  })
})

describe('formatElementList - 容器 hint 继承', () => {
  it('列表容器 hint 向下继承到子元素', () => {
    const list: any[] = [
      {
        type: ElementType.LIST,
        listType: ListType.UL,
        listStyle: ListStyle.DISC,
        hint: '这是一个列表项提示',
        valueList: [{ value: 'a' }]
      }
    ]
    formatElementList(list, { editorOptions: mockOptions })
    // 父 LIST 节点被展开后，子元素应继承 hint（文本被拆为单字）
    const child = list.find(el => el.value === 'a')
    expect(child?.hint).toBe('这是一个列表项提示')
  })

  it('超链接容器 hint 向下继承到子元素', () => {
    const list: any[] = [
      {
        type: ElementType.HYPERLINK,
        url: 'https://example.com',
        hint: '点击跳转',
        valueList: [{ value: 'a' }]
      }
    ]
    formatElementList(list, { editorOptions: mockOptions })
    const child = list.find(el => el.value === 'a')
    expect(child?.hint).toBe('点击跳转')
  })

  it('标题容器 hint 向下继承到子元素', () => {
    const list: any[] = [
      {
        type: ElementType.TITLE,
        level: TitleLevel.FIRST,
        hint: '标题说明',
        valueList: [{ value: 'a' }]
      }
    ]
    formatElementList(list, { editorOptions: mockOptions })
    const child = list.find(el => el.value === 'a')
    expect(child?.hint).toBe('标题说明')
  })

  it('子元素自身 hint 优先于容器 hint', () => {
    const list: any[] = [
      {
        type: ElementType.LIST,
        listType: ListType.UL,
        listStyle: ListStyle.DISC,
        hint: '容器提示',
        valueList: [{ value: 'a', hint: '子元素提示' }]
      }
    ]
    formatElementList(list, { editorOptions: mockOptions })
    const child = list.find(el => el.value === 'a')
    expect(child?.hint).toBe('子元素提示')
  })

  it('未配置 hint 的容器不污染子元素', () => {
    const list: any[] = [
      {
        type: ElementType.LIST,
        listType: ListType.UL,
        listStyle: ListStyle.DISC,
        valueList: [{ value: 'a' }]
      }
    ]
    formatElementList(list, { editorOptions: mockOptions })
    const child = list.find(el => el.value === 'a')
    expect(child?.hint).toBeUndefined()
  })

  it('控件元素 hint 向下继承到展开后的子元素', () => {
    const list: any[] = [
      {
        type: ElementType.CONTROL,
        value: '',
        hint: '请输入姓名',
        control: {
          type: ControlType.TEXT,
          value: null,
          placeholder: '姓名'
        }
      }
    ]
    formatElementList(list, { editorOptions: mockOptions as any })
    // 控件父节点展开为 prefix/placeholder/postfix 等子元素，均应继承 hint
    const controlChildren = list.filter(el => el.controlId)
    expect(controlChildren.length).toBeGreaterThan(0)
    for (const child of controlChildren) {
      expect(child.hint).toBe('请输入姓名')
    }
  })
})

describe('classifyParagraphLayout / textImage / multiImage', () => {
  const img = (src: string, extra: Partial<IElement> = {}): IElement => ({
    type: ElementType.IMAGE,
    value: src,
    width: 100,
    height: 80,
    ...extra
  })

  it('同一 p 内多样式文本包装为 paragraph.valueList', () => {
    const list = zipElementList(
      [
        { value: '你好', color: '#f00' },
        { value: '世界', size: 20 },
        { value: '！' }
      ],
      { isClassifyParagraphLayout: true }
    )
    expect(list).toHaveLength(1)
    expect(list[0].type).toBe(ElementType.PARAGRAPH)
    expect(list[0].valueList).toHaveLength(3)
    expect(list[0].valueList![0]).toMatchObject({
      value: '你好',
      color: '#f00'
    })
    expect(list[0].valueList![1]).toMatchObject({ value: '世界', size: 20 })
    expect(list[0].valueList![2].value).toBe('！')

    const dom = createDomFromElementList(list)
    const ps = [...dom.querySelectorAll('p')]
    expect(ps).toHaveLength(1)
    expect(ps[0].textContent).toBe('你好世界！')
  })

  it('单一样式文本不包装为 paragraph', () => {
    const list = zipElementList([{ value: '整段同色' }], {
      isClassifyParagraphLayout: true
    })
    expect(list).toHaveLength(1)
    expect(list[0].type).toBeUndefined()
    expect(list[0].value).toBe('整段同色')
    expect(list[0].valueList).toBeUndefined()
  })

  it('同一 p 内文本+图包装为 textImage', () => {
    const list = zipElementList(
      [{ value: '111' }, img('https://example.com/a.png')],
      { isClassifyParagraphLayout: true }
    )
    expect(list).toHaveLength(1)
    expect(list[0].type).toBe(ElementType.TEXT_IMAGE)
    expect(list[0].valueList).toHaveLength(2)
    expect(list[0].valueList![0].value).toBe('111')
    expect(list[0].valueList![1].type).toBe(ElementType.IMAGE)
  })

  it('同一 p 内文本+多张图全部进入同一个 textImage valueList', () => {
    const list = classifyParagraphLayout([
      { value: '标题文字' },
      img('https://example.com/1.png'),
      img('https://example.com/2.png'),
      img('https://example.com/3.png')
    ])
    expect(list).toHaveLength(1)
    expect(list[0].type).toBe(ElementType.TEXT_IMAGE)
    expect(list[0].valueList).toHaveLength(4)
    expect(list[0].valueList!.filter(el => el.type === ElementType.IMAGE)).toHaveLength(
      3
    )

    const dom = createDomFromElementList([
      { value: '标题文字' },
      img('https://example.com/1.png'),
      img('https://example.com/2.png'),
      img('https://example.com/3.png')
    ])
    const ps = [...dom.querySelectorAll('p')]
    expect(ps).toHaveLength(1)
    expect(ps[0].textContent).toContain('标题文字')
    expect(ps[0].querySelectorAll('img')).toHaveLength(3)
  })

  it('同一 p 内多张图包装为 multiImage', () => {
    const list = classifyParagraphLayout([
      img('https://example.com/1.png'),
      img('https://example.com/2.png')
    ])
    expect(list).toHaveLength(1)
    expect(list[0].type).toBe(ElementType.MULTI_IMAGE)
    expect(list[0].valueList).toHaveLength(2)
  })

  it('文本与图之间有换行时分成两段，不包装为 textImage', () => {
    const list = classifyParagraphLayout([
      { value: '正文' },
      { value: '\n' },
      img('https://example.com/a.png')
    ])
    expect(list.map(el => el.type || 'text')).toEqual([
      'text',
      ElementType.IMAGE
    ])
    expect(list[0].value).toBe('正文')
    expect(list.some(el => el.type === ElementType.TEXT_IMAGE)).toBe(false)
  })

  it('回车后跳出当前 p：文本内 \\n 后开新段，可与后续图组成新的 textImage', () => {
    const list = classifyParagraphLayout([
      { value: '第一段\n第二段' },
      img('https://example.com/a.png'),
      img('https://example.com/b.png')
    ])
    expect(list).toHaveLength(2)
    expect(list[0].type || 'text').toBe('text')
    expect(list[0].value).toBe('第一段')
    expect(list[1].type).toBe(ElementType.TEXT_IMAGE)
    expect(list[1].valueList![0].value).toBe('第二段')
    expect(
      list[1].valueList!.filter(el => el.type === ElementType.IMAGE)
    ).toHaveLength(2)
  })

  it('BLOCK 多图包装为 multiImage；正文与 BLOCK 图分行不打成 textImage', () => {
    const multi = classifyParagraphLayout([
      img('https://example.com/1.png', { imgDisplay: ImageDisplay.BLOCK }),
      img('https://example.com/2.png', { imgDisplay: ImageDisplay.BLOCK })
    ])
    expect(multi[0].type).toBe(ElementType.MULTI_IMAGE)

    const split = classifyParagraphLayout([
      { value: '正文' },
      { value: '\n' },
      img('https://example.com/a.png', { imgDisplay: ImageDisplay.BLOCK })
    ])
    expect(split.some(el => el.type === ElementType.TEXT_IMAGE)).toBe(false)
    expect(split.some(el => el.type === ElementType.IMAGE)).toBe(true)
  })

  it('formatElementList 展开后可再 zip+classify 往返', () => {
    const original: IElement[] = [
      { value: '前缀' },
      img('https://example.com/a.png')
    ]
    const packed = zipElementList(original, {
      isClassifyParagraphLayout: true
    })
    expect(packed[0].type).toBe(ElementType.TEXT_IMAGE)

    const flat = deepClonePacked(packed)
    formatElementList(flat, {
      editorOptions: mockOptions as any,
      isHandleFirstElement: false,
      isForceCompensation: false
    })
    expect(flat.some(el => el.type === ElementType.TEXT_IMAGE)).toBe(false)
    expect(flat.some(el => el.type === ElementType.IMAGE)).toBe(true)
    expect(getTextFromElementList(flat)).toContain('前缀')

    const again = zipElementList(flat, { isClassifyParagraphLayout: true })
    expect(again.some(el => el.type === ElementType.TEXT_IMAGE)).toBe(true)
  })

  it('createDomFromElementList 对 paragraph / textImage / multiImage 各输出单个 p', () => {
    const paragraphDom = createDomFromElementList([
      {
        type: ElementType.PARAGRAPH,
        value: '',
        valueList: [
          { value: '红', color: '#f00' },
          { value: '蓝', color: '#00f' }
        ]
      }
    ])
    const paragraphPs = [...paragraphDom.querySelectorAll('p')]
    expect(paragraphPs).toHaveLength(1)
    expect(paragraphPs[0].textContent).toBe('红蓝')

    const textImageDom = createDomFromElementList([
      {
        type: ElementType.TEXT_IMAGE,
        value: '',
        valueList: [
          { value: 'hello' },
          img('https://example.com/a.png'),
          img('https://example.com/b.png')
        ]
      }
    ])
    const textImagePs = [...textImageDom.querySelectorAll('p')]
    expect(textImagePs).toHaveLength(1)
    expect(textImagePs[0].textContent).toContain('hello')
    expect(textImagePs[0].querySelectorAll('img')).toHaveLength(2)

    const multiDom = createDomFromElementList([
      {
        type: ElementType.MULTI_IMAGE,
        value: '',
        valueList: [
          img('https://example.com/1.png'),
          img('https://example.com/2.png')
        ]
      }
    ])
    const multiPs = [...multiDom.querySelectorAll('p')]
    expect(multiPs).toHaveLength(1)
    expect(multiPs[0].querySelectorAll('img')).toHaveLength(2)
  })

  it('formatElementList 展开 paragraph 后可再 zip+classify 往返', () => {
    const original: IElement[] = [
      { value: 'A', color: '#f00' },
      { value: 'B', size: 18 }
    ]
    const packed = zipElementList(original, {
      isClassifyParagraphLayout: true
    })
    expect(packed[0].type).toBe(ElementType.PARAGRAPH)

    const flat = deepClonePacked(packed)
    formatElementList(flat, {
      editorOptions: mockOptions as any,
      isHandleFirstElement: false,
      isForceCompensation: false
    })
    expect(flat.some(el => el.type === ElementType.PARAGRAPH)).toBe(false)
    expect(getTextFromElementList(flat)).toContain('AB')

    const again = zipElementList(flat, { isClassifyParagraphLayout: true })
    expect(again[0].type).toBe(ElementType.PARAGRAPH)
    expect(again[0].valueList!.length).toBeGreaterThanOrEqual(2)
  })

  it('超链接在 classify 后仍保留 url / valueList', () => {
    const flat: IElement[] = [
      { value: '前' },
      {
        value: '链',
        type: ElementType.HYPERLINK,
        url: 'https://example.com',
        hyperlinkId: 'h1'
      },
      {
        value: '接',
        type: ElementType.HYPERLINK,
        url: 'https://example.com',
        hyperlinkId: 'h1'
      },
      { value: '后' }
    ]
    const packed = zipElementList(flat, { isClassifyParagraphLayout: true })
    const hyperlink = packed
      .flatMap(el => el.valueList || [el])
      .find(el => el.type === ElementType.HYPERLINK)
    expect(hyperlink).toBeDefined()
    expect(hyperlink!.url).toBe('https://example.com')
    expect(hyperlink!.valueList?.map(el => el.value).join('')).toBe('链接')
  })

  it('交叉引用锚点超链接（#titleId）在 classify 后仍保留', () => {
    const flat: IElement[] = [
      {
        value: '见图1',
        type: ElementType.HYPERLINK,
        url: '#title-abc',
        hyperlinkId: 'href1'
      }
    ]
    const packed = zipElementList(flat, { isClassifyParagraphLayout: true })
    expect(packed).toHaveLength(1)
    expect(packed[0].type).toBe(ElementType.HYPERLINK)
    expect(packed[0].url).toBe('#title-abc')
    expect(packed[0].valueList?.map(el => el.value).join('')).toBe('见图1')
  })

  it('日期元素在 classify 后仍保留 valueList', () => {
    const flat: IElement[] = [
      {
        value: '2024',
        type: ElementType.DATE,
        dateId: 'd1',
        dateFormat: 'yyyy'
      },
      {
        value: '-01',
        type: ElementType.DATE,
        dateId: 'd1',
        dateFormat: 'yyyy'
      }
    ]
    const packed = zipElementList(flat, { isClassifyParagraphLayout: true })
    expect(packed).toHaveLength(1)
    expect(packed[0].type).toBe(ElementType.DATE)
    expect(packed[0].valueList?.map(el => el.value).join('')).toBe('2024-01')
  })
})

function deepClonePacked(list: IElement[]): IElement[] {
  return JSON.parse(JSON.stringify(list)) as IElement[]
}
