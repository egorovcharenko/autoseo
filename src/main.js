import Vue from 'vue'
import App from './App.vue'
import Vuetify from 'vuetify'
import './stylus/main.styl'
import router from './router'
import { store } from './store' 

import * as firebase from 'firebase'
import Element1 from 'element-ui'

Vue.use(Element1)
Vue.use(Vuetify)

new Vue({
  el: '#app',
  router,
  store,
  render: h => h(App),
  created () {
    firebase.initializeApp({
      apiKey: 'AIzaSyCpnmPm5UzPi_DGifzXrUHAJiiBPpbT4hc',
      authDomain: 'autoseo-5d74f.firebaseapp.com',
      databaseURL: 'https://autoseo-5d74f.firebaseio.com',
      projectId: 'autoseo-5d74f',
      storageBucket: ''
    })
    firebase.auth().onAuthStateChanged((user) => {
      if (user) {
        this.$store.dispatch('autoSignin', user)
      }
    })
    this.$store.dispatch('populateDatabaseAndStartListening')
  }
})
