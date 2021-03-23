<template>
  <container dark header v-bind="$attrs">
    <h1 class="display-3"><slot />{{ title }}</h1>
    <h2 class="subtitle-1">{{ subtitle }}</h2>
  </container>
</template>
<script>
export default {
  props: {
    title: { type: String, default: '' },
    subtitle: { type: String, default: '' },
  },
}
</script>

<style src="~/assets/style/title-font.css" />
<style scoped>
.v-application h1.display-3 {
  font-family: 'SHSans EL' !important;
  font-weight: 200;
  margin: 40px 0 16px;
}

@media (max-width: 768px) {
  .v-application h1.display-3 {
    font-size: 2rem !important;
    line-height: 2rem;
    font-weight: 400;
    font-family: inherit !important;
  }
}
h1, h2 { padding: 0 16px; }
</style>
