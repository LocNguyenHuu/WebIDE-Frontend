import React from 'react'
import PropTypes from 'prop-types'
import { debounce } from 'lodash'
import { measure } from '@pinyin/measure'
import { autorun, reaction } from 'mobx'
import { observer } from 'mobx-react'
import * as monaco from 'monaco-editor'

import FileStore from 'commons/File/store'
import languageState from 'components/MonacoEditor/LanguageClientState'
import dispatchCommand from 'commands/dispatchCommand'
import { findLangueByExt } from '../utils/findLanguage'
import { EditorInfo } from '../state'
import initialOptions from '../monacoDefaultOptions'
import registerCustomLanguages from '../languages'
import { liftOff } from './grammars/configure-tokenizer'
import { getTheme, getBase } from '../../../extensions/Editor.ext'

import themes from '../themes'

themes.forEach((themeConfig) => {
  const { name, theme } = themeConfig
  const transformedTheme = getTheme(theme)
  const { colors, rules, type } = transformedTheme
  monaco.editor.defineTheme(name, {
    base: getBase(type),
    inherit: true,
    colors,
    rules
  })
})

// import 'monaco.languages.css'
// import '../languageServices/css/monaco.contribution'

registerCustomLanguages()

liftOff(monaco)

function noop () {}

const Div = measure('div')
const debounced = debounce(func => func(), 1000)

@observer
class MonacoEditor extends React.PureComponent {
  constructor (props) {
    super(props)

    let { editorInfo } = props
    if (!editorInfo) editorInfo = new EditorInfo()
    const fileExt = editorInfo.filePath ? editorInfo.filePath.split('.').pop() : ''
    this.language = findLangueByExt(fileExt) ? findLangueByExt(fileExt).language : ''
    this.editor = editorInfo
    this.editorElement = editorInfo.monacoElement
    this.containerElement = undefined
    this.currentValue = props.value
    this.didmount = false

    const model = monaco.editor.getModel(this.editor.uri)

    reaction(() => initialOptions.tabSize, (tabSize) => {
      if (model) {
        model.updateOptions({
          tabSize
        })
      }
    })

    autorun(() => {
      if (this.editor.monacoEditor) {
        this.editor.monacoEditor.updateOptions(initialOptions)
      }
    })
  }

  componentDidMount () {
    if (!this.containerElement) return
    this.containerElement.appendChild(this.editorElement)
    const { monacoEditor } = this.editor
    const { tab } = this.props
    // if (this.props.active) {
    //   monacoEditor.focus()
    // }
    this.didmount = true
    monacoEditor.onDidChangeModelContent((event) => {
      const value = monacoEditor.getValue()
      this.currentValue = value

      if (this.editor.file && tab) {
        this.editor.file.isSynced = false
        FileStore.updateFile({
          id: this.editor.file.id,
          content: value,
        })
        debounced(() => {
          dispatchCommand('file:save', this.editor.filePath)
        })
      }
    })
  }

  componentWillReceiveProps (nextProps) {
    if (nextProps.active && nextProps.active !== this.props.active) {
      this.editor.monacoEditor.focus()
    }
  }

  componentWillUnmount () {
    // this.editor.destroy()
    const languageClient = languageState.clients.get(this.language)
    if (!languageClient || !this.editor.file) return
    const { path } = this.editor.file
    const { openeduri } = languageClient
    // 组件卸载后发送 didClose消息
    if (languageClient && openeduri.get(path)) {
      this.didmount = false
      languageClient.openeduri.delete(path)
      languageClient.closeTextDocument({
        textDocument: {
          uri: `file://${languageClient._ROOT_URI_}${path}`,
        }
      })
    }
  }

  handleResize = () => {
    if (!this.editor.monacoEditor) return
    this.editor.monacoEditor.layout()
  }

  destroyMonaco () {
    if (typeof this.editor !== 'undefined') {
      this.editor.dispose()
    }
  }

  assignRef = (component) => {
    this.containerElement = component
  }

  removeMenus = () => {
    // Hack tricks to remove active menu
    const menuBars = config.menuBars
    menuBars.map(menubar => menubar.toggleActive())
  }

  render () {
    const { width, height } = this.props
    const fixedWidth = width.toString().indexOf('%') !== -1 ? width : `${width}px`
    const fixedHeight = height.toString().indexOf('%') !== -1 ? height : `${height}px`
    const style = {
      width: fixedWidth,
      height: fixedHeight
    }

    return (<Div
      style={{ width: '100%', height: '100%' }}
      onWidthChange={this.handleResize}
      onHeightChange={this.handleResize}
      onTouchStart={this.removeMenus}
    >
      <div className='react-monaco-editor-container' ref={this.assignRef} style={style} />
    </Div>)
  }
}

MonacoEditor.propTypes = {
  width: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  height: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  value: PropTypes.string,
}

MonacoEditor.defaultProps = {
  width: '100%',
  height: '100%',
  value: null,
  defaultValue: '',
  language: 'javascript',
  theme: null,
  options: {},
  editorDidMount: noop,
  editorWillMount: noop,
  onChange: noop,
  requireConfig: {},
}

export default MonacoEditor
