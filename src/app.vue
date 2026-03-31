<template>
  <div class="examples">
    <div class="box">
      <umo-editor ref="editorRef" v-bind="options"></umo-editor>
    </div>
    <!-- 底部 操作 菜单 -->
    <div class="footer-actions">
      <div class="footer-actions-item" @click="onClickOutlineTree">大纲</div>
      <div class="footer-actions-item" @click="onChangeShowPlugin">AI助手</div>
    </div>
    <!-- <div class="box">
      <umo-editor editor-key="testaaa" :toolbar="{ defaultMode: 'classic' }" />
    </div> -->
  </div>
</template>

<script setup lang="ts">
import { shortId } from '@/utils/short-id'
import {
  sendMessageToMain,
  MessageEnum,
  type SendMessageToMainParamsType,
  MessageSourceEnum,
} from '@/qiankun'
import { UploadApi } from '@/services/upload'
import { onMounted, onUnmounted, watch } from 'vue'
import { ReplaceNextNode } from '@/extensions/replaceParagraph'

const editorRef = $ref(null)
const templates = [
  {
    title: '工作任务',
    description: '工作任务模板',
    content:
      '<h1>工作任务</h1><h3>任务名称：</h3><p>[任务的简短描述]</p><h3>负责人：</h3><p>[执行任务的个人姓名]</p><h3>截止日期：</h3><p>[任务需要完成的日期]</p><h3>任务详情：</h3><ol><li>[任务步骤1]</li><li>[任务步骤2]</li><li>[任务步骤3]...</li></ol><h3>目标：</h3><p>[任务需要达成的具体目标或结果]</p><h3>备注：</h3><p>[任何额外信息或注意事项]</p>',
  },
  {
    title: '工作周报',
    description: '工作周报模板',
    content:
      '<h1>工作周报</h1><h2>本周工作总结</h2><hr /><h3>已完成工作：</h3><ul><li>[任务1名称]：[简要描述任务内容及完成情况]</li><li>[任务2名称]：[简要描述任务内容及完成情况]</li><li>...</li></ul><h3>进行中工作：</h3><ul><li>[任务1名称]：[简要描述任务当前进度和下一步计划]</li><li>[任务2名称]：[简要描述任务当前进度和下一步计划]</li><li>...</li></ul><h3>问题与挑战：</h3><ul><li>[问题1]：[描述遇到的问题及当前解决方案或需要的支持]</li><li>[问题2]：[描述遇到的问题及当前解决方案或需要的支持]</li><li>...</li></ul><hr /><h2>下周工作计划</h2><h3>计划开展工作：</h3><ul><li>[任务1名称]：[简要描述下周计划开始的任务内容]</li><li>[任务2名称]：[简要描述下周计划开始的任务内容]</li><li>...</li></ul><h3>需要支持与资源：</h3><ul><li>[资源1]：[描述需要的资源或支持]</li><li>[资源2]：[描述需要的资源或支持]</li><li>...</li></ul>',
  },
]
const options = $ref({
  // theme: 'auto',
  // skin: 'modern',
  toolbar: {
    defaultMode: 'classic',
    menus: ['base', 'insert', 'table', 'tools', 'page'],
  },
  document: {
    title: '',
    content: '',
    enableBubbleMenu: false,
    enableBlockMenu: false,
    // structure: 'heading block*',
  },
  page: {
    layouts: ['page', 'web'],
    showBookmark: true,
  },
  templates,
  cdnUrl: `${location.origin}/umo-editor/editor-external`,
  shareUrl: 'https://www.umodoc.com',
  file: {
    // allowedMimeTypes: [
    //   'application/pdf',
    //   'image/svg+xml',
    //   'video/mp4',
    //   'audio/*',
    // ],
  },
  // https://dev.umodoc.com/cn/docs/options/extensions#disableextensions
  disableExtensions: [],
  async onFileUpload(file: File) {
    const res: any = await UploadApi(file, () => {})
    const { success, message: msg, result } = res
    if (success) {
      return {
        id: result.id,
        url: result.url,
      }
    } else {
    }
  },
  onFileDelete(id: number, url: string, type: string) {
    console.log(id, url, type)
  },
  extensions: [ReplaceNextNode],
})

/**
 * @description 接收 主应用的 消息
 */
const onReceiveMainAppMessage = (e: any) => {
  if (e.detail.source === MessageSourceEnum.MainApp) {
    const { msgType, msgContent } = e.detail
      .content as SendMessageToMainParamsType
    switch (msgType) {
      case MessageEnum.ReplaceText:
        editorRef.useMessage('warning', { content: '替换' })
        break
      case MessageEnum.InsertText:
        editorRef.useMessage('warning', { content: '插入' })
        break
      case MessageEnum.SaveBid:
        sendMessageToMain({
          msgType: MessageEnum.BidContent,
          msgContent: editorRef.getHTML(),
        })
        break
      case MessageEnum.ReplaceMaterial:
        console.log('替换素材', msgContent)
        break
      case MessageEnum.ReplaceTemplate:
        console.log('替换模板', msgContent)
        editorRef.useEditor().commands.replaceNextNode(msgContent)
        break
      default:
        editorRef.useMessage('warning', { content: '未知操作' })
        break
    }
  }
}

// 改变 大纲模块 显示状态
const onClickOutlineTree = () => {
  sendMessageToMain({
    msgType: MessageEnum.IsShowOutlineTree,
  })
}

// 改变 插件模块 显示状态
const onChangeShowPlugin = () => {
  sendMessageToMain({
    msgType: MessageEnum.IsShowPuglins,
  })
}

watch(
  () => editorRef,
  () => {
    // 编辑器加载完成
    sendMessageToMain({
      msgType: MessageEnum.initEditorSuccess,
      msgContent: '编辑器初始化成功',
    })
  },
)

onMounted(() => {
  // 监听 来自主应用的 micro-message 事件
  window.addEventListener('micro-message', onReceiveMainAppMessage)
})

onUnmounted(() => {
  window.removeEventListener('micro-message', onReceiveMainAppMessage)
})
</script>

<style>
html,
body {
  padding: 0;
  margin: 0;
  height: 100%;
  overflow: hidden;
}
#app {
  width: 100%;
  height: 100%;
}
.examples {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
}
.box {
  border: solid 1px #ddd;
  box-sizing: border-box;
  position: relative;
  width: 100%;
  flex: 1;
  overflow-y: auto;
}
.footer-actions {
  width: 100%;
  padding: 10px;
  background-color: #fff;
  display: flex;
  align-items: center;
  column-gap: 10px;
  border-top: 1px solid var(--umo-border-color);

  .footer-actions-item {
    color: #333;
    cursor: pointer;
  }

  .footer-actions-item:hover {
    color: #409eff;
  }
}
</style>
