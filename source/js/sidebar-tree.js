(function () {
  let searchDataPromise

  function ensurePanel() {
    if (document.getElementById('vscode-tree-panel')) return

    const mask = document.createElement('div')
    mask.id = 'vscode-tree-mask'

    const panel = document.createElement('aside')
    panel.id = 'vscode-tree-panel'
    panel.setAttribute('aria-label', '文章文件树')
    panel.innerHTML = [
      '<div class="tree-header">',
      '  <span>EXPLORER</span>',
      '  <button type="button" id="vscode-tree-close" aria-label="关闭文章目录"><i class="fas fa-xmark"></i></button>',
      '</div>',
      '<nav class="tree-content">',
      '  <details open>',
      '    <summary><i class="fas fa-folder-open"></i><span>秋屿_Blog</span></summary>',
      '    <details open>',
      '      <summary><i class="fas fa-folder"></i><span>随笔</span></summary>',
      '      <a href="/categories/随笔/"><i class="far fa-file-lines"></i><span>日常记录与想法沉淀</span></a>',
      '    </details>',
      '    <details open>',
      '      <summary><i class="fas fa-folder"></i><span>技术笔记</span></summary>',
      '      <a href="/categories/"><i class="far fa-file-code"></i><span>开发实践与问题排查</span></a>',
      '    </details>',
      '    <details open>',
      '      <summary><i class="fas fa-folder"></i><span>项目复盘</span></summary>',
      '      <a href="/categories/"><i class="far fa-file-lines"></i><span>项目过程与经验总结</span></a>',
      '    </details>',
      '    <details open>',
      '      <summary><i class="fas fa-folder"></i><span>建站记录</span></summary>',
      '      <a href="/categories/"><i class="far fa-file-code"></i><span>Hexo 与 Butterfly 美化</span></a>',
      '    </details>',
      '  </details>',
      '</nav>'
    ].join('')

    document.body.append(mask, panel)

    const closeTree = function () {
      document.body.classList.remove('tree-open')
    }

    mask.addEventListener('click', closeTree)
    panel.querySelector('#vscode-tree-close').addEventListener('click', closeTree)
    panel.querySelectorAll('a').forEach(function (link) {
      link.addEventListener('click', closeTree)
    })

    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape') closeTree()
    })
  }

  function ensureNavToggle() {
    const blogInfo = document.querySelector('#blog-info')
    if (!blogInfo) return

    let toggle = document.getElementById('vscode-tree-toggle')
    if (!toggle) {
      toggle = document.createElement('button')
      toggle.id = 'vscode-tree-toggle'
      toggle.type = 'button'
      toggle.setAttribute('aria-label', '打开文章目录')
      toggle.innerHTML = '<i class="fas fa-bars"></i>'
      toggle.addEventListener('click', function () {
        document.body.classList.add('tree-open')
      })
    }

    if (toggle.parentElement !== blogInfo) {
      blogInfo.prepend(toggle)
    }
  }

  function renameNavTitle() {
    const siteTitle = document.querySelector('#blog-info .nav-site-title .site-name')
    if (siteTitle) siteTitle.textContent = '秋屿_Blog'
  }

  function getSearchData() {
    if (searchDataPromise) return searchDataPromise

    searchDataPromise = fetch('/search.xml')
      .then(function (res) {
        if (!res.ok) throw new Error('search.xml load failed')
        return res.text()
      })
      .then(function (xmlText) {
        const doc = new DOMParser().parseFromString(xmlText, 'text/xml')
        return Array.from(doc.querySelectorAll('entry')).map(function (entry) {
          const title = entry.querySelector('title')?.textContent || ''
          const url = entry.querySelector('url')?.textContent || entry.querySelector('link')?.getAttribute('href') || '#'
          const content = entry.querySelector('content')?.textContent || ''
          const categories = Array.from(entry.querySelectorAll('category')).map(function (item) {
            return item.textContent.trim()
          }).join(' ')
          const tags = Array.from(entry.querySelectorAll('tag')).map(function (item) {
            return item.textContent.trim()
          }).join(' ')
          return { title, url, content, categories, tags }
        })
      })
      .catch(function () {
        return []
      })

    return searchDataPromise
  }

  function stripHtml(value) {
    const box = document.createElement('div')
    box.innerHTML = value
    return box.textContent || box.innerText || ''
  }

  function renderResults(results, query, list) {
    if (!query) {
      list.innerHTML = ''
      list.hidden = true
      return
    }

    if (!results.length) {
      list.innerHTML = '<div class="vscode-search-empty">没有找到相关文章</div>'
      list.hidden = false
      return
    }

    list.innerHTML = results.slice(0, 6).map(function (item) {
      const plain = stripHtml(item.content).replace(/\s+/g, ' ').trim()
      const excerpt = plain.length > 86 ? plain.slice(0, 86) + '...' : plain
      return [
        '<a class="vscode-search-result" href="' + item.url + '">',
        '  <span class="result-title">' + item.title + '</span>',
        '  <span class="result-meta">' + [item.categories, item.tags].filter(Boolean).join(' / ') + '</span>',
        '  <span class="result-excerpt">' + excerpt + '</span>',
        '</a>'
      ].join('')
    }).join('')
    list.hidden = false
  }

  function enhanceSearchBox() {
    const searchButton = document.querySelector('#search-button')
    if (!searchButton || searchButton.querySelector('#vscode-search-input')) return

    searchButton.innerHTML = [
      '<div class="vscode-search-box">',
      '  <i class="fas fa-magnifying-glass"></i>',
      '  <input id="vscode-search-input" type="search" placeholder="Search My_blog" autocomplete="off">',
      '  <div id="vscode-search-results" hidden></div>',
      '</div>'
    ].join('')

    const input = searchButton.querySelector('#vscode-search-input')
    const resultsBox = searchButton.querySelector('#vscode-search-results')

    searchButton.addEventListener('click', function (event) {
      event.stopPropagation()
    }, true)

    input.addEventListener('input', function () {
      const query = input.value.trim().toLowerCase()
      getSearchData().then(function (data) {
        const results = data.filter(function (item) {
          return [item.title, stripHtml(item.content), item.categories, item.tags].join(' ').toLowerCase().includes(query)
        })
        renderResults(results, query, resultsBox)
      })
    })

    input.addEventListener('keydown', function (event) {
      if (event.key === 'Enter') {
        const first = resultsBox.querySelector('a')
        if (first) window.location.href = first.href
      }
      if (event.key === 'Escape') {
        input.value = ''
        resultsBox.hidden = true
      }
    })

    document.addEventListener('click', function (event) {
      if (!searchButton.contains(event.target)) resultsBox.hidden = true
    })
  }

  function init() {
    ensurePanel()
    ensureNavToggle()
    renameNavTitle()
    enhanceSearchBox()
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init)
  } else {
    init()
  }

  document.addEventListener('pjax:complete', init)
})()
