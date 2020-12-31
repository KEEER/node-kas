<template>
  <div>
    <v-btn icon color="#f5fafd" class="back" @click="$router.back()"><v-icon>mdi-arrow-left</v-icon></v-btn>
    <headline title="登录设备管理" subtitle="查看您目前登录的设备" class="sessions-header" />
    <container>
      <v-expansion-panels accordion flat class="sessions-panels">
        <v-expansion-panel v-for="session in sessions" :key="session.id">
          <v-expansion-panel-header>
            <div>
              <v-icon v-for="(icon, i) in session.icons" :key="i">mdi-{{ icon }}</v-icon>
              <span class="session-abstract">{{ session.uaString }}，{{ session.lastSeenLocation }}{{ session.current ? '（当前设备）' : '' }}</span>
            </div>
          </v-expansion-panel-header>
          <v-expansion-panel-content>
            <p>于 {{ timeString(session.loginTime) }} 在{{ session.loginLocation }}登录</p>
            <p>于 {{ timeString(session.lastSeenTime) }} 在{{ session.lastSeenLocation }}上一次访问</p>
            <p><v-btn v-if="!session.current" outlined color="error" :disabled="session.removing" @click="logout(session)">移除这个设备</v-btn></p>
          </v-expansion-panel-content>
        </v-expansion-panel>
      </v-expansion-panels>
    </container>
  </div>
</template>

<script>
import Headline from '~/components/headline'
import Container from '~/components/container'
const getSessions = () => fetch('/api/sessions', { credentials: 'same-origin' }).then(res => res.json())
export default {
  components: { Headline, Container },
  async asyncData ({ req }) {
    if (process.server) {
      const { ctx } = req
      if (!ctx.state.user) {
        ctx.redirect('/login')
        return {}
      }
      return { notLoggedIn: false, sessions: await ctx.getSessions() || [] }
    } else {
      const res = await getSessions()
      return { notLoggedIn: res.code === 'EUNAUTHORIZED', sessions: res.result || [] }
    }
  },
  inject: [ 'snackbar', 'setIdframe' ],
  created () {
    if (this.notLoggedIn) this.$router.push('/login')
  },
  mounted () { this.setIdframe(true) },
  beforeDestroy () { this.setIdframe(false) },
  methods: {
    timeString: time => new Date(time).toLocaleString(),
    async logout (session) {
      this.$set(session, 'removing', true)
      try {
        const res = await fetch(`/api/token/${session.id}`, { method: 'delete', credentials: 'same-origin' }).then(res => res.json())
        if (res.status !== 0) {
          this.snackbar(res.message || '未知错误')
        } else {
          this.snackbar(res.message || '成功')
          this.sessions = (await getSessions()).result
        }
      } catch (e) {
        this.snackbar('网络错误')
        console.error('delete session', e)
      } finally {
        session.removing = false
      }
    },
  },
  head () { return { title: '登录设备管理 ' } },
}
</script>
<style scoped>
.back {
  position: absolute;
  top: 12px;
  left: 12px;
}
.session-abstract {
  padding-left: 8px;
  line-height: 1.5em;
}
</style>
<style>
.sessions-header h1, .sessions-header h2 { padding: 0 26px !important; }
.sessions-panels { border: 1px solid rgba(0, 0, 0, .12); }
.sessions-panels .v-expansion-panel:not(:last-child) { border-bottom: 1px solid rgba(0, 0, 0, .12); }
</style>
