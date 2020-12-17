<template>
  <div class="group">
    <h3 class="headline">{{ title }}</h3>
    <v-list>
      <v-divider />
      <v-list-item-group>
        <slot />
      </v-list-item-group>
    </v-list>
  </div>
</template>

<script>
export default {
  props: { title: String }, // eslint-disable-line vue/require-default-prop
}
</script>

<style scoped>
.group { margin: 16px 0; }
h3 {
  padding: 0 16px;
  margin: 20px 0 8px;
  color: #002d4d;
}
</style>
