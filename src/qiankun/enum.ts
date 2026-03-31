/**
 * @description 消息类型 enum
 */
export enum MessageEnum {
  SaveBid = 'saveBid', // 保存标书
  ReplaceText = 'replace', // 替换文本
  InsertText = 'insert', // 插入文本
  initEditorSuccess = 'initEditorSuccess', // 编辑器初始化成功
  IsShowOutlineTree = 'isShowOutlineTree', // 是否显示大纲树
  IsShowPuglins = 'isShowPlugins', // 是否显示插件
  BidContent = 'bidContent', // 标书内容
  ReplaceMaterial = 'replaceMaterial', // 替换素材
  ReplaceTemplate = 'replaceTemplate', // 替换模板
  Regenerate = 'regenerate', // 重新生成
}

/**
 * @description 消息来源 enum
 */
export enum MessageSourceEnum {
  MainApp = 'main-app', // 主应用
}
