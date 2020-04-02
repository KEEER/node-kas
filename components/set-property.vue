<template>
  <div>
    <v-btn icon color="#f5fafd" class="back" @click="back"><v-icon>mdi-arrow-left</v-icon></v-btn>
    <headline :title="title" :subtitle="subtitle" />
    <container profile>
      <slot />
      <v-btn
        v-if="!noSubmit"
        :disabled="!valid || submitting"
        depressed
        color="primary"
        class="confirm"
        @click="submit"
      >
        确认
      </v-btn>
    </container>
  </div>
</template>

<script>
/* eslint-disable vue/require-default-prop */
import Headline from '~/components/headline'
import Container from '~/components/container'
export default {
  components: { Headline, Container },
  props: {
    noSubmit: Boolean,
    title: String,
    subtitle: String,
    putPath: String,
    getData: Function,
    validate: {
      type: Function,
      required: false,
    },
  },
  data () {
    return { submitting: false }
  },
  inject: [ 'snackbar' ],
  computed: {
    valid () {
      return this.validate ? this.validate() : true
    },
  },
  mounted () {
    const idFrameEl = document.createElement('span')
    window.idFrameEl = idFrameEl
    idFrameEl.style.cssText = 'top: 12px; right: 12px; position: fixed; --mdc-theme-primary: #f5fafd;'
    const scriptEl = document.createElement('script')
    scriptEl.src = 'https://idframe.keeer.net/js/appbar.js'
    document.head.appendChild(scriptEl)
    document.body.appendChild(idFrameEl)
    const intervalId = setInterval(function () {
      if ('idFrame' in window) {
        clearInterval(intervalId)
        // eslint-disable-next-line no-new, no-undef
        new idFrame.AppBarFrame({ container: idFrameEl, base: location.origin })
      }
    }, 100)
  },
  beforeDestroy () {
    document.body.removeChild(window.idFrameEl)
    delete window.idFrameEl
  },
  methods: {
    back () { this.$router.back() },
    async submit () {
      if (!this.valid) return
      try {
        this.submitting = true
        const res = await fetch(this.putPath, {
          method: 'put',
          body: JSON.stringify(this.getData()),
          headers: { 'Content-Type': 'application/json' },
        }).then(res => res.json())
        if (res.status !== 0) {
          this.snackbar(res.message || '未知错误')
        } else {
          this.snackbar(res.message || '成功设置')
          this.$router.back()
        }
      } catch (e) {
        this.snackbar('网络错误')
        console.error('set property', e)
      }
      this.submitting = false
    },
  },
}
</script>

<style scoped>
.confirm {
  margin-top: 12px;
  float: right;
}
.back {
  position: absolute;
  top: 12px;
  left: 12px;
}
</style>
<style>
.v-text-field.v-input {
  margin: 8px;
  width: 100%;
}
</style>
