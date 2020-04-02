<template>
  <v-text-field
    v-model="code"
    outlined
    hide-details="auto"
    label="验证码"
  >
    <v-btn slot="append" depressed color="primary" class="send-button" @click="sendCode">发送验证码</v-btn>
  </v-text-field>
</template>

<script>
export default {
  props: {
    value: { type: String, default: '' },
    number: { type: String, required: true },
    type: { type: String, required: true },
  },
  inject: [ 'snackbar' ],
  data () {
    return {
      code: this.value,
    }
  },
  watch: {
    code (val) { this.$emit('input', val) },
  },
  methods: {
    async sendCode () {
      if (!this.number) return
      try {
        const res = await fetch('/api/sms-code', {
          method: 'put',
          body: JSON.stringify({ number: this.number, type: this.type }),
          headers: { 'Content-Type': 'application/json' },
        }).then(res => res.json())
        if (res.status !== 0) this.snackbar(res.message || '未知错误')
        else this.snackbar(res.message || '成功发送验证码，请注意查收')
      } catch (e) {
        console.error(e)
        this.snackbar('网络错误')
      }
    },
  },
}
</script>

<style scoped>
.send-button {
  height: auto;
  width: 98px;
  margin: 10px 0;
  text-align: center;
}
</style>
<style>
.v-text-field .v-input__append-inner {
  margin-top: 0 !important;
}
</style>
