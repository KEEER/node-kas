<template>
  <set-property
    title="找回密码"
    subtitle="这将重置您的密码"
    put-path="/api/password"
    :get-data="() => ({ number, code, password })"
    :validate="() => !!number && !!code && !!password"
  >
    <v-text-field
      v-model="number"
      type="tel"
      autocomplete="tel"
      outlined
      autofocus
      hide-details="auto"
      label="您注册时的的手机号"
    />
    <sms-verify v-model="code" :number="number" type="SMS_TYPE_FIND_BACK_PASSWORD" />
    <v-text-field
      v-model="password"
      type="password"
      autocomplete="current-password"
      outlined
      hide-details="auto"
      label="新的密码"
    />
  </set-property>
</template>
<script>
export default {
  data: () => ({ number: '', code: '', password: '' }),
  head: () => ({ title: '找回密码' }),
}
</script>

<style scoped>
.v-input.v-text-field { margin: 8px 0; }
</style>
