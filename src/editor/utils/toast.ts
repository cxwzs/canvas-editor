export interface IToastOptions {
  message: string
  /** 挂载节点，默认 document.body */
  container?: HTMLElement
  /** 是否显示加载动画，默认 true */
  loading?: boolean
}

/**
 * 编辑器轻量 Toast，返回关闭方法。
 */
export function showToast(options: IToastOptions): () => void {
  const { message, container = document.body, loading = true } = options
  const root = document.createElement('div')
  root.className = 'ce-toast'
  root.setAttribute('role', 'status')
  root.setAttribute('aria-live', 'polite')

  if (loading) {
    const spinner = document.createElement('span')
    spinner.className = 'ce-toast__spinner'
    root.append(spinner)
  }

  const text = document.createElement('span')
  text.className = 'ce-toast__text'
  text.textContent = message
  root.append(text)

  container.append(root)
  // 下一帧再加可见态，便于过渡动画
  requestAnimationFrame(() => {
    root.classList.add('ce-toast--visible')
  })

  let closed = false
  return () => {
    if (closed) return
    closed = true
    root.classList.remove('ce-toast--visible')
    window.setTimeout(() => {
      root.remove()
    }, 180)
  }
}

export interface IDelayedToast {
  /** 内容较大时立即展示，否则延迟 delayMs 后展示 */
  schedule: (immediate?: boolean) => void
  /** 取消未展示的定时器，并关闭已展示的 toast */
  done: () => void
}

/**
 * 粘贴等耗时操作：短任务不打扰，长任务自动出 toast。
 */
export function createDelayedToast(
  options: IToastOptions & { delayMs?: number }
): IDelayedToast {
  const delayMs = options.delayMs ?? 300
  let timer: number | null = null
  let closeToast: (() => void) | null = null
  let finished = false

  const show = () => {
    if (finished || closeToast) return
    closeToast = showToast(options)
  }

  return {
    schedule(immediate = false) {
      if (finished || closeToast) return
      if (immediate) {
        show()
        return
      }
      if (timer !== null) return
      timer = window.setTimeout(() => {
        timer = null
        show()
      }, delayMs)
    },
    done() {
      finished = true
      if (timer !== null) {
        window.clearTimeout(timer)
        timer = null
      }
      closeToast?.()
      closeToast = null
    }
  }
}
