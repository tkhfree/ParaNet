# TextTag

文本 tag

## 属性

| 属性         | 说明             | 类型                                          | 默认      | 是否必填 |
| ------------ | ---------------- | --------------------------------------------- | --------- | -------- | --- |
| type         | 类型             | 'primary'/'purple''warning'/'error'/'success' | success   | 否       |
| color        | 自定义颜色       | string                                        | -         | 否       |
| isShowCircle | 是否展示左侧圆点 | boolean                                       | -         | 否       |
| background   | 背景色           | boolean/string                                | -         | 否       |
| text         | 内容             | string                                        | -         | 否       |
| children     | 内容             | React.ReactNode                               | -         | 否       |
| onClick      | 点击事件         | React.MouseEventHandler<HTMLDivElement>       | undefined | -        | 否  |
