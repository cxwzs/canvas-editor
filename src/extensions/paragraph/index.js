import NodeView from './node-view.vue'
import { VueNodeViewRenderer } from '@tiptap/vue-3'
import Paragraph from '@tiptap/extension-paragraph'

export default Paragraph.extend({
  addNodeView() {
    return VueNodeViewRenderer(NodeView)
  },
})
