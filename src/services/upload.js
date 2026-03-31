import request from '@/utils/request'

export const UploadApi = (file, onUploadProgress) => {
  const formData = new FormData();
  formData.append('file', file);
  return request('/AIbid/upload/file', {
    method: 'POST',
    headers: {
      'Content-Type': 'multipart/form-data',
    },
    data: formData,
    onUploadProgress,
  });
}