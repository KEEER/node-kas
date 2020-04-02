<template>
  <set-property
    title="设置您的昵称"
    subtitle="对您的名称所做的更改将反映在您的 KEEER 账户中"
    put-path="/api/nickname"
    :get-data="() => ({ nickname })"
    :validate="() => !!nickname"
  >
    <v-text-field
      v-model="nickname"
      maxlen="64"
      outlined
      autofocus
      hide-details="auto"
      label="新的昵称"
    />
  </set-property>
</template>
<script>
import SetProperty from '~/components/set-property'
export default {
  components: { SetProperty },
  data () {
    return { nickname: '' }
  },
  head () { return { title: '设置昵称' } },
}
</script>
