import TextArea, { TextAreaProps } from 'antd/es/input/TextArea'
import React from 'react'

import { MAX_CHAR_SIZE, PLACEHOLDER } from '@/utils/constants'

const ProTextArea = (props: TextAreaProps) => {
  return (
    <TextArea
      maxLength={MAX_CHAR_SIZE.TEXTAREA}
      placeholder={PLACEHOLDER.INPUT}
      rows={4}
      showCount
      {...props}
    />
  )
}

export default ProTextArea
