<template>
  <container dark header align-center>
    <h1 class="display-3">{{ title }}</h1>
    <h2 class="subtitle-1">{{ subtitle }}</h2>
  </container>
</template>
<script>
import Container from '~/components/container'
export default {
  components: { Container },
  props: { title: String, subtitle: String }, // eslint-disable-line vue/require-default-prop
}
</script>
<style scoped>
.v-application h1.display-3 {
  font-weight: 200;
  margin: 40px 0 16px;
}
</style>
