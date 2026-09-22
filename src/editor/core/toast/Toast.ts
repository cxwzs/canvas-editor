import { EDITOR_COMPONENT, EDITOR_PREFIX } from '../../dataset/constant/Editor'
import { EditorComponent } from '../../dataset/enum/Editor'
import './toast.css'

export interface IToastHandle {
  close: () => void
}

/**
 * 在编辑器容器内展示轻量 toast（居中偏上）。
 * duration 为 0 时需手动 close。
 */
export function showToast(
  container: HTMLElement,
  message: string,
  options: { duration?: number } = {}
): IToastHandle {
  const { duration = 2000 } = options
  const existing = container.querySelector(`.${EDITOR_PREFIX}-toast`)
  existing?.remove()

  const toast = document.createElement('div')
  toast.classList.add(`${EDITOR_PREFIX}-toast`)
  toast.setAttribute(EDITOR_COMPONENT, EditorComponent.POPUP)

  const spinner = document.createElement('span')
  spinner.classList.add(`${EDITOR_PREFIX}-toast__spinner`)
  toast.append(spinner)

  const text = document.createElement('span')
  text.classList.add(`${EDITOR_PREFIX}-toast__text`)
  text.textContent = message
  toast.append(text)

  container.append(toast)
  // 下一帧再加 visible，触发过渡
  requestAnimationFrame(() => {
    toast.classList.add('visible')
  })

  let closed = false
  let timer: number | null = null
  const close = () => {
    if (closed) return
    closed = true
    if (timer !== null) {
      window.clearTimeout(timer)
      timer = null
    }
    toast.classList.remove('visible')
    window.setTimeout(() => toast.remove(), 200)
  }

  if (duration > 0) {
    timer = window.setTimeout(close, duration)
  }

  return { close }
}
