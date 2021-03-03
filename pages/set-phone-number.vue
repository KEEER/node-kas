<template>
  <set-property
    title="变更您的手机号"
    subtitle="这将变更您 KEEER 帐号所绑定的手机号码"
    put-path="/api/phone-number"
    track="phone-number"
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
      label="新的手机号"
    />
    <sms-verify v-model="code" :number="number" type="SMS_TYPE_SET_PHONE_NUMBER" />
    <v-text-field
      v-model="password"
      type="password"
      autocomplete="current-password"
      outlined
      hide-details="auto"
      label="您的密码"
    />
  </set-property>
</template>
<script>
export default {
  data: () => ({ number: '', code: '', password: '' }),
  head: () => ({ title: '变更手机号' }),
}
</script>
