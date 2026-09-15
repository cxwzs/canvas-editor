export interface IFileUploadOptions {
  /** 上传进度，取值 0–100 */
  onProgress: (percent: number) => void
}

/**
 * 自定义文件上传。
 * @param file 待上传文件（裁剪后的图片）
 * @param options.onProgress 进度回调
 * @returns 可访问的文件地址（用于插入编辑器）
 */
export type IFileUpload = (
  file: File,
  options: IFileUploadOptions
) => Promise<string>
