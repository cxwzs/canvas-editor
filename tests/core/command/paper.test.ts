import { describe, it, expect, afterEach } from 'vitest'
import { ElementType } from '../../../src/editor/dataset/enum/Element'
import { PaperDirection } from '../../../src/editor/dataset/enum/Editor'
import { createTestEditor } from '../../factories/editor'

describe('纸张与页面命令', () => {
  let ctx: ReturnType<typeof createTestEditor>
  afterEach(() => ctx?.destroy())

  it('executePaperSize 改变纸张尺寸', () => {
    ctx = createTestEditor()
    ctx.editor.command.executePaperSize(500, 700)
    expect(ctx.editor.command.getOptions().width).toBe(500)
    expect(ctx.editor.command.getOptions().height).toBe(700)
  })

  it('executePaperDirection 切换方向', () => {
    ctx = createTestEditor()
    ctx.editor.command.executePaperDirection(PaperDirection.HORIZONTAL)
    expect(ctx.editor.command.getOptions().paperDirection).toBe('horizontal')
  })

  it('executeSetPaperMargin 设置页边距', () => {
    ctx = createTestEditor()
    ctx.editor.command.executeSetPaperMargin([60, 60, 60, 60])
    const margins = ctx.editor.command.getOptions().margins
    expect(margins).toEqual([60, 60, 60, 60])
  })

  it('executePaperSize 后表格随正文宽度等比恢复', () => {
    // 默认 794 宽、边距 [100,120,100,120] => 正文 554
    ctx = createTestEditor({
      data: {
        header: [],
        main: [
          {
            type: ElementType.TABLE,
            value: '',
            colgroup: [{ width: 277 }, { width: 277 }],
            trList: [
              {
                height: 42,
                tdList: [
                  {
                    colspan: 1,
                    rowspan: 1,
                    value: [{ value: '\n' }]
                  },
                  {
                    colspan: 1,
                    rowspan: 1,
                    value: [{ value: '\n' }]
                  }
                ]
              }
            ]
          },
          { value: '\n' }
        ],
        footer: []
      },
      options: { table: { overflow: false } }
    })
    const getTable = () =>
      ctx.editor.command
        .getValue()
        .data.main.find(el => el.type === ElementType.TABLE)!

    // 缩小纸张：表格应等比缩小
    ctx.editor.command.executePaperSize(500, 700)
    // 正文宽度 = 500 - 120 - 120 = 260
    const shrunk = getTable()
    const shrunkWidth =
      (shrunk.colgroup?.[0].width || 0) + (shrunk.colgroup?.[1].width || 0)
    expect(shrunkWidth).toBeCloseTo(260, 0)

    // 恢复纸张：表格应等比恢复到原正文宽度
    ctx.editor.command.executePaperSize(794, 1123)
    const restored = getTable()
    const restoredWidth =
      (restored.colgroup?.[0].width || 0) + (restored.colgroup?.[1].width || 0)
    expect(restoredWidth).toBeCloseTo(554, 0)
  })

  it('executeSetPaperMargin 后图片随页宽自适应可恢复', () => {
    ctx = createTestEditor({
      data: {
        header: [],
        main: [
          {
            type: ElementType.IMAGE,
            value: 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
            width: 500,
            height: 250
          },
          { value: '\n' }
        ],
        footer: []
      }
    })
    const getImage = () =>
      ctx.editor.command
        .getValue()
        .data.main.find(el => el.type === ElementType.IMAGE)!

    // 加大页边距，正文变窄，图片应被压缩
    ctx.editor.command.executeSetPaperMargin([100, 200, 100, 200])
    // 正文宽度 = 794 - 200 - 200 = 394
    const shrunk = getImage()
    expect(shrunk.width!).toBeLessThanOrEqual(394)
    expect(shrunk.width!).toBeCloseTo(394, 0)

    // 恢复页边距，图片应回到设计尺寸 500
    ctx.editor.command.executeSetPaperMargin([100, 120, 100, 120])
    const restored = getImage()
    expect(restored.width).toBe(500)
    expect(restored.height).toBe(250)
  })
})
