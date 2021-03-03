<template>
  <set-property
    title="设置您的密码"
    subtitle="请您牢记您的密码"
    put-path="/api/password"
    track="password"
    :get-data="() => ({ current, password })"
    :validate="() => !!current && !!password"
  >
    <v-text-field
      v-model="current"
      type="password"
      outlined
      autofocus
      hide-details="auto"
      label="现在的密码"
      autocomplete="current-password"
    />
    <v-text-field
      v-model="password"
      type="password"
      outlined
      hide-details="auto"
      label="新的密码"
      autocomplete="new-password"
    />
  </set-property>
</template>
<script>
export default {
  data: () => ({ current: '', password: '' }),
  head: () => ({ title: '修改密码' }),
}
</script>
