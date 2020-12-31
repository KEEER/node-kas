<template>
  <set-property
    title="设置您的 KEEER ID"
    subtitle="请慎重，您仅有 1 次设置机会"
    put-path="/api/keeer-id"
    track="keeer-id"
    :get-data="() => ({ keeerId: id })"
    :validate="() => !!id && id.length < 32"
  >
    <v-text-field
      v-model="id"
      pattern="^[a-zA-Z][0-9a-zA-Z_-]{1,31}$"
      maxlen="31"
      outlined
      autofocus
      hide-details="auto"
      label="KEEER ID"
    />
  </set-property>
</template>
<script>
import SetProperty from '~/components/set-property'
export default {
  components: { SetProperty },
  data () {
    return { id: '' }
  },
  head () { return { title: '设置 KEEER ID' } },
}
</script>
