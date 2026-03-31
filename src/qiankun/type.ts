import { MessageEnum } from './enum'
/**
 * @description 给主应用发消息 Func 参数 type
 */
export type SendMessageToMainParamsType = {
  msgType: MessageEnum
  msgContent?: any
}
