<template>
  <node-view-wrapper
    class="umo-node-view"
    :data-node-id="props.node.attrs.nodeId"
  >
    <div class="umo-node-paragraph-action" v-show="showToolbar">
      <div
        class="umo-node-paragraph-action-item"
        v-for="item in btns"
        :key="item.value"
        @mousedown.prevent
        @click="onClickBtn(item.value)"
      >
        {{ item.label }}
      </div>
    </div>
    <div class="umo-node-paragraph-content">
      <node-view-content></node-view-content>
    </div>
  </node-view-wrapper>
</template>

<script setup lang="ts">
import { nodeViewProps, NodeViewWrapper, NodeViewContent } from '@tiptap/vue-3'
import { computed, onMounted, onUnmounted } from 'vue'
import {
  MessageEnum,
  MessageSourceEnum,
  sendMessageToMain,
  SendMessageToMainParamsType,
} from '@/qiankun'

const btns = [
  {
    label: '替换模板',
    value: MessageEnum.ReplaceTemplate,
  },
  {
    label: '替换素材',
    value: MessageEnum.ReplaceMaterial,
  },
  {
    label: '重新生成',
    value: MessageEnum.Regenerate,
  },
]

const props = defineProps(nodeViewProps)

const showToolbar = computed(() => {
  const { state, isFocused } = props.editor
  const { from } = state.selection

  const pos: any = props.getPos()
  const $pos = state.doc.resolve(pos)

  const isTopLevel = $pos.parent.type.name === 'doc'

  const inThisNode = from >= pos && from <= pos + props.node.nodeSize

  return isFocused && isTopLevel && inThisNode
})

/**
 * @description 点击操作按钮
 * @param msgType 消息类型
 */
const onClickBtn = (msgType: MessageEnum) => {
  sendMessageToMain({
    msgType,
    msgContent: {
      nodeId: props.node.attrs.nodeId,
    },
  })
}

/**
 * @description 替换节点内容
 * @param content 内容
 */
const replaceBlock = (content: any) => {
  const pos: any = props.getPos()
  const node: any = props.editor.state.doc.nodeAt(pos)
  props.editor
    .chain()
    .focus()
    .insertContentAt(
      {
        from: pos + 1,
        to: pos + node.nodeSize - 1,
      },
      content,
    )
    .run()
}

/**
 * @description 接收 主应用的 消息
 */
const onReceiveMainAppMessage = (e: any) => {
  if (e.detail.source === MessageSourceEnum.MainApp) {
    const { msgType, msgContent } = e.detail
      .content as SendMessageToMainParamsType
    if (msgContent.nodeId && msgContent.nodeId === props.node.attrs.nodeId) {
      switch (msgType) {
        case MessageEnum.ReplaceMaterial:
          console.log('替换素材', msgContent)
          replaceBlock(`${msgContent.content}<p></p>`)
          break
        case MessageEnum.ReplaceTemplate:
          console.log('替换模板', msgContent)
          replaceBlock(`${msgContent.content}<p></p>`)
          break
        default:
          break
      }
    }
  }
}

onMounted(() => {
  // 监听 来自主应用的 micro-message 事件
  window.addEventListener('micro-message', onReceiveMainAppMessage)
})

onUnmounted(() => {
  window.removeEventListener('micro-message', onReceiveMainAppMessage)
})
</script>

<style lang="less">
.umo-node-paragraph-content {
  width: 100%;
}

.umo-node-paragraph-action {
  max-width: 100%;
  position: absolute;
  top: -40px;
  left: 0;
  display: flex;
  align-items: center;
  column-gap: 10px;
  background-color: #fff;
  padding: 4px 16px;
  box-shadow:
    0 3px 14px 2px rgba(0, 0, 0, 0.03),
    0 8px 10px 1px rgba(0, 0, 0, 0.04),
    0 5px 5px -3px rgba(0, 0, 0, 0.08);
  border-radius: 4px;
  border: 1px solid rgba(0, 0, 0, 0.08);

  .umo-node-paragraph-action-item {
    cursor: pointer;
  }

  .umo-node-paragraph-action-item:hover {
    color: aqua;
  }
}
</style>
