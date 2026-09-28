import { ElementType } from '../dataset/enum/Element'
import type { ICatalogItem } from '../interface/Catalog'
import type { IElement } from '../interface/Element'
import type { IPositionContext } from '../interface/Position'
import type { IRange } from '../interface/Range'
import type { Draw } from '../core/draw/Draw'

/** 将目录树展平为下拉选项（带缩进） */
export function flattenCatalogOptions(
  catalogItems: ICatalogItem[],
  depth = 0
): { label: string; value: string; name: string }[] {
  const result: { label: string; value: string; name: string }[] = []
  for (let i = 0; i < catalogItems.length; i++) {
    const item = catalogItems[i]
    result.push({
      label: `${'\u3000'.repeat(depth)}${item.name}`,
      value: item.id,
      name: item.name
    })
    if (item.subCatalog?.length) {
      result.push(...flattenCatalogOptions(item.subCatalog, depth + 1))
    }
  }
  return result
}

function getTitlePosition(
  elementList: IElement[],
  titleId: string
): (IRange & IPositionContext) | null {
  for (let e = 0; e < elementList.length; e++) {
    const element = elementList[e]
    if (element.type === ElementType.TABLE) {
      const trList = element.trList!
      for (let r = 0; r < trList.length; r++) {
        const tr = trList[r]
        for (let d = 0; d < tr.tdList.length; d++) {
          const td = tr.tdList[d]
          const range = getTitlePosition(td.value, titleId)
          if (range) {
            return {
              ...range,
              isTable: true,
              index: e,
              trIndex: r,
              tdIndex: d,
              tdId: td.id,
              trId: tr.id,
              tableId: element.id
            }
          }
        }
      }
    }
    if (element.titleId === titleId) {
      let newIndex = e
      while (newIndex < elementList.length) {
        if (elementList[newIndex + 1]?.titleId !== titleId) {
          return {
            isTable: false,
            startIndex: newIndex,
            endIndex: newIndex
          }
        }
        newIndex++
      }
    }
  }
  return null
}

/** 定位到指定标题（目录 id / titleId） */
export function locationCatalogByTitleId(draw: Draw, titleId: string) {
  if (!titleId) return
  const elementList = draw.getOriginalElementList()
  const context = getTitlePosition(elementList, titleId)
  if (!context) return
  const {
    isTable,
    index,
    startTdIndex,
    endTdIndex,
    startTrIndex,
    endTrIndex,
    trIndex,
    tdIndex,
    tdId,
    trId,
    tableId,
    endIndex
  } = context
  const position = draw.getPosition()
  const range = draw.getRange()
  position.setPositionContext({
    isTable,
    index,
    trIndex,
    tdIndex,
    tdId,
    trId,
    tableId
  })
  range.setRange(
    endIndex,
    endIndex,
    tableId,
    startTdIndex,
    endTdIndex,
    startTrIndex,
    endTrIndex
  )
  draw.render({
    curIndex: endIndex,
    isCompute: false,
    isSubmitHistory: false
  })
}

/** 还原被浏览器解析成完整地址的锚点链接（#id → http://host/path#id） */
export function normalizeHyperlinkUrl(url: string): string {
  if (!url || url.startsWith('#')) return url
  try {
    if (typeof location === 'undefined') return url
    const parsed = new URL(url, location.href)
    if (
      parsed.origin === location.origin &&
      parsed.pathname === location.pathname &&
      !parsed.search &&
      parsed.hash.length > 1
    ) {
      return parsed.hash
    }
  } catch {
    // ignore invalid url
  }
  return url
}

/** 是否为交叉引用锚点链接（#titleId） */
export function isAnchorHyperlink(url?: string): boolean {
  if (!url) return false
  const normalized = normalizeHyperlinkUrl(url)
  return normalized.startsWith('#') && normalized.length > 1
}

export function getAnchorTitleId(url: string): string {
  return normalizeHyperlinkUrl(url).slice(1)
}
