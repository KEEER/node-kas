<template>
  <content>
    <v-btn icon color="primary" class="back" @click="$router.back()"><v-icon>mdi-arrow-left</v-icon></v-btn>
    <div class="content">
      <h2 class="display-3 recharge-title">为 <span dir="ltr">{{ nickname || '新用户' }}</span> 充值 Kredit </h2>
      <nuxt-link v-if="!nickname" to="/set-nickname">设置昵称</nuxt-link>
      <p class="subtitle-1">充值 Kredit 以享受 KEEER 提供的付费服务</p>
      <p class="subtitle-2">
        请确保充值前您已经悉知并同意
        <nuxt-link to="/kredit-terms" class="link"><strong>Kredit 条款（点击以查看）</strong></nuxt-link>，继续操作代表您已经同意该条款
      </p>
      <div class="card-container">
        <v-card class="option-card only-on-mobile" @click="recharge(2000)">
          <p class="headline">充值 20 Kredit</p>
          <p class="display-1">20 元</p>
        </v-card>
        <v-card class="option-card" @click="recharge(1024)">
          <p class="headline">充值 10.24 Kredit</p>
          <p class="display-1">10.24 元</p>
        </v-card>
        <v-card class="option-card" @click="recharge(500)">
          <p class="headline">充值 5 Kredit</p>
          <p class="display-1">5 元</p>
        </v-card>
        <v-card class="option-card" @click="recharge(100)">
          <p class="headline">充值 1 Kredit</p>
          <p class="display-1">1 元</p>
        </v-card>
        <v-card class="option-card custom">
          <p class="headline">自定义数额充值</p>
          <p class="body-1">1 元 → 1 Kredit</p>
          <div class="recharge-input-container">
            <div class="recharge-input">
              <v-text-field
                v-model="amount"
                class="amount-text-field"
                type="number"
                min="0.01"
                step="0.01"
                max="1000"
                outlined
                hide-details="auto"
                label="充值数额（元）"
              />
            </div>
            <v-btn outlined class="recharge-button" @click="recharge(amount * 100)">继续</v-btn>
          </div>
        </v-card>
      </div>
    </div>
    <v-spacer />
    <footer>
      <p>
        <a href="https://keeer.net/" class="link"><img class="keeer-logo" src="https://keeer.net/img/logo/dark-large.svg"></a>
        <nuxt-link to="/kas-terms" class="link">用户协议与隐私政策</nuxt-link>
        <a href="/" class="link">联系我们</a>
      </p>
      <p>Copyright © 2015-present KEEER. All rights reserved.</p>
    </footer>
  </content>
</template>

<script>
export default {
  inject: [ 'snackbar' ],
  async asyncData ({ req, res }) {
    const notLoggedIn = {
      notLoggedIn: true,
      nickname: '未登录用户',
    }
    if (process.server) {
      const { ctx } = req
      if (!ctx.state.user) return ctx.redirect('/login')
      const { nickname } = ctx.state.user.options
      return { notLoggedIn: false, nickname }
    } else {
      const res = await fetch('/api/user-information', { credentials: 'same-origin' }).then(res => res.json())
      if (res.status !== 0) return notLoggedIn
      else {
        const { nickname } = res.result
        return { notLoggedIn: false, nickname }
      }
    }
  },
  data () {
    return { amount: '' }
  },
  created () {
    if (this.notLoggedIn) this.$router.push('/login')
  },
  methods: {
    async recharge (amount) {
      if (!amount || isNaN(amount) || !Number.isInteger(amount)) return
      if (amount > 100000) return this.snackbar('充值金额过大，系统无法处理')
      this.$ga.event('recharge', amount)
      const url = new URL('/api/recharge-order', location.href)
      url.search = new URLSearchParams({ amount })
      const order = await fetch(url, { method: 'put', credentials: 'same-origin' }).then(res => res.json())
      if (order.status !== 0) return this.snackbar(order.message || '无法创建请求')
      const { result } = order
      if (/^https?:\/\//.test(result)) location = result
      else this.$router.push(result)
    },
  },
  head () { return { title: '充值 Kredit ' } },
}
</script>

<style scoped>
.back {
  position: absolute;
  top: 12px;
  left: 12px;
}
content {
  min-height: 100vh;
  margin: 0;
  display: flex;
  flex-direction: column;
  background-color: #eaeaea;
  color: #002d4d;
}
.recharge-title { margin: 70px 0 16px; }
.content {
  display: flex;
  flex-direction: column;
  justify-content: center;
  text-align: center;
}
.option-card {
  margin: 16px;
  width: 280px;
  height: 280px;
  text-align: center;
  display: flex;
  flex-direction: column;
  color: inherit;
}
.option-card .headline { margin: 24px 0; }
.option-card .display-1 { margin: 34px 0; }
.only-on-mobile { display: none; }
.card-container {
  display: flex;
  justify-content: center;
  flex-wrap: wrap;
}
a.link:link, a.link:visited, a.link:link:hover, a.link:visited:hover {
  text-decoration: none;
  color: #365679;
}
footer>a {
  color: inherit;
}
.recharge-input {
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
}
.recharge-input .v-input { width: 80%; }
.recharge-input-container { text-align: center; }
.recharge-button {
  margin: 16px 0;
}
footer {
  padding: 12px 10px;
  font-size: 13px;
  line-height: 16px;
  color: #002d4d;
  width: 100%;
  text-align: center;
}
.keeer-logo {
  height: 16px;
  position: relative;
  bottom: -4px;
}
.amount-text-field {
  width: 80%;
}

@media (max-width: 768px) {
  .only-on-mobile { display: flex; }
  .recharge-title {
    font-size: 2rem !important;
    line-height: 2rem;
  }
  .option-card {
    height: auto;
    width: 42%;
    margin: 8px;
  }
  .option-card .headline {
    font-size: 1rem !important;
    margin: 8px 0;
  }
  .custom .headline {
    font-size: 1.25rem !important;
    margin-top: 16px;
  }
  .option-card .display-1 {
    margin: 0 0 16px;
    font-size: 1.5rem !important;
  }
  .option-card.custom { width: 80%; }
}
</style>
