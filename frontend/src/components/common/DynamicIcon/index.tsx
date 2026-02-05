import React from 'react'
import * as AntdIcons from '@ant-design/icons'

interface DynamicIconProps {
  name: string
  style?: React.CSSProperties
  className?: string
}

// 动态图标组件，根据图标名称渲染对应的 Ant Design 图标
const DynamicIcon: React.FC<DynamicIconProps> = ({ name, style, className }) => {
  // 获取 Ant Design 图标组件
  const IconComponent = (AntdIcons as any)[name] as React.ComponentType<any> | undefined

  if (!IconComponent) {
    console.warn(`Icon "${name}" not found in @ant-design/icons`)
    return null
  }

  return <IconComponent style={style} className={className} />
}

export default DynamicIcon
