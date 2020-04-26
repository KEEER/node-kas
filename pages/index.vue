<template>
  <div>
    <headline :title="`欢迎 ${nickname || '新用户'}`" subtitle="您在 KEEER 服务中使用的基本信息，点击以编辑它们" />
    <container>
      <settings-group title="个人资料">
        <settings-item :title="`昵称：${nickname || '未设置'}`" to="/set-nickname" />
        <v-list-item to="/set-avatar" nuxt>
          <v-list-item-title>头像</v-list-item-title>
          <v-list-item-action>
            <div class="avatar-editable">
              <div class="avatar-wrapper">
                <img class="avatar-img" :src="avatar" aria-hidden="true" onerror="this.src='data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPjwvc3ZnPg=='">
              </div>
              <div class="avatar-mask">
                <v-icon color="#f5fafd" class="avatar-mask-icon">mdi-pencil</v-icon>
              </div>
            </div>
          </v-list-item-action>
        </v-list-item>
      </settings-group>
      <settings-group title="账户设置">
        <settings-item title="更改密码" to="/set-password" />
        <settings-item title="设置电子邮箱" to="/set-email" />
        <settings-item title="变更手机号" to="/set-phone-number" />
        <settings-item v-if="!keeerId" title="设置 KEEER ID" to="/set-keeer-id" />
        <v-list-item v-else>您的 KEEER ID: {{ keeerId }}</v-list-item>
      </settings-group>
      <settings-group title="信用点">
        <v-list-item>您的信用点余额：{{ kredit / 100 }}</v-list-item>
        <settings-item title="充值" to="/recharge" />
      </settings-group>
      <center><v-btn outlined color="error" @click="logout">退出登录</v-btn></center>
    </container>
    <container dark>
      Copyright &copy; 2015-present KEEER. All rights reserved.
    </container>
  </div>
</template>

<script>
import Container from '~/components/container'
import Headline from '~/components/headline'
import SettingsItem from '~/components/settings-item'
import SettingsGroup from '~/components/settings-group'
export default {
  components: { Container, SettingsItem, SettingsGroup, Headline },
  inject: [ 'snackbar' ],
  async asyncData ({ req, res }) {
    const notLoggedIn = {
      notLoggedIn: true,
      nickname: '未登录用户',
      avatar: '',
      kredit: 0,
      keeerId: null,
    }
    if (process.server) {
      const { ctx } = req
      if (!ctx.state.user) {
        ctx.redirect('/login')
        return notLoggedIn
      }
      const { nickname, kredit, avatarName, keeerId } = ctx.state.user.options
      const avatar = ctx.avatarFromName(avatarName)
      return { notLoggedIn: false, nickname, kredit, avatar, keeerId }
    } else {
      const res = await fetch('/api/user-information', { credentials: 'same-origin' }).then(res => res.json())
      if (res.status !== 0) return notLoggedIn
      else {
        const { nickname, kredit, avatar, keeerId } = res.result
        return { notLoggedIn: false, nickname, kredit, avatar, keeerId }
      }
    }
  },
  created () {
    if (this.notLoggedIn) this.$router.push('/login')
  },
  methods: {
    async logout () {
      try {
        const res = await fetch('/api/token?set-cookie=true', { method: 'delete', credentials: 'same-origin' }).then(res => res.json())
        if (res.status !== 0) this.snackbar(res.message || '未知错误')
        else {
          this.snackbar(res.message || '您已经成功退出登录')
          this.$router.push('/login')
        }
      } catch (e) {
        console.error(e)
        this.snackbar('网络错误')
      }
    },
  },
  head () { return { title: '我的账号' } },
}
</script>

<style scoped>
.avatar-editable {
  -webkit-box-flex: 0;
  box-flex: 0;
  -webkit-flex-grow: 0;
  flex-grow: 0;
  -webkit-flex-shrink: 0;
  flex-shrink: 0;
  -webkit-border-radius: 4px;
  border-radius: 4px;
  margin-left: 16px;
  overflow: hidden;
  position: relative;
  width: 60px;
  height: 60px;
}
.avatar-wrapper {
  -webkit-border-radius: 4px;
  border-radius: 4px;
  height: 100%;
  width: auto;
}
.avatar-img {
  border-radius: 4px;
  width: 60px;
  height: 60px;
}
.avatar-mask {
  background-color: rgba(14, 26, 63, 0.4);
  bottom: 0;
  height: 33%;
  left: 0;
  position: absolute;
  right: 0;
  text-align: center;
}
.avatar-mask .avatar-mask-icon.v-icon {
  font-size: 16px;
  top: -4px;
}
</style>
