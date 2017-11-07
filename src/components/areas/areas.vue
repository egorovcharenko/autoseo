<template lang="pug">
  div
    v-card.my-2
      v-card-title.light-green.lighten-3 Зоны
      v-card
        v-card-title
          v-text-field(append-icon='search', label='Искать', single-line, hide-details, v-model='search')
          v-btn(@click='addArea()') Добавить зону
        v-data-table(selected-key='name', v-bind:headers='headersAreas', v-bind:items='areas', v-bind:search='search', item-key='id', v-bind:pagination.sync='paginationAreas')
          template(slot='items', scope='props')
            tr 
              td 
                v-edit-dialog(@open='tmppriority = props.item.priority', @save='saveAreaPriority(props.item, tmppriority)', large)
                  v-chip(color='red', text-color='white', v-if="props.item.priority === '1high'") Высокий 
                  v-chip(color='yellow', text-color='black', v-if="props.item.priority === '2medium'")  Средний 
                  v-chip(color='grey', text-color='white', v-if="props.item.priority === '3low'")  Низкий 
                  v-chip(color='grey', text-color='white', v-if="props.item.priority !== '3low' && props.item.priority !== '2medium' && props.item.priority !== '1high'")  Не указан 
                  .mt-3.title(slot='input')
                    | Обновить
                    v-radio-group(v-model='tmppriority', column)
                      v-radio(label='Высокий', value='1high')
                      v-radio(label='Средний', value='2medium')
                      v-radio(label='Низкий', value='3low')
              td
                div(style='min-height: 30px; min-width: 100px;')
                  v-edit-dialog(@open='tmp_name = props.item.name', @save='saveAreaName(props.item, tmp_name)', large, lazy)
                    | {{ props.item.name }}
                    v-btn(@click='selectArea(props.item.id)') К кластерам
                    v-text-field(label='Название', slot='input', v-model='tmp_name', single-line, counter)
          template(slot='pageText', scope='{ pageStart, pageStop }')
            | From {{ pageStart }} to {{ pageStop }}
          template(slot='expand', scope='props')

</template>

<script>

export default {
  data () {
    return {
      tmp_name: '',
      tmppriority: '',
      search: '',
      headersAreas: [
        { text: 'Приоритет', value: 'priority', align: 'left' },
        { text: 'Название', value: 'name', align: 'left' }
      ],
      paginationAreas: {
        sortBy: 'name',
        rowsPerPage: 10
      }
    }
  },
  methods: {
    selectArea (areaId) {
      this.$store.commit('selectArea', {selectedAreaId: areaId})
    },
    saveAreaPriority (area, priority) {
      this.$store.commit('updateArea', { object: area, property: 'priority', newValue: priority })
    },
    saveAreaName (area, newName) {
      this.$store.commit('updateArea', { object: area, property: 'name', newValue: newName })
    },
    addArea () {
      let newArea = { name: 'Новая зона' }
      this.$store.commit('createNewArea', { area: newArea })
    }
  },
  computed: {
    areas () {
      let areas = this.$store.getters.allAreas
      return areas
    }
  }
}
</script>

<style>
table.table tbody td,
table.table tbody th {
  height: 30px;
}

.transition-clusters {
  display: block;
  min-height: 50px;
  background: lightgray;
}

.url-divider {
  font-size: 0.8rem;
  color: grey;
}
</style>
