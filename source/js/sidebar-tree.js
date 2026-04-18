(function () {
  let searchDataPromise

  const treeSections = [
    {
      title: '随笔',
      url: '/categories/随笔/',
      icon: 'far fa-file-lines',
      items: [
        { title: '日常记录与想法沉淀', url: '/categories/随笔/', icon: 'far fa-file-lines' }
      ]
    },
    {
      title: 'Linux相关',
      url: '/categories/技术笔记/',
      icon: 'far fa-file-code',
      items: [
        { title: '开发实践与问题排查', url: '/categories/技术笔记/', icon: 'far fa-file-code' }
      ]
    },
    {
      title: '项目复盘',
      url: '/categories/项目复盘/',
      icon: 'far fa-file-lines',
      items: [
        { title: 'Linux高性能服务器开发思路(一)', url: '/2026/04/19/Linux/Linux高性能服务器开发思路-(一)/', icon: 'far fa-file-lines' }
      ]
    },
    {
      title: '建站',
      url: '/categories/建站记录/',
      icon: 'far fa-file-code',
      items: [
        { title: 'Hexo 与 Butterfly 美化', url: '/categories/建站记录/', icon: 'far fa-file-code' }
      ]
    }
  ]

  function renderTree() {
    const sectionHtml = treeSections.map(function (section) {
      const items = section.items.map(function (item) {
        return [
          '<a href="' + item.url + '">',
          '  <i class="' + item.icon + '"></i><span>' + item.title + '</span>',
          '</a>'
        ].join('')
      }).join('')

      return [
        '<details open>',
        '  <summary><i class="fas fa-folder"></i><span>' + section.title + '</span></summary>',
        items,
        '</details>'
      ].join('')
    }).join('')

    return [
      '<div class="tree-header">',
      '  <span>EXPLORER</span>',
      '  <button type="button" id="vscode-tree-close" aria-label="关闭文章目录"><i class="fas fa-xmark"></i></button>',
      '</div>',
      '<nav class="tree-content">',
      '  <details open>',
      '    <summary><i class="fas fa-folder-open"></i><span>秋屿_Blog</span></summary>',
      sectionHtml,
      '  </details>',
      '</nav>'
    ].join('')
  }

  function ensurePanel() {
    if (document.getElementById('vscode-tree-panel')) return

    const mask = document.createElement('div')
    mask.id = 'vscode-tree-mask'

    const panel = document.createElement('aside')
    panel.id = 'vscode-tree-panel'
    panel.setAttribute('aria-label', '文章目录')
    panel.innerHTML = renderTree()

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
      toggle.innerHTML = '<i class="fas fa-book-open"></i>'
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
