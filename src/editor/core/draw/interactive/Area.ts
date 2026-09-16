import { Draw } from '../Draw'
import { deepClone, getUUID, isNonValue } from '../../../utils'
import { ElementType } from '../../../dataset/enum/Element'
import {
  IArea,
  IAreaInfo,
  IDeleteAreaOption,
  IGetAreaValueOption,
  IGetAreaValueResult,
  IInsertAreaOption,
  ILocationAreaOption,
  ISetAreaPropertiesOption,
  ISetAreaValueOption
} from '../../../interface/Area'
import { EditorZone } from '../../../dataset/enum/Editor'
import { LocationPosition } from '../../../dataset/enum/Common'
import { RangeManager } from '../../range/RangeManager'
import { Zone } from '../../zone/Zone'
import { Position } from '../../position/Position'
import {
  formatElementList,
  getNonDeletedElementList,
  zipElementList
} from '../../../utils/element'
import { AreaMode } from '../../../dataset/enum/Area'
import { IRange } from '../../../interface/Range'
import { IElement, IElementPosition } from '../../../interface/Element'
import { Placeholder } from '../frame/Placeholder'
import { defaultPlaceholderOption } from '../../../dataset/constant/Placeholder'
import { DeepRequired } from '../../../interface/Common'
import { IEditorOption } from '../../../interface/Editor'
import { ITd } from '../../../interface/table/Td'
import { ZERO } from '../../../dataset/constant/Common'

export class Area {
  private draw: Draw
  private zone: Zone
  private range: RangeManager
  private position: Position
  private options: DeepRequired<IEditorOption>
  private areaInfoMap = new Map<string, IAreaInfo>()

  constructor(draw: Draw) {
    this.draw = draw
    this.options = draw.getOptions()
    this.zone = draw.getZone()
    this.range = draw.getRange()
    this.position = draw.getPosition()
  }

  public getAreaInfo(): Map<string, IAreaInfo> {
    return this.areaInfoMap
  }

  public getActiveAreaId(): string | null {
    if (!this.areaInfoMap.size) return null
    const { startIndex } = this.range.getRange()
    const elementList = this.draw.getElementList()
    const element = elementList[startIndex]
    return element?.areaId || null
  }

  public getActiveAreaInfo(): IAreaInfo | null {
    const activeAreaId = this.getActiveAreaId()
    if (!activeAreaId) return null
    return this.areaInfoMap.get(activeAreaId) || null
  }

  /** 跳过区域开头禁用标题，返回正文起始下标 */
  public getAreaBodyStartOffset(elementList: IElement[]): number {
    if (!elementList[0]?.title?.disabled) return 0
    const titleId = elementList[0].titleId
    let offset = 0
    while (
      offset < elementList.length &&
      elementList[offset].titleId === titleId
    ) {
      offset++
    }
    return offset
  }

  /** 区域正文是否为空（仅标题，或正文只剩一个换行） */
  public isAreaBodyEmpty(elementList: IElement[]): boolean {
    const bodyStart = this.getAreaBodyStartOffset(elementList)
    const body = elementList.slice(bodyStart)
    if (!body.length) return true
    return (
      body.length === 1 &&
      body[0].value === ZERO &&
      (!body[0].type || body[0].type === ElementType.TEXT)
    )
  }

  /**
   * 全选当前区域内容（排除 data-title 生成的不可编辑标题）
   */
  public areaSelectAll() {
    const areaInfo = this.getActiveAreaInfo()
    if (!areaInfo?.positionList.length) return
    const { elementList, positionList } = areaInfo
    const contentStart = this.getAreaBodyStartOffset(elementList)
    if (contentStart >= elementList.length) return
    // 选区为 (startIndex, endIndex]，start 取标题末字符或区域首字符
    const startIndex =
      contentStart > 0
        ? positionList[contentStart - 1].index
        : positionList[0].index
    const endIndex = positionList[positionList.length - 1].index
    this.range.setRange(startIndex, endIndex)
    this.draw.render({
      isSubmitHistory: false,
      isSetCursor: false,
      isCompute: false
    })
  }

  /**
   * 删除后若区域正文被清空：保留标题尾换行，再补一个默认样式的可编辑空行。
   * @returns 当前激活区域正文光标索引（若有）
   */
  public ensureEditableBodies(elementList: IElement[]): number | null {
    const activeAreaId = this.getActiveAreaId()
    const defaultSize = this.options.defaultSize
    let cursorIndex: number | null = null
    let i = 0
    while (i < elementList.length) {
      const areaId = elementList[i].areaId
      if (!areaId) {
        i++
        continue
      }
      const start = i
      while (i < elementList.length && elementList[i].areaId === areaId) {
        i++
      }
      let areaElements = elementList.slice(start, i)
      let bodyStart = this.getAreaBodyStartOffset(areaElements)
      let body = areaElements.slice(bodyStart)
      const titleRef = areaElements.find(
        el => el.title?.disabled && el.titleId
      )

      // 正文已空：保证标题尾禁用换行仍在，再插入默认样式正文换行
      if (!body.length && bodyStart > 0 && titleRef) {
        const lastTitle = areaElements[bodyStart - 1]
        const hasTitleTrailBreak =
          lastTitle?.value === ZERO && !!lastTitle.title?.disabled
        // 若标题尾换行曾被剥掉禁用属性，恢复之
        if (lastTitle?.value === ZERO && !lastTitle.title?.disabled) {
          lastTitle.title = titleRef.title
          lastTitle.titleId = titleRef.titleId
          lastTitle.level = titleRef.level
          delete lastTitle.size
          lastTitle.bold = false
        } else if (!hasTitleTrailBreak) {
          elementList.splice(start + bodyStart, 0, {
            value: ZERO,
            areaId,
            area: titleRef.area,
            title: titleRef.title,
            titleId: titleRef.titleId,
            level: titleRef.level
          })
          i++
          bodyStart++
        } else if (lastTitle) {
          // 标题尾换行不使用标题字号，避免与正文空行叠高
          delete lastTitle.size
          lastTitle.bold = false
        }
        elementList.splice(start + bodyStart, 0, {
          value: ZERO,
          areaId,
          area: titleRef.area,
          size: defaultSize,
          bold: false
        })
        i++
        if (areaId === activeAreaId) {
          cursorIndex = start + bodyStart
        }
        continue
      }

      if (!body.length) {
        const anchor = areaElements[0]
        elementList.splice(start + bodyStart, 0, {
          value: ZERO,
          areaId,
          area: anchor.area,
          size: defaultSize,
          bold: false
        })
        i++
        if (areaId === activeAreaId) {
          cursorIndex = start + bodyStart
        }
        continue
      }

      // 已有正文占位时仅校正样式，不强制拉回光标（避免打断跨 area 删除导航）
      areaElements = elementList.slice(start, i)
      bodyStart = this.getAreaBodyStartOffset(areaElements)
      body = areaElements.slice(bodyStart)
      if (this.isAreaBodyEmpty(areaElements)) {
        const bodyEl = elementList[start + bodyStart]
        if (bodyEl) {
          bodyEl.size = defaultSize
          bodyEl.bold = false
          delete bodyEl.title
          delete bodyEl.titleId
          delete bodyEl.level
        }
      }
    }
    return cursorIndex
  }

  public isReadonly() {
    const activeAreaInfo = this.getActiveAreaInfo()
    if (!activeAreaInfo?.area) return false
    switch (activeAreaInfo.area.mode) {
      case AreaMode.EDIT:
        return false
      case AreaMode.READONLY:
        return true
      case AreaMode.FORM:
        return !this.draw.getControl().getIsRangeWithinControl()
      default:
        return false
    }
  }

  public insertArea(payload: IInsertAreaOption): string | null {
    const { id, value, area, position, range } = payload
    // 切换至正文
    if (this.zone.getZone() !== EditorZone.MAIN) {
      this.zone.setZone(EditorZone.MAIN)
    }
    // 通过光标插入area && 不能在area内再次插入area
    if (range && !this.getActiveAreaId()) {
      const { startIndex, endIndex } = range
      // 校验位置合法性
      const elementList = this.draw.getMainElementList()
      if (!elementList[startIndex] || !elementList[endIndex]) {
        return null
      }
      this.range.setRange(range.startIndex, range.endIndex)
    } else {
      // 设置插入位置
      if (position === LocationPosition.BEFORE) {
        this.range.setRange(0, 0)
      } else {
        const elementList = this.draw.getMainElementList()
        const lastIndex = elementList.length - 1
        this.range.setRange(lastIndex, lastIndex)
      }
    }
    const areaId = id || getUUID()
    this.draw.insertElementList([
      {
        type: ElementType.AREA,
        value: '',
        areaId,
        valueList: value,
        area: deepClone(area)
      }
    ])
    return areaId
  }

  public render(ctx: CanvasRenderingContext2D, pageNo: number) {
    if (!this.areaInfoMap.size) return
    ctx.save()
    const margins = this.draw.getMargins()
    const width = this.draw.getInnerWidth()
    for (const areaInfoItem of this.areaInfoMap) {
      const { area, positionList, elementList } = areaInfoItem[1]
      if (area?.hide && !this.draw.isAreaHideDisabled()) continue
      const placeholderOption = area.placeholder?.data
        ? area.placeholder
        : this.options.placeholder
      const isBodyEmpty = this.isAreaBodyEmpty(elementList)
      const needPlaceholder = !!(placeholderOption?.data && isBodyEmpty)
      if (
        !area?.backgroundColor &&
        !area?.borderColor &&
        !needPlaceholder
      ) {
        continue
      }
      const pagePositionList = positionList.filter(p => p.pageNo === pageNo)
      if (!pagePositionList.length) continue
      ctx.translate(0.5, 0.5)
      const firstPosition = pagePositionList[0]
      const lastPosition = pagePositionList[pagePositionList.length - 1]
      const tableCell = areaInfoItem[1].tableCell
      const isTableArea = !!tableCell
      const tdPadding = this.draw.getTdPadding()
      // 起始位置
      const x = isTableArea
        ? tableCell.tablePosition.coordinate.leftTop[0] +
          tableCell.td.x! * this.options.scale +
          tdPadding[3]
        : margins[3]
      const y = Math.ceil(firstPosition.coordinate.leftTop[1])
      const height = Math.ceil(lastPosition.coordinate.rightBottom[1] - y)
      const areaWidth = isTableArea
        ? tableCell.td.width! * this.options.scale - tdPadding[1] - tdPadding[3]
        : width
      // 背景色
      if (area.backgroundColor) {
        ctx.fillStyle = area.backgroundColor
        ctx.fillRect(x, y, areaWidth, height)
      }
      // 边框
      if (area.borderColor) {
        ctx.strokeStyle = area.borderColor
        ctx.strokeRect(x, y, areaWidth, height)
      }
      // 提示词：正文为空时画在正文行（标题下方）
      if (needPlaceholder) {
        const bodyStart = this.getAreaBodyStartOffset(elementList)
        const bodyPosition =
          bodyStart < positionList.length
            ? positionList[bodyStart]
            : lastPosition
        const placeholder = new Placeholder(this.draw)
        placeholder.render(ctx, {
          placeholder: {
            ...defaultPlaceholderOption,
            ...placeholderOption
          },
          startY: Math.ceil(
            bodyPosition.pageNo === pageNo
              ? bodyPosition.coordinate.leftTop[1]
              : firstPosition.coordinate.leftTop[1]
          )
        })
      }
      ctx.translate(-0.5, -0.5)
    }
    ctx.restore()
  }

  public compute() {
    this.areaInfoMap.clear()
    const elementList = this.draw.getOriginalMainElementList()
    const positionList = this.position.getOriginalMainPositionList()
    this.computeAreaInfo(elementList, positionList, elementList)
  }

  private computeAreaInfo(
    elementList: IElement[],
    positionList: IElementPosition[] = [],
    sourceElementList: IElement[],
    inheritedAreaId?: string,
    tableCell?: IAreaInfo['tableCell']
  ) {
    for (let e = 0; e < elementList.length; e++) {
      const element = elementList[e]
      const areaId = element.areaId
      const position = positionList[e]
      if (areaId && areaId !== inheritedAreaId) {
        const areaInfo = this.areaInfoMap.get(areaId)
        if (!areaInfo) {
          this.areaInfoMap.set(areaId, {
            id: areaId,
            area: element.area!,
            elementList: [element],
            positionList: position ? [position] : [],
            sourceElementList,
            tableCell
          })
        } else {
          areaInfo.elementList.push(element)
          if (position) {
            areaInfo.positionList.push(position)
          }
        }
      }
      if (element.type === ElementType.TABLE && element.trList) {
        this.computeTableAreaInfo(element, position, areaId)
      }
    }
  }

  private computeTableAreaInfo(
    tableElement: IElement,
    tablePosition?: IElementPosition,
    inheritedAreaId?: string
  ) {
    const trList = tableElement.trList!
    for (let r = 0; r < trList.length; r++) {
      const tr = trList[r]
      for (let d = 0; d < tr.tdList.length; d++) {
        const td: ITd = tr.tdList[d]
        this.computeAreaInfo(
          td.value,
          td.positionList,
          td.value,
          inheritedAreaId,
          tablePosition
            ? {
                td,
                tablePosition
              }
            : undefined
        )
      }
    }
  }

  public getAreaValue(
    options: IGetAreaValueOption = {}
  ): IGetAreaValueResult | null {
    const areaId = options.id || this.getActiveAreaId()
    if (!areaId) return null
    const areaInfo = this.areaInfoMap.get(areaId)
    if (!areaInfo) return null
    return {
      area: areaInfo.area,
      id: areaInfo.id,
      startPageNo: areaInfo.positionList[0].pageNo,
      endPageNo: areaInfo.positionList[areaInfo.positionList.length - 1].pageNo,
      value: zipElementList(getNonDeletedElementList(areaInfo.elementList), {
        isClone: false
      })
    }
  }

  public getContextByAreaId(
    areaId: string,
    options?: ILocationAreaOption
  ): { range: IRange; elementPosition: IElementPosition } | null {
    const elementList = this.draw.getOriginalMainElementList()
    for (let e = 0; e < elementList.length; e++) {
      const element = elementList[e]
      if (options?.position === LocationPosition.OUTER_BEFORE) {
        // 区域外面最前
        if (elementList[e + 1]?.areaId !== areaId) continue
      } else if (options?.position === LocationPosition.AFTER) {
        // 区域内部最后
        if (
          !(element.areaId === areaId && elementList[e + 1]?.areaId !== areaId)
        ) {
          continue
        }
      } else if (options?.position === LocationPosition.OUTER_AFTER) {
        // 区域外部最后
        if (
          !(element.areaId !== areaId && elementList[e - 1]?.areaId === areaId)
        ) {
          continue
        }
      } else {
        // 区域内部最前
        if (element.areaId !== areaId) continue
      }
      const positionList = this.position.getOriginalMainPositionList()
      return {
        range: {
          startIndex: e,
          endIndex: e
        },
        elementPosition: positionList[e]
      }
    }
    return null
  }

  public setAreaProperties(payload: ISetAreaPropertiesOption) {
    const areaId = payload.id || this.getActiveAreaId()
    if (!areaId) return
    const areaInfo = this.areaInfoMap.get(areaId)
    if (!areaInfo) return
    if (!areaInfo.area) {
      areaInfo.area = {}
    }
    // 需要计算的属性
    let isCompute = false
    const computeProps: Array<keyof IArea> = ['top', 'hide']
    // 循环设置
    Object.entries(payload.properties).forEach(([key, value]) => {
      if (isNonValue(value)) return
      const propKey = key as keyof IArea
      areaInfo.area[propKey] = value
      if (computeProps.includes(propKey)) {
        isCompute = true
      }
    })
    this.draw.render({
      isCompute,
      isSetCursor: false
    })
  }

  public setAreaValue(payload: ISetAreaValueOption) {
    const areaId = payload.id || this.getActiveAreaId()
    if (!areaId) return
    const areaInfo = this.areaInfoMap.get(areaId)
    if (!areaInfo) return
    // 删除旧数据并替换新的格式化数据
    const { positionList } = areaInfo
    const elementList = areaInfo.sourceElementList
    const valueList = payload.value
    formatElementList(
      [
        {
          type: ElementType.AREA,
          value: '',
          valueList,
          areaId: areaInfo.id,
          area: areaInfo.area
        }
      ],
      {
        editorOptions: this.options
      }
    )
    const startIndex = positionList[0].index
    this.draw.deleteElementList(elementList, startIndex, positionList.length, {
      isIgnoreDeletedRule: true
    })
    this.draw.getTraceParticle().markElementListInserted(valueList)
    this.draw.spliceElementList(elementList, startIndex, 0, valueList)
    this.draw.render({
      isSetCursor: false
    })
  }

  public deleteArea(options: IDeleteAreaOption = {}) {
    const areaId = options.id || this.getActiveAreaId()
    if (!areaId) return
    const areaInfo = this.areaInfoMap.get(areaId)
    if (!areaInfo) return
    // 删除区域内的所有元素
    const { positionList } = areaInfo
    const elementList = areaInfo.sourceElementList
    this.draw.deleteElementList(
      elementList,
      positionList[0].index,
      positionList.length,
      {
        isIgnoreDeletedRule: true
      }
    )
    this.draw.render({
      isSetCursor: false
    })
  }
}
