import type * as Monaco from 'monaco-editor'
import {
  PARANET_DSL_ID,
  paranetDslConfiguration,
  paranetDslDefinition,
} from './paranet-dsl'

export function setupParanetDSL(monacoInstance: typeof Monaco): void {
  monacoInstance.languages.register({ id: PARANET_DSL_ID })
  monacoInstance.languages.setMonarchTokensProvider(PARANET_DSL_ID, paranetDslDefinition)
  monacoInstance.languages.setLanguageConfiguration(PARANET_DSL_ID, paranetDslConfiguration)
}
