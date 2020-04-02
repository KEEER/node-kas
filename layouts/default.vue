<template>
  <v-app>
    <!-- <v-app-bar v-if="hasAppBar" fixed app>
      <v-toolbar-title v-text="title" />
    </v-app-bar> -->
    <v-content>
      <nuxt />
      <v-snackbar v-model="snackbarModel" :timeout="3200">
        {{ snackbarText }}
      </v-snackbar>
    </v-content>
  </v-app>
</template>

<script>
export default {
  data () {
    return {
      title: 'KEEER Account Service',
      // hasAppBar: false,
      snackbarModel: false,
      snackbarText: '',
      snackbarQueue: [],
    }
  },
  provide () {
    return {
      layout: this,
      snackbar: text => {
        if (this.snackbarModel) return this.snackbarQueue.push(text)
        this.snackbarText = text
        this.snackbarModel = true
      },
    }
  },
  watch: {
    snackbarModel (val) {
      if (!val && this.snackbarQueue.length > 0) {
        setTimeout(() => {
          this.snackbarText = this.snackbarQueue.shift()
          this.snackbarModel = true
        }, 300)
      }
    },
  },
  head () { return { title: 'KAS' } },
}
</script>
