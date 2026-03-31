import { type SendMessageToMainParamsType } from './type' 
/**
 * @description 给主应用发消息
 */
export const sendMessageToMain = (params: SendMessageToMainParamsType) => {
  window.dispatchEvent(new CustomEvent('micro-message', {
    detail: {
      source: 'sub-app-umi-editor',
      content: params
    }
  }))
}