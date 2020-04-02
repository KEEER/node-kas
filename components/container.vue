<template>
  <content :class="classes">
    <div :class="{ profile }">
      <slot />
    </div>
  </content>
</template>

<script>
export default {
  props: {
    dark: Boolean,
    header: Boolean,
    alignCenter: Boolean,
    profile: Boolean,
  },
  computed: {
    classes () {
      const { dark, header } = this
      return { dark, header, light: !dark, 'align-center': this.alignCenter }
    },
  },
}
</script>

<style scoped>
content { display: flex; }

content > * {
  width: 100%;
  max-width: 750px;
  padding: 16px;
}

content::before, content::after {
  content: ' ';
  flex: auto;
  height: 100%;
}
content.header { height: 200px; }
content.header > * {
  display: flex;
  flex-direction: column;
}
content.header > *::before, content.header > *::after {
  content: ' ';
  flex: auto;
}

content.light {
  color: #002d4d;
  background-color: #fff;
}
content.dark {
  color: #f5fafd;
  background-color: #002d4d;
}

.align-center {
  text-align: center;
}

.profile {
  margin: 15px 0;
  max-width: 300px;
}
</style>
