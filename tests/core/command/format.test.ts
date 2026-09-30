import { describe, it, expect, afterEach } from 'vitest'
import { QuickFormatAction } from '@/editor/dataset/enum/QuickFormat'
import { createTestEditor } from '../../factories/editor'

describe('格式化命令', () => {
  let ctx: ReturnType<typeof createTestEditor>
  afterEach(() => ctx?.destroy())

  it('executeFormat 清除样式', () => {
    ctx = createTestEditor()
    ctx.editor.command.executeFocus()
    ctx.editor.command.executeInsertElementList([{ value: 'hello', bold: true, italic: true }])
    ctx.editor.command.executeSelectAll()
    ctx.editor.command.executeFormat()
    const data = ctx.editor.command.getValue().data.main
    expect(data?.some((e: any) => e.bold || e.italic)).toBe(false)
  })

  it('executeFont 改变字体', () => {
    ctx = createTestEditor()
    ctx.editor.command.executeFocus()
    ctx.editor.command.executeInsertElementList([{ value: 'hello' }])
    ctx.editor.command.executeSelectAll()
    ctx.editor.command.executeFont('Arial')
    const data = ctx.editor.command.getValue().data.main
    expect(data?.some((e: any) => e.font === 'Arial')).toBe(true)
  })

  it('executeSize 改变字号', () => {
    ctx = createTestEditor()
    ctx.editor.command.executeFocus()
    ctx.editor.command.executeInsertElementList([{ value: 'hello' }])
    ctx.editor.command.executeSelectAll()
    ctx.editor.command.executeSize(20)
    const data = ctx.editor.command.getValue().data.main
    expect(data?.some((e: any) => e.size === 20)).toBe(true)
  })

  it('executeColor 改变颜色', () => {
    ctx = createTestEditor()
    ctx.editor.command.executeFocus()
    ctx.editor.command.executeInsertElementList([{ value: 'hello' }])
    ctx.editor.command.executeSelectAll()
    ctx.editor.command.executeColor('#ff0000')
    const data = ctx.editor.command.getValue().data.main
    expect(data?.some((e: any) => e.color === '#ff0000')).toBe(true)
  })

  it('executeHighlight 改变高亮', () => {
    ctx = createTestEditor()
    ctx.editor.command.executeFocus()
    ctx.editor.command.executeInsertElementList([{ value: 'hello' }])
    ctx.editor.command.executeSelectAll()
    ctx.editor.command.executeHighlight('#ffff00')
    const data = ctx.editor.command.getValue().data.main
    expect(data?.some((e: any) => e.highlight === '#ffff00')).toBe(true)
  })

  it('executeQuickFormat 无选区时对全文删除段首空格并缩进', () => {
    ctx = createTestEditor({
      data: {
        header: [],
        main: [
          { value: '\n' },
          { value: ' ' },
          { value: 'a' },
          { value: '\n' },
          { value: ' ' },
          { value: 'b' }
        ],
        footer: []
      }
    })
    ctx.editor.command.executeFocus()
    ctx.editor.command.executeQuickFormat(QuickFormatAction.SMART_FORMAT)
    const text = ctx.editor.command.getText().main
    expect(text.replace(/^\n/, '')).toBe('a\nb')
    const data = ctx.editor.command.getValue().data.main
    expect(data?.some((e: any) => e.textIndent === 2)).toBe(true)
  })

  it('executeQuickFormat 有选区时仅处理选中段落', () => {
    ctx = createTestEditor({
      data: {
        header: [],
        main: [
          { value: '\n' },
          { value: '1' },
          { value: '.' },
          { value: ' ' },
          { value: 'a' },
          { value: '\n' },
          { value: '2' },
          { value: '.' },
          { value: ' ' },
          { value: 'b' }
        ],
        footer: []
      }
    })
    ctx.editor.command.executeFocus()
    // 选中第一段内容
    ctx.editor.command.executeSetRange(1, 4)
    ctx.editor.command.executeQuickFormat(QuickFormatAction.REMOVE_NUMBER)
    const text = ctx.editor.command.getText().main
    expect(text.replace(/^\n/, '')).toBe('a\n2. b')
  })
})
