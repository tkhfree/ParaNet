// types/p4Language.d.ts
import * as monaco from 'monaco-editor'

export interface P4LanguageDefinition {
  id: string
  configuration: monaco.languages.LanguageConfiguration
  definition: monaco.languages.IMonarchLanguage
  completionItems: P4CompletionItem[]
  validationRules: P4ValidationRule[]
}

export interface P4CompletionItem {
  label: string
  kind: 'keyword' | 'snippet' | 'property' | 'class' | 'interface' | 'function'
  documentation: string
  insertText?: string
}

export interface P4ValidationRule {
  regex: RegExp
  message: string
  severity: 'error' | 'warning' | 'info'
  testLine?: boolean
  inverse?: boolean
}
