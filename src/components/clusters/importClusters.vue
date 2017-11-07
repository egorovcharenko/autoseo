<template lang="pug">
  div
    h4 Импортировать структуру сайта
    v-select(v-bind:items="areas", item-text="name", v-model="selectedAreaId", label="Зона, в которую импортировать", item-value="id")
    // -
      el-upload.upload-demo(drag, action='/clusters/import/handle', :on-preview='handlePreview', :on-remove='handleRemove', :on-change='handleChange', :auto-upload='false', v-if='selectedAreaId')
        i.el-icon-upload
        .el-upload__text
          | Перетащите сюда CSV из Screaming Seo Spider
        .el-upload__tip(slot='tip') CSV из Screaming Seo Spider
    div(v-if='selectedAreaId')
      h5 Импортировать кластеризацию из Раша
      el-upload.upload-demo(drag, action='/clusters/import/handle2', :on-change='handleChangeRush', :auto-upload='false' )
        i.el-icon-upload
        .el-upload__text
          | Перетащите сюда XSLX из Rush Analytics
</template>

<script>
var Papa = require("papaparse");
import XLSX from "xlsx";
const X = typeof XLSX !== "undefined" ? XLSX : _XLSX;
const make_cols = refstr =>
  Array(X.utils.decode_range(refstr).e.c + 1)
    .fill(0)
    .map((x, i) => ({ name: X.utils.encode_col(i), key: i }));

export default {
  data() {
    return {
      csvFile: "",
      csvFileContent: "",
      selectedAreaId: null
    };
  },
  methods: {
    handleRemove(file, fileList) {
      console.log(file, fileList);
    },
    handlePreview(file) {
      console.log(file);
    },
    handleChange(file, fileList) {
      const fileReader = new FileReader();
      // console.log(file, fileList)
      fileReader.addEventListener("load", () => {
        this.csvFile = fileReader.result;
      });
      fileReader.readAsDataURL(file.raw);
      this.csvFileContent = file.raw;
      Papa.parse(this.csvFileContent, {
        header: true,
        preview: 20,
        dynamicTyping: true,
        complete: results => {
          for (let element of results.data) {
            console.log(element);
            element.fullurl = element.Address;
            element.name = element.Address;
            this.$store.commit("addCluster", {
              newCluster: element,
              areaId: this.$data.selectedAreaId
            });
          }
          // this.$store.commit('reassignChildren')
        }
      });
    },
    handleChangeRush(file, fileList) {
      const fileReader = new FileReader();
      fileReader.addEventListener("load", () => {
        this.csvFile = fileReader.result;
      });
      fileReader.readAsDataURL(file.raw);
      this.csvFileContent = file.raw;

      const reader = new FileReader();
      reader.onload = e => {
        const bstr = e.target.result;
        const wb = X.read(bstr, { type: "binary" });

        // загружаем первые два листа в выбранную зону
        for (let sheetIndex = 0; sheetIndex <= 1; sheetIndex++) {
          const wsname = wb.SheetNames[sheetIndex];
          const ws = wb.Sheets[wsname];
          const data = X.utils.sheet_to_json(ws);

          const store = this.$store;
          const areaId = this.$data.selectedAreaId;
          console.log("store", store);
          data
            .reduce(function(p, row) {
              return p.then(function() {
                console.log(row["Ключевое слово"]);
                let newCluster = {
                  name: row["Название кластера"],
                  fullurl: row["Релевантный URL"]
                };
                let highlights = row["Подсветки для кластерa"]
                if(highlights){
                  newCluster.highlights = highlights 
                }
                
                let newKeyword = {
                  keyword: row["Ключевое слово"],
                  type: "rush"
                };
                let freq = row["Частотность ключевых слов"];
                if (freq) {
                  newKeyword.freq = freq;
                }
                return store.dispatch("createNewClusterWithKeyword", {
                  cluster: newCluster,
                  areaId: areaId,
                  keyword: newKeyword
                });
              });
            }, Promise.resolve())
            .then(
              function(finalResult) {
                // done here
                console.log(1);
              },
              function(err) {
                // error here
                console.log("error", err);
              }
            );
        }
      };
      reader.readAsBinaryString(file.raw);

      //var first_worksheet = workbook.Sheets[workbook.SheetNames[0]];
      //var data = XLSX.utils.sheet_to_json(first_worksheet, { header: 1 });
    }
  },
  computed: {
    areas() {
      let areas = this.$store.getters.allAreas;
      return areas;
    }
  }
};
</script>

<style>

</style>
