<template>
  <v-col align-self="center" class="content">
    <v-row align="center">
      <v-spacer />
      <v-card class="payment-card">
        <h3 class="headline">{{ title }}</h3>
        <img :src="qrcode" class="qrcode" :class="{ blur }">
        <br>
        <v-btn v-show="showBackButton" outlined color="primary" class="return-button" @click="$router.back()">返回上一页</v-btn>
      </v-card>
      <v-spacer />
    </v-row>
  </v-col>
</template>

<script>
export default {
  inject: [ 'snackbar' ],
  asyncData ({ req, query }) {
    const { id, qrcode, amount } = query
    return {
      id,
      qrcode,
      amount,
      showBackButton: false,
      blur: false,
      title: `充值 ${amount / 100} Kredit`,
      destroyed: false,
    }
  },
  head: () => ({ title: '充值收银台' }),
  computed: {
    pollUrl () {
      const url = new URL('/api/recharge-order', location.href)
      url.search = new URLSearchParams({ id: this.id, watch: true })
      return url
    },
  },
  mounted () { this.poll() },
  beforeDestroy () { this.destroyed = true },
  methods: {
    repoll () {
      if (this.destroyed) return
      setTimeout(() => this.poll(), 3000)
    },
    async poll () {
      console.log('New poll @ ', this.pollUrl)
      try {
        const res = await fetch(this.pollUrl, { credentials: 'same-origin' }).then(res => res.json())
        if (res.code === 'ETIMEOUT') {
          this.blur = false
          return this.repoll()
        }
        if (res.status !== 0) {
          if (res.message) this.title = res.message
          this.snackbar(res.message || '未知错误')
          this.blur = true
        } else {
          if (res.message) this.snackbar(res.message)
          this.title = res.message || '充值成功！'
          this.showBackButton = true
          this.blur = true
        }
      } catch (e) {
        console.error(e)
        this.snackbar('网络错误，正在重试……')
        this.blur = true
        return this.repoll()
      }
    },
  },
}
</script>

<style scoped>
.content {
  padding: 32px;
  display: flex;
  flex-direction: row;
  height: 100vh;
  background-color: #eaeaea;
}
.qrcode {
  width: 280px;
  height: 280px;
  margin: 32px;
  margin-top: 0;
  transition: filter 0.2s ease;
}
.blur { filter: blur(8px); }
.payment-card { text-align: center; }
.return-button { margin: 8px; }
h3 { margin: 32px 0 16px; }
</style>
