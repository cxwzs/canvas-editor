import NodeView from './node-view.vue'
import { VueNodeViewRenderer } from '@tiptap/vue-3'
import { Node } from '@tiptap/core'
import { Plugin } from 'prosemirror-state'
import { v4 as uuidv4 } from 'uuid'

export const BlockNode = Node.create({
  name: 'block',

  group: 'block',
  content: 'blockContent', // 👈 关键

  parseHTML() {
    return [{ tag: 'div[data-type="block"]' }]
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', { ...HTMLAttributes, 'data-type': 'block' }, 0]
  },

  addNodeView() {
    return VueNodeViewRenderer(NodeView)
  },

  addAttributes() {
    return {
      nodeId: {
        default: null,
      }
    }
  },

  // 👉 Enter：在当前 block 后新增一个 block
  addKeyboardShortcuts() {
    return {
      Enter: ({ editor }) => {
        const { state } = editor
        const { $from } = state.selection

        const isAtEnd =
          $from.parentOffset === $from.parent.content.size

        if (!isAtEnd) return false

        return editor
          .chain()
          .insertContent({
            type: 'block',
            content: [{ type: 'paragraph' }],
          })
          .run()
      },
    }
  },
})

export const blockIdPlugin = new Plugin({
  appendTransaction: (transactions, oldState, newState) => {
    let tr = newState.tr
    let modified = false

    newState.doc.descendants((node, pos) => {
      if (node.type.name === 'block' && !node.attrs.nodeId) {
        tr = tr.setNodeMarkup(pos, undefined, {
          ...node.attrs,
          nodeId: uuidv4(),
        })
        modified = true
      }
    })

    return modified ? tr : null
  },
})