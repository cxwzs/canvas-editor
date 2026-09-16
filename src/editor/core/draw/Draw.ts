import { version } from '../../../../package.json'
import { ZERO } from '../../dataset/constant/Common'
import { RowFlex } from '../../dataset/enum/Row'
import {
  IAppendElementListOption,
  IComputeRowListPayload,
  IDrawFloatPayload,
  IDrawOption,
  IDrawPagePayload,
  IDrawRowPayload,
  IGetImageOption,
  IGetOriginValueOption,
  IGetValueOption,
  IPainterOption
} from '../../interface/Draw'
import {
  IEditorData,
  IEditorOption,
  IEditorResult,
  ISetValueOption
} from '../../interface/Editor'
import {
  IElement,
  IElementMetrics,
  IElementFillRect,
  IElementStyle,
  ISpliceElementListOption,
  IInsertElementListOption
} from '../../interface/Element'
import { IMarkElementListDeletedOption } from '../../interface/Trace'
import { IRow, IRowElement } from '../../interface/Row'
import { IColumnLayout, IColumnOption } from '../../interface/Column'
import { ColumnManager } from './column/ColumnManager'
import { deepClone, nextTick } from '../../utils'
import { Cursor } from '../cursor/Cursor'
import { CanvasEvent } from '../event/CanvasEvent'
import { GlobalEvent } from '../event/GlobalEvent'
import { HistoryManager } from '../history/HistoryManager'
import { Listener } from '../listener/Listener'
import { Position } from '../position/Position'
import { RangeManager } from '../range/RangeManager'
import { Background } from './frame/Background'
import { Highlight } from './richtext/Highlight'
import { Margin } from './frame/Margin'
import { Search } from './interactive/Search'
import { Strikeout } from './richtext/Strikeout'
import { Underline } from './richtext/Underline'
import { ElementType } from '../../dataset/enum/Element'
import { TraceType } from '../../dataset/enum/Trace'
import { ImageParticle } from './particle/ImageParticle'
import { LaTexParticle } from './particle/latex/LaTexParticle'
import { TextParticle } from './particle/TextParticle'
import { PageNumber } from './frame/PageNumber'
import { ScrollObserver } from '../observer/ScrollObserver'
import { SelectionObserver } from '../observer/SelectionObserver'
import { TableParticle } from './particle/table/TableParticle'
import { TablePaging } from './particle/table/TablePaging'
import { TableTool } from './particle/table/TableTool'
import { Ruler } from './ruler/Ruler'
import { HyperlinkParticle } from './particle/HyperlinkParticle'
import { HintParticle } from './particle/HintParticle'
import { TraceParticle } from './particle/TraceParticle'
import { LabelParticle } from './particle/LabelParticle'
import { Header } from './frame/Header'
import { SuperscriptParticle } from './particle/SuperscriptParticle'
import { SubscriptParticle } from './particle/SubscriptParticle'
import { SeparatorParticle } from './particle/SeparatorParticle'
import { PageBreakParticle } from './particle/PageBreakParticle'
import { Watermark } from './frame/Watermark'
import { WatermarkLayer } from '../../dataset/enum/Watermark'
import {
  EditorComponent,
  EditorMode,
  EditorZone,
  PageMode,
  PaperDirection,
  WordBreak
} from '../../dataset/enum/Editor'
import { Control } from './control/Control'
import { CascadeManager } from '../cascade/CascadeManager'
import { Validate } from '../validate/Validate'
import {
  deleteSurroundElementList,
  getIsBlockElement,
  getSlimCloneElementList,
  pickSurroundElementList,
  zipElementList
} from '../../utils/element'
import { CheckboxParticle } from './particle/CheckboxParticle'
import { RadioParticle } from './particle/RadioParticle'
import { DeepRequired, IPadding } from '../../interface/Common'
import {
  ControlComponent,
  ControlIndentation
} from '../../dataset/enum/Control'
import { formatElementList } from '../../utils/element'
import { shrinkColgroupToWidth } from '../../utils/table'
import { WorkerManager } from '../worker/WorkerManager'
import { Previewer } from './particle/previewer/Previewer'
import { DateParticle } from './particle/date/DateParticle'
import { IMargin } from '../../interface/Margin'
import { BlockParticle } from './particle/block/BlockParticle'
import { EDITOR_COMPONENT, EDITOR_PREFIX } from '../../dataset/constant/Editor'
import { I18n } from '../i18n/I18n'
import { ImageObserver } from '../observer/ImageObserver'
import { Zone } from '../zone/Zone'
import { Footer } from './frame/Footer'
import {
  IMAGE_ELEMENT_TYPE,
  TEXTLIKE_ELEMENT_TYPE
} from '../../dataset/constant/Element'
import { ListParticle } from './particle/ListParticle'
import { Placeholder } from './frame/Placeholder'
import { EventBus } from '../event/eventbus/EventBus'
import { EventBusMap } from '../../interface/EventBus'
import { Group } from './interactive/Group'
import { Override } from '../override/Override'
import { FlexDirection, ImageDisplay } from '../../dataset/enum/Common'
import {
  PUNCTUATION_REG,
  WHITE_SPACE_REG
} from '../../dataset/constant/Regular'
import { LineBreakParticle } from './particle/LineBreakParticle'
import { WhiteSpaceParticle } from './particle/WhiteSpaceParticle'
import { MouseObserver } from '../observer/MouseObserver'
import { LineNumber } from './frame/LineNumber'
import { PageBorder } from './frame/PageBorder'
import { ITd } from '../../interface/table/Td'
import { Actuator } from '../actuator/Actuator'
import { TableOperate } from './particle/table/TableOperate'
import { Area } from './interactive/Area'
import { Badge } from './frame/Badge'
import { Graffiti } from './graffiti/Graffiti'
import { Magnifier } from './interactive/Magnifier'
import { Accessibility } from '../accessibility/Accessibility'

export class Draw {
  private container: HTMLDivElement
  private pageContainer: HTMLDivElement
  private pageList: HTMLCanvasElement[]
  private ctxList: CanvasRenderingContext2D[]
  private pageNo: number
  private renderCount: number
  private pagePixelRatio: number | null
  private mode: EditorMode
  private options: DeepRequired<IEditorOption>
  private position: Position
  private zone: Zone
  private elementList: IElement[]
  private listener: Listener
  private eventBus: EventBus<EventBusMap>
  private override: Override

  private i18n: I18n
  private canvasEvent: CanvasEvent
  private globalEvent: GlobalEvent
  private cursor: Cursor
  private range: RangeManager
  private margin: Margin
  private background: Background
  private badge: Badge
  private magnifier: Magnifier
  private search: Search
  private group: Group
  private area: Area
  private underline: Underline
  private strikeout: Strikeout
  private highlight: Highlight
  private historyManager: HistoryManager
  private previewer: Previewer
  private imageParticle: ImageParticle
  private laTexParticle: LaTexParticle
  private textParticle: TextParticle
  private tableParticle: TableParticle
  private tablePaging: TablePaging
  private tableTool: TableTool
  private tableOperate: TableOperate
  private pageNumber: PageNumber
  private lineNumber: LineNumber
  private waterMark: Watermark
  private placeholder: Placeholder
  private header: Header
  private footer: Footer
  private hyperlinkParticle: HyperlinkParticle
  private hintParticle: HintParticle
  private traceParticle: TraceParticle
  private labelParticle: LabelParticle
  private dateParticle: DateParticle
  private separatorParticle: SeparatorParticle
  private pageBreakParticle: PageBreakParticle
  private superscriptParticle: SuperscriptParticle
  private subscriptParticle: SubscriptParticle
  private checkboxParticle: CheckboxParticle
  private radioParticle: RadioParticle
  private blockParticle: BlockParticle
  private listParticle: ListParticle
  private lineBreakParticle: LineBreakParticle
  private whiteSpaceParticle: WhiteSpaceParticle
  private control: Control
  private cascadeManager: CascadeManager
  private validate: Validate
  private pageBorder: PageBorder
  private workerManager: WorkerManager
  private scrollObserver: ScrollObserver
  private selectionObserver: SelectionObserver
  private imageObserver: ImageObserver
  private graffiti: Graffiti
  private accessibility: Accessibility

  private LETTER_REG: RegExp
  private WORD_LIKE_REG: RegExp
  private rowList: IRow[]
  private pageRowList: IRow[][]
  private pageDirectionList: PaperDirection[]
  private painterStyle: IElementStyle | null
  private painterOptions: IPainterOption | null
  private visiblePageNoList: number[]
  private intersectionPageNo: number
  private lazyRenderIntersectionObserver: IntersectionObserver | null
  private printModeData: Required<Omit<IEditorData, 'graffiti'>> | null
  private controlMinWidthPlaceholderElementListSet: WeakSet<IElement[]>
  private columnManager: ColumnManager
  private ruler: Ruler
  // 虚拟滚动：分页模式仅挂载窗口内页面（默认 3 页），滚动时复用 canvas
  private static readonly VIRTUAL_PAGE_WINDOW = 3
  private static readonly HISTORY_SUBMIT_DELAY = 300
  private forceFullPageRender = false
  private virtualPageRange: [number, number] | null = null
  private measureCtx: CanvasRenderingContext2D | null = null
  private historySubmitTimer: number | null = null
  private pendingHistoryCurIndex: number | undefined = undefined
  private contentChangeTimer: number | null = null
  private rulerRenderTimer: number | null = null

  constructor(
    rootContainer: HTMLElement,
    options: DeepRequired<IEditorOption>,
    data: IEditorData,
    listener: Listener,
    eventBus: EventBus<EventBusMap>,
    override: Override
  ) {
    this.container = this._wrapContainer(rootContainer)
    this.pageList = []
    this.ctxList = []
    this.pageNo = 0
    this.renderCount = 0
    this.pagePixelRatio = null
    this.mode = options.mode
    this.options = options
    this.elementList = data.main
    this.pageDirectionList = [options.paperDirection]
    this.listener = listener
    this.eventBus = eventBus
    this.override = override

    this._formatContainer()
    this.pageContainer = this._createPageContainer()
    this._createPage(0)

    this.i18n = new I18n(options.locale)
    this.historyManager = new HistoryManager(this)
    this.position = new Position(this)
    this.zone = new Zone(this)
    this.range = new RangeManager(this)
    this.margin = new Margin(this)
    this.background = new Background(this)
    this.badge = new Badge(this)
    this.magnifier = new Magnifier(this)
    this.search = new Search(this)
    this.group = new Group(this)
    this.area = new Area(this)
    this.underline = new Underline(this)
    this.strikeout = new Strikeout(this)
    this.highlight = new Highlight(this)
    this.previewer = new Previewer(this)
    this.imageParticle = new ImageParticle(this)
    this.laTexParticle = new LaTexParticle(this)
    this.textParticle = new TextParticle(this)
    this.tableParticle = new TableParticle(this)
    this.tablePaging = new TablePaging(this)
    this.tableTool = new TableTool(this)
    this.tableOperate = new TableOperate(this)
    this.pageNumber = new PageNumber(this)
    this.lineNumber = new LineNumber(this)
    this.waterMark = new Watermark(this)
    this.placeholder = new Placeholder(this)
    this.header = new Header(this, data.header)
    this.footer = new Footer(this, data.footer)
    this.hyperlinkParticle = new HyperlinkParticle(this)
    this.hintParticle = new HintParticle(this)
    this.traceParticle = new TraceParticle(this)
    this.labelParticle = new LabelParticle(this)
    this.dateParticle = new DateParticle(this)
    this.separatorParticle = new SeparatorParticle(this)
    this.pageBreakParticle = new PageBreakParticle(this)
    this.superscriptParticle = new SuperscriptParticle()
    this.subscriptParticle = new SubscriptParticle()
    this.checkboxParticle = new CheckboxParticle(this)
    this.radioParticle = new RadioParticle(this)
    this.blockParticle = new BlockParticle(this)
    this.listParticle = new ListParticle(this)
    this.lineBreakParticle = new LineBreakParticle(this)
    this.whiteSpaceParticle = new WhiteSpaceParticle(this)
    this.control = new Control(this)
    this.cascadeManager = new CascadeManager(this)
    this.validate = new Validate(this)
    this.pageBorder = new PageBorder(this)
    this.graffiti = new Graffiti(this, data.graffiti)
    this.columnManager = new ColumnManager(this)
    this.ruler = new Ruler(this)

    this.scrollObserver = new ScrollObserver(this)
    this.selectionObserver = new SelectionObserver(this)
    this.imageObserver = new ImageObserver()
    new MouseObserver(this)

    this.canvasEvent = new CanvasEvent(this)
    this.cursor = new Cursor(this, this.canvasEvent)
    this.canvasEvent.register()
    this.globalEvent = new GlobalEvent(this, this.canvasEvent)
    this.globalEvent.register()

    this.workerManager = new WorkerManager(this)
    new Actuator(this)
    this.accessibility = new Accessibility(this)

    const { letterClass } = options
    this.LETTER_REG = new RegExp(`[${letterClass.join('')}]`)
    this.WORD_LIKE_REG = new RegExp(
      `${letterClass.map(letter => `[^${letter}][${letter}]`).join('|')}`
    )
    this.rowList = []
    this.pageRowList = []
    this.painterStyle = null
    this.painterOptions = null
    this.visiblePageNoList = []
    this.intersectionPageNo = 0
    this.lazyRenderIntersectionObserver = null
    this.printModeData = null
    this.controlMinWidthPlaceholderElementListSet = new WeakSet()
    this.forceFullPageRender = false
    this.virtualPageRange = null
    this.measureCtx = null
    this.historySubmitTimer = null
    this.pendingHistoryCurIndex = undefined
    this.contentChangeTimer = null
    this.rulerRenderTimer = null

    // 打印模式优先设置打印数据
    if (this.mode === EditorMode.PRINT) {
      this.setPrintData()
    }
    this.render({
      isInit: true,
      isSetCursor: false,
      isFirstRender: true
    })
    // 初始数据中可能含待加载图片
    this.imageParticle.preloadPendingImages()
    // 级联规则初始化全量执行
    this.cascadeManager.executeAll()
  }

  // 设置打印数据
  public setPrintData() {
    this.printModeData = {
      header: this.header.getElementList(),
      main: this.elementList,
      footer: this.footer.getElementList()
    }
    // 过滤控件辅助元素
    const clonePrintModeData = deepClone(this.printModeData)
    const editorDataKeys: (keyof Omit<IEditorData, 'graffiti'>)[] = [
      'header',
      'main',
      'footer'
    ]
    editorDataKeys.forEach(key => {
      clonePrintModeData[key] = this.control.filterAssistElement(
        clonePrintModeData[key]
      )
    })
    this.setEditorData(clonePrintModeData)
  }

  // 还原打印数据
  public clearPrintData() {
    if (this.printModeData) {
      this.setEditorData(this.printModeData)
      this.printModeData = null
    }
  }

  public getLetterReg(): RegExp {
    return this.LETTER_REG
  }

  public getMode(): EditorMode {
    return this.mode
  }

  public setMode(payload: EditorMode) {
    if (this.mode === payload) return
    // 设置打印模式
    if (payload === EditorMode.PRINT) {
      this.setPrintData()
    }
    // 取消打印模式
    if (this.mode === EditorMode.PRINT) {
      this.clearPrintData()
    }
    this.clearSideEffect()
    this.range.clearRange()
    this.mode = payload
    this.options.mode = payload
    this.syncPreviewChrome()
    this.render({
      isSetCursor: false,
      isSubmitHistory: false
    })
  }

  /** 预览模式隐藏内置菜单栏与底部工具栏 */
  public syncPreviewChrome() {
    const host = this.container.closest(
      '.ce-builtin-menu-host'
    ) as HTMLElement | null
    if (!host) return
    host.classList.toggle('ce-preview-mode', this.mode === EditorMode.PREVIEW)
  }

  public isPreview(): boolean {
    return this.mode === EditorMode.PREVIEW
  }

  public isReadonly() {
    // 全局只读类模式优先于 Area.EDIT，避免 Area 默认 edit 覆盖 options.mode
    switch (this.mode) {
      case EditorMode.DESIGN:
        return false
      case EditorMode.READONLY:
      case EditorMode.PREVIEW:
      case EditorMode.PRINT:
      case EditorMode.GRAFFITI:
      case EditorMode.TRACE:
        return true
    }
    // 可编辑模式下再按 Area 限制（只读 / 表单）
    if (this.area.getActiveAreaInfo()?.area?.mode) {
      return this.area.isReadonly()
    }
    if (this.mode === EditorMode.FORM) {
      return !this.control.getIsRangeWithinControl()
    }
    return false
  }

  public isDisabled() {
    if (this.mode === EditorMode.DESIGN) return false
    const { startIndex, endIndex } = this.range.getRange()
    const elementList = this.getElementList()
    // 优先判断表格单元格
    if (this.getTd()?.disabled) return true
    if (startIndex === endIndex) {
      const startElement = elementList[startIndex]
      const nextElement = elementList[startIndex + 1]
      return !!(
        (startElement?.disabled && nextElement?.disabled) ||
        (startElement?.title?.disabled &&
          nextElement?.title?.disabled &&
          startElement.titleId === nextElement.titleId) ||
        (startElement?.control?.disabled &&
          nextElement?.control?.disabled &&
          startElement.controlId === nextElement.controlId)
      )
    }
    const selectionElementList = elementList.slice(startIndex + 1, endIndex + 1)
    return selectionElementList.some(
      element =>
        element.disabled ||
        element.title?.disabled ||
        element.control?.disabled
    )
  }

  public isDesignMode() {
    return this.mode === EditorMode.DESIGN
  }

  public isPrintMode() {
    return this.mode === EditorMode.PRINT
  }

  public isAreaHideDisabled() {
    return (
      this.isDesignMode() ||
      (this.isPrintMode() &&
        this.options.modeRule[EditorMode.PRINT].areaHideDisabled)
    )
  }

  public isGraffitiMode() {
    return this.mode === EditorMode.GRAFFITI
  }

  public isTraceMode() {
    return this.mode === EditorMode.TRACE
  }

  public setTraceEnabled(enabled: boolean) {
    // 留痕查看模式下不允许切换记录开关，避免查看态偷偷改数据
    if (this.mode === EditorMode.TRACE) return
    if (!this.options.trace.disabled === enabled) return
    this.options.trace.disabled = !enabled
    this.render({
      isSetCursor: false,
      isSubmitHistory: false
    })
  }

  public setRulerEnabled(enabled: boolean) {
    if (!this.options.ruler.disabled === enabled) return
    this.ruler.setEnabled(enabled)
  }

  // 删除元素：trace 启用时软删除（保留在原位仅打标），否则硬删除
  public deleteElementList(
    elementList: IElement[],
    index: number,
    count: number = 1,
    options?: IMarkElementListDeletedOption
  ) {
    if (!this.options.trace.disabled) {
      return this.traceParticle.markElementListDeleted(
        elementList.slice(index, index + count),
        options
      )
    } else {
      this.spliceElementList(elementList, index, count, undefined, {
        isIgnoreDeletedRule: options?.isIgnoreDeletedRule
      })
      return []
    }
  }

  public getOriginalWidth(direction = this.options.paperDirection): number {
    const { width, height } = this.options
    return direction === PaperDirection.VERTICAL ? width : height
  }

  public getOriginalHeight(direction = this.options.paperDirection): number {
    const { width, height } = this.options
    return direction === PaperDirection.VERTICAL ? height : width
  }

  public getWidth(direction = this.options.paperDirection): number {
    return Math.floor(this.getOriginalWidth(direction) * this.options.scale)
  }

  public getHeight(direction = this.options.paperDirection): number {
    return Math.floor(this.getOriginalHeight(direction) * this.options.scale)
  }

  public getMainHeight(): number {
    const pageHeight = this.getHeight()
    return pageHeight - this.getMainOuterHeight()
  }

  public getMainOuterHeight(
    pageNo?: number,
    direction?: PaperDirection
  ): number {
    const curDirection =
      direction ||
      (pageNo === undefined
        ? this.options.paperDirection
        : this.getPageDirection(pageNo))
    const margins = this.getMargins(curDirection)
    const headerExtraHeight = this.header.getExtraHeight(pageNo, curDirection)
    const footerExtraHeight = this.footer.getExtraHeight(pageNo, curDirection)
    return margins[0] + margins[2] + headerExtraHeight + footerExtraHeight
  }

  public getCanvasWidth(pageNo = -1): number {
    const page = this.getPage(pageNo)
    return page.width
  }

  public getCanvasHeight(pageNo = -1): number {
    const page = this.getPage(pageNo)
    return page.height
  }

  public getInnerWidth(direction = this.options.paperDirection): number {
    const width = this.getWidth(direction)
    const margins = this.getMargins(direction)
    return width - margins[1] - margins[3]
  }

  public getColumnLayout(direction?: PaperDirection): IColumnLayout | null {
    return this.columnManager.getLayout(direction)
  }

  public setColumnConfig(config: IColumnOption | null): void {
    if (this.options.pageMode === PageMode.CONTINUITY) return
    this.columnManager.setConfig(config)
  }

  public getOriginalInnerWidth(): number {
    const width = this.getOriginalWidth()
    const margins = this.getOriginalMargins()
    return width - margins[1] - margins[3]
  }

  public getContextInnerWidth(): number {
    const positionContext = this.position.getPositionContext()
    if (positionContext.isTable) {
      const elementList = this.getOriginalElementList()
      const td = this.position.getTableTdByContext(elementList, positionContext)
      const tdPadding = this.getTdPadding()
      return td!.width! - tdPadding[1] - tdPadding[3]
    }
    // 分栏布局下按栏宽计算可用宽度（栏宽为缩放值，还原为未缩放单位）
    const columnLayout = this.getColumnLayout()
    if (columnLayout && columnLayout.count > 1) {
      return columnLayout.width / this.options.scale
    }
    return this.getOriginalInnerWidth()
  }

  public getMargins(direction = this.options.paperDirection): IMargin {
    return <IMargin>(
      this.getOriginalMargins(direction).map(m => m * this.options.scale)
    )
  }

  public getOriginalMargins(direction = this.options.paperDirection): number[] {
    const { margins } = this.options
    return direction === PaperDirection.VERTICAL
      ? margins
      : [margins[1], margins[2], margins[3], margins[0]]
  }

  public getPageDirection(pageNo: number): PaperDirection {
    return this.pageDirectionList[pageNo] || this.options.paperDirection
  }

  public getPageDirectionList(): PaperDirection[] {
    return this.pageDirectionList
  }

  public getPageSize(pageNo: number) {
    const direction = this.getPageDirection(pageNo)
    const margins = this.getMargins(direction)
    const width = this.getWidth(direction)
    return {
      width,
      height: this.getHeight(direction),
      margins,
      innerWidth: width - margins[1] - margins[3]
    }
  }

  // 获取页面容器中的偏移
  public getPageOffset(pageNo: number, isOriginal = false) {
    const getWidth = (direction: PaperDirection) =>
      isOriginal ? this.getOriginalWidth(direction) : this.getWidth(direction)
    const getHeight = (direction: PaperDirection) =>
      isOriginal ? this.getOriginalHeight(direction) : this.getHeight(direction)
    const pageGap = isOriginal ? this.options.pageGap : this.getPageGap()
    let y = 0
    for (let i = 0; i < pageNo; i++) {
      y += getHeight(this.getPageDirection(i)) + pageGap
    }
    // CSS 会居中较窄页面，浮层坐标需补偿水平偏移
    const direction = this.getPageDirection(pageNo)
    const width = getWidth(direction)
    return {
      x: (this._getPageMaxWidth(isOriginal) - width) / 2,
      y
    }
  }

  private _getPageMaxWidth(isOriginal = false) {
    const width = isOriginal ? this.getOriginalWidth() : this.getWidth()
    const isMixed = this.pageDirectionList.some(
      direction => direction !== this.options.paperDirection
    )
    if (!isMixed) return width
    const height = isOriginal ? this.getOriginalHeight() : this.getHeight()
    return Math.max(width, height)
  }

  public getPageGap(): number {
    return this.options.pageGap * this.options.scale
  }

  public getOriginalPageGap(): number {
    return this.options.pageGap
  }

  public getPageNumberBottom(): number {
    const {
      pageNumber: { bottom },
      scale
    } = this.options
    return bottom * scale
  }

  public getMarginIndicatorSize(): number {
    return this.options.marginIndicatorSize * this.options.scale
  }

  public getDefaultBasicRowMarginHeight(): number {
    return this.options.defaultBasicRowMarginHeight * this.options.scale
  }

  public getHighlightMarginHeight(): number {
    return this.options.highlightMarginHeight * this.options.scale
  }

  public getTdPadding(): IPadding {
    const {
      table: { tdPadding },
      scale
    } = this.options
    return <IPadding>tdPadding.map(m => m * scale)
  }

  public getContainer(): HTMLDivElement {
    return this.container
  }

  public getPageContainer(): HTMLDivElement {
    return this.pageContainer
  }

  public getVisiblePageNoList(): number[] {
    return this.visiblePageNoList
  }

  public setVisiblePageNoList(payload: number[]) {
    this.visiblePageNoList = payload
    if (this.listener.visiblePageNoListChange) {
      this.listener.visiblePageNoListChange(this.visiblePageNoList)
    }
    if (this.eventBus.isSubscribe('visiblePageNoListChange')) {
      this.eventBus.emit('visiblePageNoListChange', this.visiblePageNoList)
    }
  }

  public getIntersectionPageNo(): number {
    return this.intersectionPageNo
  }

  public setIntersectionPageNo(payload: number) {
    this.intersectionPageNo = payload
    if (this.listener.intersectionPageNoChange) {
      this.listener.intersectionPageNoChange(this.intersectionPageNo)
    }
    if (this.eventBus.isSubscribe('intersectionPageNoChange')) {
      this.eventBus.emit('intersectionPageNoChange', this.intersectionPageNo)
    }
  }

  public getPageNo(): number {
    return this.pageNo
  }

  public setPageNo(payload: number) {
    this.pageNo = payload
  }

  public getRenderCount(): number {
    return this.renderCount
  }

  public getPage(pageNo = -1): HTMLCanvasElement {
    const targetPageNo = ~pageNo ? pageNo : this.pageNo
    return (
      this.pageList.find(p => Number(p.dataset.index) === targetPageNo) ||
      this.pageList[0]
    )
  }

  public getPageList(): HTMLCanvasElement[] {
    return this.pageList
  }

  public getPageCount(): number {
    return this.pageRowList.length || this.pageList.length
  }

  public getIsVirtualPageMode(): boolean {
    return (
      this.getIsPagingMode() &&
      !this.forceFullPageRender &&
      !!this.options.pageVirtualScroll
    )
  }

  private _getPageListIndex(pageNo: number): number {
    return this.pageList.findIndex(p => Number(p.dataset.index) === pageNo)
  }

  private _getVirtualPageRange(centerPageNo: number): [number, number] {
    const pageCount = this.pageRowList.length
    if (pageCount <= 0) return [0, 0]
    if (
      !this.getIsVirtualPageMode() ||
      pageCount <= Draw.VIRTUAL_PAGE_WINDOW
    ) {
      return [0, pageCount - 1]
    }
    const half = Math.floor(Draw.VIRTUAL_PAGE_WINDOW / 2)
    let start = Math.max(0, centerPageNo - half)
    let end = start + Draw.VIRTUAL_PAGE_WINDOW - 1
    if (end > pageCount - 1) {
      end = pageCount - 1
      start = Math.max(0, end - Draw.VIRTUAL_PAGE_WINDOW + 1)
    }
    return [start, end]
  }

  private _getContentHeight(): number {
    const pageCount = this.pageRowList.length
    if (!pageCount) return this.getHeight()
    const pageGap = this.getPageGap()
    let height = 0
    for (let i = 0; i < pageCount; i++) {
      height += this.getHeight(this.getPageDirection(i)) + pageGap
    }
    return height
  }

  private _updatePageContainerHeight() {
    if (this.getIsPagingMode()) {
      this.pageContainer.style.position = 'relative'
      this.pageContainer.style.height = `${this._getContentHeight()}px`
    } else {
      this.pageContainer.style.position = ''
      this.pageContainer.style.height = ''
    }
  }

  private _applyPagePosition(canvas: HTMLCanvasElement, pageNo: number) {
    const { width, height } = this.getPageSize(pageNo)
    canvas.style.width = `${width}px`
    canvas.style.height = `${height}px`
    canvas.setAttribute('data-index', String(pageNo))
    if (this.getIsPagingMode()) {
      const { x, y } = this.getPageOffset(pageNo)
      canvas.style.position = 'absolute'
      canvas.style.top = `${y}px`
      canvas.style.left = `${x}px`
      canvas.style.marginLeft = '0'
      canvas.style.marginRight = '0'
      canvas.style.marginBottom = '0'
    } else {
      canvas.style.position = ''
      canvas.style.top = ''
      canvas.style.left = ''
      canvas.style.marginLeft = 'auto'
      canvas.style.marginRight = 'auto'
      canvas.style.marginBottom = `${this.getPageGap()}px`
    }
  }

  private _ensurePageCanvasSize(
    canvas: HTMLCanvasElement,
    ctx: CanvasRenderingContext2D,
    pageNo: number
  ) {
    const dpr = this.getPagePixelRatio()
    const { width, height } = this.getPageSize(pageNo)
    const pixelWidth = Math.floor(width * dpr)
    const pixelHeight = Math.floor(height * dpr)
    if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
      canvas.width = pixelWidth
      canvas.height = pixelHeight
      this._initPageContext(ctx)
    }
  }

  /**
   * 同步虚拟页窗口：仅保留中心页附近若干 canvas，滚动时复用并重绘
   */
  public syncVirtualPages(
    centerPageNo = this.intersectionPageNo,
    options: { force?: boolean; isDraw?: boolean } = {}
  ) {
    if (!this.getIsPagingMode() || !this.pageRowList.length) return
    const { force = false, isDraw = true } = options
    const pageCount = this.pageRowList.length
    const safeCenter = Math.max(0, Math.min(centerPageNo, pageCount - 1))
    const [start, end] = this._getVirtualPageRange(safeCenter)
    const rangeUnchanged =
      this.virtualPageRange?.[0] === start &&
      this.virtualPageRange?.[1] === end &&
      this.pageList.length === end - start + 1
    if (rangeUnchanged && !force) {
      // 仅校正占位高度与页位置（缩放/混排后）
      this.pageList.forEach(canvas => {
        this._applyPagePosition(canvas, Number(canvas.dataset.index))
      })
      this._updatePageContainerHeight()
      return
    }
    const neededPageNos: number[] = []
    for (let i = start; i <= end; i++) {
      neededPageNos.push(i)
    }
    const reusable = new Map<
      number,
      { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D }
    >()
    this.pageList.forEach((canvas, index) => {
      reusable.set(Number(canvas.dataset.index), {
        canvas,
        ctx: this.ctxList[index]
      })
    })
    const nextPageList: HTMLCanvasElement[] = []
    const nextCtxList: CanvasRenderingContext2D[] = []
    const pagesToDraw: number[] = []
    for (const pageNo of neededPageNos) {
      const hit = reusable.get(pageNo)
      if (hit) {
        reusable.delete(pageNo)
        this._applyPagePosition(hit.canvas, pageNo)
        this._ensurePageCanvasSize(hit.canvas, hit.ctx, pageNo)
        nextPageList.push(hit.canvas)
        nextCtxList.push(hit.ctx)
        if (force) {
          pagesToDraw.push(pageNo)
        }
        continue
      }
      const leftover = reusable.entries().next()
      if (!leftover.done) {
        const [oldPageNo, slot] = leftover.value
        reusable.delete(oldPageNo)
        this._applyPagePosition(slot.canvas, pageNo)
        this._ensurePageCanvasSize(slot.canvas, slot.ctx, pageNo)
        nextPageList.push(slot.canvas)
        nextCtxList.push(slot.ctx)
        pagesToDraw.push(pageNo)
        continue
      }
      const { canvas, ctx } = this._createPageCanvas(pageNo)
      this.pageContainer.append(canvas)
      nextPageList.push(canvas)
      nextCtxList.push(ctx)
      pagesToDraw.push(pageNo)
    }
    reusable.forEach(({ canvas }) => canvas.remove())
    // 原地更新数组，保持外部持有的 pageList 引用有效
    this.pageList.length = 0
    this.ctxList.length = 0
    this.pageList.push(...nextPageList)
    this.ctxList.push(...nextCtxList)
    this.virtualPageRange = [start, end]
    this._updatePageContainerHeight()
    if (isDraw && pagesToDraw.length) {
      const positionList = this.position.getOriginalMainPositionList()
      const elementList = this.getOriginalMainElementList()
      for (const pageNo of pagesToDraw) {
        if (!this.pageRowList[pageNo]) continue
        this._drawPage({
          elementList,
          positionList,
          rowList: this.pageRowList[pageNo],
          pageNo
        })
      }
    }
  }

  public getTableRowList(sourceElementList: IElement[]): IRow[] {
    const positionContext = this.position.getPositionContext()
    return this.position.getTableTdByContext(
      sourceElementList,
      positionContext
    )!.rowList!
  }

  public getOriginalRowList() {
    const zoneManager = this.getZone()
    if (zoneManager.isHeaderActive()) {
      return this.header.getRowList()
    }
    if (zoneManager.isFooterActive()) {
      return this.footer.getRowList()
    }
    return this.rowList
  }

  public getRowList(): IRow[] {
    const positionContext = this.position.getPositionContext()
    return positionContext.isTable
      ? this.getTableRowList(this.getOriginalElementList())
      : this.getOriginalRowList()
  }

  public getPageRowList(): IRow[][] {
    return this.pageRowList
  }

  public getCtx(): CanvasRenderingContext2D {
    const listIndex = this._getPageListIndex(this.pageNo)
    return this.ctxList[~listIndex ? listIndex : 0]
  }

  public getOptions(): DeepRequired<IEditorOption> {
    return this.options
  }

  public getSearch(): Search {
    return this.search
  }

  public getGroup(): Group {
    return this.group
  }

  public getArea(): Area {
    return this.area
  }

  public getBadge(): Badge {
    return this.badge
  }

  public getMagnifier(): Magnifier {
    return this.magnifier
  }

  public getHistoryManager(): HistoryManager {
    return this.historyManager
  }

  public getPosition(): Position {
    return this.position
  }

  public getZone(): Zone {
    return this.zone
  }

  public getColumnManager(): ColumnManager {
    return this.columnManager
  }

  public getRange(): RangeManager {
    return this.range
  }

  public getLineBreakParticle(): LineBreakParticle {
    return this.lineBreakParticle
  }

  public getTextParticle(): TextParticle {
    return this.textParticle
  }

  public getStrikeout(): Strikeout {
    return this.strikeout
  }

  public getUnderline(): Underline {
    return this.underline
  }

  public getSubscriptParticle(): SubscriptParticle {
    return this.subscriptParticle
  }

  public getSuperscriptParticle(): SuperscriptParticle {
    return this.superscriptParticle
  }

  public getHeaderElementList(): IElement[] {
    return this.header.getElementList()
  }

  public getTableElementList(sourceElementList: IElement[]): IElement[] {
    const positionContext = this.position.getPositionContext()
    return (
      this.position.getTableTdByContext(sourceElementList, positionContext)
        ?.value || []
    )
  }

  public getElementList(): IElement[] {
    const positionContext = this.position.getPositionContext()
    const elementList = this.getOriginalElementList()
    return positionContext.isTable
      ? this.getTableElementList(elementList)
      : elementList
  }

  public getMainElementList(): IElement[] {
    const positionContext = this.position.getPositionContext()
    return positionContext.isTable
      ? this.getTableElementList(this.elementList)
      : this.elementList
  }

  public getOriginalElementList() {
    const zoneManager = this.getZone()
    if (zoneManager.isHeaderActive()) {
      return this.getHeaderElementList()
    }
    if (zoneManager.isFooterActive()) {
      return this.getFooterElementList()
    }
    return this.elementList
  }

  public getOriginalMainElementList(): IElement[] {
    return this.elementList
  }

  public getFooterElementList(): IElement[] {
    return this.footer.getElementList()
  }

  public getTd(): ITd | null {
    const positionContext = this.position.getPositionContext()
    if (!positionContext.isTable) return null
    return this.position.getTableTdByContext(
      this.getOriginalElementList(),
      positionContext
    )
  }

  public insertElementList(
    payload: IElement[],
    options: IInsertElementListOption = {}
  ) {
    if (!payload.length || !this.range.getIsCanInput()) return
    const { startIndex, endIndex } = this.range.getRange()
    if (!~startIndex && !~endIndex) return
    const { isSubmitHistory = true } = options
    formatElementList(payload, {
      isHandleFirstElement: false,
      editorOptions: this.options
    })
    this.traceParticle.markElementListInserted(payload)
    let curIndex = -1
    // 判断是否在控件内
    let activeControl = this.control.getActiveControl()
    // 光标在控件内如果当前没有被激活，需要手动激活
    if (!activeControl && this.control.getIsRangeWithinControl()) {
      this.control.initControl()
      activeControl = this.control.getActiveControl()
    }
    if (activeControl && this.control.getIsRangeWithinControl()) {
      curIndex = activeControl.setValue(payload, undefined, {
        isIgnoreDisabledRule: true
      })
      this.control.emitControlContentChange()
    } else {
      const elementList = this.getElementList()
      const isCollapsed = startIndex === endIndex
      const start = startIndex + 1
      if (!isCollapsed) {
        this.deleteElementList(elementList, start, endIndex - startIndex)
      }
      this.spliceElementList(elementList, start, 0, payload)
      curIndex = startIndex + payload.length
      // 列表前如有换行符则删除-因为列表内已存在
      const preElement = elementList[start - 1]
      if (
        payload[0].listId &&
        preElement &&
        !preElement.listId &&
        preElement?.value === ZERO &&
        (!preElement.type || preElement.type === ElementType.TEXT)
      ) {
        elementList.splice(startIndex, 1)
        curIndex -= 1
      }
    }
    if (~curIndex) {
      this.range.setRange(curIndex, curIndex)
      this.render({
        curIndex,
        isSubmitHistory
      })
    }
  }

  public appendElementList(
    elementList: IElement[],
    options: IAppendElementListOption = {}
  ) {
    if (!elementList.length) return
    formatElementList(elementList, {
      isHandleFirstElement: false,
      editorOptions: this.options
    })
    this.traceParticle.markElementListInserted(elementList)
    let curIndex: number
    const { isPrepend, isSubmitHistory = true } = options
    if (isPrepend) {
      this.elementList.splice(1, 0, ...elementList)
      curIndex = elementList.length
    } else {
      this.elementList.push(...elementList)
      curIndex = this.elementList.length - 1
    }
    this.range.setRange(curIndex, curIndex)
    this.render({
      curIndex,
      isSubmitHistory
    })
  }

  public spliceElementList(
    elementList: IElement[],
    start: number,
    deleteCount: number,
    items?: IElement[],
    options?: ISpliceElementListOption
  ) {
    const { isIgnoreDeletedRule = false } = options || {}
    const { group, modeRule } = this.options
    if (deleteCount > 0) {
      // 当最后元素与开始元素列表信息不一致时：清除当前列表信息
      const endIndex = start + deleteCount
      const endElement = elementList[endIndex]
      const endElementListId = endElement?.listId
      if (
        endElementListId &&
        elementList[start - 1]?.listId !== endElementListId
      ) {
        let startIndex = endIndex
        while (startIndex < elementList.length) {
          const curElement = elementList[startIndex]
          if (
            curElement.listId !== endElementListId ||
            curElement.value === ZERO
          ) {
            break
          }
          delete curElement.listId
          delete curElement.listType
          delete curElement.listStyle
          startIndex++
        }
      }
      // 非明确忽略删除规则 && 非设计模式 && 非光标在控件内(控件内控制) =》 校验删除规则
      if (
        !isIgnoreDeletedRule &&
        !this.isDesignMode() &&
        !this.control.getIsRangeWithinControl()
      ) {
        const tdDeletable = this.getTd()?.deletable
        let deleteIndex = endIndex - 1
        while (deleteIndex >= start) {
          const deleteElement = elementList[deleteIndex]
          // 删除痕迹不可移除
          if (
            deleteElement?.trace?.length &&
            deleteElement.trace[deleteElement.trace.length - 1].type ===
              TraceType.DELETED
          ) {
            deleteIndex--
            continue
          }
          if (
            deleteElement?.hide ||
            deleteElement?.control?.hide ||
            deleteElement?.area?.hide ||
            (tdDeletable !== false &&
              deleteElement?.disabled !== true &&
              deleteElement?.control?.deletable !== false &&
              (!deleteElement.controlId ||
                this.mode !== EditorMode.FORM ||
                !modeRule[this.mode].controlDeletableDisabled) &&
              deleteElement?.title?.deletable !== false &&
              (group.deletable !== false || !deleteElement.groupIds?.length) &&
              (deleteElement?.area?.deletable !== false ||
                deleteElement?.areaIndex !== 0))
          ) {
            elementList.splice(deleteIndex, 1)
          }
          deleteIndex--
        }
      } else {
        // 留痕删除记录不可移除
        let deleteIndex = endIndex - 1
        while (deleteIndex >= start) {
          const deleteElement = elementList[deleteIndex]
          if (
            !deleteElement?.trace?.length ||
            deleteElement.trace[deleteElement.trace.length - 1].type !==
              TraceType.DELETED
          ) {
            elementList.splice(deleteIndex, 1)
          }
          deleteIndex--
        }
      }
    }
    // 循环添加，避免使用解构影响性能
    if (items?.length) {
      for (let i = 0; i < items.length; i++) {
        elementList.splice(start + i, 0, items[i])
      }
    }
  }

  public getCanvasEvent(): CanvasEvent {
    return this.canvasEvent
  }

  public getGlobalEvent(): GlobalEvent {
    return this.globalEvent
  }

  public getListener(): Listener {
    return this.listener
  }

  public getEventBus(): EventBus<EventBusMap> {
    return this.eventBus
  }

  public getOverride(): Override {
    return this.override
  }

  public getCursor(): Cursor {
    return this.cursor
  }

  public getPreviewer(): Previewer {
    return this.previewer
  }

  public getImageParticle(): ImageParticle {
    return this.imageParticle
  }

  public getTableTool(): TableTool {
    return this.tableTool
  }

  public getRuler(): Ruler {
    return this.ruler
  }

  public getTableOperate(): TableOperate {
    return this.tableOperate
  }

  public getTableParticle(): TableParticle {
    return this.tableParticle
  }

  public getBlockParticle(): BlockParticle {
    return this.blockParticle
  }

  public getHeader(): Header {
    return this.header
  }

  public getFooter(): Footer {
    return this.footer
  }

  public getHyperlinkParticle(): HyperlinkParticle {
    return this.hyperlinkParticle
  }

  public getHintParticle(): HintParticle {
    return this.hintParticle
  }

  public getTraceParticle(): TraceParticle {
    return this.traceParticle
  }

  public getDateParticle(): DateParticle {
    return this.dateParticle
  }

  public getListParticle(): ListParticle {
    return this.listParticle
  }

  public getCheckboxParticle(): CheckboxParticle {
    return this.checkboxParticle
  }

  public getRadioParticle(): RadioParticle {
    return this.radioParticle
  }

  public getControl(): Control {
    return this.control
  }

  public getCascadeManager(): CascadeManager {
    return this.cascadeManager
  }

  public getValidate(): Validate {
    return this.validate
  }

  public getWorkerManager(): WorkerManager {
    return this.workerManager
  }

  public getImageObserver(): ImageObserver {
    return this.imageObserver
  }

  public getI18n(): I18n {
    return this.i18n
  }

  public getGraffiti(): Graffiti {
    return this.graffiti
  }

  public getAccessibility(): Accessibility {
    return this.accessibility
  }

  public getRowCount(): number {
    return this.getRowList().length
  }

  public async getDataURL(payload: IGetImageOption = {}): Promise<string[]> {
    const { pixelRatio, mode, snapDomFunction } = payload
    // 放大像素比
    if (pixelRatio) {
      this.setPagePixelRatio(pixelRatio)
    }
    // 不同模式
    const currentMode = this.mode
    const isSwitchMode = !!mode && currentMode !== mode
    if (isSwitchMode) {
      this.setMode(mode)
    }
    // 导出时临时挂载全部页面
    this.forceFullPageRender = true
    let dataUrlList: string[] = []
    try {
      // 先全量计算并预加载待定尺寸图片
      this.render({
        isLazy: false,
        isCompute: true,
        isSetCursor: false,
        isSubmitHistory: false
      })
      await this.imageObserver.allSettled()
      // 图片尺寸纠正后的延迟重排立即执行，保证导出页数正确
      this.imageParticle.flushImageRelayout()
      await this.imageObserver.allSettled()
      // 叠加iframe图片
      if (snapDomFunction) {
        await this.blockParticle.drawIframeToPage(this.pageList, snapDomFunction)
      }
      dataUrlList = [...this.pageList]
        .sort((a, b) => Number(a.dataset.index) - Number(b.dataset.index))
        .map(c => c.toDataURL())
    } finally {
      this.forceFullPageRender = false
      if (pixelRatio) {
        this.setPagePixelRatio(null)
      }
      if (isSwitchMode) {
        this.setMode(currentMode)
      }
      // 还原虚拟页窗口
      if (this.getIsPagingMode()) {
        this.syncVirtualPages(this.intersectionPageNo, {
          force: true,
          isDraw: true
        })
      }
    }
    return dataUrlList
  }

  public getPainterStyle(): IElementStyle | null {
    return this.painterStyle && Object.keys(this.painterStyle).length
      ? this.painterStyle
      : null
  }

  public getPainterOptions(): IPainterOption | null {
    return this.painterOptions
  }

  public setPainterStyle(
    payload: IElementStyle | null,
    options?: IPainterOption
  ) {
    this.painterStyle = payload
    this.painterOptions = options || null
    if (this.getPainterStyle()) {
      this.pageList.forEach(c => (c.style.cursor = 'copy'))
    }
  }

  public setDefaultRange() {
    if (!this.elementList.length) return
    setTimeout(() => {
      const curIndex = this.elementList.length - 1
      this.range.setRange(curIndex, curIndex)
      this.range.setRangeStyle()
    })
  }

  public getIsPagingMode(): boolean {
    return this.options.pageMode === PageMode.PAGING
  }

  public setPageMode(payload: PageMode) {
    if (!payload || this.options.pageMode === payload) return
    this.options.pageMode = payload
    this.virtualPageRange = null
    // 纸张大小重置
    if (payload === PageMode.PAGING) {
      const { height } = this.options
      const dpr = this.getPagePixelRatio()
      const canvas = this.pageList[0]
      if (canvas) {
        canvas.style.height = `${height}px`
        canvas.height = height * dpr
        // canvas尺寸发生变化，上下文被重置
        this._initPageContext(this.ctxList[0])
      }
    } else {
      // 连页模式：移除懒加载监听&清空页眉页脚计算数据，并还原页面定位样式
      this._disconnectLazyRender()
      this.header.recovery()
      this.footer.recovery()
      this.zone.setZone(EditorZone.MAIN)
      this.pageContainer.style.position = ''
      this.pageContainer.style.height = ''
      // 连页仅保留一页
      if (this.pageList.length > 1) {
        this.pageList.splice(1).forEach(page => page.remove())
        this.ctxList.splice(1)
      }
      if (this.pageList[0]) {
        this._applyPagePosition(this.pageList[0], 0)
      }
    }
    const { startIndex } = this.range.getRange()
    const isCollapsed = this.range.getIsCollapsed()
    this.render({
      isSetCursor: true,
      curIndex: startIndex,
      isSubmitHistory: false
    })
    // 重新定位避免事件监听丢失
    if (!isCollapsed) {
      this.cursor.drawCursor({
        isShow: false
      })
    }
    // 回调
    setTimeout(() => {
      if (this.listener.pageModeChange) {
        this.listener.pageModeChange(payload)
      }
      if (this.eventBus.isSubscribe('pageModeChange')) {
        this.eventBus.emit('pageModeChange', payload)
      }
    })
  }

  public setPageScale(payload: number) {
    this.options.scale = payload
    this.header.recovery()
    this.footer.recovery()
    this._updatePageSizes()
    const cursorPosition = this.position.getCursorPosition()
    this.render({
      isSubmitHistory: false,
      isSetCursor: !!cursorPosition,
      curIndex: cursorPosition?.index
    })
    if (this.listener.pageScaleChange) {
      this.listener.pageScaleChange(payload)
    }
    if (this.eventBus.isSubscribe('pageScaleChange')) {
      this.eventBus.emit('pageScaleChange', payload)
    }
  }

  public getPagePixelRatio(): number {
    return this.pagePixelRatio || window.devicePixelRatio
  }

  public setPagePixelRatio(payload: number | null) {
    if (
      (!this.pagePixelRatio && payload === window.devicePixelRatio) ||
      payload === this.pagePixelRatio
    ) {
      return
    }
    this.pagePixelRatio = payload
    this.setPageDevicePixel()
  }

  public setPageDevicePixel() {
    this._updatePageSizes()
    this.render({
      isSubmitHistory: false,
      isSetCursor: false
    })
  }

  public setPaperSize(width: number, height: number) {
    this.options.width = width
    this.options.height = height
    this._updatePageSizes()
    this.render({
      isSubmitHistory: false,
      isSetCursor: false
    })
  }

  public setPaperDirection(payload: PaperDirection) {
    this.options.paperDirection = payload
    this.render({
      isSubmitHistory: false,
      isSetCursor: false
    })
  }

  // 设置光标所在节的纸张方向，首节修改全局方向
  public setPageDirection(payload: PaperDirection | null) {
    if (
      this.isReadonly() ||
      this.isDisabled() ||
      this.zone.getZone() !== EditorZone.MAIN
    ) {
      return
    }
    const { endIndex } = this.range.getRange()
    let pageBreakElement: IElement | null = null
    for (let i = endIndex; i >= 0; i--) {
      if (this.elementList[i].type === ElementType.PAGE_BREAK) {
        pageBreakElement = this.elementList[i]
        break
      }
    }
    if (!pageBreakElement) {
      if (payload) {
        this.setPaperDirection(payload)
      }
      return
    }
    if (payload) {
      pageBreakElement.paperDirection = payload
    } else {
      delete pageBreakElement.paperDirection
    }
    this.render({ curIndex: endIndex })
  }

  public setPaperMargin(payload: IMargin) {
    this.options.margins = payload
    this.header.recovery()
    this.footer.recovery()
    this.render({
      isSubmitHistory: false,
      isSetCursor: false
    })
  }

  public getOriginValue(
    options: IGetOriginValueOption = {}
  ): Required<IEditorData> {
    const { pageNo } = options
    let mainElementList = this.elementList
    if (
      Number.isInteger(pageNo) &&
      pageNo! >= 0 &&
      pageNo! < this.pageRowList.length
    ) {
      mainElementList = this.pageRowList[pageNo!].flatMap(
        row => row.elementList
      )
    }
    // 同步block的最新数据
    this.blockParticle.update()
    const data: Required<IEditorData> = {
      header: this.getHeaderElementList(),
      main: mainElementList,
      footer: this.getFooterElementList(),
      graffiti: this.graffiti.getValue()
    }
    return data
  }

  public getValue(options: IGetValueOption = {}): IEditorResult {
    const originData = this.getOriginValue(options)
    const { extraPickAttrs } = options
    const data: IEditorData = {
      header: zipElementList(originData.header, {
        extraPickAttrs
      }),
      main: zipElementList(originData.main, {
        extraPickAttrs,
        isClassifyArea: true
      }),
      footer: zipElementList(originData.footer, {
        extraPickAttrs
      }),
      graffiti: originData.graffiti
    }
    return {
      version,
      data,
      options: deepClone(this.options)
    }
  }

  public setValue(payload: Partial<IEditorData>, options?: ISetValueOption) {
    const { header, main, footer } = deepClone(payload)
    if (!header && !main && !footer) return
    const { isSetCursor = false } = options || {}
    const pageComponentData = [header, main, footer]
    pageComponentData.forEach(data => {
      if (!data) return
      formatElementList(data, {
        editorOptions: this.options,
        isForceCompensation: true
      })
    })
    // 空正文 area 补偿可编辑占位行（含仅有 data-title 的初始空区域）
    if (main?.length) {
      this.area.ensureEditableBodies(main)
    }
    this.setEditorData({
      header,
      main,
      footer
    })
    // 渲染&计算&清空历史记录
    this.historyManager.recovery()
    const curIndex = isSetCursor
      ? main?.length
        ? main.length - 1
        : 0
      : undefined
    if (curIndex !== undefined) {
      this.range.setRange(curIndex, curIndex)
    }
    this.render({
      curIndex,
      isSetCursor,
      isFirstRender: true
    })
    // 异步图片尺寸纠正（含未挂载虚拟页上的图片）
    this.imageParticle.preloadPendingImages()
    // 数据替换后级联规则全量重算
    this.cascadeManager.executeAll()
  }

  public setEditorData(payload: Partial<Omit<IEditorData, 'graffiti'>>) {
    const { header, main, footer } = payload
    if (header) {
      this.header.setElementList(header)
    }
    if (main) {
      this.elementList = main
    }
    if (footer) {
      this.footer.setElementList(footer)
    }
  }

  private _wrapContainer(rootContainer: HTMLElement): HTMLDivElement {
    const container = document.createElement('div')
    rootContainer.append(container)
    return container
  }

  private _formatContainer() {
    // 容器宽度需跟随纸张宽度
    this.container.style.position = 'relative'
    this.container.style.width = `${this.getWidth()}px`
    this.container.setAttribute(EDITOR_COMPONENT, EditorComponent.MAIN)
  }

  private _createPageContainer(): HTMLDivElement {
    const pageContainer = document.createElement('div')
    pageContainer.classList.add(`${EDITOR_PREFIX}-page-container`)
    this.container.append(pageContainer)
    return pageContainer
  }

  private _createPageCanvas(pageNo: number): {
    canvas: HTMLCanvasElement
    ctx: CanvasRenderingContext2D
  } {
    const { width, height } = this.getPageSize(pageNo)
    const canvas = document.createElement('canvas')
    canvas.style.display = 'block'
    canvas.style.backgroundColor = '#ffffff'
    canvas.style.cursor = 'text'
    this._applyPagePosition(canvas, pageNo)
    // 调整分辨率
    const dpr = this.getPagePixelRatio()
    canvas.width = width * dpr
    canvas.height = height * dpr
    const ctx = canvas.getContext('2d')!
    // 初始化上下文配置
    this._initPageContext(ctx)
    return { canvas, ctx }
  }

  private _createPage(pageNo: number) {
    const { canvas, ctx } = this._createPageCanvas(pageNo)
    this.pageContainer.append(canvas)
    this.pageList.push(canvas)
    this.ctxList.push(ctx)
  }

  // 按各页实际尺寸（方向/缩放/DPR）校正页面 canvas 与容器宽度
  private _updatePageSizes() {
    const dpr = this.getPagePixelRatio()
    const isPagingMode = this.getIsPagingMode()
    this.container.style.width = `${this._getPageMaxWidth()}px`
    this.pageList.forEach((p, i) => {
      const pageNo = Number(p.dataset.index)
      const { width, height } = this.getPageSize(
        Number.isNaN(pageNo) ? i : pageNo
      )
      if (isPagingMode) {
        this._applyPagePosition(p, Number.isNaN(pageNo) ? i : pageNo)
      } else {
        p.style.width = `${width}px`
        p.style.marginBottom = `${this.getPageGap()}px`
      }
      // 连续页模式高度由内容撑开（_computePageList 已按需调整），仅校正宽度
      if (isPagingMode) {
        p.style.height = `${height}px`
      }
      const canvasHeight = isPagingMode
        ? height
        : Number.parseFloat(p.style.height) || height
      const pixelWidth = Math.floor(width * dpr)
      const pixelHeight = Math.floor(canvasHeight * dpr)
      const isSizeChanged = p.width !== pixelWidth || p.height !== pixelHeight
      if (isSizeChanged) {
        p.width = pixelWidth
        p.height = pixelHeight
        this._initPageContext(this.ctxList[i])
      }
    })
    if (isPagingMode) {
      this._updatePageContainerHeight()
    }
  }

  private _initPageContext(ctx: CanvasRenderingContext2D) {
    const dpr = this.getPagePixelRatio()
    ctx.scale(dpr, dpr)
    // 重置以下属性是因部分浏览器(chrome)会应用css样式
    ctx.letterSpacing = '0px'
    ctx.wordSpacing = '0px'
    ctx.direction = 'ltr'
  }

  private _getMeasureCtx(): CanvasRenderingContext2D {
    if (!this.measureCtx) {
      const canvas = document.createElement('canvas')
      this.measureCtx = canvas.getContext('2d')!
    }
    return this.measureCtx
  }

  public getElementFont(el: IElement, scale = 1): string {
    const { defaultSize, defaultFont } = this.options
    const font = el.font || defaultFont
    const size = el.actualSize || el.size || defaultSize
    return `${el.italic ? 'italic ' : ''}${el.bold ? 'bold ' : ''}${
      size * scale
    }px ${font}`
  }

  public getElementSize(el: IElement) {
    return el.actualSize || el.size || this.options.defaultSize
  }

  public getElementRowMargin(el: IElement) {
    const {
      defaultSize,
      defaultBasicRowMarginHeight,
      defaultRowMargin,
      scale
    } = this.options
    // 字体在12-30之间，行间距不变，小于12按比例缩小，大于30按比例放大
    const fontSize = el.size || defaultSize
    let ratio = 1
    if (fontSize < 12) {
      ratio = fontSize / 12
    } else if (fontSize > 30) {
      ratio = 1 + (fontSize - 30) / 30
    }
    return (
      defaultBasicRowMarginHeight *
      ratio *
      (el.rowMargin ?? defaultRowMargin) *
      scale
    )
  }

  public computeRowList(payload: IComputeRowListPayload) {
    const {
      innerWidth,
      elementList,
      isPagingMode = false,
      isFromTable = false,
      startX = 0,
      startY = 0,
      pageHeight = 0,
      surroundElementList = []
    } = payload
    const {
      defaultSize,
      scale,
      imgCaption,
      table: { tdPadding, defaultColMinWidth, overflow },
      defaultTabWidth
    } = this.options
    const defaultBasicRowMarginHeight = this.getDefaultBasicRowMarginHeight()
    const ctx = this._getMeasureCtx()
    // 还原最小宽度控件占位
    if (this.controlMinWidthPlaceholderElementListSet.has(elementList)) {
      for (let i = elementList.length - 1; i >= 0; i--) {
        if (elementList[i].isControlMinWidthPlaceholder) {
          elementList.splice(i, 1)
        }
      }
      this.controlMinWidthPlaceholderElementListSet.delete(elementList)
    }
    // 计算列表偏移宽度
    const listStyleMap = this.listParticle.computeListStyle(ctx, elementList)
    const rowList: IRow[] = []
    let layout =
      isPagingMode && !isFromTable ? this.columnManager.getLayout() : null
    let isColumnEnabled = !!layout && layout.count > 1
    if (elementList.length) {
      rowList.push({
        width: 0,
        height: 0,
        ascent: 0,
        elementList: [],
        startIndex: 0,
        rowIndex: 0,
        rowFlex: elementList?.[0]?.rowFlex || elementList?.[1]?.rowFlex,
        ...(isColumnEnabled ? { columnIndex: 0 } : {})
      })
    }
    // 起始位置及页码计算
    let x = startX
    let y = startY
    let pageNo = 0
    // 混排横竖版：跟随分页符上的 paperDirection 切换当前节的排版方向
    let currentDirection = this.options.paperDirection
    let currentMargins = this.getMargins(currentDirection)
    let currentInnerWidth = innerWidth
    let currentStartX = startX
    let currentPageHeight = pageHeight
    // 分页模式下按页计算起始 Y（页眉/页脚禁用时该页起始位置上移）
    let pageStartY = startY
    if (isPagingMode && !isFromTable) {
      pageStartY = currentMargins[0] + this.getHeader().getExtraHeight(0)
      y = pageStartY
    }
    // 列表位置
    // 不同 listId 独立计数，避免父列表与子列表序号互相影响
    const listIndexMap: Map<string, number> = new Map()
    // 控件最小宽度
    let controlRealWidth = 0
    // 分栏游标
    let currentColumn = 0
    for (let i = 0; i < elementList.length; i++) {
      const curRow: IRow = rowList[rowList.length - 1]
      const element = elementList[i]
      const rowMargin = this.getElementRowMargin(element)
      const metrics: IElementMetrics = {
        width: 0,
        height: 0,
        boundingBoxAscent: 0,
        boundingBoxDescent: 0
      }
      // 实际可用宽度
      const offsetX =
        curRow.offsetX ||
        (element.listId &&
          (listStyleMap.get(element.listId) || 0) +
            (element.listLevel
              ? this.listParticle.LIST_INDENT_WIDTH * element.listLevel * scale
              : 0)) ||
        0
      const rowMaxWidth =
        isColumnEnabled && layout ? layout.width : currentInnerWidth
      const availableWidth = rowMaxWidth - offsetX
      // 增加起始位置坐标偏移量
      const isStartElement = curRow.elementList.length === 1
      x += isStartElement ? offsetX : 0
      y += isStartElement ? curRow.offsetY || 0 : 0
      if (
        (element.hide ||
          element.control?.hide ||
          (element.area?.hide && !this.isAreaHideDisabled()) ||
          this.traceParticle.isTraceHidden(element)) &&
        !this.isDesignMode()
      ) {
        const preElement = curRow.elementList[curRow.elementList.length - 1]
        metrics.height =
          preElement?.metrics.height || this.options.defaultSize * scale
        metrics.boundingBoxAscent = preElement?.metrics.boundingBoxAscent || 0
        metrics.boundingBoxDescent = preElement?.metrics.boundingBoxDescent || 0
      } else if (
        element.type === ElementType.IMAGE ||
        element.type === ElementType.LATEX
      ) {
        // 浮动图片无需计算数据
        if (
          element.imgDisplay === ImageDisplay.SURROUND ||
          element.imgDisplay === ImageDisplay.FLOAT_TOP ||
          element.imgDisplay === ImageDisplay.FLOAT_BOTTOM
        ) {
          metrics.width = 0
          metrics.height = 0
          metrics.boundingBoxDescent = 0
        } else {
          const elementWidth = (element.width || 0) * scale
          const elementHeight = (element.height || 0) * scale
          // 图片超出尺寸后自适应（图片大小大于可用宽度时）
          if (elementWidth > availableWidth && elementWidth > 0) {
            const adaptiveHeight =
              (elementHeight * availableWidth) / elementWidth
            element.width = availableWidth / scale
            element.height = adaptiveHeight / scale
            metrics.width = availableWidth
            metrics.height = adaptiveHeight
            metrics.boundingBoxDescent = adaptiveHeight
          } else {
            metrics.width = elementWidth
            metrics.height = elementHeight
            metrics.boundingBoxDescent = elementHeight
          }
          // 增加题注高度
          if (element.imgCaption?.value) {
            const fontSize = element.imgCaption.size || imgCaption.size
            const captionTop = element.imgCaption.top ?? imgCaption.top
            const captionHeight = (fontSize + captionTop) * scale
            metrics.boundingBoxAscent += captionHeight
          }
        }
      } else if (element.type === ElementType.TABLE) {
        const tdPaddingWidth = tdPadding[1] + tdPadding[3]
        const tdPaddingHeight = tdPadding[0] + tdPadding[2]
        // 表格跨页在渲染层拆分行（数据层保持单一表格）
        const trList = element.trList!
        // 重置tr高度：行高不可低于一个单元格最小高度
        const tdMinHeight =
          tdPaddingHeight + defaultSize + (rowMargin * 2) / scale
        for (let t = 0; t < trList.length; t++) {
          const tr = trList[t]
          // 行高默认当前最小高度，后续根据内容自适应
          tr.height = Math.max(tdMinHeight, tr.minHeight || 0)
          tr.minHeight = tr.height
        }
        // 表格不允许超出正文区域时：等比例压缩列宽至内容区内，并清除横向偏移
        if (!overflow) {
          shrinkColgroupToWidth(
            element.colgroup!,
            this.getOriginalInnerWidth(),
            defaultColMinWidth
          )
          element.translateX = 0
        }
        // 计算表格行列
        this.tableParticle.computeRowColInfo(element)
        // 计算表格内元素信息
        for (let t = 0; t < trList.length; t++) {
          const tr = trList[t]
          for (let d = 0; d < tr.tdList.length; d++) {
            const td = tr.tdList[d]
            const rowList = this.computeRowList({
              innerWidth: (td.width! - tdPaddingWidth) * scale,
              elementList: td.value,
              isFromTable: true,
              isPagingMode
            })
            const rowHeight = rowList.reduce((pre, cur) => pre + cur.height, 0)
            td.rowList = rowList
            // 移除缩放导致的行高变化-渲染时会进行缩放调整
            const curTdHeight = rowHeight / scale + tdPaddingHeight
            // 内容高度大于当前单元格高度需增加
            if (td.height! < curTdHeight) {
              const extraHeight = curTdHeight - td.height!
              const changeTr = trList[t + td.rowspan - 1]
              changeTr.height += extraHeight
              changeTr.tdList.forEach(changeTd => {
                changeTd.height! += extraHeight
                if (!changeTd.realHeight) {
                  changeTd.realHeight = changeTd.height!
                } else {
                  changeTd.realHeight! += extraHeight
                }
              })
            }
            // 当前单元格最小高度及真实高度（包含跨列）
            let curTdMinHeight = 0
            let curTdRealHeight = 0
            let i = 0
            while (i < td.rowspan) {
              const curTr = trList[i + t] || trList[t]
              curTdMinHeight += curTr.minHeight!
              curTdRealHeight += curTr.height!
              i++
            }
            td.realMinHeight = curTdMinHeight
            td.realHeight = curTdRealHeight
            td.mainHeight = curTdHeight
          }
        }
        // 单元格高度大于实际内容高度需减少
        const reduceTrList = this.tableParticle.getTrListGroupByCol(trList)
        for (let t = 0; t < reduceTrList.length; t++) {
          const tr = reduceTrList[t]
          let reduceHeight = -1
          for (let d = 0; d < tr.tdList.length; d++) {
            const td = tr.tdList[d]
            const curTdRealHeight = td.realHeight!
            const curTdHeight = td.mainHeight!
            const curTdMinHeight = td.realMinHeight!
            // 获取最大可减少高度
            const curReduceHeight =
              curTdHeight < curTdMinHeight
                ? curTdRealHeight - curTdMinHeight
                : curTdRealHeight - curTdHeight
            if (!~reduceHeight || curReduceHeight < reduceHeight) {
              reduceHeight = curReduceHeight
            }
          }
          if (reduceHeight > 0) {
            const changeTr = trList[t]
            changeTr.height -= reduceHeight
            changeTr.tdList.forEach(changeTd => {
              changeTd.height! -= reduceHeight
              changeTd.realHeight! -= reduceHeight
            })
          }
        }
        // 需要重新计算表格内值
        this.tableParticle.computeRowColInfo(element)
        // 计算出表格高度
        const tableHeight = this.tableParticle.getTableHeight(element)
        const tableWidth = this.tableParticle.getTableWidth(element)
        element.width = tableWidth
        element.height = tableHeight
        const elementWidth = tableWidth * scale
        const elementHeight = tableHeight * scale
        metrics.width = elementWidth
        metrics.height = elementHeight
        metrics.boundingBoxDescent = elementHeight
        metrics.boundingBoxAscent = -rowMargin
        // 后一个元素也是表格则移除行间距
        if (elementList[i + 1]?.type === ElementType.TABLE) {
          metrics.boundingBoxAscent -= rowMargin
        }
      } else if (element.type === ElementType.SEPARATOR) {
        const {
          separator: { lineWidth: defaultLineWidth }
        } = this.options
        const lineWidth = element.lineWidth || defaultLineWidth
        element.width = availableWidth / scale
        metrics.width = availableWidth
        metrics.height = lineWidth * scale
        metrics.boundingBoxAscent = -rowMargin
        metrics.boundingBoxDescent = -rowMargin + metrics.height
      } else if (element.type === ElementType.PAGE_BREAK) {
        element.width = availableWidth / scale
        metrics.width = availableWidth
        metrics.height = defaultSize
      } else if (
        element.type === ElementType.RADIO ||
        element.controlComponent === ControlComponent.RADIO
      ) {
        const { width, height, gap } = this.options.radio
        const elementWidth = width + gap * 2
        element.width = elementWidth
        metrics.width = elementWidth * scale
        metrics.height = height * scale
      } else if (
        element.type === ElementType.CHECKBOX ||
        element.controlComponent === ControlComponent.CHECKBOX
      ) {
        const { width, height, gap } = this.options.checkbox
        const elementWidth = width + gap * 2
        element.width = elementWidth
        metrics.width = elementWidth * scale
        metrics.height = height * scale
      } else if (element.type === ElementType.TAB) {
        metrics.width = defaultTabWidth * scale
        metrics.height = defaultSize * scale
        metrics.boundingBoxDescent = 0
        metrics.boundingBoxAscent =
          this.textParticle.getBasisWordBoundingBoxAscent(ctx, ctx.font)
      } else if (element.isControlMinWidthPlaceholder) {
        metrics.width = (element.width || 0) * scale
        metrics.height = defaultSize * scale
        ctx.font = this.getElementFont(element)
        const basisMetrics = this.textParticle.measureBasisWord(
          ctx,
          element.font!
        )
        metrics.boundingBoxAscent = basisMetrics.actualBoundingBoxAscent * scale
        metrics.boundingBoxDescent =
          basisMetrics.actualBoundingBoxDescent * scale
      } else if (element.type === ElementType.BLOCK) {
        if (!element.width) {
          metrics.width = availableWidth
        } else {
          const elementWidth = element.width * scale
          metrics.width = Math.min(elementWidth, availableWidth)
        }
        metrics.height = element.height! * scale
        metrics.boundingBoxDescent = metrics.height
        metrics.boundingBoxAscent = 0
      } else if (element.type === ElementType.LABEL) {
        const {
          defaultSize,
          label: { defaultPadding }
        } = this.options
        ctx.font = this.getElementFont(element)
        const fontMetrics = this.textParticle.measureText(ctx, element)
        metrics.width =
          (fontMetrics.width + defaultPadding[1] + defaultPadding[3]) * scale
        metrics.height = (element.size || defaultSize) * scale
        metrics.boundingBoxDescent = 0
        metrics.boundingBoxAscent =
          (defaultPadding[0] + fontMetrics.actualBoundingBoxAscent) * scale
      } else {
        // 设置上下标真实字体尺寸
        const size = element.size || defaultSize
        if (
          element.type === ElementType.SUPERSCRIPT ||
          element.type === ElementType.SUBSCRIPT
        ) {
          element.actualSize = Math.ceil(size * 0.6)
        }
        metrics.height = (element.actualSize || size) * scale
        ctx.font = this.getElementFont(element)
        const fontMetrics = this.textParticle.measureText(ctx, element)
        metrics.width = fontMetrics.width * scale
        if (element.letterSpacing) {
          metrics.width += element.letterSpacing * scale
        }
        // 使用基于字体的基准度量以确保一致的行高，避免字符特定度量导致的布局跳动
        const basisMetrics = this.textParticle.measureBasisWord(
          ctx,
          element.font!
        )
        metrics.boundingBoxAscent = basisMetrics.actualBoundingBoxAscent * scale
        metrics.boundingBoxDescent =
          basisMetrics.actualBoundingBoxDescent * scale
        if (element.type === ElementType.SUPERSCRIPT) {
          metrics.boundingBoxAscent += metrics.height / 2
        } else if (element.type === ElementType.SUBSCRIPT) {
          metrics.boundingBoxDescent += metrics.height / 2
        }
      }
      const ascent =
        !element.hide &&
        !this.traceParticle.isTraceHidden(element) &&
        ((element.imgDisplay !== ImageDisplay.INLINE &&
          element.type === ElementType.IMAGE) ||
          element.type === ElementType.LATEX)
          ? metrics.height + rowMargin
          : metrics.boundingBoxAscent + rowMargin
      const height =
        rowMargin +
        metrics.boundingBoxAscent +
        metrics.boundingBoxDescent +
        rowMargin
      const rowElement: IRowElement = Object.assign(element, {
        metrics,
        left: 0,
        style: this.getElementFont(element, scale)
      })
      // 控件开始时统计宽度，结束时消费最小宽度并补充跨行占位
      if (
        rowElement.control?.minWidth &&
        !rowElement.isControlMinWidthPlaceholder &&
        !this.traceParticle.isTraceHidden(rowElement)
      ) {
        if (rowElement.controlComponent) {
          controlRealWidth += metrics.width
        }
        if (rowElement.controlComponent === ControlComponent.POSTFIX) {
          const controlMinWidth = rowElement.control.minWidth * scale
          const extraWidth = controlMinWidth - controlRealWidth
          const rowRemainingWidth = Math.max(
            availableWidth - curRow.width - rowElement.metrics.width,
            0
          )
          // 设置最小宽度控件属性（字符偏移量）
          this.control.setMinWidthControlInfo({
            row: curRow,
            rowElement,
            availableWidth,
            controlRealWidth
          })
          let placeholderWidth = extraWidth - rowRemainingWidth
          const placeholderList: IElement[] = []
          while (placeholderWidth > 0) {
            const width = Math.min(placeholderWidth, availableWidth)
            placeholderList.push({
              ...rowElement,
              value: '',
              width: width / scale,
              left: 0,
              isControlMinWidthPlaceholder: true
            } as IElement)
            placeholderWidth -= width
          }
          if (placeholderList.length) {
            elementList.splice(i + 1, 0, ...placeholderList)
            this.controlMinWidthPlaceholderElementListSet.add(elementList)
          }
          controlRealWidth = 0
        }
      }
      // 超过限定宽度
      const preElement = elementList[i - 1]
      let nextElement = elementList[i + 1]
      // 累计行宽 + 当前元素宽度 + 排版宽度(英文单词整体宽度 + 后面标点符号宽度)
      let curRowWidth = curRow.width + metrics.width
      if (this.options.wordBreak === WordBreak.BREAK_WORD) {
        if (
          (!preElement?.type || preElement?.type === ElementType.TEXT) &&
          (!element.type || element.type === ElementType.TEXT)
        ) {
          // 英文单词
          const word = `${preElement?.value || ''}${element.value}`
          if (this.WORD_LIKE_REG.test(word)) {
            const { width, endElement } = this.textParticle.measureWord(
              ctx,
              elementList,
              i
            )
            // 后面存在元素 && 单词宽度大于行可用宽度，无需折行
            const wordWidth = width * scale
            if (endElement && wordWidth <= availableWidth) {
              curRowWidth += wordWidth
              nextElement = endElement
            }
          }
          // 标点符号
          const punctuationWidth = this.textParticle.measurePunctuationWidth(
            ctx,
            nextElement
          )
          curRowWidth += punctuationWidth * scale
        }
      }
      // 列表信息
      if (element.listId && element.value === ZERO && !element.listWrap) {
        if (listIndexMap.has(element.listId)) {
          listIndexMap.set(
            element.listId,
            (listIndexMap.get(element.listId) ?? 0) + 1
          )
        } else {
          listIndexMap.set(element.listId, 0)
        }
      }
      // 计算四周环绕导致的元素偏移量
      const surroundPosition = this.position.setSurroundPosition({
        pageNo,
        rowElement,
        row: curRow,
        rowElementRect: {
          x,
          y,
          height,
          width: metrics.width
        },
        availableWidth,
        surroundElementList
      })
      x = surroundPosition.x
      curRowWidth += surroundPosition.rowIncreaseWidth
      x += metrics.width
      // 是否强制换行
      const isForceBreak =
        element.type === ElementType.SEPARATOR ||
        element.type === ElementType.TABLE ||
        preElement?.type === ElementType.TABLE ||
        preElement?.type === ElementType.BLOCK ||
        element.type === ElementType.BLOCK ||
        preElement?.type === ElementType.PAGE_BREAK ||
        preElement?.imgDisplay === ImageDisplay.INLINE ||
        element.imgDisplay === ImageDisplay.INLINE ||
        preElement?.listId !== element.listId ||
        (preElement?.areaId !== element.areaId &&
          !(element.area?.hide && !this.isAreaHideDisabled())) ||
        (element.control?.flexDirection === FlexDirection.COLUMN &&
          (element.controlComponent === ControlComponent.CHECKBOX ||
            element.controlComponent === ControlComponent.RADIO) &&
          preElement?.controlComponent === ControlComponent.VALUE) ||
        (i !== 0 &&
          element.value === ZERO &&
          !(element.area?.hide && !this.isAreaHideDisabled()) &&
          // 区域标题尾换行后的正文占位换行：同一行，避免双空行
          !(
            preElement?.value === ZERO &&
            preElement.title?.disabled &&
            !element.title?.disabled &&
            !!element.areaId &&
            element.areaId === preElement.areaId
          ))
      // 是否宽度不足导致换行
      const isWidthNotEnough = curRowWidth > availableWidth
      const isWrap = isForceBreak || isWidthNotEnough
      // 新行数据处理
      if (isWrap) {
        const row: IRow = {
          width: metrics.width,
          height,
          startIndex: i,
          elementList: [rowElement],
          ascent,
          rowIndex: curRow.rowIndex + 1,
          rowFlex: elementList[i]?.rowFlex || elementList[i + 1]?.rowFlex,
          isPageBreak: element.type === ElementType.PAGE_BREAK,
          ...(isColumnEnabled ? { columnIndex: currentColumn } : {})
        }
        if (row.isPageBreak && element.paperDirection) {
          row.paperDirection = element.paperDirection
        }
        // 控件缩进
        if (
          rowElement.controlComponent !== ControlComponent.PREFIX &&
          rowElement.control?.indentation === ControlIndentation.VALUE_START
        ) {
          // 查找到非前缀的第一个元素位置
          const preStartIndex = curRow.elementList.findIndex(
            el =>
              el.controlId === rowElement.controlId &&
              el.controlComponent !== ControlComponent.PREFIX
          )
          if (~preStartIndex) {
            const preRowPositionList = this.position.computeRowPosition({
              row: curRow,
              innerWidth: currentInnerWidth
            })
            const valueStartPosition = preRowPositionList[preStartIndex]
            if (valueStartPosition) {
              row.offsetX = valueStartPosition.coordinate.leftTop[0]
            }
          }
        }
        // 列表缩进
        if (element.listId) {
          row.isList = true
          row.offsetX =
            (listStyleMap.get(element.listId!) || 0) +
            (element.listLevel
              ? this.listParticle.LIST_INDENT_WIDTH * element.listLevel * scale
              : 0)
          row.listIndex = listIndexMap.get(element.listId!) ?? 0
        }
        // Y轴偏移量
        row.offsetY =
          !isFromTable &&
          element.area?.top &&
          element.areaId !== elementList[i - 1]?.areaId
            ? element.area.top * scale
            : 0
        rowList.push(row)
      } else {
        curRow.width += metrics.width
        // 减小块元素前第一行空行行高
        if (
          i === 0 &&
          (getIsBlockElement(elementList[1]) || !!elementList[1]?.areaId)
        ) {
          curRow.height = defaultBasicRowMarginHeight
          curRow.ascent = defaultBasicRowMarginHeight
        } else if (curRow.height < height) {
          curRow.height = height
          curRow.ascent = ascent
        }
        curRow.elementList.push(rowElement)
      }
      // 行结束时逻辑
      if (isWrap || i === elementList.length - 1) {
        // 行内全部为隐藏元素时 => 行高折叠（仅当行内不止换行符一个元素时）
        if (!this.isDesignMode() && curRow.height > 0) {
          const visibleElements = curRow.elementList.filter(
            el => el.value !== ZERO
          )
          const isAllHidden =
            visibleElements.length > 0 &&
            visibleElements.every(
              el =>
                el.hide ||
                el.control?.hide ||
                (el.area?.hide && !this.isAreaHideDisabled()) ||
                this.traceParticle.isTraceHidden(el)
            )
          if (isAllHidden) {
            curRow.height = 0
          }
        }
        // 换行原因：宽度不足
        curRow.isWidthNotEnough = isWidthNotEnough && !isForceBreak
        // 两端对齐、分散对齐
        if (
          !curRow.isSurround &&
          (preElement?.rowFlex === RowFlex.JUSTIFY ||
            (preElement?.rowFlex === RowFlex.ALIGNMENT &&
              curRow.isWidthNotEnough))
        ) {
          // 忽略换行符及尾部元素间隔设置
          const rowElementList =
            curRow.elementList[0]?.value === ZERO
              ? curRow.elementList.slice(1)
              : curRow.elementList
          const gap =
            (availableWidth - curRow.width) / (rowElementList.length - 1)
          for (let e = 0; e < rowElementList.length - 1; e++) {
            const el = rowElementList[e]
            el.metrics.width += gap
          }
          curRow.width = availableWidth
        }
      }
      // 重新计算坐标、页码、下一行首行元素环绕交叉
      if (isWrap) {
        const columnOffset = !layout ? 0 : layout.offsets[currentColumn] || 0
        x = currentStartX + columnOffset
        y += curRow.height
        if (isPagingMode && !isFromTable && currentPageHeight) {
          const isPageBreakElement = element.type === ElementType.PAGE_BREAK
          const nextDirection =
            element.paperDirection || this.options.paperDirection
          if (isPageBreakElement && nextDirection !== currentDirection) {
            // 分页符切换后续节方向，未指定时回到全局方向
            currentDirection = nextDirection
            currentMargins = this.getMargins(currentDirection)
            currentInnerWidth =
              this.getWidth(currentDirection) -
              currentMargins[1] -
              currentMargins[3]
            currentStartX = currentMargins[3]
            currentPageHeight = this.getHeight(currentDirection)
            // 分栏布局随节方向切换
            layout = this.columnManager.getLayout(currentDirection)
            isColumnEnabled = !!layout && layout.count > 1
          }
          const curMainOuterHeight = this.getMainOuterHeight(
            pageNo,
            currentDirection
          )
          const isOverflow =
            y - pageStartY + curMainOuterHeight + height > currentPageHeight
          if (isOverflow || isPageBreakElement) {
            if (
              !isPageBreakElement &&
              isColumnEnabled &&
              layout &&
              currentColumn < layout.count - 1
            ) {
              currentColumn += 1
              y = pageStartY
              x = currentStartX + (layout.offsets[currentColumn] || 0)
            } else {
              // 删除多余四周环绕型元素
              deleteSurroundElementList(surroundElementList, pageNo)
              pageNo += 1
              currentColumn = 0
              pageStartY =
                currentMargins[0] + this.getHeader().getExtraHeight(pageNo)
              y = pageStartY
              x = currentStartX + (layout ? layout.offsets[0] || 0 : 0)
            }
          }
        }
        // 同步新行的栏索引（栏游标可能在翻栏/翻页逻辑中变化）
        const nextRow = rowList[rowList.length - 1]
        if (nextRow && isColumnEnabled && nextRow.columnIndex !== undefined) {
          nextRow.columnIndex = currentColumn
        }
        // 计算下一行第一个元素是否存在环绕交叉
        rowElement.left = 0
        const surroundPosition = this.position.setSurroundPosition({
          pageNo,
          rowElement,
          row: nextRow,
          rowElementRect: {
            x,
            y,
            height,
            width: metrics.width
          },
          availableWidth,
          surroundElementList
        })
        x = surroundPosition.x
        x += metrics.width
      }
    }
    return rowList
  }

  private _computePageList(): IRow[][] {
    const pageRowList: IRow[][] = [[]]
    const {
      pageMode,
      pageNumber: { maxPageNo }
    } = this.options
    const height = this.getHeight()
    let pageNo = 0
    if (pageMode === PageMode.CONTINUITY) {
      this.pageDirectionList = [this.options.paperDirection]
      const marginHeight = this.getMainOuterHeight(0)
      let pageHeight = marginHeight
      pageRowList[0] = this.rowList
      // 重置高度
      pageHeight += this.rowList.reduce(
        (pre, cur) => pre + cur.height + (cur.offsetY || 0),
        0
      )
      const dpr = this.getPagePixelRatio()
      const pageDom = this.pageList[0]
      const pageDomHeight = Number(pageDom.style.height.replace('px', ''))
      if (pageHeight > pageDomHeight) {
        pageDom.style.height = `${pageHeight}px`
        pageDom.height = pageHeight * dpr
      } else {
        const reduceHeight = pageHeight < height ? height : pageHeight
        pageDom.style.height = `${reduceHeight}px`
        pageDom.height = reduceHeight * dpr
      }
      this._initPageContext(this.ctxList[0])
    } else {
      // 每页页眉/页脚禁用状态可能不同，按页计算外部占位高度
      // 溢出页继承当前方向，分页符开启的新节默认使用全局方向
      const pageDirectionList = [this.options.paperDirection]
      let direction = this.options.paperDirection
      let pageLimit = this.getHeight(direction)
      let pageHeight = this.getMainOuterHeight(0, direction)
      let prevColumnIndex: number | undefined = undefined
      for (let i = 0; i < this.rowList.length; i++) {
        const row = this.rowList[i]
        const rowOffsetY = row.offsetY || 0
        // 分栏内栏切换：重置当前页累计高度，留在本页
        const columnChanged =
          prevColumnIndex !== undefined &&
          row.columnIndex !== undefined &&
          row.columnIndex > 0 &&
          row.columnIndex !== prevColumnIndex
        if (columnChanged) {
          pageHeight =
            this.getMainOuterHeight(pageNo, direction) + row.height + rowOffsetY
          pageRowList[pageNo].push(row)
        } else if (
          row.height + rowOffsetY + pageHeight > pageLimit ||
          this.rowList[i - 1]?.isPageBreak
        ) {
          if (Number.isInteger(maxPageNo) && pageNo >= maxPageNo!) {
            // 跨页表格片段共享元素索引：按片段边界裁剪表格，
            // 保留已展示片段内容，不能直接按共享索引整体截断
            const fragment = row.tableFragment
            const tableElement = this.elementList[row.startIndex]
            if (
              fragment &&
              tableElement?.type === ElementType.TABLE &&
              this.tablePaging.truncateTableByFragment(
                tableElement,
                fragment,
                this.elementList
              )
            ) {
              this.elementList = this.elementList.slice(0, row.startIndex + 1)
            } else {
              this.elementList = this.elementList.slice(0, row.startIndex)
            }
            break
          }
          pageNo++
          const prevRow = this.rowList[i - 1]
          if (prevRow?.isPageBreak) {
            direction = prevRow.paperDirection || this.options.paperDirection
            pageLimit = this.getHeight(direction)
          }
          pageDirectionList[pageNo] = direction
          pageHeight =
            this.getMainOuterHeight(pageNo, direction) + row.height + rowOffsetY
          pageRowList.push([row])
        } else {
          pageHeight += row.height + rowOffsetY
          pageRowList[pageNo].push(row)
        }
        prevColumnIndex = row.columnIndex
      }
      this.pageDirectionList = pageDirectionList
    }
    return pageRowList
  }

  private _drawHighlight(
    ctx: CanvasRenderingContext2D,
    payload: IDrawRowPayload
  ) {
    const { rowList, positionList, elementList } = payload
    const marginHeight = this.getDefaultBasicRowMarginHeight()
    const highlightMarginHeight = this.getHighlightMarginHeight()
    for (let i = 0; i < rowList.length; i++) {
      const curRow = rowList[i]
      for (let j = 0; j < curRow.elementList.length; j++) {
        const element = curRow.elementList[j]
        const preElement = curRow.elementList[j - 1]
        // 高亮配置：元素 > 控件配置
        const highlight =
          element.highlight ||
          this.control.getControlHighlight(elementList, curRow.startIndex + j)
        if (highlight) {
          // 高亮元素相连需立即绘制，并记录下一元素坐标
          if (
            preElement &&
            preElement.highlight &&
            preElement.highlight !== element.highlight
          ) {
            this.highlight.render(ctx)
          }
          // 当前元素位置信息记录（表格跨页片段行优先使用片段位置）
          const {
            coordinate: {
              leftTop: [x, y]
            }
          } = curRow.fragmentPosition || positionList[curRow.startIndex + j]
          // 元素向左偏移量
          const offsetX = element.left || 0
          this.highlight.recordFillInfo(
            ctx,
            x - offsetX,
            y + marginHeight - highlightMarginHeight, // 先减去行margin，再加上高亮margin
            element.metrics.width + offsetX,
            curRow.height - 2 * marginHeight + 2 * highlightMarginHeight,
            highlight
          )
        } else if (preElement?.highlight) {
          // 之前是高亮元素，当前不是需立即绘制
          this.highlight.render(ctx)
        }
      }
      this.highlight.render(ctx)
    }
  }

  public drawRow(ctx: CanvasRenderingContext2D, payload: IDrawRowPayload) {
    // 优先绘制高亮元素
    this._drawHighlight(ctx, payload)
    // 绘制元素、下划线、删除线、选区
    const {
      scale,
      table: { tdPadding },
      group,
      lineBreak,
      whiteSpace
    } = this.options
    const {
      rowList,
      pageNo,
      elementList,
      positionList,
      startIndex,
      zone,
      isDrawLineBreak = !lineBreak.disabled,
      isDrawWhiteSpace = !whiteSpace.disabled,
      isDrawRange = true
    } = payload
    const isPrintMode = this.isPrintMode()
    const isGraffitiMode = this.isGraffitiMode()
    const { isCrossRowCol, tableId } = this.range.getRange()
    let index = startIndex
    for (let i = 0; i < rowList.length; i++) {
      const curRow = rowList[i]
      // 选区绘制记录
      const rangeRecord: IElementFillRect = {
        x: 0,
        y: 0,
        width: 0,
        height: 0
      }
      let tableRangeElement: IElement | null = null
      for (let j = 0; j < curRow.elementList.length; j++) {
        const element = curRow.elementList[j]
        // 表格跨页片段行：索引以行起始数据索引为基准，
        // 避免同页多片段时选区记录索引漂移
        if (curRow.tableFragment) {
          index = curRow.startIndex + j
        }
        const metrics = element.metrics
        // 当前元素位置信息（表格跨页片段行优先使用片段位置）
        const {
          ascent: offsetY,
          coordinate: {
            leftTop: [x, y]
          }
        } = curRow.fragmentPosition || positionList[curRow.startIndex + j]
        const preElement = curRow.elementList[j - 1]
        // 元素绘制
        if (
          (element.hide ||
            element.control?.hide ||
            (element.area?.hide && !this.isAreaHideDisabled()) ||
            this.traceParticle.isTraceHidden(element)) &&
          !this.isDesignMode()
        ) {
          // 控件隐藏时不绘制
          this.textParticle.complete()
        } else if (element.type === ElementType.IMAGE) {
          this.textParticle.complete()
          // 浮动图片单独绘制
          if (
            element.imgDisplay !== ImageDisplay.SURROUND &&
            element.imgDisplay !== ImageDisplay.FLOAT_TOP &&
            element.imgDisplay !== ImageDisplay.FLOAT_BOTTOM
          ) {
            this.imageParticle.render(ctx, element, x, y + offsetY)
          }
        } else if (element.type === ElementType.LATEX) {
          this.textParticle.complete()
          this.laTexParticle.render(ctx, element, x, y + offsetY)
        } else if (element.type === ElementType.TABLE) {
          if (isCrossRowCol) {
            rangeRecord.x = x
            rangeRecord.y = y
            tableRangeElement = element
          }
          this.tableParticle.render(ctx, element, x, y, curRow.tableFragment)
        } else if (element.type === ElementType.HYPERLINK) {
          this.textParticle.complete()
          this.hyperlinkParticle.render(ctx, element, x, y + offsetY)
        } else if (element.type === ElementType.LABEL) {
          this.textParticle.complete()
          this.labelParticle.render(ctx, element, x, y + offsetY)
        } else if (element.type === ElementType.DATE) {
          const nextElement = curRow.elementList[j + 1]
          // 释放之前的
          if (!preElement || preElement.dateId !== element.dateId) {
            this.textParticle.complete()
          }
          this.textParticle.record(ctx, element, x, y + offsetY)
          if (!nextElement || nextElement.dateId !== element.dateId) {
            // 手动触发渲染
            this.textParticle.complete()
          }
        } else if (element.type === ElementType.SUPERSCRIPT) {
          this.textParticle.complete()
          this.superscriptParticle.render(ctx, element, x, y + offsetY)
        } else if (element.type === ElementType.SUBSCRIPT) {
          this.underline.render(ctx)
          this.textParticle.complete()
          this.subscriptParticle.render(ctx, element, x, y + offsetY)
        } else if (element.type === ElementType.SEPARATOR) {
          this.separatorParticle.render(ctx, element, x, y)
        } else if (element.type === ElementType.PAGE_BREAK) {
          if (this.mode !== EditorMode.CLEAN && !isPrintMode) {
            this.pageBreakParticle.render(ctx, element, x, y)
          }
        } else if (
          element.type === ElementType.CHECKBOX ||
          element.controlComponent === ControlComponent.CHECKBOX
        ) {
          this.textParticle.complete()
          this.checkboxParticle.render({
            ctx,
            x,
            y: y + offsetY,
            index: j,
            row: curRow
          })
        } else if (
          element.type === ElementType.RADIO ||
          element.controlComponent === ControlComponent.RADIO
        ) {
          this.textParticle.complete()
          this.radioParticle.render({
            ctx,
            x,
            y: y + offsetY,
            index: j,
            row: curRow
          })
        } else if (element.type === ElementType.TAB) {
          this.textParticle.complete()
        } else if (
          element.rowFlex === RowFlex.ALIGNMENT ||
          element.rowFlex === RowFlex.JUSTIFY
        ) {
          // 如果是两端对齐，因canvas目前不支持letterSpacing需单独绘制文本
          this.textParticle.record(ctx, element, x, y + offsetY)
          this.textParticle.complete()
        } else if (element.type === ElementType.BLOCK) {
          this.textParticle.complete()
          this.blockParticle.render(ctx, pageNo, element, x, y + offsetY)
        } else {
          // 如果当前元素设置左偏移，则上一元素立即绘制
          if (element.left) {
            this.textParticle.complete()
          }
          this.textParticle.record(ctx, element, x, y + offsetY)
          // 如果设置字宽、字间距、标点符号（避免浏览器排版缩小间距）需单独绘制
          if (
            element.width ||
            element.letterSpacing ||
            PUNCTUATION_REG.test(element.value)
          ) {
            this.textParticle.complete()
          }
        }
        // 换行符绘制
        if (
          isDrawLineBreak &&
          !isPrintMode &&
          this.mode !== EditorMode.CLEAN &&
          !curRow.isWidthNotEnough &&
          j === curRow.elementList.length - 1
        ) {
          this.lineBreakParticle.render(ctx, element, x, y + curRow.height / 2)
        }
        // 空白符绘制
        if (isDrawWhiteSpace && WHITE_SPACE_REG.test(element.value)) {
          this.whiteSpaceParticle.render(ctx, element, x, y + curRow.height / 2)
        }
        // 边框绘制（目前仅支持控件）
        if (element.control?.border) {
          // 不同控件边框立刻绘制
          if (
            preElement?.control?.border &&
            preElement.controlId !== element.controlId
          ) {
            this.control.drawBorder(ctx)
          }
          // 当前元素位置信息记录
          const rowMargin = this.getElementRowMargin(element)
          this.control.recordBorderInfo(
            x,
            y + rowMargin,
            element.metrics.width,
            curRow.height - 2 * rowMargin
          )
        } else if (preElement?.control?.border) {
          this.control.drawBorder(ctx)
        }
        // 下划线记录
        if (element.underline || element.control?.underline) {
          // 下标元素下划线单独绘制
          if (
            preElement?.type === ElementType.SUBSCRIPT &&
            element.type !== ElementType.SUBSCRIPT
          ) {
            this.underline.render(ctx)
          }
          // 行间距
          const rowMargin = this.getElementRowMargin(element)
          // 元素向左偏移量
          const offsetX = element.left || 0
          // 下标元素y轴偏移值
          let offsetY = 0
          if (element.type === ElementType.SUBSCRIPT) {
            offsetY = this.subscriptParticle.getOffsetY(element)
          }
          // 占位符不参与颜色计算
          const color = element.control?.underline
            ? this.options.underlineColor
            : element.color
          this.underline.recordFillInfo(
            ctx,
            x - offsetX,
            y + curRow.height - rowMargin + offsetY,
            metrics.width + offsetX,
            0,
            color,
            element.textDecoration?.style
          )
        } else if (preElement?.underline || preElement?.control?.underline) {
          this.underline.render(ctx)
        }
        // 删除线记录
        if (element.strikeout) {
          // 仅文本类元素支持删除线
          if (!element.type || TEXTLIKE_ELEMENT_TYPE.includes(element.type)) {
            // 字体大小不同时需立即绘制
            if (
              preElement &&
              ((preElement.type === ElementType.SUBSCRIPT &&
                element.type !== ElementType.SUBSCRIPT) ||
                (preElement.type === ElementType.SUPERSCRIPT &&
                  element.type !== ElementType.SUPERSCRIPT) ||
                this.getElementSize(preElement) !==
                  this.getElementSize(element))
            ) {
              this.strikeout.render(ctx)
            }
            // 基线文字测量信息
            const standardMetrics = this.textParticle.measureBasisWord(
              ctx,
              this.getElementFont(element)
            )
            // 文字渲染位置 + 基线文字下偏移量 - 一半文字高度
            let adjustY =
              y +
              offsetY +
              standardMetrics.actualBoundingBoxDescent * scale -
              metrics.height / 2
            // 上下标位置调整
            if (element.type === ElementType.SUBSCRIPT) {
              adjustY += this.subscriptParticle.getOffsetY(element)
            } else if (element.type === ElementType.SUPERSCRIPT) {
              adjustY += this.superscriptParticle.getOffsetY(element)
            }
            this.strikeout.recordFillInfo(ctx, x, adjustY, metrics.width)
          }
        } else if (preElement?.strikeout) {
          this.strikeout.render(ctx)
        }
        // 留痕装饰
        this.traceParticle.render({
          ctx,
          element,
          x,
          y,
          curRow,
          metrics,
          offsetY,
          scale
        })
        // 选区记录
        const {
          zone: currentZone,
          startIndex,
          endIndex
        } = this.range.getRange()
        if (
          isDrawRange &&
          currentZone === zone &&
          startIndex !== endIndex &&
          startIndex <= index &&
          index <= endIndex
        ) {
          const positionContext = this.position.getPositionContext()
          // 表格需限定上下文
          if (
            (!positionContext.isTable && !element.tdId) ||
            positionContext.tdId === element.tdId
          ) {
            // 从行尾开始-绘制最小宽度
            if (startIndex === index) {
              const nextElement = elementList[startIndex + 1]
              if (nextElement && nextElement.value === ZERO) {
                rangeRecord.x = x + metrics.width
                rangeRecord.y = y
                rangeRecord.height = curRow.height
                rangeRecord.width += this.options.rangeMinWidth
              }
            } else {
              let rangeWidth = metrics.width
              // 最小选区宽度
              if (rangeWidth === 0 && curRow.elementList.length === 1) {
                rangeWidth = this.options.rangeMinWidth
              }
              // 记录第一次位置、行高
              if (!rangeRecord.width) {
                rangeRecord.x = x
                rangeRecord.y = y
                rangeRecord.height = curRow.height
              }
              rangeRecord.width += rangeWidth
            }
          }
        }
        // 组信息记录
        if (!group.disabled && element.groupIds) {
          this.group.recordFillInfo(element, x, y, metrics.width, curRow.height)
        }
        index++
        // 绘制表格内元素
        if (
          element.type === ElementType.TABLE &&
          !element.hide &&
          !this.traceParticle.isTraceHidden(element)
        ) {
          const tdPaddingWidth = tdPadding[1] + tdPadding[3]
          const fragment = curRow.tableFragment
          // 续页回显表头内容（使用一次性位置列表，不绘制选区）
          if (curRow.repeatTdPositionList?.length) {
            for (const {
              td,
              positionList: repeatPositionList
            } of curRow.repeatTdPositionList) {
              this.drawRow(ctx, {
                elementList: td.value,
                positionList: repeatPositionList,
                rowList: td.rowList!,
                pageNo,
                startIndex: 0,
                innerWidth: (td.width! - tdPaddingWidth) * scale,
                zone,
                isDrawLineBreak,
                isDrawRange: false
              })
            }
          }
          // 遍历片段范围行与进位合并单元格，仅绘制窗口内的内容行
          const fragmentTdList = fragment
            ? this.tableParticle.getFragmentTdList(element, fragment)
            : element.trList!.flatMap(tr => tr.tdList)
          for (const td of fragmentTdList) {
            let rowList = td.rowList!
            let startIndex = 0
            if (fragment) {
              const [windowStart, windowEnd] =
                this.tableParticle.getTdWindowInFragment(td, element, fragment)
              if (windowEnd <= windowStart) continue
              if (windowStart > 0 || windowEnd < td.height!) {
                const visible = this.tableParticle.getTdVisibleRowListByWindow(
                  td,
                  windowStart,
                  windowEnd
                )
                rowList = visible.rowList
                startIndex = visible.startIndex
              }
            }
            this.drawRow(ctx, {
              elementList: td.value,
              positionList: td.positionList!,
              rowList,
              pageNo,
              startIndex,
              innerWidth: (td.width! - tdPaddingWidth) * scale,
              zone,
              isDrawLineBreak
            })
          }
        }
      }
      // 绘制列表样式
      if (curRow.isList && curRow.height > 0) {
        this.listParticle.drawListStyle(
          ctx,
          curRow,
          positionList[curRow.startIndex]
        )
      }
      // 绘制文字、边框、下划线、删除线
      this.textParticle.complete()
      this.control.drawBorder(ctx)
      this.underline.render(ctx)
      this.strikeout.render(ctx)
      // 冲刷留痕累积
      this.traceParticle.flush(ctx)
      // 绘制批注样式
      this.group.render(ctx)
      // 绘制选区
      if (!isPrintMode && !isGraffitiMode) {
        if (rangeRecord.width && rangeRecord.height) {
          const { x, y, width, height } = rangeRecord
          this.range.render(ctx, x, y, width, height)
        }
        if (
          isDrawRange &&
          isCrossRowCol &&
          tableRangeElement &&
          tableRangeElement.id === tableId
        ) {
          const {
            coordinate: {
              leftTop: [x, y]
            }
          } = curRow.fragmentPosition || positionList[curRow.startIndex]
          this.tableParticle.drawRange(
            ctx,
            tableRangeElement,
            x,
            y,
            curRow.tableFragment
          )
        }
      }
    }
  }

  private _drawFloat(
    ctx: CanvasRenderingContext2D,
    payload: IDrawFloatPayload
  ) {
    const floatPositionList = this.position.getFloatPositionList()
    const { imgDisplays, pageNo } = payload
    for (let e = 0; e < floatPositionList.length; e++) {
      const floatPosition = floatPositionList[e]
      const element = floatPosition.element
      if (
        (pageNo === floatPosition.pageNo ||
          floatPosition.zone === EditorZone.HEADER ||
          floatPosition.zone == EditorZone.FOOTER) &&
        element.imgDisplay &&
        imgDisplays.includes(element.imgDisplay) &&
        element.type === ElementType.IMAGE
      ) {
        const { x, y } = this.position.getFloatPositionCoordinate(floatPosition)
        this.imageParticle.render(ctx, element, x, y)
      }
    }
  }

  private _clearPage(pageNo: number) {
    const listIndex = this._getPageListIndex(pageNo)
    if (!~listIndex) return
    const ctx = this.ctxList[listIndex]
    const pageDom = this.pageList[listIndex]
    ctx.clearRect(
      0,
      0,
      Math.max(pageDom.width, this.getWidth()),
      Math.max(pageDom.height, this.getHeight())
    )
    this.blockParticle.clear()
  }

  private _drawPage(payload: IDrawPagePayload) {
    const { elementList, positionList, rowList, pageNo } = payload
    const listIndex = this._getPageListIndex(pageNo)
    if (!~listIndex) return
    const {
      inactiveAlpha,
      pageMode,
      header,
      footer,
      pageNumber,
      lineNumber,
      pageBorder
    } = this.options
    const isPrintMode = this.mode === EditorMode.PRINT
    const isContinuityMode = pageMode === PageMode.CONTINUITY
    const { innerWidth } = this.getPageSize(pageNo)
    const ctx = this.ctxList[listIndex]
    // 判断当前激活区域-非正文区域时元素透明度降低
    ctx.globalAlpha = !this.zone.isMainActive() ? inactiveAlpha : 1
    this._clearPage(pageNo)
    // 绘制背景
    if (
      !isPrintMode ||
      !this.options.modeRule[EditorMode.PRINT]?.backgroundDisabled
    ) {
      this.background.render(ctx, pageNo)
    }
    // 绘制区域
    if (!isPrintMode) {
      this.area.render(ctx, pageNo)
    }
    // 绘制分栏分隔线
    this.columnManager.drawSeparator(ctx, pageNo)
    // 绘制水印（底层）
    if (
      !isContinuityMode &&
      this.options.watermark.data &&
      this.options.watermark.layer === WatermarkLayer.BOTTOM
    ) {
      this.waterMark.render(ctx, pageNo)
    }
    // 绘制页边距
    if (!isPrintMode) {
      this.margin.render(ctx, pageNo)
    }
    // 渲染衬于文字下方元素
    this._drawFloat(ctx, {
      pageNo,
      imgDisplays: [ImageDisplay.FLOAT_BOTTOM]
    })
    // 控件高亮
    if (!isPrintMode) {
      this.control.renderHighlightList(ctx, pageNo)
    }
    // 渲染元素
    const index = rowList[0]?.startIndex
    this.drawRow(ctx, {
      elementList,
      positionList,
      rowList,
      pageNo,
      startIndex: index,
      innerWidth,
      zone: EditorZone.MAIN
    })
    if (this.getIsPagingMode()) {
      // 绘制页眉
      if (!header.disabled) {
        this.header.render(ctx, pageNo)
      }
      // 绘制页码
      if (!pageNumber.disabled) {
        this.pageNumber.render(ctx, pageNo)
      }
      // 绘制页脚
      if (!footer.disabled) {
        this.footer.render(ctx, pageNo)
      }
    }
    // 渲染浮于文字上方元素
    this._drawFloat(ctx, {
      pageNo,
      imgDisplays: [ImageDisplay.FLOAT_TOP, ImageDisplay.SURROUND]
    })
    // 搜索匹配绘制
    if (!isPrintMode && this.search.getSearchKeyword()) {
      this.search.render(ctx, pageNo)
    }
    // 绘制空白占位符
    if (this.elementList.length <= 1 && !this.elementList[0]?.listId) {
      this.placeholder.render(ctx)
    }
    // 渲染行数
    if (!lineNumber.disabled) {
      this.lineNumber.render(ctx, pageNo)
    }
    // 绘制页面边框
    if (!pageBorder.disabled) {
      this.pageBorder.render(ctx, pageNo)
    }
    // 绘制签章
    this.badge.render(ctx, pageNo)
    // 绘制涂鸦
    if (this.isGraffitiMode()) {
      this.graffiti.render(ctx, pageNo)
    }
    // 绘制水印（顶层）
    if (
      !isContinuityMode &&
      this.options.watermark.data &&
      this.options.watermark.layer === WatermarkLayer.TOP
    ) {
      this.waterMark.render(ctx, pageNo)
    }
  }

  private _disconnectLazyRender() {
    this.lazyRenderIntersectionObserver?.disconnect()
    this.lazyRenderIntersectionObserver = null
  }

  private _immediateRender(fromPageNo = 0) {
    const positionList = this.position.getOriginalMainPositionList()
    const elementList = this.getOriginalMainElementList()
    // 仅绘制当前已挂载且位于脏页及之后的页面
    for (let i = 0; i < this.pageList.length; i++) {
      const pageNo = Number(this.pageList[i].dataset.index)
      if (pageNo < fromPageNo || !this.pageRowList[pageNo]) continue
      this._drawPage({
        elementList,
        positionList,
        rowList: this.pageRowList[pageNo],
        pageNo
      })
    }
  }

  public getPageNoByElementIndex(index: number): number {
    const pageRowList = this.pageRowList
    if (!pageRowList.length) return 0
    for (let i = 0; i < pageRowList.length; i++) {
      const rowList = pageRowList[i]
      if (!rowList?.length) continue
      const start = rowList[0].startIndex
      const lastRow = rowList[rowList.length - 1]
      const end = lastRow.startIndex + lastRow.elementList.length - 1
      if (index < start) return Math.max(0, i - 1)
      if (index <= end) return i
    }
    return pageRowList.length - 1
  }

  public render(payload?: IDrawOption) {
    this.renderCount++
    const { header, footer } = this.options
    const {
      isSubmitHistory = true,
      isSetCursor = true,
      isCompute = true,
      isInit = false,
      isSourceHistory = false,
      isFirstRender = false
    } = payload || {}
    // isLazy：虚拟窗口下挂载页很少，统一立即绘制；导出全量时同样走立即绘制
    let { curIndex } = payload || {}
    const innerWidth = this.getInnerWidth()
    const isPagingMode = this.getIsPagingMode()
    // 缓存当前页数信息
    const oldPageSize = this.pageRowList.length
    const oldPageDirectionList = this.pageDirectionList
    // 脏页：输入时仅从光标页起增量计算位置并重绘，降低大文档卡顿
    let dirtyPageNo = 0
    // 计算文档信息
    if (isCompute) {
      if (isPagingMode) {
        // 分栏信息
        this.columnManager.compute()
        // 正文输入时复用页眉页脚缓存，避免每次按键重算
        const isMainZone = this.zone.isMainActive()
        if (!header.disabled && (!isMainZone || isInit || isFirstRender)) {
          this.header.compute()
        }
        if (!footer.disabled && (!isMainZone || isInit || isFirstRender)) {
          this.footer.compute()
        }
      }
      // 行信息
      const margins = this.getMargins()
      const pageHeight = this.getHeight()
      const extraHeight = this.header.getExtraHeight()
      const startX = margins[3]
      const startY = margins[0] + extraHeight
      const surroundElementList = pickSurroundElementList(this.elementList)
      this.rowList = this.computeRowList({
        startX,
        startY,
        pageHeight,
        isPagingMode,
        innerWidth,
        surroundElementList,
        elementList: this.elementList
      })
      // 分页模式下跨页表格在渲染层拆分为按页片段行
      if (isPagingMode) {
        this.rowList = this.tablePaging.splitTableRowAcrossPages(this.rowList)
      }
      // 页面信息
      this.pageRowList = this._computePageList()
      // 计算脏页（历史回放/初始化/全量导出仍全量）
      const canIncremental =
        !isInit &&
        !isFirstRender &&
        !isSourceHistory &&
        !this.forceFullPageRender &&
        curIndex !== undefined &&
        isPagingMode
      dirtyPageNo = canIncremental
        ? this.getPageNoByElementIndex(curIndex!)
        : 0
      // 浮动元素：仅清理脏页及之后，保留前面页缓存
      if (dirtyPageNo <= 0) {
        this.position.setFloatPositionList([])
      } else {
        this.position.setFloatPositionList(
          this.position
            .getFloatPositionList()
            .filter(item => item.pageNo < dirtyPageNo)
        )
      }
      // 位置信息（从脏页增量计算）
      this.position.computePositionList(dirtyPageNo)
      // 区域信息
      this.area.compute()
      if (!this.isPrintMode()) {
        // 搜索信息
        const searchKeyword = this.search.getSearchKeyword()
        if (searchKeyword) {
          this.search.compute(searchKeyword)
        }
        // 控件关键词高亮
        this.control.computeHighlightList()
      }
      // 涂鸦信息
      if (this.isGraffitiMode()) {
        this.graffiti.compute()
      }
    }
    // 清除光标等副作用（须在预加载前清空，避免清掉尺寸纠正的 Promise）
    this.imageObserver.clearAll()
    this.cursor.recoveryCursor()
    // 预加载尺寸待定图片（页眉/正文/页脚，不依赖虚拟页是否挂载）
    if (isCompute) {
      this.imageParticle.preloadPendingImages()
    }
    // 创建/同步纸张（分页虚拟滚动仅挂载窗口内页面）
    if (isPagingMode) {
      const centerPageNo = Math.min(
        Math.max(this.pageNo, 0),
        Math.max(this.pageRowList.length - 1, 0)
      )
      const isPageDirectionChanged =
        oldPageDirectionList.length !== this.pageDirectionList.length ||
        oldPageDirectionList.some(
          (direction, index) => direction !== this.pageDirectionList[index]
        )
      const isPageCountChanged = oldPageSize !== this.pageRowList.length
      // 页数/方向变化才强制重建窗口，输入时走轻量同步
      this.syncVirtualPages(centerPageNo, {
        force: isPageCountChanged || isPageDirectionChanged,
        isDraw: false
      })
      if (isPageDirectionChanged) {
        this._updatePageSizes()
      }
    } else {
      // 连页模式保持单页
      if (!this.pageList[0]) {
        this._createPage(0)
      }
      if (this.pageList.length > 1) {
        this.pageList.splice(1).forEach(page => page.remove())
        this.ctxList.splice(1)
      }
      this._applyPagePosition(this.pageList[0], 0)
      this.pageContainer.style.position = ''
      this.pageContainer.style.height = ''
      this.virtualPageRange = null
    }
    // 绘制元素
    // 分页虚拟窗口最多 3 页；输入时仅重绘脏页及之后的已挂载页
    this._immediateRender(dirtyPageNo)
    // 光标重绘
    if (isSetCursor) {
      curIndex = this.setCursor(curIndex)
    } else if (this.range.getIsSelection()) {
      // 存在选区时仅定位避免事件无法捕获
      this.cursor.focus()
    }
    // 历史记录用于undo、redo（非首次渲染内容变更 || 第一次存在光标时）
    if (
      (isSubmitHistory && !isFirstRender) ||
      (curIndex !== undefined && this.historyManager.isStackEmpty())
    ) {
      // 连续输入合并为一次历史，降低大文档逐字深拷贝开销
      this.scheduleSubmitHistory(curIndex)
    }
    // 信息变动回调
    nextTick(() => {
      // 选区样式
      this.range.setRangeStyle()
      // 重新唤起弹窗类控件
      if (isCompute && this.control.getActiveControl()) {
        this.control.reAwakeControl()
      }
      // 表格工具重新渲染
      if (
        isCompute &&
        !this.isReadonly() &&
        this.position.getPositionContext().isTable
      ) {
        this.tableTool.render()
      }
      // 页眉指示器重新渲染
      if (isCompute && !this.zone.isMainActive()) {
        this.zone.drawZoneIndicator()
      }
      // 标尺：输入高频场景降频重绘
      if (isCompute) {
        this._scheduleRulerRender()
      }
      // 页数改变
      if (oldPageSize !== this.pageRowList.length) {
        if (this.listener.pageSizeChange) {
          this.listener.pageSizeChange(this.pageRowList.length)
        }
        if (this.eventBus.isSubscribe('pageSizeChange')) {
          this.eventBus.emit('pageSizeChange', this.pageRowList.length)
        }
      }
      // 文档内容改变（与历史入栈解耦，短防抖避免宿主侧卡顿）
      if ((isSubmitHistory || isSourceHistory) && !isInit) {
        this._scheduleContentChange()
      }
    })
  }

  public setCursor(curIndex: number | undefined) {
    const positionContext = this.position.getPositionContext()
    const positionList = this.position.getPositionList()
    if (positionContext.isTable) {
      const elementList = this.getOriginalElementList()
      const tablePositionList = this.position.getTableTdByContext(
        elementList,
        positionContext
      )?.positionList
      if (tablePositionList?.length) {
        if (curIndex === undefined) {
          curIndex = tablePositionList.length - 1
        } else if (curIndex > tablePositionList.length - 1) {
          // 光标索引超出单元格位置（如内容被截断）：收缩到末尾有效位置
          curIndex = tablePositionList.length - 1
        }
      }
      const tablePosition = tablePositionList?.[curIndex!]
      this.position.setCursorPosition(tablePosition || null)
      // 跨页表格光标所在片段可能变化，光标确定后重新锚定表格工具
      this.tableTool.render()
    } else {
      this.position.setCursorPosition(
        curIndex !== undefined ? positionList[curIndex] : null
      )
    }
    // 定位到图片元素并且位置发生变化
    let isShowCursor = true
    if (
      curIndex !== undefined &&
      positionContext.isImage &&
      positionContext.isDirectHit
    ) {
      const elementList = this.getElementList()
      const element = elementList[curIndex]
      if (IMAGE_ELEMENT_TYPE.includes(element.type!)) {
        isShowCursor = false
        const position = this.position.getCursorPosition()
        this.previewer.updateResizer(element, position)
      }
    }
    this.cursor.drawCursor({
      isShow: isShowCursor
    })
    return curIndex
  }

  public scheduleSubmitHistory(curIndex: number | undefined) {
    this.pendingHistoryCurIndex = curIndex
    if (this.historySubmitTimer !== null) {
      window.clearTimeout(this.historySubmitTimer)
    }
    this.historySubmitTimer = window.setTimeout(() => {
      this.historySubmitTimer = null
      const index = this.pendingHistoryCurIndex
      this.pendingHistoryCurIndex = undefined
      this.submitHistory(index)
    }, Draw.HISTORY_SUBMIT_DELAY)
  }

  public flushHistory() {
    if (this.historySubmitTimer === null) return
    window.clearTimeout(this.historySubmitTimer)
    this.historySubmitTimer = null
    const index = this.pendingHistoryCurIndex
    this.pendingHistoryCurIndex = undefined
    this.submitHistory(index)
  }

  private _scheduleContentChange() {
    if (this.contentChangeTimer !== null) {
      window.clearTimeout(this.contentChangeTimer)
    }
    this.contentChangeTimer = window.setTimeout(() => {
      this.contentChangeTimer = null
      if (this.listener.contentChange) {
        this.listener.contentChange()
      }
      if (this.eventBus.isSubscribe('contentChange')) {
        this.eventBus.emit('contentChange')
      }
    }, 100)
  }

  private _scheduleRulerRender() {
    if (this.rulerRenderTimer !== null) {
      window.clearTimeout(this.rulerRenderTimer)
    }
    this.rulerRenderTimer = window.setTimeout(() => {
      this.rulerRenderTimer = null
      this.ruler.render()
    }, 100)
  }

  public submitHistory(curIndex: number | undefined) {
    const positionContext = this.position.getPositionContext()
    const oldElementList = getSlimCloneElementList(this.elementList)
    const oldHeaderElementList = getSlimCloneElementList(
      this.header.getElementList()
    )
    const oldFooterElementList = getSlimCloneElementList(
      this.footer.getElementList()
    )
    const oldRange = deepClone(this.range.getRange())
    const pageNo = this.pageNo
    const oldPositionContext = deepClone(positionContext)
    const zone = this.zone.getZone()
    this.historyManager.execute(() => {
      this.zone.setZone(zone)
      this.setPageNo(pageNo)
      this.position.setPositionContext(deepClone(oldPositionContext))
      this.header.setElementList(deepClone(oldHeaderElementList))
      this.footer.setElementList(deepClone(oldFooterElementList))
      this.elementList = deepClone(oldElementList)
      this.range.replaceRange(deepClone(oldRange))
      this.render({
        curIndex,
        isSubmitHistory: false,
        isSourceHistory: true
      })
    })
  }

  public destroy() {
    if (this.historySubmitTimer !== null) {
      window.clearTimeout(this.historySubmitTimer)
      this.historySubmitTimer = null
    }
    if (this.contentChangeTimer !== null) {
      window.clearTimeout(this.contentChangeTimer)
      this.contentChangeTimer = null
    }
    if (this.rulerRenderTimer !== null) {
      window.clearTimeout(this.rulerRenderTimer)
      this.rulerRenderTimer = null
    }
    this.container.remove()
    this.globalEvent.removeEvent()
    this.scrollObserver.removeEvent()
    this.selectionObserver.removeEvent()
    this.workerManager.destroy()
    this.magnifier.destroy()
    this.accessibility.destroy()
    this.ruler.dispose()
    this.lazyRenderIntersectionObserver?.disconnect()
  }

  public clearSideEffect() {
    // 预览工具组件
    this.getPreviewer().clearResizer()
    // 表格工具组件
    this.getTableTool().dispose()
    // 超链接弹窗
    this.getHyperlinkParticle().clearHyperlinkPopup()
    // 悬浮提示弹窗
    this.getHintParticle().clearHintPopup()
    // 留痕悬浮弹窗
    this.getTraceParticle().clearTracePopup()
    // 日期控件
    this.getDateParticle().clearDatePicker()
  }
}
