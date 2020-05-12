<template>
  <div id="wrapper">
    <v-btn icon class="back" @click="back"><v-icon>mdi-arrow-left</v-icon></v-btn>
    <main>
      <h1>Kredit 条款</h1>
      <content>
        <ol>
          <li>
            <h2><span class="item">1.</span>性质说明</h2>
            <p>Kredit 是 KEEER 团队推出的用于使用 KEEER 所提供增值服务（包括但不限于万圣节门票平台、Cloud Print 打印服务，Vote 服务）的积分系统，与 KEEER 团队以外的任何学校、组织或团体无关。</p>
          </li>
          <li><h2><span class="item">2.</span>服务条款</h2></li>
          <ol>
            <li><span class="item">a）</span>用户可以通过充值获得 Kredit。</li>
            <li>
              <span class="item">b）</span>
              <p>若无特殊说明，用户通过使用 Kredit 服务获得的 Kredit、兑换物品等虚拟产品，具体使用方法、期限等以相关服务页面中附带的说明及用户指南或具备以上解说性质的类似官方文档为准。</p>
              <p>Kredit 系统会因用户需求、网站策略调整、用户接受程度等因素随时进行调整，具体信息请以当时的页面说明为准。</p>
              <p>如无特殊约定，用户通过正规渠道获得的 Kredit 及其衍生物品均不以任何现金方式退还，仅能通过享用 Kredit 服务进行等值消耗。用户消耗其所获得全部 Kredit，且不将继续使用 Kredit 服务的，服务终止。</p>
              <p>Kredit 系统将会记录每一笔 Kredit 的交易，但是处于用户隐私保护的原则，除必要的审核要求外，KEEER 团队将不会公开这些信息。</p>
            </li>
          </ol>
          <li>
            <h2><span class="item">3.</span>退款</h2>
            <p>除以下情况外，用户理解所充值的 Kredit 不可以任何理由进行返现（退款）。­</p>
            <ul>
              <li><span class="item">-</span>由于 KEEER 的服务器故障导致使用 Kredit 支付失败的</li>
              <li><span class="item">-</span>由于 KEEER 服务器故障导致充值时 Kredit 未到帐的部分</li>
              <li><span class="item">-</span>在本条款更新时选择拒绝接受本条款的</li>
            </ul>
            <p>在上述情况下，用户可以选择向 <a href="mailto:refund@keeer.net">refund@keeer.net</a> 发送返现请求，并提供以下材料以申请返现：</p>
            <ul>
              <li><span class="item">-</span>您注册 KEEER 账户的手机号</li>
              <li><span class="item">-</span>一个可以用于联系的手机号（最好也是注册 KEEER 账户的手机号）</li>
              <li><span class="item">-</span>您接收返现的银行卡号或微信号（请注意，暂不支持移动支付转账）</li>
              <li><span class="item">-</span>您支付的有关证据（包含相关交易记录信息的微信截屏）</li>
            </ul>
            <p>我们将于收到邮件的 20 天内核查处理并给予您电话或短信答复，请确认您的邮件是否送达（收到自动回复说明已经送达，但不代表我们已经阅读）。</p>
            <p>用户理解在返现过程中，由于支付平台对 KEEER 团队收取 2.38% 的手续费，该部分金额将被从返现金额中扣去。</p>
          </li>
          <li>
            <h2><span class="item">4.</span>条款更新与变更</h2>
            <p>用户理解 KEEER 团队有权变更 Kredit 条款的权利。当本条款（Kredit 条款）发生变更时，KEEER 团队将提前 30 天在充值页面进行公示。公示期间用户享有拒绝更新条款的权利。当用户拒绝接受更新的条款时，用户可选择依照上述条款内容依照变更前的 Kredit 条款进行返现申请。</p>
          </li>
        </ol>
        <p class="noindent">（全文完）</p>
      </content>
    </main>
  </div>
</template>

<script>
export default {
  methods: { back () { this.$router.back() } },
  head () { return { title: 'Kredit 条款' } },
}
</script>

<style scoped>
#wrapper {
  background-color: #f5fafd;
  color: #222;
  font-family: Roboto, sans-serif;
  padding: 16px;
  text-align: center;
  width: 100%;
}
@media (prefers-color-scheme: dark) {
  #wrapper {
    background-color: #222;
    color: rgba(255, 255, 255, .8);
  }
}
h1 {
  font-size: 3rem;
  font-weight: 200;
  line-height: 3.125rem;
  margin: 32px 0;
}
h2 {
  font-size: 1.5rem;
  font-weight: 400;
  line-height: 2rem;
  margin: 16px 0;
}
p, li {
  font-size: 1rem;
  font-weight: 400;
  line-height: 1.5rem;
  margin: 8px 0;
}
ol, ul {
  list-style: none;
  padding-left: 40px;
  margin-bottom: 16px;
}
ol, ul ol, ul { padding-left: 32px; }
.item {
  position: absolute;
  right: calc(100% + 8px);
  user-select: none;
}
li { position: relative; }
main {
  margin-top: 64px;
  max-width: 720px;
  display: inline-block;
  text-align: left;
}
a:link, a:visited { text-decoration: none; }
a:link:hover, a:link:focus, a:link:active, a:visited:hover, a:link:focus, a:link:active { text-decoration: underline; }
.back {
  position: absolute;
  top: 12px;
  left: 12px;
  color: inherit !important;
}
</style>
