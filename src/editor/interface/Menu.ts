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
  rowMargin?: boolean
  list?: boolean
  table?: boolean
  image?: boolean
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
