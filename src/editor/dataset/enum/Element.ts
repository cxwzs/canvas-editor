export enum ElementType {
  TEXT = 'text',
  IMAGE = 'image',
  TABLE = 'table',
  HYPERLINK = 'hyperlink',
  SUPERSCRIPT = 'superscript',
  SUBSCRIPT = 'subscript',
  SEPARATOR = 'separator',
  PAGE_BREAK = 'pageBreak',
  CONTROL = 'control',
  AREA = 'area',
  CHECKBOX = 'checkbox',
  RADIO = 'radio',
  LATEX = 'latex',
  TAB = 'tab',
  DATE = 'date',
  BLOCK = 'block',
  TITLE = 'title',
  LIST = 'list',
  LABEL = 'label',
  /** 文本段落（同一 <p> 内多样式文本，如局部颜色/字号） */
  PARAGRAPH = 'paragraph',
  /** 图文混排段落（同一 <p> 内文本 + 图片） */
  TEXT_IMAGE = 'textImage',
  /** 多图并排段落（同一 <p> 内多张图片） */
  MULTI_IMAGE = 'multiImage'
}
