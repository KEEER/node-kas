/* eslint-disable unicorn/prefer-includes */
;(() => {
  const data = __data__ // eslint-disable-line no-undef
  const defaultItems = [ 'nickname', 'myaccount', 'divider', 'kredit', 'recharge', 'divider', 'logout' ]
  const shortItems = {
    divider: () => ({ _isDivider: true, text: null }),
    nickname: () => ({ text: esc(data.nickname) }),
    myaccount: () => ({ text: '管理帐号信息', link: url('/') }),
    kredit: () => ({ text: 'Kredit 余额：' + data.kredit / 100 }),
    recharge: () => ({ text: '充值', link: url('/recharge') }),
    logout: () => ({ text: '退出登录', id: 'idframe-log-out', onclick: () => window.idFrame.logout() }),
  }

  const url = path => data.base + path
  const esc = str => str.replace(/</g, '&lt;').replace(/>/g, '&gt;')
  if (!('idFrame' in window)) window.idFrame = {}
  if (!('logout' in window.idFrame)) window.idFrame.logout = () => {
    const req = new XMLHttpRequest()
    req.onload = () => location.reload()
    req.onerror = () => alert('网络错误')
    req.open('DELETE', url('/api/token?set-cookie=true'))
  }

  const waitMdc = new Promise((resolve, reject) => {
    const timeout = 300000
    setTimeout(reject, timeout)
    const intervalId = setInterval(() => {
      if (!('mdc' in window)) return
      if ('ripple' in window.mdc && 'menu' in window.mdc) return resolve()
    }, 200)
    setTimeout(() => clearInterval(intervalId), timeout)
  })

  /**
   * Class representing a IDFrame object.
   * @constructor
   * @param {string|HTMLElement} config.container IDFrame container, string will be interpreted as selector
   * @param {string} [config.loginUrl] login button URL
   * @param {string} [config.signupUrl] signup button URL
   * @param {(string|object)[]} [config.items] items to show
   * @param {string} [config.serviceName] KAS service name to include in login and sign up URLs
   */
  window.idFrame.AppBarFrame = class AppBarFrame {
    constructor (config) {
      this.config = config
      if (!(config.container instanceof HTMLElement)) {
        if (typeof config.container === 'string') config.container = document.querySelector(config.container)
        if (!(config.container instanceof HTMLElement)) throw new Error('Container not found.')
      }
      this.container = config.container
      if (!config.serviceName) {
        this.loginUrl = config.loginUrl || url('/login#login')
        this.signupUrl = config.signupUrl || url('/login#signup')
      } else {
        this.loginUrl = config.loginUrl || url(`/login?service=${config.serviceName}#login`)
        this.signupUrl = config.signupUrl || url(`/login?service=${config.serviceName}#signup`)
      }
      this.ready = this._init()
    }

    /**
     * Initializes frame UI.
     * @private
     */
    _init () {
      return waitMdc.then(() => {
        if (!data.loggedIn) {
          this.container.innerHTML = `
          <span class="idframe idframe--appbar idframe--not-logged-in">
            <a class="mdc-button" href="${this.loginUrl}"><div class="mdc-button__ripple"></div><span class="mdc-button__label">登录</span></a>&nbsp;
            <a class="mdc-button mdc-button--outlined" href="${this.signupUrl}"><div class="mdc-button__ripple"></div><span class="mdc-button__label">注册</span></a>
          </span>`
          const els = this.container.querySelectorAll('.mdc-button')
          for (let i = 0; i < els.length; i++) window.mdc.ripple.MDCRipple.attachTo(els[i])
        } else { // logged in
          this.container.innerHTML = `<span class="idframe idframe--appbar" role="button" title="KEEER 帐号">
            <span class="idframe--appbar__avatar" style="background-image: url('${data.avatar})"></span>
            <span class="idframe--appbar__nickname" dir="ltr">${esc(data.nickname)}</span>
            <span class="idframe--appbar__dropdown-icon"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path d="M7 10l5 5 5-5z"/><path d="M0 0h24v24H0z" fill="none"/></svg></span>
          </span>`
          this.container.firstElementChild.onclick = () => this._menu.open = true
          this.updateItems(this.config.items || [].concat(defaultItems))
        }
      })
    }

    /**
     * Gives layout of frame items.
     * @private
     */
    _handleItems () {
      let html = '<ul class="mdc-list" role="menu" aria-hidden="true" aria-orientation="vertical" tabindex="-1">'
      const listeners = {}
      for (let i = 0; i < this.items.length; i++) {
        let item = this.items[i]
        if (typeof item === 'string') {
          if (!(item in shortItems)) throw new Error(`Item ${item} not found.`)
          item = shortItems[item](this)
        }
        if (!('text' in item)) throw new Error('Invalid item ' + item)
        if (item._isDivider) html += '<li role="separator" class="mdc-list-divider"></li>'
        else if ('link' in item) {
          html += `<a class="mdc-list-item" role="menuitem" href="${item.link}"><span class="mdc-list-item__text">${esc(item.text)}</span></a>`
        } else if ('onclick' in item) {
          if (!('id' in item)) throw new Error(`Item ${item} has an onclick listener without ID.`)
          const id = `${item.id}-${Math.floor(Math.random() * 100000)}`
          listeners[id] = item.onclick
          html += `<a id="${id}" class="mdc-list-item" role="menuitem" href="javascript:;"><span class="mdc-list-item__text">${esc(item.text)}</span></a>`
        } else {
          html += `<li class="mdc-list-item idframe-list-item--disabled" role="menuitem"><span class="mdc-list-item__text">${esc(item.text)}</span></li>`
        }
      }
      if (!this._menuEl) {
        const el = document.createElement('span')
        el.className = 'mdc-menu-surface--anchor'
        this._menuEl = document.createElement('div')
        this._menuEl.className = 'mdc-menu mdc-menu-surface'
        el.appendChild(this._menuEl)
        this.ready.then(() => this.container.firstElementChild.appendChild(el))
      }
      html += '</ul>'
      this._menuEl.innerHTML = html
      this._menuEl.querySelector('ul').addEventListener('click', function (e) { e.stopPropagation() })
      this._menu = new window.mdc.menu.MDCMenu(this._menuEl)
      const els = this._menu.list_.listElements
      for (let i = 0; i < els.length; i++) new window.mdc.ripple.MDCRipple(els[i]) // eslint-disable-line no-new
      setTimeout(() => {
        for (const id in listeners) document.getElementById(id).addEventListener('click', listeners[id])
      }, 100)
    }

    /**
     * Updates menu items.
     * @param {(string|object)[]} items items to be displayed.
     */
    updateItems (items) {
      if (!items || items.length === undefined) throw new TypeError('Items not an array')
      const oldItems = this.items
      this.items = items
      try {
        this._handleItems()
      } catch (e) {
        this.items = oldItems
        this._handleItems()
        throw e
      }
    }
  }

  // initialize styles
  const styleEl = document.createElement('style')
  styleEl.innerHTML = `
  .idframe--appbar {
    cursor: pointer;
    user-select: none;
    display: flex;
    align-items: center;
  }
  .idframe--not-logged-in {
    margin-top: 2px;
    margin-right: 2px;
  }
  .idframe--appbar__nickname {
    font-size: 16px;
    margin: 0 4px 0 8px;
    color: var(--mdc-theme-primary, black);
  }
  @media(max-width: 599px) {
    .idframe--appbar__nickname {
      display: none;
    }
  }
  .idframe--appbar__avatar {
    width: 40px;
    height: 40px;
    background-size: contain;
    display: inline-block;
    border-radius: 4px;
  }
  .idframe--appbar .mdc-menu-surface--anchor {
    align-self: start;
  }
  .idframe--appbar .idframe-list-item--disabled .mdc-list-item__text {
    opacity: .5;
  }
  .idframe--appbar__dropdown-icon, .idframe--appbar__dropdown-icon svg {
    display: inline-block;
    width: 20px;
    height: 20px;
    opacity: .8;
    fill: var(--mdc-theme-primary, black);
  }`
  document.head.appendChild(styleEl)

  // initialize MDC
  const used = {
    'mdc.button.': [ 'https://cdn.jsdelivr.net/npm/@material/button@4.0.0/dist/mdc.button.min.css' ],
    'mdc.ripple.': [ 'https://cdn.jsdelivr.net/npm/@material/ripple@4.0.0/dist/mdc.ripple.min.css', 'https://cdn.jsdelivr.net/npm/@material/ripple@4.0.0/dist/mdc.ripple.min.js' ],
    'mdc.list.': [ 'https://cdn.jsdelivr.net/npm/@material/list@4.0.0/dist/mdc.list.min.css' ],
    'mdc.menu-surface.': [ 'https://cdn.jsdelivr.net/npm/@material/menu-surface@4.0.0/dist/mdc.menu-surface.min.css' ],
    'mdc.menu.': [ 'https://cdn.jsdelivr.net/npm/@material/menu@4.0.0/dist/mdc.menu.min.css', 'https://cdn.jsdelivr.net/npm/@material/menu@4.0.0/dist/mdc.menu.min.js' ],
  }
  for (const i in used) {
    let has = !used[i][0]
    if (!('mdc' in window.idFrame) || !window.idFrame.mdc.style) {
      for (let j = 0; j < document.styleSheets.length; j++) {
        if ((document.styleSheets[j].href || '').indexOf(i) > -1) has = true
      }
      if (!has) {
        const el = document.createElement('link')
        el.rel = 'stylesheet'
        el.href = used[i][0]
        document.head.appendChild(el)
      }
    }
    if (!('mdc' in window.idFrame) || !window.idFrame.mdc.script) {
      has = !used[i][1]
      for (let j = 0; j < document.scripts.length; j++) {
        if ((document.scripts[j].src || '').indexOf(i) > -1) has = true
      }
      if (!has) {
        const el = document.createElement('script')
        el.src = used[i][1]
        document.head.appendChild(el)
      }
    }
  }
})()
