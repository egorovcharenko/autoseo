<template lang="pug">
  div
    v-card.my-2(light v-if="selectedAreaId")
      v-card-title.py-0.light-green.lighten-3 Кластеры: {{selectedClusterId}}
        v-breadcrumbs(icons, divider='chevron_right')
          v-breadcrumbs-item(v-for='item in currentPath', :key='item.text', :disabled='false')
            v-btn(@click='drillUp()')
              | {{ item.text }}
        v-select.mx-1(v-bind:items="areas", item-text="name", v-model="selectAreaForClusters", label="Переместить в зону...", item-value="id", @input="moveClustersToNewArea")
        v-text-field.mx-1(append-icon='search', label='Искать', single-line, v-model='search')
        v-text-field.mx-1(label="Новый кластер",v-model="newClusterUrl", :rules="newClusterUrlRules", required)
        v-btn.mx-1(small, @click='addNewCluster') Добавить кластер
        v-btn.mx-1.red(small, @click='deleteCluster') Удалить кластер
      v-data-table(light, select-all, selected-key='id', v-bind:headers='headersClusters', v-bind:items='clusters', v-bind:search='search', v-model='selectedClusterIds', item-key='id', v-bind:pagination.sync='paginationClusters')
        template(slot='items', scope='props')
          tr(:active='selectedClusterId === props.item.id', @click='selectedClusterId = props.item.id')
            td
              v-checkbox(light, primary, v-model='props.selected') 
            td
              v-btn(light, @click.prevent='drilldownHandler(props.item)', small, text-color='black', icon, flat, color='black')
                v-icon(light, text-color='black') subdirectory_arrow_right
            td
              v-btn(light, @click.prevent='props.expanded = !props.expanded', small, text-color='black', icon, flat, color='black')
                v-icon(light, text-color='black') open_in_new
            td
              v-edit-dialog(@open='tmpClusterType = props.item.type', @save='updateClusterProperty(props.item, "type", tmpClusterType)', large)
                v-chip(small outline, color='green', text-color='black', v-if="props.item.type === 'filter'") Фильтр
                v-chip(small outline, color='green', text-color='black', v-if="props.item.type === 'category'") Категория
                v-chip(small outline, color='cyan', text-color='black', v-if="props.item.type === 'product'") Товар
                v-chip(small outline, color='cyan', text-color='black', v-if="props.item.type === 'article'") Статья
                v-chip(small outline, color='cyan', text-color='black', v-if="props.item.type === 'other'") Другое
                v-chip(small color='grey', text-color='white', v-if="props.item.type !== 'unassigned' && props.item.type !== 'filter' && props.item.type !== 'category' && props.item.type !== 'product' && props.item.type !== 'article' && props.item.type !== 'other'")  Не указан 
                .mt-3.title(slot='input')
                  | Обновить
                  v-radio-group(v-model='tmpClusterType', column)
                    v-radio(label='Фильтр', value='filter')
                    v-radio(label='Категория', value='category')
                    v-radio(label='Товар', value='product')
                    v-radio(label='Статья', value='article')
                    v-radio(label='Другое', value='other')
            td
              v-edit-dialog(@open='tmppriority = props.item.priority', @save='updateClusterProperty(props.item, "priority", tmppriority)', large)
                v-chip(small color='red', text-color='white', v-if="props.item.priority === '1high'") Высокий
                v-chip(small color='yellow', text-color='black', v-if="props.item.priority === '2medium'")  Средний 
                v-chip(small color='grey', text-color='white', v-if="props.item.priority === '3low'")  Низкий 
                v-chip(small color='grey', text-color='white', v-if="props.item.priority !== '3low' && props.item.priority !== '2medium' && props.item.priority !== '1high'")  Не указан 
                .mt-3.title(slot='input')
                  | Обновить
                  v-radio-group(v-model='tmppriority', column)
                    v-radio(label='Высокий', value='1high')
                    v-radio(label='Средний', value='2medium')
                    v-radio(label='Низкий', value='3low')
            td
              v-edit-dialog(@open='tmpClusterName = props.item.name', @save='updateClusterProperty(props.item, "name", tmpClusterName)', large, lazy)
                | {{ props.item.name }}
                v-text-field(label='Название', slot='input', v-model='tmpClusterName', single-line, counter)
            td
              span(v-for='hier in props.item.hierarchy', :key='hier')
                | {{ hier }}
                span.url-divider /
              v-edit-dialog(@open='tmpUrl = props.item.fullurl', @save='updateClusterProperty(props.item, "fullurl", tmpUrl)', large, lazy) 
                v-icon(color="grey") mode_edit
                v-text-field(label='Название', slot='input', v-model='tmpUrl', single-line)
            td.text-xs-center {{ props.item.freq }}
            td.text-xs-center {{ props.item.keywords }}
            td.text-xs-center 
            v-edit-dialog(@open='tmpChecks = props.item.checks', @save='updateClusterProperty(props.item, "checks", tmpChecks)', large)
              | {{ props.item.checks.length ? props.item.checks : 'пусто' }}
              .mt-3.title(slot='input')
                | Обновить
                v-checkbox(label='Страница', v-model='tmpChecks', value='Страница', light)
                v-checkbox(label='Метатеги', v-model='tmpChecks', value='Метатеги', light)
                v-checkbox(label='Краткий', v-model='tmpChecks', value='Краткий', light)
                v-checkbox(label='Полезное', v-model='tmpChecks', value='Полезное', light)
                v-checkbox(label='Фильтры', v-model='tmpChecks', value='Фильтры', light)
                v-checkbox(label='Меню', v-model='tmpChecks', value='Меню', light)
        template(slot='pageText', scope='{ pageStart, pageStop }')
          | From {{ pageStart }} to {{ pageStop }}
        template(slot='expand', scope='props')
          v-card(flat)
            v-card-text
              v-container(fluid)
                | {{props.item.highlights}}

    v-card(v-for="project in wordstatProjects", :key="project.id")
      v-card-title.light-green.lighten-3 Проект {{project.id}} - статус {{project.statusId}}
      v-card
        v-card-title
          v-btn(@click='moveAllWordstaToArea(project)') Перенести все запросы
          v-btn(@click='closeProject(project)') Закрыть проект
        v-data-table(v-bind:headers='headersWordstat', v-bind:items='project.slicedKeys')
          template(slot='items', scope='props')
            td 
              v-chip(small v-for='keyword in props.item.keys' :key='keyword.keyword' close @input="addToMinusWords(keyword)") {{ keyword }}
            td {{ props.item.freq }} 
            td
              v-btn(@click='addAsPartitialKeyword(props.item.keys)') Частичное
          template(slot='pageText', scope='{ pageStart, pageStop }')
            | С {{ pageStart }} по {{ pageStop }}

    v-card.my-2(v-if="selectedAreaId")
      v-card-title.py-0.light-green.lighten-3
        v-btn-toggle(v-model="keywordsShowType" mandatory )
          v-btn(flat value="allKeywords") Все запросы
          v-btn(flat value="onlyForCluster") Привязанные
          v-btn(flat value="onlyUnassigned") Непривязанные
        v-text-field.mx-1(append-icon='search', label='Искать', single-line, v-model='searchUnassigned')
        v-text-field.mx-1(label="Новый запрос",v-model="newUnassignedKeyword", :rules="newUnassignedKeywordRules", :counter="100", required)
        v-btn.mx-1(small, @click='addNewUnassignedKeyword') Добавить запрос
        v-btn(small @click='searchInWordstat()') Поискать по маркерам в вордстате
        v-btn(small @click='collectAllFreqRush()') Собрать частотность
        v-btn(small @click='collectAllIntentsPixel()') Собрать интенты
        v-btn.mx-1(small, @click='doClustering') Кластеризовать
      v-data-table(v-bind:headers='headersKeywords', v-bind:items='keywords', v-bind:search='searchUnassigned' v-bind:pagination.sync='paginationKeywords')
        template(slot='items', scope='props')
          td
            v-edit-dialog(@open='tmpKeywordType = props.item.type', @save='saveKeywordType(props.item, tmpKeywordType)', large)
              v-chip(small color='yellow', text-color='black', v-if='props.item.type === "marker"') Маркерный
              v-chip(small color='green', text-color='white', v-if='props.item.type === "rush"') Из Rush
              v-chip(small color='red', text-color='white', v-if='props.item.type === "minus"') Минус-запрос
              v-chip(small color='black', text-color='white', v-if='props.item.type === "partitial"') Частичный
              v-chip(small color='black', text-color='white', v-if='props.item.type === "wordstat"') Из Wordstat
              v-chip(small color='black', text-color='white', v-if='props.item.type === "normal"') Обычный
              v-chip(small color='grey', text-color='white', v-if='props.item.type !== "rush" && props.item.type !== "marker" && props.item.type !== "minus" && props.item.type !== "normal" && props.item.type !== "partitial" && props.item.type !== "wordstat"') Не указан
              .mt-3.title(slot='input')
                | Обновить
                v-radio-group(v-model='tmpKeywordType', column)
                  v-radio(label='Маркерный', value='marker')
                  v-radio(label='Минус-запрос', value='minus')
                  v-radio(label='Частичный', value='partitial')
                  v-radio(label='Из wordstat', value='wordstat')
                  v-radio(label='Из Rush', value='rush')
                  v-radio(label='Обычный', value='normal')
          td
            v-edit-dialog(lazy)
              | {{ props.item.keyword }}
              v-text-field(slot='input', label='Edit', v-model='props.item.keyword', single-line, counter, :rules='[max25chars]')
          td {{ props.item.freq }}
          td {{ props.item.freqBroad }}
          td {{ props.item.freqPartitial }}
          td {{ props.item.freqExact }}
          td {{ props.item.intent ? props.item.intent.com : '' }}
          td {{ props.item.assignedClusterName }}
          td
            v-btn(small, @click='assignKeyword(props.item)', v-if='selectedClusterId') Привязать
            v-btn(small, @click='unassignKeyword(props.item)') Отвязать
            v-btn.red(small, @click='removeKeyword(props.item)') Удалить
        template(slot='pageText', scope='{ pageStart, pageStop }')
          | From {{ pageStart }} to {{ pageStop }}

    v-card.my-2(v-if="selectedAreaId" v-for="clusterization in clusterizations" :key='clusterization.id')
      v-card-title.light-green.lighten-3 Результаты кластеризации {{clusterization.id}} 
        v-btn(small @click='addKeywordsToSelectedCluster' v-if='(clusteredKeywordsSelection.length > 0) && (selectedClusterId)') Добавить выбранные слова в выбранный кластер
        v-btn(@click='closeProject(clusterization)') Закрыть проект
      v-list(two-line subheader dense )
        div(v-for="cluster in clusterization.clusters" :value='true' :key="cluster.cluster")
          v-subheader {{cluster.cluster}}
            v-btn(icon ripple @click='addNewClusterFromClusterization(cluster)')
              v-icon(color="green lighten-1") add
          v-list-tile(v-for="key in cluster.keys" :key="key.keyword")
            v-list-tile-action
              v-checkbox(v-model="clusteredKeywordsSelection" :value='key.keyword')
            v-list-tile-content
              v-list-tile-title {{ key.keyword }}
              v-list-tile-sub-title {{ key.url }}


</template>

<script>
const regexpForUrl = /^(https?\:)\/\/(([^:\/?#]*)(?:\:([0-9]+))?)([\/]{0,1}[^?#]*)(\?[^#]*|)(#.*|)$/;

export default {
  data() {
    return {
      tmpUrl: undefined,
      tmpChecks: undefined,
      tmpClusterName: undefined,
      tmpClusterType: undefined,
      keywordsShowType: "allKeywords",
      clusteredKeywordsSelection: [],
      searchWordstat: "",
      wordstatActive: false,
      tmpKeywordType: "",
      newClusterUrl: "https://vselaki.ru/",
      newClusterUrlRules: [
        v => {
          if (v) {
            return regexpForUrl.test(v) || "Введите валидный URL";
          } else {
            return false;
          }
        }
      ],
      newUnassignedKeywordRules: [
        v => {
          if (v) {
            return v.length >= 2 || "Запрос должен быть больше 2х символов";
          } else {
            return true;
          }
        }
      ],
      newUnassignedKeyword: null,
      selectAreaForClusters: null,
      max25chars: v => v.length <= 25 || "Input too long!",
      tmp: "",
      tmp_name: "",
      currentPath: [
        {
          href: "",
          text: "Все кластеры",
          disabled: false
        }
      ],
      search: "",
      searchUnassigned: "",
      searchAssigned: "",
      headersClusters: [
        { text: "", value: "", align: "left" },
        { text: "", value: "", align: "left" },
        { text: "Тип", value: "type", align: "left" },
        { text: "Приоритет", value: "priority", align: "left" },
        { text: "Название", align: "left", value: "name" },
        { text: "Url", align: "left", value: "fullurl" },
        { text: "Частотность", value: "freq" },
        { text: "Запросы", value: "keywords" },
        { text: "Чеклист", value: "checks" }
      ],
      headersKeywords: [
        { text: "Тип", align: "left", value: "type" },
        { text: "Запрос", align: "left", value: "keyword" },
        { text: "Частота?", align: "left", value: "freq" },
        { text: "Част общая", align: "left", value: "freqBroad" },
        { text: "Част частичн", align: "left", value: "freqPartitial" },
        { text: "Част точная", align: "left", value: "freqExact" },
        { text: "Комм. интент", align: "left", value: "intent" },
        { text: "Кластер", align: "left", value: "assignedClusterName" }
      ],
      headersWordstat: [
        { text: "Запрос", align: "left", value: "keyword" },
        { text: "Частота", align: "left", value: "freq" }
      ],
      selectedClusterId: null,
      selectedClusterIds: [],
      paginationClusters: {
        sortBy: "name",
        rowsPerPage: 10
      },
      paginationKeywords: {
        sortBy: "name",
        rowsPerPage: 10
      },
      tmppriority: ""
    };
  },
  methods: {
    updateClusterProperty(cluster, propertyName, propertyValue) {
      this.$store.commit("updateCluster", {
        areaId: this.$store.getters.selectedAreaId,
        object: cluster,
        property: propertyName,
        newValue: propertyValue
      });
    },
    addKeywordsToSelectedCluster() {
      // и присваиваем их в кластер
      if (
        this.$data.selectedClusterId !== undefined &&
        this.$data.selectedClusterId !== null
      ) {
        // присваиваем
        this.$data.clusteredKeywordsSelection.forEach(keywordText => {
          this.$store.dispatch("assignKeywords", {
            areaId: this.$store.getters.selectedAreaId,
            keywords: [{ keyword: keywordText }],
            clusterId: this.$data.selectedClusterId
          });
        });
      } else {
        console.log("Кластер не выбран!");
      }
    },
    addNewClusterFromClusterization(cluster) {
      let newClusterObj = {
        fullurl: cluster.keys[0].url,
        name: cluster.cluster
      };
      this.$store.commit("createNewCluster", {
        areaId: this.$store.getters.selectedAreaId,
        newCluster: newClusterObj
      });
    },
    doClustering() {
      this.$store.dispatch("doClustering", {
        areaId: this.$store.getters.selectedAreaId
      });
    },
    moveAllWordstaToArea(project) {
      // добавляем с типом Частичное, удаляем из общего списка проекта
      console.log("project", project);
      project.slicedKeys.forEach(slicedKey => {
        let newKeyword = {
          keyword: slicedKey.keys.join(" "),
          freq: slicedKey.freq,
          type: "wordstat"
        };
        this.$store.dispatch("createKeyword", {
          areaId: this.$store.getters.selectedAreaId,
          keyword: newKeyword
        });
      });
    },
    addAsPartitialKeyword(keysArray) {
      // добавляем с типом Частичное, удаляем из общего списка проекта
      let newKeyword = {
        keyword: keysArray.join(" "),
        type: "partitial"
      };
      this.$store.dispatch("createKeyword", {
        areaId: this.$store.getters.selectedAreaId,
        keyword: newKeyword
      });
    },
    closeProject(project) {
      this.$store.commit("updateProject", {
        areaId: this.$store.getters.selectedAreaId,
        object: project,
        property: "closed",
        newValue: true
      });
    },
    addToMinusWords(keyword) {
      let newKeyword = {
        keyword: keyword,
        type: "minus"
      };
      this.$store.dispatch("createKeyword", {
        areaId: this.$store.getters.selectedAreaId,
        keyword: newKeyword
      });
    },
    collectAllIntentsPixel() {
      if (this.$store.getters.selectedAreaId) {
        this.$store.dispatch("collectAllIntentsPixel", {
          areaId: this.$store.getters.selectedAreaId,
          onlyWithoutIntent: true,
          keywords: this.keywords
        });
      }
    },
    collectAllFreqRush() {
      if (this.$store.getters.selectedAreaId) {
        this.$store.dispatch("parseWordstat", {
          areaId: this.$store.getters.selectedAreaId,
          includeKeysType: undefined,
          excludeKeysType: undefined,
          collectType: 0,
          projectType: "wordstatFreq",
          keywordsInitial: this.keywords
        });
      }
    },
    searchInWordstat() {
      if (this.$store.getters.selectedAreaId) {
        this.$store.dispatch("parseWordstat", {
          areaId: this.$store.getters.selectedAreaId,
          includeKeysType: "marker",
          excludeKeysType: "minus",
          collectType: 1,
          projectType: "wordstat",
          keywordsInitial: this.keywords
        });
      }
    },
    deleteCluster() {
      this.$store.commit("deleteCluster", {
        areaId: this.$store.getters.selectedAreaId,
        clusterId: this.$data.selectedClusterId
      });
    },
    addNewCluster() {
      let newClusterObj = {
        fullurl: this.$data.newClusterUrl,
        name: this.$data.newClusterUrl
      };
      this.$store.commit("createNewCluster", {
        areaId: this.$store.getters.selectedAreaId,
        newCluster: newClusterObj
      });
      this.$data.newClusterUrl = "https://vselaki.ru/";
    },
    addNewUnassignedKeyword() {
      let newKeyword = {
        areaId: this.$store.getters.selectedAreaId,
        newKeyword: this.$data.newUnassignedKeyword
      }
      if (this.$data.selectedClusterId) {
        newKeyword.assignedCluster = this.$data.selectedClusterId
      }
      console.log(newKeyword)
      this.$store.commit("addNewUnassignedKeyword", newKeyword);
      this.$data.newUnassignedKeyword = null;
    },
    moveClustersToNewArea(newAreaId) {
      console.log("newAreaId:", newAreaId);
      let oldAreaId = this.$store.getters.selectedAreaId;
      this.$store.commit("moveClustersToNewArea", {
        clustersToMoveIds: this.$data.selectedClusterIds,
        oldAreaId: oldAreaId,
        newAreaId: newAreaId
      });
      this.$data.selectAreaForClusters = null;
      this.$data.selectedClusterIds = [];
    },
    saveKeywordType(keyword, type) {
      this.$store.commit("updateKeyword", {
        areaId: this.$store.getters.selectedAreaId,
        object: keyword,
        property: "type",
        newValue: type
      });
    },
    drillUp() {
      this.$data.currentPath.pop();
      console.log(this.$data.currentPath);
    },
    drilldownHandler(cluster) {
      this.$data.currentPath.push({
        href: cluster.hierarchy[this.$data.currentPath.length],
        text: cluster.hierarchy[this.$data.currentPath.length],
        disabled: false
      });
      // console.log(cluster)
    },
    filterNode(value, data) {
      if (!value) return true;
      if (data.fullurl) {
        return data.fullurl.indexOf(value) !== -1;
      } else {
        return true;
      }
    },
    clusterClicked(event, array) {
      console.log("event", event);
      console.log("array", array);
      this.$data.selectedClusterId = event.srcElement.innerText;
    },
    unassignKeyword(keyword) {
      this.$store.dispatch("assignKeywords", {
        areaId: this.$store.getters.selectedAreaId,
        keywords: [keyword],
        clusterId: undefined
      });
    },
    assignKeyword(keyword) {
      if (
        this.$data.selectedClusterId !== undefined &&
        this.$data.selectedClusterId !== null
      ) {
        this.$store.dispatch("assignKeywords", {
          areaId: this.$store.getters.selectedAreaId,
          keywords: [keyword],
          clusterId: this.$data.selectedClusterId
        });
      } else {
        console.log("Кластер не выбран!");
      }
    },
    removeKeyword(keyword) {
      this.$store.dispatch("removeKeyword", {
        areaId: this.$store.getters.selectedAreaId,
        keyword: keyword
      });
    }
  },
  computed: {
    selectedAreaId() {
      return this.$store.state.selectedAreaId;
    },
    clusters() {
      // фильтруем по выбранной иерархии
      let tempClusters = this.$store.getters.allClustersForArea(
        this.$store.getters.selectedAreaId
      );

      let level = 0;
      if (tempClusters) {
        this.$data.currentPath.forEach(el => {
          tempClusters = tempClusters.filter(cluster => {
            if (cluster.hierarchy) {
              return cluster.hierarchy[level] === el.href;
            } else {
              return true;
            }
          });
          level++;
        });
      }

      // добавляем количество запросов и другое
      if (tempClusters) {
        let keywords = this.$store.getters.allKeywordsForArea(
          this.$store.getters.selectedAreaId
        );
        tempClusters.forEach(el => {
          let thisKeys = keywords.filter(key => {
            return key.assignedCluster === el.id;
          });
          el.keywords = thisKeys.length;
          let sum = 0;
          thisKeys.forEach(el => {
            sum += el.freqExact ? el.freqExact : 0;
          });
          el.freq = sum;
          // добавляем массив чекбоксов, если нужно
          if (el.checks === undefined) {
            el.checks = [];
          }
        });
      }
      return tempClusters;
    },
    areas() {
      let areas = this.$store.getters.allAreas;
      return areas;
    },
    keywords() {
      let allKeywords = this.$store.getters.allKeywordsForArea(
        this.$store.getters.selectedAreaId
      );
      let resultingKeywords;
      if (this.$data.keywordsShowType === "onlyForCluster") {
        resultingKeywords = allKeywords.filter(el => {
          return el.assignedCluster === this.$data.selectedClusterId;
        });
      } else if (this.$data.keywordsShowType === "allKeywords") {
        resultingKeywords = allKeywords;
      } else if (this.$data.keywordsShowType === "onlyUnassigned") {
        resultingKeywords = allKeywords.filter(el => {
          return (
            el.assignedCluster === undefined ||
            el.assignedCluster === null ||
            el.assignedCluster === ""
          );
        });
      }
      // добавляем нормально кластер
      let clusters = this.$store.getters.allClustersForArea(
        this.$store.getters.selectedAreaId
      );
      if (clusters) {
        resultingKeywords.forEach(el => {
          if (el.assignedCluster) {
            let foundCluster = clusters.find(elClust => {
              return elClust.id === el.assignedCluster;
            });
            if (foundCluster) {
              el.assignedClusterName = foundCluster.name;
            }
          }
        });
      }
      return resultingKeywords;
    },
    wordstatProjects() {
      if (this.$store.getters.selectedAreaId) {
        let allKeywords = this.$store.getters.allKeywordsForArea(
          this.$store.getters.selectedAreaId
        );
        let allProjects = this.$store.getters.allProjects(
          this.$store.getters.selectedAreaId
        );

        if (allProjects) {
          allProjects = allProjects.filter(project => {
            return project.type === "wordstat";
          });

          allProjects.forEach(project => {
            project.slicedKeys = [];
            if (project.data) {
              project.data.forEach(keyword => {
                // если этот ключ уже есть в зоне и он частичный - пропускаем его
                if (
                  !allKeywords.some(el => {
                    return (
                      el.keyword.trim() === keyword.keyword.trim()
                    ); /*&& (el.type === 'partitial')*/
                  })
                ) {
                  // заносим дополнительно разбитые ключи
                  project.slicedKeys.push({
                    keys: keyword.keyword.trim().split(" "),
                    freq: keyword.freq
                  });
                }
              });
            }
          });
        }
        return allProjects;
      }
    },
    clusterizations() {
      if (this.$store.getters.selectedAreaId) {
        let allKeywords = this.$store.getters.allKeywordsForArea(
          this.$store.getters.selectedAreaId
        );
        let allProjects = this.$store.getters.allProjects(
          this.$store.getters.selectedAreaId
        );
        if (allProjects) {
          allProjects = allProjects.filter(project => {
            return project.type === "clusterization";
          });
          allProjects.forEach(project => {
            console.log("project.data", project.data);
            var newArr = [];
            let groups = {};
            project.data.forEach(cur => {
              if (!(cur.group in groups)) {
                groups[cur.group] = {
                  cluster: cur.group,
                  keys: [],
                  url: cur.url
                };
                newArr.push(groups[cur.group]);
              }
              groups[cur.group].keys.push({ keyword: cur.request });
            });
            console.log(newArr);

            project.clusters = newArr;
          });
        }
        return allProjects;
      }
    }
  }
};
</script>

<style>
table.table tbody td,
table.table tbody th {
  height: 30px;
}

table.table thead td:not(:nth-child(1)),
table.table tbody td:not(:nth-child(1)),
table.table thead th:not(:nth-child(1)),
table.table tbody th:not(:nth-child(1)),
table.table thead td:first-child,
table.table tbody td:first-child,
table.table thead th:first-child,
table.table tbody th:first-child {
  padding: 0 5px;
}

.zk-table__cell-inner {
  white-space: nowrap;
  overflow: hidden;
  padding: 1px 5px !important;
}

.zk-table__body-row {
  height: 10px !important;
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
.list--two-line.list--dense .list__tile {
  height: auto;
}
.btn--small {
  font-size: 13px;
  height: 20px;
}
</style>
