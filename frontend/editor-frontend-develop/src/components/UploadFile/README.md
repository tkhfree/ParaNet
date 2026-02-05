# UploadFile

文件上传

## 属性

| 属性                 | 说明                                                          | 类型                                  | 默认                                                           | 是否必填 |
| -------------------- | ------------------------------------------------------------- | ------------------------------------- | -------------------------------------------------------------- | -------- | --- |
| value                | 已上传的文件列表                                              | FileModel[]                           | -                                                              | 否       |
| children             | 自定义上传按钮内容                                            | ReactNode                             | -                                                              | 否       |
| tips                 | 提示内容                                                      | ReactNode                             | -                                                              | 否       |
| maxSize              | 上传文件的最大大小(单位：KB)                                  | number                                | 200 \* 1024                                                    | 否       |
| multiple             | 是否支持多选文件，`ie10+`支持。开启后按住`ctrl`可选择多个文件 | boolean                               | false                                                          | 否       |
| actions              | 附件操作按钮                                                  | Array<'preview'/ 'download'/'remove'> | ['download']                                                   | 否       |
| accept               | 接受上传的文件类型                                            | string                                | [FILE_TYPES](../../../utils//constants.ts)                     | 否       |
| maxCount             | 上传文件的最大数量                                            | number                                | [MAX_FILE_COUNT](../../../utils//constants.ts)                 | 否       |
| fileTypeErrorMessage | 自定义文件类型验证错误提示                                    | string                                | '当前系统仅支持Office、压缩包、图片及音视频类型的常见文件格式' | 否       |
| showResultMessage    | 是否显示上传结果的提示信息                                    | boolean                               | true                                                           | 否       |
| onRemove             | 附件操作按钮                                                  | (file: FileModel) => void             | -                                                              | 否       |
| onStatusChange       | 上传文件状态改变事件                                          | (status: 'uploading'                  | 'done') => void                                                | -        | 否  |
| onChange             | 上传成功回调                                                  | (info?: FileModel[]) => void          | -                                                              | 否       |
| onError              | 上传失败回调                                                  | (error: Error) => void                | -                                                              | 否       |

```ts
export interface FileModel {
  originalName: string
  fileNo: string
  downloading?: boolean
}
```
