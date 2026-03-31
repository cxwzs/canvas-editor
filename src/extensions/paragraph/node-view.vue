<template>
  <node-view-wrapper class="umo-node-view">
    <div class="umo-node-paragraph">
      <div class="umo-node-paragraph-action" v-if="showToolbar">
        <div class="umo-node-paragraph-action-item">替换模板</div>
      </div>
      <node-view-content></node-view-content>
    </div>
  </node-view-wrapper>
</template>

<script setup>
import { nodeViewProps, NodeViewWrapper, NodeViewContent } from '@tiptap/vue-3'
import { computed } from 'vue'

const props = defineProps(nodeViewProps)

const showToolbar = computed(() => {
  const { state, isFocused } = props.editor
  const { from } = state.selection
  const pos = props.getPos()

  // 👇 光标在当前段落内
  const inThisNode = from >= pos && from <= pos + props.node.nodeSize

  // 👇 必须编辑器有焦点
  return isFocused && inThisNode
})
</script>

<style lang="less">
.umo-node-view {
  .umo-node-paragraph {
    width: 100%;
    position: relative;

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
  }
}
</style>
