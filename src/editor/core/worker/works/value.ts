import { IGetValueOption } from '../../../interface/Draw'
import { IEditorData } from '../../../interface/Editor'
import { zipElementList } from '../../../utils/element'

interface IGetValueWorkerOption {
  data: Required<IEditorData>
  options: IGetValueOption
}

onmessage = evt => {
  const payload = <IGetValueWorkerOption>evt.data
  const { options, data } = payload
  const { extraPickAttrs = [] } = options || {}

  const editorData: IEditorData = {
    header: zipElementList(data.header, {
      extraPickAttrs,
      isClone: false,
      isClassifyParagraphLayout: true
    }),
    main: zipElementList(data.main, {
      extraPickAttrs,
      isClassifyArea: true,
      isClone: false,
      isClassifyParagraphLayout: true
    }),
    footer: zipElementList(data.footer, {
      extraPickAttrs,
      isClone: false,
      isClassifyParagraphLayout: true
    })
  }

  postMessage(editorData)
}
