import Vue from '@vitejs/plugin-vue'
import ReactivityTransform from '@vue-macros/reactivity-transform/vite'
import AutoImport from 'unplugin-auto-import/vite'
import { TDesignResolver } from 'unplugin-vue-components/resolvers'
import Components from 'unplugin-vue-components/vite'
import VueMacros from 'unplugin-vue-macros/vite'
import { defineConfig } from 'vite'
import { createSvgIconsPlugin } from 'vite-plugin-svg-icons'

import pkg from './package.json'
import copyright from './src/utils/copyright'
import qiankun from 'vite-plugin-qiankun'

const useQiankun = qiankun('umo-editor', {
  useDevMode: true, // 开启开发模式，允许热更新
})

// Plugin configurations
const vuePlugins = {
  VueMacros: VueMacros({
    plugins: {
      vue: Vue(),
    },
  }),
  AutoImport: AutoImport({
    dirs: ['./src/composables'],
    imports: ['vue', '@vueuse/core'],
    resolvers: [TDesignResolver({ library: 'vue-next', esm: true })],
    dts: './types/imports.d.ts',
    dtsMode: 'overwrite',
  }),
  Components: Components({
    directoryAsNamespace: true,
    dirs: ['./src/components'],
    resolvers: [TDesignResolver({ library: 'vue-next', esm: true })],
    dts: './types/components.d.ts',
  }),
  SvgIcons: createSvgIconsPlugin({
    iconDirs: [`${process.cwd()}/src/assets/icons`],
    symbolId: 'umo-icon-[name]',
    customDomId: 'umo-icons',
  }),
}

// Build configuration
const buildConfig = {
  target: 'es2018',
  lib: {
    entry: `${process.cwd()}/src/components/index.js`,
    name: pkg.name,
    fileName: 'umo-editor',
  },
  outDir: 'dist',
  copyPublicDir: false,
  minify: 'esbuild',
  cssMinify: true,
  rollupOptions: {
    output: [
      {
        banner: copyright,
        intro: `import './umo-editor.css'`,
        format: 'es',
      },
    ],
    external: [
      'vue',
      /^@vueuse\/.*/,
      /^@tiptap\/.*/,
      /^prosemirror-*/,
      /^nzh\/.*/,
      ...Object.keys(pkg.dependencies),
    ],
    onwarn(warning, warn) {
      if (warning.code === 'UNUSED_EXTERNAL_IMPORT') return
      warn(warning)
    },
  },
  cssCodeSplit: false,
  modulePreload: false,
}

const cssConfig = {
  preprocessorOptions: {
    less: {
      modifyVars: { '@prefix': 'umo' },
      javascriptEnabled: true,
      // 添加 Less 插件来排除特定类名
      plugins: [
        {
          install(less, pluginManager) {
            pluginManager.addPostProcessor({
              process(css) {
                return css.replace(/\.flex-center(\s|\{|,)[^}]*\}/g, '')
              },
            })
          },
        },
      ],
    },
  },
}

export default defineConfig({
  base: '/umo-editor',
  plugins: [ReactivityTransform(), ...Object.values(vuePlugins), useQiankun],
  css: cssConfig,
  build: buildConfig,
  esbuild: {
    drop: ['debugger'],
  },
  resolve: {
    alias: {
      '@': `${process.cwd()}/src`,
    },
  },
  server: {
    port: 8080,
    host: true,
    open: true,
    cors: true, // 必须开启跨域
    headers: {
      'Access-Control-Allow-Origin': '*', // 允许主应用跨域访问
    },
    proxy: {
      // https://cn.vitejs.dev/config/#server-proxy
      '/api': {
        target: 'http://58.33.114.130:9402',
        changeOrigin: true,
      },
    },
    // hmr: {
    //   overlay: false,
    // }
  },
})
