import React, { useRef } from 'react'
import Editor, { type OnMount } from '@monaco-editor/react'
import { setupParanetDSL } from './monacoConfig'
import { PARANET_DSL_ID } from './paranet-dsl'

export interface DSLEditorProps {
  value: string
  onChange?: (value: string) => void
  height?: string | number
  width?: string | number
  readOnly?: boolean
  placeholder?: string
}

const DSLEditor: React.FC<DSLEditorProps> = ({
  value,
  onChange,
  height = '100%',
  width = '100%',
  readOnly = false,
}) => {
  const editorRef = useRef<ReturnType<Parameters<OnMount>[0]['getModel']> | null>(null)

  const handleEditorDidMount: OnMount = (editor, monaco) => {
    editorRef.current = editor.getModel()
    setupParanetDSL(monaco as unknown as typeof import('monaco-editor'))
  }

  const handleChange = (newValue: string | undefined) => {
    if (onChange && newValue !== undefined) {
      onChange(newValue)
    }
  }

  return (
    <Editor
      height={height}
      width={width}
      language={PARANET_DSL_ID}
      value={value ?? ''}
      onChange={handleChange}
      onMount={handleEditorDidMount}
      options={{
        minimap: { enabled: false },
        fontSize: 14,
        wordWrap: 'on',
        folding: true,
        lineNumbers: 'on',
        readOnly,
        scrollBeyondLastLine: false,
        automaticLayout: true,
        tabSize: 2,
        padding: { top: 8 },
      }}
    />
  )
}

export default DSLEditor
