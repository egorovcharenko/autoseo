<template lang="pug">
  div
    h4 Импортировать запросы
    v-select(v-bind:items="areas", item-text="name", v-model="selectedAreaId", label="Зона, в которую импортировать", item-value="id")
    el-upload(drag, action='/keywords/import/handle', :on-change='handleChange', :auto-upload='false')
      i.el-icon-upload
      .el-upload__text
        | Перетащите сюда CSV в нужном формате
        em выберите файл
      .el-upload__tip(slot='tip') CSV в нужном формате
</template>

<script>
var Papa = require('papaparse')
export default {
  data () {
    return {
      csvFile: '',
      csvFileContent: '',
      selectedAreaId: null
    }
  },
  methods: {
    handleChange (file, fileList) {
      const fileReader = new FileReader()
      fileReader.addEventListener('load', () => {
        this.csvFile = fileReader.result
      })
      fileReader.readAsDataURL(file.raw)
      this.csvFileContent = file.raw
      Papa.parse(
        this.csvFileContent, {
          header: true,
          preview: 5,
          dynamicTyping: true,
          complete: (results) => {
            for (let keyword of results.data) {
              // console.log(element)
              this.$store.dispatch('addKeyword', {keyword: keyword, areaId: this.$data.selectedAreaId})
            }
          }
        })
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

</style>
