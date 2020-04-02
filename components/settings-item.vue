<template>
  <v-list-item :to="to" nuxt>
    <v-list-item-title>{{ title }}</v-list-item-title>
    <v-btn icon><v-icon>mdi-chevron-right</v-icon></v-btn>
  </v-list-item>
</template>
<script>
export default {
  props: { title: String, to: String }, // eslint-disable-line vue/require-default-prop
}
</script>
