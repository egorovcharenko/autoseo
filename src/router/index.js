import Vue from 'vue'
import Router from 'vue-router'
import Clusters from '../components/clusters/clusters'
import Keywords from '../components/keywords/keywords'
import importClusters from '../components/clusters/importClusters'
import SignUp from '../components/users/signup'
import SignIn from '../components/users/signin'
import AuthGuard from './auth-guard'
import ImportKeywords from '../components/keywords/importKeywords'
import Areas from '../components/areas/areas'
 
Vue.use(Router)

export default new Router({
  routes: [
    {
      path: '/clusters',
      name: 'Clusters',
      component: Clusters,
      beforeEnter: AuthGuard
    }, {
      path: '/keywords',
      name: 'Keywords',
      component: Keywords,
      beforeEnter: AuthGuard
    }, {
      path: '/clusters/import',
      name: 'importClusters',
      component: importClusters,
      beforeEnter: AuthGuard
    }, {
      path: '/signup',
      name: 'SignUp',
      component: SignUp
    }, {
      path: '/signin',
      name: 'SignIn',
      component: SignIn
    }, {
      path: '/keywords/import',
      name: 'ImportKeywords',
      component: ImportKeywords,
      beforeEnter: AuthGuard
    }, {
      path: '/areas',
      name: 'Areas',
      component: Areas,
      beforeEnter: AuthGuard
    }
  ],
  mode: 'history'
})
