// components/P4Editor.tsx
import React, { useRef } from 'react'
import Editor, { Monaco, OnMount } from '@monaco-editor/react'
import { setupP4Language } from './monacoConfig'
import { P4Language } from './p4Language'

interface P4EditorProps {
  code: string
  onChange?: (value: string) => void
  height?: string | number
  width?: string | number
  options?: any
}

const P4Editor: React.FC<P4EditorProps> = ({
  code,
  onChange,
  height = '90vh',
  width = '100%',
  options = {},
}) => {
  const editorRef = useRef<any>(null)

  const handleEditorDidMount: OnMount = (editor, monacoInstance) => {
    editorRef.current = editor
    setupP4Language(monacoInstance)
  }

  const handleChange = (value: string | undefined) => {
    if (onChange && value !== undefined) {
      onChange(value)
    }
  }

  const defaultOptions: any = {
    minimap: { enabled: false },
    fontSize: 14,
    wordWrap: 'on',
    folding: true,
    lineNumbers: 'on',
    autoClosingBrackets: 'always',
    autoClosingQuotes: 'always',
    matchBrackets: 'always',
    scrollBeyondLastLine: false,
    automaticLayout: true,
    tabSize: 2,
    ...options,
  }

  return (
    <Editor
      height={height}
      width={width}
      defaultLanguage={P4Language.id}
      language={P4Language.id}
      value={code}
      onChange={handleChange}
      onMount={handleEditorDidMount}
      options={defaultOptions}
    />
  )
}

export default P4Editor
