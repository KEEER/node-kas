<template>
  <set-property
    title="更换您的头像"
    subtitle="对您的头像所做的更改将反映在您的 KEEER 帐号中"
    no-submit
    class="center"
  >
    <v-btn class="upload-button" color="primary" @click="$refs.avatar.click()">
      <v-icon left>mdi-cloud-upload</v-icon>
      上传头像
    </v-btn>
    <form method="POST" action="/api/avatar" enctype="multipart/form-data">
      <input
        ref="avatar"
        name="avatar"
        required
        class="input-file"
        type="file"
        accept="image/*"
        @change="previewFile"
      >
      <input name="_csrf" type="hidden" :value="csrf">
      <input name="frontend" type="hidden" value="true">
      <template v-if="valid">
        <h3>预览</h3>
        <img ref="preview" class="preview-avatar" src="" onerror="this.src='data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPjwvc3ZnPg=='">
        <br>
        <v-btn depressed color="primary" :disabled="!valid" type="submit">确认</v-btn>
      </template>
    </form>
  </set-property>
</template>
<script>
import SetProperty from '~/components/set-property'
export default {
  components: { SetProperty },
  data () {
    return { valid: false, csrf: '' }
  },
  methods: {
    previewFile () {
      const file = this.$refs.avatar.files[0]
      if (file) {
        this.valid = true
        const reader = new FileReader()
        reader.onloadend = () => this.$refs.preview.src = reader.result
        reader.readAsDataURL(file)
        this.csrf = Math.random().toString(36).substring(3)
        document.cookie = `_csrf=${this.csrf}`
      } else {
        this.$refs.preview.src = ''
        this.valid = false
      }
    },
  },
  head () { return { title: '设置头像' } },
}
</script>
<style>
.center { text-align: center; }
.input-file { display: none; }
.upload-button { margin-bottom: 16px; }
.preview-avatar {
  border-radius: 4px;
  width: 128px;
  height: 128px;
  margin: 16px;
}
</style>
