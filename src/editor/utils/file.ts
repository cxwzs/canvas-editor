import { IFileUpload } from '../interface/File'

export function fileToDataURL(file: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })
}

export async function urlToFile(
  url: string,
  fileName = `paste-${Date.now()}.png`
): Promise<File> {
  const response = await fetch(url)
  const blob = await response.blob()
  return new File([blob], fileName, {
    type: blob.type || 'image/png'
  })
}

function toUploadFile(file: File | Blob, fileName?: string): File {
  if (file instanceof File) return file
  return new File([file], fileName || `paste-${Date.now()}.png`, {
    type: file.type || 'image/png'
  })
}

/**
 * 有 onFileUpload 时走上传返回地址，否则转为 base64 dataURL。
 */
export async function resolveUploadOrBase64(
  file: File | Blob,
  onFileUpload?: IFileUpload | null,
  fileName?: string
): Promise<string> {
  if (onFileUpload) {
    const uploadFile = toUploadFile(file, fileName)
    const url = await onFileUpload(uploadFile, {
      onProgress: () => undefined
    })
    if (!url || typeof url !== 'string') {
      throw new Error('onFileUpload must return an image url string')
    }
    return url
  }
  return fileToDataURL(file)
}

/** 判断粘贴 HTML 中的图片地址是否需要本地解析（非可直接访问的 http(s)） */
export function isLocalPasteImageSrc(src: string): boolean {
  return (
    src.startsWith('data:') ||
    src.startsWith('blob:') ||
    src.startsWith('file:') ||
    !/^https?:\/\//i.test(src)
  )
}
