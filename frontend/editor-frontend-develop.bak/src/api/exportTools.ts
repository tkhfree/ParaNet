import { message } from 'antd'

// 下载文件处理方法
export const exportFile = (data: any, filename: string): any => {
  const blob = new Blob([data])
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  if (typeof window.navigator.msSaveBlob !== 'undefined') {
    // 兼容IE，window.navigator.msSaveBlob：以本地方式保存文件
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    window.navigator.msSaveBlob(blob, decodeURIComponent(filename))
  } else {
    // 创建新的URL并指向File对象或者Blob对象的地址
    const blobURL = window.URL.createObjectURL(blob)
    // 创建a标签，用于跳转至下载链接
    const tempLink = document.createElement('a')
    tempLink.style.display = 'none'
    tempLink.href = blobURL
    tempLink.setAttribute('download', decodeURIComponent(filename))
    // 兼容：某些浏览器不支持HTML5的download属性
    if (typeof tempLink.download === 'undefined') {
      tempLink.setAttribute('target', '_blank')
    }
    // 挂载a标签
    document.body.appendChild(tempLink)
    tempLink.click()
    document.body.removeChild(tempLink)
    // 释放blob URL地址
    window.URL.revokeObjectURL(blobURL)
  }
}

// 下载文件处理方法
export default (res: any): any => {
  const fileReader = new FileReader()
  fileReader.readAsText(res.data)
  fileReader.onload = e => {
    try {
      // 如果后台返回非文件流
      const resData = JSON.parse(e.target?.result as string)
      if (resData.code) {
        message.error(resData.msg || '导出失败')
      } else if (resData.code === undefined) {
        throw new Error()
      }
    } catch (_) {
      const blob = new Blob([res.data])
      // 提取文件名
      let contentDisposition: any = ''
      if (res.headers['content-disposition']) {
        contentDisposition = res.headers['content-disposition']
      }
      if (res.headers['Content-disposition']) {
        contentDisposition = res.headers['Content-disposition']
      }
      const err = contentDisposition.match(/err=(.*)/)
      if (err?.[1]) {
        message.error(decodeURIComponent(err[1]))
        return
      }
      let fileName = '未知'
      if (contentDisposition) {
        // console.log('fileName', contentDisposition.match(/filename=(.*)/)[1])
        // fileName = contentDisposition.match(/filename=(.*)/)[1]
        const match = contentDisposition.match(/filename="?([^"]+)"?/)
        if (match && match[1]) {
          fileName = match[1].trim() // 去除前后空格
        }
      }
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      if (typeof window.navigator.msSaveBlob !== 'undefined') {
        // 兼容IE，window.navigator.msSaveBlob：以本地方式保存文件
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        window.navigator.msSaveBlob(blob, decodeURIComponent(fileName))
      } else {
        // 创建新的URL并指向File对象或者Blob对象的地址
        const blobURL = window.URL.createObjectURL(blob)
        // 创建a标签，用于跳转至下载链接
        const tempLink = document.createElement('a')
        tempLink.style.display = 'none'
        tempLink.href = blobURL
        tempLink.setAttribute('download', decodeURIComponent(fileName))
        // 兼容：某些浏览器不支持HTML5的download属性
        if (typeof tempLink.download === 'undefined') {
          tempLink.setAttribute('target', '_blank')
        }
        // 挂载a标签
        document.body.appendChild(tempLink)
        tempLink.click()
        document.body.removeChild(tempLink)
        // 释放blob URL地址
        window.URL.revokeObjectURL(blobURL)
      }
    }
  }
}
