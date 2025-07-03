import { marked } from 'marked'
import hljs from 'highlight.js'
import 'highlight.js/styles/github.css'

// 配置 marked 選項
marked.setOptions({
  highlight: function(code, lang) {
    // 確保語言參數有效
    if (lang && typeof lang === 'string' && lang !== 'undefined') {
      try {
        if (hljs.getLanguage(lang)) {
          return hljs.highlight(lang, code).value
        }
      } catch (err) {
        console.error('語法高亮錯誤:', err)
      }
    }
    
    // 如果語言無效或不支援，使用自動檢測
    try {
      return hljs.highlightAuto(code).value
    } catch (err) {
      console.error('自動語法高亮錯誤:', err)
      return code // 返回原始代碼
    }
  },
  langPrefix: 'hljs language-',
  breaks: true,
  gfm: true,
  tables: true,
  sanitize: false
})

// 自訂渲染規則
const renderer = new marked.Renderer()

// 自訂代碼塊渲染
renderer.code = function(code, language) {
  // 確保 code 是字符串
  const safeCode = typeof code === 'string' ? code : String(code || '')
  
  // 如果代碼為空，直接返回
  if (!safeCode.trim()) {
    return `<pre><code class="hljs language-plaintext"></code></pre>`
  }
  
  // 安全的語言檢查
  let validLanguage = 'plaintext'
  let highlightedCode = safeCode
  
  // 檢查語言參數是否有效
  if (language && typeof language === 'string' && language !== 'undefined' && language.trim()) {
    try {
      if (hljs.getLanguage(language)) {
        validLanguage = language
        highlightedCode = hljs.highlight(language, safeCode).value
      } else {
        // 語言不支援，使用自動檢測
        const autoResult = hljs.highlightAuto(safeCode)
        validLanguage = autoResult.language || 'plaintext'
        highlightedCode = autoResult.value
      }
    } catch (err) {
      console.error('代碼塊渲染錯誤:', err)
      // 發生錯誤時使用純文字
      validLanguage = 'plaintext'
      highlightedCode = safeCode
    }
  } else {
    // 沒有指定語言，使用自動檢測
    try {
      const autoResult = hljs.highlightAuto(safeCode)
      validLanguage = autoResult.language || 'plaintext'
      highlightedCode = autoResult.value
    } catch (err) {
      console.error('自動檢測錯誤:', err)
      validLanguage = 'plaintext'
      highlightedCode = safeCode
    }
  }
  
  return `<div class="code-block">
    <div class="code-header">
      <span class="language">${validLanguage}</span>
      <button class="copy-btn" onclick="copyCode(this)">
        <i class="mdi mdi-content-copy"></i>
      </button>
    </div>
    <pre><code class="hljs language-${validLanguage}">${highlightedCode}</code></pre>
  </div>`
}

// 自訂表格渲染
renderer.table = function(header, body) {
  return `<div class="table-container">
    <table class="markdown-table">
      <thead>${header}</thead>
      <tbody>${body}</tbody>
    </table>
  </div>`
}

// 自訂列表渲染
renderer.list = function(body, ordered) {
  const type = ordered ? 'ol' : 'ul'
  return `<${type} class="markdown-list">${body}</${type}>`
}

// 自訂引用渲染
renderer.blockquote = function(quote) {
  return `<blockquote class="markdown-blockquote">${quote}</blockquote>`
}

marked.use({ renderer })

// 複製代碼功能
window.copyCode = function(button) {
  const codeBlock = button.closest('.code-block')
  const code = codeBlock.querySelector('code').textContent
  
  navigator.clipboard.writeText(code).then(() => {
    const originalText = button.innerHTML
    button.innerHTML = '<i class="mdi mdi-check"></i>'
    setTimeout(() => {
      button.innerHTML = originalText
    }, 2000)
  }).catch(err => {
    console.error('複製失敗:', err)
  })
}

// 主要的 markdown 渲染函數
export function renderMarkdown(text) {
  if (!text) return ''
  
  // 確保輸入是字符串
  const safeText = typeof text === 'string' ? text : String(text)
  
  try {
    const result = marked(safeText)
    
    // 檢查結果是否有效
    if (typeof result === 'string' && result.trim()) {
      return result
    }
    
    console.warn('Marked 返回無效結果，使用原始文本')
    return safeText.replace(/\n/g, '<br>')
    
  } catch (error) {
    console.error('Markdown 渲染錯誤:', error)
    return safeText.replace(/\n/g, '<br>')
  }
}

// 純文字轉換（移除 HTML 標籤）
export function stripHtml(html) {
  const tmp = document.createElement('DIV')
  tmp.innerHTML = html
  return tmp.textContent || tmp.innerText || ''
} 