export enum QuickFormatAction {
  /** 删除段首空格 + 首行缩进 2 字符 */
  SMART_FORMAT = 'smartFormat',
  /** 删除空白段落 */
  DELETE_BLANK_PARAGRAPHS = 'deleteBlankParagraphs',
  /** 删除段首空格 */
  REMOVE_LEADING_SPACES = 'removeLeadingSpaces',
  /** 删除所有空格 */
  REMOVE_SPACES = 'removeSpaces',
  /** 段落首行缩进 2 个字符（textIndent） */
  INDENT_2_EM = 'indent2Em',
  /** 段落首行缩进空格（清除 textIndent，插入全角空格） */
  INDENT_SPACE = 'indentSpace',
  /** 清除段落前的手工编号 */
  REMOVE_NUMBER = 'removeNumber'
}
