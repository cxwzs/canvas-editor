import { describe, expect, it, afterEach } from 'vitest'
import { PageMode } from '@/editor/dataset/enum/Editor'
import { ZERO } from '@/editor/dataset/constant/Common'
import { EDITOR_PREFIX } from '@/editor/dataset/constant/Editor'
import {
  PAGE_VIRTUAL_WINDOW_SIZE,
  PageVirtualScroll
} from '@/editor/core/draw/PageVirtualScroll'
import { createTestEditor, type TestEditorContext } from '../../factories/editor'

describe('PageVirtualScroll', () => {
  const contexts: TestEditorContext[] = []

  afterEach(() => {
    while (contexts.length) {
      contexts.pop()?.destroy()
    }
  })

  function createEditor(options: Record<string, unknown> = {}) {
    const main = Array.from({ length: 80 }, () => ({
      value: `${ZERO}段落内容`
    }))
    const ctx = createTestEditor({
      data: { header: [], main, footer: [] },
      options: {
        pageMode: PageMode.PAGING,
        pageVirtualScroll: true,
        height: 400,
        margins: [40, 40, 40, 40],
        ...options
      }
    })
    contexts.push(ctx)
    return ctx
  }

  function getPageCanvases(container: HTMLElement) {
    return Array.from(
      container.querySelectorAll<HTMLCanvasElement>(
        `.${EDITOR_PREFIX}-page-container canvas`
      )
    )
  }

  function getPageContainer(container: HTMLElement) {
    return container.querySelector<HTMLDivElement>(
      `.${EDITOR_PREFIX}-page-container`
    )
  }

  it('getWindow clamps around center within fixed window size', () => {
    const scroll = new PageVirtualScroll({} as any)
    expect(scroll.getWindow(0, 10)).toEqual([0, 1, 2])
    expect(scroll.getWindow(1, 10)).toEqual([0, 1, 2])
    expect(scroll.getWindow(5, 10)).toEqual([4, 5, 6])
    expect(scroll.getWindow(9, 10)).toEqual([7, 8, 9])
    expect(scroll.getWindow(0, 2)).toEqual([0, 1])
    expect(scroll.getWindow(0, 0)).toEqual([])
    expect(PAGE_VIRTUAL_WINDOW_SIZE).toBe(3)
  })

  it('isEnabled respects paging mode and option switch', () => {
    const enabledCtx = createEditor({ pageVirtualScroll: true })
    expect(getPageCanvases(enabledCtx.container).length).toBe(
      PAGE_VIRTUAL_WINDOW_SIZE
    )

    const disabledCtx = createEditor({ pageVirtualScroll: false })
    expect(
      getPageCanvases(disabledCtx.container).length
    ).toBeGreaterThan(PAGE_VIRTUAL_WINDOW_SIZE)

    const continuityCtx = createEditor({
      pageVirtualScroll: true,
      pageMode: PageMode.CONTINUITY
    })
    expect(getPageCanvases(continuityCtx.container).length).toBe(1)
  })

  it('keeps at most three page canvases and sets spacer height', () => {
    const { container } = createEditor()
    const canvases = getPageCanvases(container)
    expect(canvases.length).toBe(PAGE_VIRTUAL_WINDOW_SIZE)
    canvases.forEach(canvas => {
      expect(canvas.style.position).toBe('absolute')
    })
    const pageContainer = getPageContainer(container)
    expect(pageContainer).toBeTruthy()
    const height = Number.parseFloat(pageContainer!.style.height)
    expect(height).toBeGreaterThan(0)
    // 占位高度应明显大于单页高度，保证可滚动衔接
    expect(height).toBeGreaterThan(400 * 3)
  })

  it('applyWindow remaps data-index via mock draw', () => {
    const pageSizes = [
      { width: 100, height: 200 },
      { width: 100, height: 200 },
      { width: 100, height: 200 },
      { width: 100, height: 200 },
      { width: 100, height: 200 },
      { width: 100, height: 200 }
    ]
    const pageList: HTMLCanvasElement[] = []
    const ctxList: CanvasRenderingContext2D[] = []
    const pageContainer = document.createElement('div')
    document.body.appendChild(pageContainer)
    const drawn: number[] = []

    const draw = {
      getIsPagingMode: () => true,
      getOptions: () => ({ pageVirtualScroll: true }),
      getPageRowList: () => pageSizes.map(() => []),
      getPageList: () => pageList,
      getCtxList: () => ctxList,
      getPageContainer: () => pageContainer,
      getPageGap: () => 20,
      getPagePixelRatio: () => 1,
      getPageSize: (pageNo: number) => pageSizes[pageNo],
      getPageOffset: (pageNo: number) => ({
        x: 0,
        y: pageNo * 220
      }),
      getIntersectionPageNo: () => 0,
      createPage: (pageNo: number) => {
        const canvas = document.createElement('canvas')
        canvas.setAttribute('data-index', String(pageNo))
        const ctx = canvas.getContext('2d')!
        pageContainer.appendChild(canvas)
        pageList.push(canvas)
        ctxList.push(ctx)
      },
      initPageContext: () => undefined,
      drawLogicalPage: (pageNo: number) => {
        drawn.push(pageNo)
      },
      getScrollObserver: () => ({
        getPageVisibleInfo: () => ({
          intersectionPageNo: 4,
          visiblePageNoList: [3, 4, 5]
        })
      })
    }

    const scroll = new PageVirtualScroll(draw as any)
    scroll.applyWindow(4, true)
    expect(scroll.getWindowPageNos()).toEqual([3, 4, 5])
    expect(pageList.length).toBe(3)
    pageList.forEach((canvas, index) => {
      expect(Number(canvas.dataset.index)).toBe([3, 4, 5][index])
      expect(canvas.style.position).toBe('absolute')
      expect(canvas.style.top).toBe(`${[3, 4, 5][index] * 220}px`)
    })
    expect(drawn).toEqual([3, 4, 5])
    expect(pageContainer.style.height).toBe(`${5 * 220 + 200 + 20}px`)
    pageContainer.remove()
  })
})
