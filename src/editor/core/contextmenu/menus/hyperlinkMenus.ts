import { Dialog } from '../../../../components/dialog/Dialog'
import { INTERNAL_CONTEXT_MENU_KEY } from '../../../dataset/constant/ContextMenu'
import { ElementType } from '../../../dataset/enum/Element'
import {
  IRegisterContextMenu
} from '../../../interface/contextmenu/ContextMenu'
import {
  flattenCatalogOptions,
  getAnchorTitleId,
  isAnchorHyperlink
} from '../../../utils/catalog'
import { Command } from '../../command/Command'
import { showToast } from '../../toast/Toast'

const {
  HYPERLINK: { DELETE, CANCEL, EDIT }
} = INTERNAL_CONTEXT_MENU_KEY

async function openCrossReferenceEditDialog(command: Command, url: string) {
  const catalog = await command.getCatalog()
  if (!catalog?.length) {
    showToast(command.getContainer(), '当前文档暂无目录，请先设置标题')
    return
  }
  const catalogOptions = flattenCatalogOptions(catalog)
  const nameMap = new Map(catalogOptions.map(item => [item.value, item.name]))
  const currentId = getAnchorTitleId(url)
  const selectedId = catalogOptions.some(item => item.value === currentId)
    ? currentId
    : catalogOptions[0].value
  new Dialog({
    title: '交叉引用',
    data: [
      {
        type: 'select',
        label: '目录',
        name: 'catalogId',
        required: true,
        value: selectedId,
        options: catalogOptions.map(({ label, value }) => ({
          label,
          value
        }))
      }
    ],
    onConfirm: payload => {
      const catalogId = payload.find(p => p.name === 'catalogId')?.value
      if (!catalogId) return
      const name = nameMap.get(catalogId)
      if (!name) return
      command.executeEditHyperlink({
        url: `#${catalogId}`,
        name
      })
    }
  })
}

function openHyperlinkEditDialog(
  command: Command,
  info: { url: string; text: string }
) {
  new Dialog({
    title: '超链接',
    data: [
      {
        type: 'text',
        label: '文本',
        name: 'name',
        required: true,
        placeholder: '请输入文本',
        value: info.text
      },
      {
        type: 'text',
        label: '链接',
        name: 'url',
        required: true,
        placeholder: '请输入链接',
        value: info.url
      }
    ],
    onConfirm: payload => {
      const name = payload.find(p => p.name === 'name')?.value
      if (!name) return
      const nextUrl = payload.find(p => p.name === 'url')?.value
      if (!nextUrl) return
      command.executeEditHyperlink({
        url: nextUrl,
        name
      })
    }
  })
}

export const hyperlinkMenus: IRegisterContextMenu[] = [
  {
    key: DELETE,
    i18nPath: 'contextmenu.hyperlink.delete',
    when: payload => {
      return (
        !payload.isReadonly &&
        payload.startElement?.type === ElementType.HYPERLINK
      )
    },
    callback: (command: Command) => {
      command.executeDeleteHyperlink()
    }
  },
  {
    key: CANCEL,
    i18nPath: 'contextmenu.hyperlink.cancel',
    when: payload => {
      return (
        !payload.isReadonly &&
        payload.startElement?.type === ElementType.HYPERLINK
      )
    },
    callback: (command: Command) => {
      command.executeCancelHyperlink()
    }
  },
  {
    key: EDIT,
    i18nPath: 'contextmenu.hyperlink.edit',
    when: payload => {
      return (
        !payload.isReadonly &&
        payload.startElement?.type === ElementType.HYPERLINK
      )
    },
    callback: (command: Command) => {
      const info = command.getHyperlinkInfo()
      if (!info) return
      if (isAnchorHyperlink(info.url)) {
        void openCrossReferenceEditDialog(command, info.url)
        return
      }
      openHyperlinkEditDialog(command, info)
    }
  }
]
