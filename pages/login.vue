<template>
  <content :class="{ 'custom-logo': customLogo }">
    <div class="background" :style="backgroundStyle" />
    <a v-if="customLogo" id="keeer-icon" class="link" target="_blank" href="https://keeer.net/?utm_source=nodekas&utm_medium=login_top">
      <img src="https://keeer.net/img/logo/light-large.svg">
    </a>
    <div id="wrapper">
      <div id="slogan">
        <img id="logo" :src="logoSrc">
        <h1 id="title" class="display-1">{{ title }}</h1>
        <p id="subtitle" class="subtitle-1">一个帐号，使用全部 KEEER 产品</p>
      </div>
      <div id="regbox-out">
        <v-card id="regbox">
          <v-tabs v-if="loadTabs" v-model="tab" fixed-tabs>
            <v-tabs-slider />
            <v-tab href="#login">登录</v-tab>
            <v-tab href="#signup">注册</v-tab>

            <v-tab-item value="login">
              <form @submit="login(); $event.preventDefault()">
                <v-text-field
                  v-model="identity"
                  outlined
                  autofocus
                  hide-details="auto"
                  label="手机号、邮箱或者 KEEER ID"
                  autocomplete="username"
                />
                <v-text-field
                  v-model="password"
                  type="password"
                  outlined
                  hide-details="auto"
                  label="密码"
                  autocomplete="current-password"
                />
                <v-btn type="submit" color="primary" class="confirm-button" :disabled="!loginValid || busy">登录</v-btn>
                <v-btn text class="forgot-password-button" to="/password-findback" nuxt>忘了密码</v-btn>
              </form>
            </v-tab-item>
            <v-tab-item value="signup">
              <form @submit="signup(); $event.preventDefault()">
                <v-text-field
                  v-model="identity"
                  type="tel"
                  outlined
                  autofocus
                  hide-details="auto"
                  label="您的手机号"
                  autocomplete="tel"
                />
                <sms-verify v-model="code" :number="identity" type="SMS_TYPE_REGISTER" />
                <v-text-field
                  v-model="password"
                  type="password"
                  autocomplete="new-password"
                  outlined
                  hide-details="auto"
                  label="您的密码"
                />
                <v-row align="end" class="agree-terms">
                  <v-checkbox v-model="agreeTerms" hide-details />
                  <span>我已阅读并同意<nuxt-link to="/kas-terms">用户协议和隐私政策</nuxt-link></span>
                </v-row>
                <v-btn type="submit" class="confirm-button" color="primary" :disabled="!signupValid || busy">注册</v-btn>
              </form>
            </v-tab-item>
          </v-tabs>
        </v-card>
      </div>
      <footer>
        <a href="https://keeer.net/" class="link"><img class="keeer-logo" src="https://keeer.net/img/logo/light-large.svg"></a>
        <nuxt-link to="/kas-terms" class="link">用户协议与隐私政策</nuxt-link>
        <a href="/" class="link">联系我们</a>
        <a v-if="backgroundCopyright" :href="backgroundCopyrightUrl" class="link" target="_blank" rel="noopener">{{ backgroundCopyright }}</a>
      </footer>
    </div>
  </content>
</template>

<script>
import SmsVerify from '~/components/sms-verify'

export default {
  inject: [ 'snackbar', 'reloadIdframe' ],
  components: { SmsVerify },
  async asyncData ({ req }) {
    if (process.server) {
      const { ctx } = req
      if (ctx.query.service) {
        const cfg = await ctx.getServiceLoginConfig(ctx.query.service)
        if (ctx.state.user) return ctx.redirect(cfg.redirectUrl)
        if (cfg) return { useCustom: cfg }
      }
      if (ctx.query.git) return { useCustom: 'git', state: ctx.query.state, redir: ctx.query.redirect_uri }
      if (ctx.state.user) return ctx.redirect('/')
      return { useCustom: false }
    } else if (location.search && /service=/.test(location.search)) {
      const res = await fetch('/api/login-config' + location.search).then(res => res.json())
      return { useCustom: res.result }
    } else return { useCustom: false }
  },
  data () {
    return {
      tab: '',
      loadTabs: false,
      identity: '',
      code: '',
      password: '',
      agreeTerms: false,
      busy: false,
      title: '登录您的 KEEER 帐号',
      logoSrc: 'https://keeer.net/img/logo/light-square.jpg',
      backgroundUrl: 'https://nodekas-production.oss-cn-beijing.aliyuncs.com/assets/login-background.jpg',
      backgroundCopyright: '背景图片：CC BY-SA 4.0',
      backgroundCopyrightUrl: 'https://commons.wikimedia.org/wiki/File:Ellerberg_1274451.jpg',
      customLogo: false,
    }
  },
  computed: {
    signupValid () {
      return this.identity && this.code && this.password && this.agreeTerms
    },
    loginValid () { return this.identity && this.password },
    backgroundStyle () {
      if (!this.backgroundUrl) return ''
      return `background-image: url(${this.backgroundUrl});`
    },
  },
  mounted () {
    this.tab = location.hash === '#login' ? 'login' : 'signup'
    this.$nextTick(() => this.loadTabs = true)
  },
  created () {
    if (this.useCustom && this.useCustom !== 'redirect' && this.useCustom !== 'git') {
      for (const k of [ 'title', 'logoSrc', 'backgroundUrl' ]) this[k] = this.useCustom[k] || this[k]
      if (this.useCustom.logoSrc) this.customLogo = true
      if (this.useCustom.backgroundUrl) {
        if (this.useCustom.backgroundCopyright) {
          this.backgroundCopyright = this.useCustom.backgroundCopyright
          this.backgroundCopyrightUrl = this.useCustom.backgroundCopyrightUrl
        } else {
          this.backgroundCopyright = null
        }
      }
      if (this.useCustom.themeColor) {
        this.$vuetify.theme.themes.light.primary = '#002d4d'
        setTimeout(() => this.$vuetify.theme.themes.light.primary = this.useCustom.themeColor, 500)
      }
    }
    if (this.useCustom === 'redirect') {
      if (/^https?:\/\//.test(this.redirectUrl)) location = this.redirectUrl
      else this.$router.push(this.redirectUrl)
    }
  },
  methods: {
    proceed () {
      this.reloadIdframe()
      if (this.useCustom && this.useCustom.redirectUrl) {
        const url = this.useCustom.redirectUrl
        if (/^https?:\/\//.test(url)) location = url
        else this.$router.push(url)
      } else if (this.useCustom === 'git') {
        location = '/git/authorize?' + new URLSearchParams({ redirect_uri: this.redir, state: this.state })
      } else this.$router.push('/')
    },
    async login () {
      this.busy = true
      try {
        const res = await fetch('/api/token?set-cookie=true', {
          credentials: 'same-origin',
          method: 'put',
          headers: { Authorization: `Basic ${btoa(`${this.identity}:${this.password}`)}` },
        }).then(res => res.json())
        if (res.status !== 0) this.snackbar(res.message || '未知错误')
        else {
          if (res.message) this.snackbar(res.message)
          this.proceed()
        }
      } catch (e) {
        console.error(e)
        this.snackbar('网络错误')
      }
      this.busy = false
    },
    async signup () {
      this.busy = true
      try {
        const { identity: number, code, password } = this
        const res = await fetch('/api/user?set-cookie=true', {
          credentials: 'same-origin',
          method: 'put',
          body: JSON.stringify({ number, code, password }),
          headers: { 'Content-Type': 'application/json' },
        }).then(res => res.json())
        if (res.status !== 0) this.snackbar(res.message || '未知错误')
        else {
          if (res.message) this.snackbar(res.message)
          this.proceed()
        }
      } catch (e) {
        console.error(e)
        this.snackbar('网络错误')
      }
      this.busy = false
    },
  },
  head () { return { title: '登录' } },
}
</script>

<style scoped>
content { display: block; }
.background {
  content: ' ';
  background-color: #002d4d;
  background-image: linear-gradient(64deg, #9a1b99, #002d4d);
  background-size: cover;
  background-repeat: no-repeat;
  background-position: center center;
  display: block;
  width: 100%;
  height: 100%;
  position: fixed;
  top: 0;
  left: 0;
}

#wrapper {
  height: 100vh;
  width: 100%;
  display: flex;
  z-index: 1;
}
#keeer-icon {
  position: absolute;
  top: 32px;
  left: 32px;
  z-index: 3;
}
#keeer-icon, #keeer-icon > img { height: 32px; }

#title { margin: 22px 0; }
#slogan {
  flex: 1;
  z-index: 2;
  color: #f5fafd;
  padding: 96px 64px 64px;
  position: relative;
}
#subtitle { position: relative; }
#subtitle:before {
  position: absolute;
  top: auto;
  bottom: -5px;
  left: -3000px;
  right: -588px;
  content: ' ';
  background-color: #f5fafd;
  height: 1px;
  z-index: 5;
}

#regbox-out { padding: 64px; }
#regbox {
  padding: 30px;
  z-index: 10;
  overflow: hidden;
}
#regbox-out {
  width: 464px;
  padding: 94px 100px 0 64px;
}

.checkbox-label {
  line-height: 1.25em;
  margin-top: 8px;
  margin-left: -8px;
  display: inline-block;
}

footer {
  position: fixed;
  bottom: 0;
  padding-bottom: 12px;
  padding-left: 10px;
  padding-right: 10px;
  font-size: 13px;
  line-height: 16px;
  color: #f5fafd;
  width: auto;
  left: 64px;
  z-index: 3;
}

.keeer-logo {
  height: 16px;
  position: relative;
  bottom: -4px;
}
.link:link, .link:visited, .link:hover {
  opacity: 0.6;
  transition: opacity 0.2s ease;
  color: inherit;
  text-decoration: none;
  position: relative;
  bottom: 3px;
}
.link:hover { opacity: 1; }

@media(min-width: 1000px) {
  #slogan { padding-left: 128px; }
  #regbox-out { width: 524px; }
  footer { left: 128px; }
}

@media(min-width: 1300px) {
  #regbox-out {
    padding-right: 256px;
    width: 680px;
  }
  #slogan { padding-left: 164px; }
  #subtitle::before { right: -256px; }
  footer { left: 164px; }
}

@media(max-width: 768px) {
  #wrapper, #slogan, #regbox-out {
    display: block;
    padding: 15px;
    text-align: center;
    width: 100%;
  }
  .custom-logo #slogan { margin-top: 64px; }
  #regbox {
    display: inline-block;
    text-align: left;
    width: 90%;
  }
  #regbox-out { top: 0; }
  #regbox-out::before, #regbox-out::after {
    content: ' ';
    width: auto;
    display: inline-block;
  }
  #slogan { top: 0; }
  #wrapper { padding: 0; }
  #subtitle::before {
    left: -15px;
    right: -15px;
  }
  footer {
    position: inherit;
    left: 0;
    right: 0;
    text-align: center;
  }
}

.hidden { display: none; }
#logo {
  height: 128px;
  border-radius: 5px;
}

.confirm-button {
  margin-top: 12px;
  float: right;
}
.forgot-password-button { margin-top: 12px; }

.v-input.v-text-field { margin: 8px 0; }
.agree-terms { margin: -16px 0 0 !important; }
</style>
