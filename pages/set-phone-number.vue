<template>
  <set-property
    title="变更您的手机号"
    subtitle="这将变更您 KEEER 账户所绑定的手机号码"
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
import SetProperty from '~/components/set-property'
import SmsVerify from '~/components/sms-verify'

export default {
  components: { SetProperty, SmsVerify },
  data () {
    return { number: '', code: '', password: '' }
  },
  head () { return { title: '变更手机号' } },
}
</script>
