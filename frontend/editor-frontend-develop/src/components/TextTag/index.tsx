import React, { useMemo } from 'react'

import { classNames } from '@/utils/tools'

import './index.less'

export type TextTagType = 'error' | 'off-line' | 'primary' | 'success' | 'warning'

export interface TextTagProps {
  background?: boolean | string
  children?: React.ReactNode
  color?: string
  isShowCircle?: boolean
  onClick?: React.MouseEventHandler<HTMLDivElement> | undefined
  text?: string
  type?: TextTagType
}

const TextTag = ({
  background,
  children,
  color,
  isShowCircle = true,
  onClick,
  text,
  type = 'success',
}: TextTagProps) => {
  const isBg = useMemo(() => typeof background === 'boolean' && background, [background])
  const isCustomBg = useMemo(() => typeof background === 'string', [background])
  const backgroundColor = useMemo(() => {
    if (isCustomBg) {
      return background as string
    }

    if (isBg && color) {
      // 10%的透明度
      return `${color}1A`
    }

    return undefined
  }, [background, color, isBg, isCustomBg])

  return (
    <div
      className={classNames([
        'text-tag',
        `text-tag--${type}`,
        { 'text-tag--bg': isBg },
        { 'text-tag--custom-bg': isCustomBg },
        { 'text-tag--click-enabled': onClick },
      ])}
      onClick={onClick}
      style={{ backgroundColor, color }}
    >
      {isShowCircle ? (
        <span className="text-tag-circle" style={{ backgroundColor: color }} />
      ) : null}
      {children ?? text}
    </div>
  )
}

export default TextTag
