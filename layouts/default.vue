<template>
  <div>
    <v-app>
      <v-main>
        <nuxt />
        <v-snackbar v-model="snackbarModel" :timeout="3200">
          {{ snackbarText }}
        </v-snackbar>
      </v-main>
    </v-app>
    <span v-show="showIdframe" id="idframe" ref="idframe" />
  </div>
</template>

<script>
export default {
  provide () {
    return {
      layout: this,
      snackbar: text => {
        if (this.snackbarModel) return this.snackbarQueue.push(text)
        this.snackbarText = text
        this.snackbarModel = true
      },
      setIdframe: val => this.showIdframe = val,
      reloadIdframe: () => this.reloadIdframe(),
    }
  },
  data () {
    return {
      title: 'KEEER Account Service',
      showIdframe: false,
      snackbarModel: false,
      snackbarText: '',
      snackbarQueue: [],
    }
  },
  head: () => ({ title: 'KAS' }),
  watch: {
    snackbarModel (val) {
      if (!val && this.snackbarQueue.length > 0) {
        setTimeout(() => {
          this.snackbarText = this.snackbarQueue.shift()
          this.snackbarModel = true
        }, 300)
      }
    },
  },
  mounted () { this.reloadIdframe() },
  methods: {
    reloadIdframe () {
      this.$refs.idframe.innerHTML = ''
      if (!window.idFrame) window.idFrame = {}
      window.idFrame.logoutCallback = () => this.$router.push('/login#login')
      const scriptEl = document.createElement('script')
      scriptEl.onload = () => {
        // eslint-disable-next-line no-new
        new window.idFrame.AppBarFrame({ container: this.$refs.idframe })
      }
      scriptEl.src = '/api/idframe'
      document.head.appendChild(scriptEl)
    },
  },
}
</script>

<style scoped>
#idframe {
  top: 12px;
  right: 12px;
  z-index: 99;
  position: fixed;
  --mdc-theme-primary: #f5fafd;
}
</style>
