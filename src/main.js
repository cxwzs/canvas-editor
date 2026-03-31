import { createApp } from 'vue'

import App from './app.vue'
import { useUmoEditor } from './components'

import {
  renderWithQiankun,
  qiankunWindow,
} from 'vite-plugin-qiankun/dist/helper'

let instance = null

// const app = createApp(App)

const options = {}

// app.use(useUmoEditor, options)

// app.mount('#app')

const render = (props) => {
  // 如果有 container，说明是被 qiankun 加载，挂载到 container 中
  // 否则是独立运行，挂载到 #app
  const root =
    props && props.container
      ? props.container.querySelector('#app')
      : document.querySelector('#app')

  if (!root) {
    console.error('❌ mount 失败：找不到 #app')
    return
  }

  instance = createApp(App)

  instance.use(useUmoEditor, options)

  // 关键点：如果是子应用模式，需要设置 router 的 base
  if (props && props.base) {
    // 动态设置 base，确保子应用路由正确
    // 注意：Vue Router 4 需要在创建实例时或导航前设置
    // 这里简单处理，实际项目中建议在 router 配置里动态处理
  }

  instance.mount(root)
}

// 独立运行时直接渲染
if (!qiankunWindow.__POWERED_BY_QIANKUN__) {
  render()
}

renderWithQiankun({
  bootstrap() {
    console.log('[umo-editor] bootstraped')
  },
  mount(props) {
    console.log('[umo-editor] props from main app', props)
    // 存储全局状态通信方法
    // props.onGlobalStateChange && props.onGlobalStateChange(...)
    render(props)
  },
  update() {
    console.log('[umo-editor] updated')
  },
  unmount() {
    console.log('[umo-editor] unmounting')
    if (instance) {
      instance.unmount()
      instance._container.innerHTML = ''
      instance = null
    }
  },
})
