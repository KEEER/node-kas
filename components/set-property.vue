<template>
  <div>
    <v-btn icon color="#f5fafd" class="back" @click="back"><v-icon>mdi-arrow-left</v-icon></v-btn>
    <headline :title="title" :subtitle="subtitle" align-center />
    <container profile>
      <form @submit="submit(); $event.preventDefault()">
        <slot />
        <v-btn
          v-if="!noSubmit"
          type="submit"
          :disabled="!valid || submitting"
          depressed
          color="primary"
          class="confirm"
        >
          确认
        </v-btn>
      </form>
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
    track: String,
  },
  data () {
    return { submitting: false }
  },
  inject: [ 'snackbar', 'setIdframe' ],
  computed: {
    valid () {
      return this.validate ? this.validate() : true
    },
  },
  mounted () { this.setIdframe(true) },
  beforeDestroy () { this.setIdframe(false) },
  methods: {
    back () { this.$router.back() },
    async submit () {
      if (!this.valid) return
      if (this.track) this.$ga.event('set', this.track)
      try {
        this.submitting = true
        const res = await fetch(this.putPath, {
          credentials: 'same-origin',
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
