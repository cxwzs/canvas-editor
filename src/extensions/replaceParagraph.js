import { Extension } from '@tiptap/core'

// 替换 整个段落
export const ReplaceNextNode = Extension.create({
  name: 'replaceNextNode',

  addCommands() {
    return {
      replaceNextNode:
        (content) =>
        ({ state, chain }) => {
          const { $from } = state.selection

          // 判断是否有 next node
          const hasNextNode = $from.nodeAfter

          if (!hasNextNode) {
            return chain().insertContent(content).run()
          }

          return chain()
            .focus()
            .selectTextblockEnd()
            .selectNodeForward()
            .insertContent(content)
            .run()
        },
    }
  },
})
