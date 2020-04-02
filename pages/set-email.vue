<template>
  <set-property
    title="设置您的电子邮箱"
    subtitle="这将会向您的邮箱中发送一封验证邮件，请按照邮件中的指示继续操作"
    put-path="/api/email"
    :get-data="() => ({ email })"
    :validate="() => !!email"
  >
    <v-text-field
      v-model="email"
      type="email"
      outlined
      autofocus
      hide-details="auto"
      label="邮箱地址"
      autocomplete="email"
    />
  </set-property>
</template>
<script>
import SetProperty from '~/components/set-property'
export default {
  components: { SetProperty },
  data () {
    return { email: '' }
  },
  head () { return { title: '设置电子邮箱' } },
}
</script>
