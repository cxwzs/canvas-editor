/** 图片 / PDF 菜单上传限制；true 或对象均显示按钮 */
export interface IMenuUploadOption {
  /** 允许的文件类型，同 input[accept]。未配置时使用默认值 */
  accept?: string
  /** 单文件大小上限（字节）。未配置或 0 表示不限制 */
  maxSize?: number
}

/** 内置菜单栏操作按钮显示开关，默认均为 true */
export interface IMenuOption {
  undo?: boolean
  redo?: boolean
  painter?: boolean
  format?: boolean
  font?: boolean
  size?: boolean
  sizeAdd?: boolean
  sizeMinus?: boolean
  bold?: boolean
  italic?: boolean
  underline?: boolean
  strikeout?: boolean
  superscript?: boolean
  subscript?: boolean
  color?: boolean
  highlight?: boolean
  title?: boolean
  left?: boolean
  center?: boolean
  right?: boolean
  alignment?: boolean
  justify?: boolean
  increaseIndent?: boolean
  decreaseIndent?: boolean
  rowMargin?: boolean
  list?: boolean
  table?: boolean
  /** true / 对象显示，false 隐藏；对象可配置 accept、maxSize */
  image?: boolean | IMenuUploadOption
  /** true / 对象显示，false 隐藏；对象可配置 accept、maxSize */
  pdf?: boolean | IMenuUploadOption
  hyperlink?: boolean
  separator?: boolean
  watermark?: boolean
  codeblock?: boolean
  pageBreak?: boolean
  control?: boolean
  checkbox?: boolean
  radio?: boolean
  latex?: boolean
  date?: boolean
  block?: boolean
  search?: boolean
  print?: boolean
  quickFormat?: boolean
}

/** 内置底部工具栏操作按钮显示开关，默认均为 true */
export interface IFooterBarOption {
  catalog?: boolean
  pageMode?: boolean
  pageNoList?: boolean
  pageNo?: boolean
  wordCount?: boolean
  rowNo?: boolean
  colNo?: boolean
  editorMode?: boolean
  pageScaleMinus?: boolean
  pageScalePercentage?: boolean
  pageScaleAdd?: boolean
  paperSize?: boolean
  paperDirection?: boolean
  paperMargin?: boolean
  column?: boolean
  ruler?: boolean
  fullscreen?: boolean
  editorOption?: boolean
}
