<template>
  <t-dropdown
    placement="bottom-right"
    overlay-class-name="umo-block-menu-dropdown"
    :max-height="320"
    trigger="click"
    :destroy-on-close="false"
    :popup-props="popupProps"
  >
    <menus-button
      class="umo-block-menu-button"
      :menu-active="menuActive"
      ico="block-add"
      hide-text
    />
    <t-dropdown-menu>
      <t-dropdown-item>
        <menus-button
          text="替换素材"
          :tooltip="false"
          @menu-click="onReplaceMaterial"
        />
      </t-dropdown-item>
      <t-dropdown-item>
        <menus-button
          text="替换模板"
          :tooltip="false"
          @menu-click="onReplaceTemplate"
        />
      </t-dropdown-item>
      <t-dropdown-item>
        <menus-button
          text="重新生成"
          :tooltip="false"
          @menu-click="onResetCreate"
        />
      </t-dropdown-item>
    </t-dropdown-menu>
  </t-dropdown>
</template>

<script setup>
import { sendMessageToMain, MessageEnum } from '@/qiankun'

const props = defineProps({
  node: {
    type: Object,
    default: null,
  },
  pos: {
    type: Number,
    default: null,
  },
})
const emits = defineEmits(['dropdown-visible'])

const container = inject('container')
const options = inject('options')
const editor = inject('editor')
const uploadFileMap = inject('uploadFileMap')
const blockMenu = inject('blockMenu')

let menuActive = $ref(false)
const popupProps = {
  attach: `${container} .umo-main-container`,
  popperOptions: {
    modifiers: [{ name: 'offset', options: { offset: [2, 0] } }],
  },
  onVisibleChange(visible) {
    blockMenu.value = visible
    menuActive = visible
    editor.value
      ?.chain()
      .selectTextblockEnd()
      .selectNodeForward()
      .focus(props.pos)
      .run()
    emits('dropdown-visible', visible)
  },
}

const disableMenu = (name) => {
  return options.value.disableExtensions.includes(name)
}

const insertImage = () => {
  editor.value
    ?.chain()
    .focus()
    .selectFiles('image', container, uploadFileMap.value)
    .run()
}

const setTemplate = ({ content }) => {
  if (!content || !editor.value) {
    return
  }
  editor.value.commands.insertContent(content)
}

/**
 * @description 替换素材
 */
const onReplaceMaterial = () => {
  // console.log('replace Material', props.pos)
  sendMessageToMain({
    msgType: MessageEnum.ReplaceMaterial,
  })
}

/**
 * @description 替换模板
 */
const onReplaceTemplate = () => {
  // console.log('replace Template', props.pos)
  sendMessageToMain({
    msgType: MessageEnum.ReplaceTemplate,
  })
}

/**
 * @description 重新生成
 */
const onResetCreate = () => {
  const content =
    editor.value?.state.selection.$from.nodeAfter?.textContent || ''
  console.log('reset create', content)
}
</script>

<style lang="less"></style>
