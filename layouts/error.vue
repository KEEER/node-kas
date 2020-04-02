<template>
  <v-app>
    <v-col align-self="center" class="content">
      <v-row align="center">
        <v-spacer />
        <v-card class="error-card">
          <template v-if="error.statusCode === 404">
            <h1 class="display-1">(404) 未找到。</h1>
            <p>这个资源不存在，或者你没有权限访问这个资源。</p>
          </template>
          <template v-else>
            <h1>错误（{{ error.statusCode }}）</h1>
          </template>
          <p>点击下面的按钮回到主页。</p>
          <v-btn color="primary" depressed to="/" nuxt>返回</v-btn>
        </v-card>
        <v-spacer />
      </v-row>
    </v-col>
  </v-app>
</template>

<script>
export default {
  layout: 'empty',
  props: {
    error: {
      type: Object,
      default: null,
    },
  },
  data () {
    return {
      pageNotFound: '404 Not Found',
      otherError: 'An error occurred',
    }
  },
  head () {
    const title = this.error.statusCode === 404 ? this.pageNotFound : this.otherError
    return { title }
  },
}
</script>

<style scoped>
.content {
  padding: 32px;
  display: flex;
  flex-direction: row;
  height: 100vh;
  background-color: #002d4d;
}
.error-card { padding: 16px }
h1 { margin: 16px 0; }
</style>
