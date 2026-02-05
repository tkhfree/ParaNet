// monacoConfig.ts
import * as monaco from 'monaco-editor'
import { P4Language } from './p4Language'

export const setupP4Language = (monacoInstance: typeof monaco): void => {
  // 注册P4语言
  monacoInstance.languages.register({ id: P4Language.id })

  // 设置语法高亮
  monacoInstance.languages.setMonarchTokensProvider(P4Language.id, P4Language.definition)

  // 设置语言配置
  monacoInstance.languages.setLanguageConfiguration(P4Language.id, P4Language.configuration)

  // 注册代码补全
  // monacoInstance.languages.registerCompletionItemProvider(P4Language.id, {
  //   provideCompletionItems: (model, position) => {
  //     const word = model.getWordUntilPosition(position)
  //     const range = {
  //       startLineNumber: position.lineNumber,
  //       endLineNumber: position.lineNumber,
  //       startColumn: word.startColumn,
  //       endColumn: word.endColumn,
  //     }

  //     const suggestions = P4Language.completionItems.map((item: any) => ({
  //       label: item.label,
  //       kind:
  //         monacoInstance.languages.CompletionItemKind[
  //           item.kind.charAt(0).toUpperCase() + item.kind.slice(1)
  //         ] || monacoInstance.languages.CompletionItemKind.Keyword,
  //       documentation: item.documentation,
  //       insertText: item.insertText || item.label,
  //       insertTextRules: item.insertText
  //         ? monacoInstance.languages.CompletionItemInsertTextRule.InsertAsSnippet
  //         : undefined,
  //       range: range,
  //     }))

  //     return { suggestions }
  //   },
  // })
  // 注册代码补全
  monacoInstance.languages.registerCompletionItemProvider(P4Language.id, {
    triggerCharacters: ['.'], // 添加点号作为触发字符

    provideCompletionItems: (model, position, context) => {
      const word = model.getWordUntilPosition(position)
      const range = {
        startLineNumber: position.lineNumber,
        endLineNumber: position.lineNumber,
        startColumn: word.startColumn,
        endColumn: word.endColumn,
      }

      // 获取当前行光标前的文本
      const lineContent = model.getLineContent(position.lineNumber)
      const textUntilPosition = lineContent.substring(0, position.column - 1)

      // 基础补全建议（保留原有逻辑）
      const baseSuggestions = P4Language.completionItems.map((item: any) => ({
        label: item.label,
        kind:
          monacoInstance.languages.CompletionItemKind[
            item.kind.charAt(0).toUpperCase() + item.kind.slice(1)
          ] || monacoInstance.languages.CompletionItemKind.Keyword,
        documentation: item.documentation,
        insertText: item.insertText || item.label,
        insertTextRules: item.insertText
          ? monacoInstance.languages.CompletionItemInsertTextRule.InsertAsSnippet
          : undefined,
        range: range,
      }))

      // 如果是点号触发的补全
      if (context.triggerCharacter === '.') {
        // 添加方法补全建议
        // const dotSuggestions = [
        //   {
        //     label: 'apply()',
        //     kind: monacoInstance.languages.CompletionItemKind.Method,
        //     documentation: '调用模块或解析器的apply方法',
        //     insertText: 'apply()',
        //     range: range,
        //     sortText: 'a', // 确保排序靠前
        //   },
        //   {
        //     label: 'isValid()',
        //     kind: monacoInstance.languages.CompletionItemKind.Method,
        //     documentation: '检查头部或字段是否有效',
        //     insertText: 'isValid()',
        //     range: range,
        //     sortText: 'b',
        //   },
        // ]

        // 合并建议（点号触发的建议在前）
        return {
          suggestions: [...baseSuggestions],
        }
      }

      // 默认返回基础补全建议
      return { suggestions: baseSuggestions }
    },

    // 可选：解决补全冲突
    resolveCompletionItem: item => {
      return item
    },
  })

  // // 注册验证器
  // const validateP4Code = (model: monaco.editor.ITextModel) => {
  //   const errors: any[] = []
  //   const lines = model.getValue().split('\n')

  //   P4Language.validationRules.forEach((rule: any) => {
  //     lines.forEach((line, i) => {
  //       const lineNumber = i + 1
  //       const testResult = rule.regex.test(line)
  //       const shouldAddError = rule.inverse ? !testResult : testResult

  //       if (shouldAddError) {
  //         errors.push({
  //           severity:
  //             monacoInstance.MarkerSeverity[
  //               rule.severity.charAt(0).toUpperCase() + rule.severity.slice(1)
  //             ] || monacoInstance.MarkerSeverity.Error,
  //           startLineNumber: lineNumber,
  //           startColumn: 1,
  //           endLineNumber: lineNumber,
  //           endColumn: line.length + 1,
  //           message: rule.message,
  //           source: 'P4',
  //         })
  //       }
  //     })
  //   })

  //   monacoInstance.editor.setModelMarkers(model, P4Language.id, errors)
  // }
  // 新的验证器实现
  const validateP4Code = (model: monaco.editor.ITextModel) => {
    const markers: any = []
    const code = model.getValue()

    P4Language.validationRules.forEach((rule: any) => {
      if (rule.validator) {
        // 处理使用validator函数的规则
        const errors = rule.validator(code)
        errors?.forEach((error: any) => {
          markers.push({
            severity:
              monacoInstance.MarkerSeverity[
                error.severity.charAt(0).toUpperCase() + error.severity.slice(1)
              ] || monacoInstance.MarkerSeverity.Error,
            message: error.message,
            startLineNumber: error.position?.line || 1,
            startColumn: error.position?.column || 1,
            endLineNumber: error.position?.line || 1,
            endColumn: error.position?.column ? error.position.column + 1 : 2,
            source: 'P4',
          })
        })
      } else if (rule.regex) {
        // 向后兼容处理旧的regex规则
        const lines = code.split('\n')
        lines.forEach((line, i) => {
          const lineNumber = i + 1
          const testResult = rule.regex.test(line)
          const shouldAddError = rule.inverse ? !testResult : testResult

          if (shouldAddError) {
            // 检查是否在排除列表中
            const isExcluded = rule.exclude?.some((ex: RegExp) => ex.test(line))
            if (!isExcluded) {
              markers.push({
                severity:
                  monacoInstance.MarkerSeverity[
                    rule.severity.charAt(0).toUpperCase() + rule.severity.slice(1)
                  ] || monacoInstance.MarkerSeverity.Error,
                startLineNumber: lineNumber,
                startColumn: 1,
                endLineNumber: lineNumber,
                endColumn: line.length + 1,
                message: rule.message,
                source: 'P4',
              })
            }
          }
        })
      }
    })

    monacoInstance.editor.setModelMarkers(model, P4Language.id, markers)
  }

  // // 监听内容变化进行验证
  // monacoInstance.editor.onDidCreateModel(model => {
  //   console.log('监听内容变化')
  //   if (model.getLanguageId() === P4Language.id) {
  //     validateP4Code(model)
  //     model.onDidChangeContent(() => validateP4Code(model))
  //   }
  // })
  // // 对已存在的模型进行验证
  // monacoInstance.editor.getModels().forEach(model => {
  //   console.log('已存在的模型')
  //   if (model.getLanguageId() === P4Language.id) {
  //     validateP4Code(model)
  //   }
  // })
  const setupModelValidation = (model: monaco.editor.ITextModel) => {
    if (model.getLanguageId() === P4Language.id) {
      // 立即执行一次验证
      validateP4Code(model)
      // 设置内容变化监听
      model.onDidChangeContent(() => {
        console.log('内容变化，触发验证')
        validateP4Code(model)
      })
    }
  }

  // 方式一：监听新模型创建
  monacoInstance.editor.onDidCreateModel(setupModelValidation)

  // 方式二：处理已存在的模型
  monacoInstance.editor.getModels().forEach(setupModelValidation)

  // 6. 可选：添加延迟验证以确保所有初始化完成
  setTimeout(() => {
    monacoInstance.editor.getModels().forEach(model => {
      if (model.getLanguageId() === P4Language.id && !model.isDisposed()) {
        validateP4Code(model)
      }
    })
  }, 100)
}
