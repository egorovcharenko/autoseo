<template lang="pug">
  v-app(light)
    v-toolbar(fixed, app)
      v-toolbar-title.mr-5(v-text="'АвтоСео'")
      v-btn(light, flat, to='/areas') Зоны
      v-btn(light, flat, to='/clusters' v-if='this.$store.state.selectedAreaId') Кластеры
      v-btn(light, flat, to='/clusters/import') Загрузить кластеры
      v-btn(light, flat, to='/keywords/import') Загрузить запросы
      v-spacer
    main
      v-content
        v-container(fluid)
          v-slide-y-transition(mode='out-in')
            v-layout(column)
              router-view
    v-footer(app)
      span © 2017
</template>

<script>
export default {
  data () {
    return {
    }
  }
}
</script>
