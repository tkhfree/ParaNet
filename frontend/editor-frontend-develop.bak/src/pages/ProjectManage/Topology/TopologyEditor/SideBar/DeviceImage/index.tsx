import React from 'react'

interface IProps {
  url: string
}

export const DeviceImage = (props: IProps) => {
  const { url } = props

  return <img width="90" height="42" src={`/api/Element/images/${url}`} alt={url} />
}
