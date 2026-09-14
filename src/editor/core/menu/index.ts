import { BuiltinMenu } from './BuiltinMenu'
import { PluginFunction } from '../../interface/Plugin'

export const builtinMenuPlugin: PluginFunction<unknown> = editor => {
  const menu = new BuiltinMenu(editor)
  const originDestroy = editor.destroy
  editor.destroy = () => {
    menu.destroy()
    originDestroy()
  }
}

export { BuiltinMenu }
