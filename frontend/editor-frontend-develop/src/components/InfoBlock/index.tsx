import React from 'react'

export interface InfoBlockProps {
  title: string
  children?: React.ReactNode
  className?: string
  style?: React.CSSProperties
}

const InfoBlock = (props: InfoBlockProps) => {
  return (
    <div className={`info-block ${props?.className ? props.className : ''}`} style={props?.style}>
      <div className="g-title info-block__title">{props?.title}</div>
      <div className="info-block__content">{props?.children}</div>
    </div>
  )
}

export default InfoBlock
