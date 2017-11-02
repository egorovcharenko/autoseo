import Vue from 'vue'
import Vuex from 'vuex'
import * as firebase from 'firebase'
import * as firestore from 'firebase/firestore'
import axios from 'axios'
import router from '../router'

Vue.use(Vuex)
firestore // hack

const regexpForUrl = /^(https?\:)\/\/(([^:\/?#]*)(?:\:([0-9]+))?)([\/]{0,1}[^?#]*)(\?[^#]*|)(#.*|)$/

export { regexpForUrl }

function getLocation (href) {
  var match = href.match(regexpForUrl)
  let intemidiate = match && {
    href: href,
    protocol: match[1],
    host: match[2],
    hostname: match[3],
    port: match[4],
    pathname: match[5],
    search: match[6],
    hash: match[7]
  }
  return JSON.parse(JSON.stringify(intemidiate))
}

function keysToLower (obj) {
  var key
  var keys = Object.keys(obj)
  var n = keys.length
  var newobj = {}
  while (n--) {
    key = keys[n]
    newobj[key.toLowerCase()] = obj[key]
  }
  return newobj
}

const collectionsMeta = {
  Area: {
    idField: 'id',
    collectionName: 'areas',
    defaultId: 'unassigned'
  },
  Cluster: {
    idField: 'id',
    collectionName: 'clusters'
  },
  Keyword: {
    idField: 'keyword',
    collectionName: 'keywords'
  },
  Project: {
    idField: 'id',
    collectionName: 'projects'
  }
}

function updateProperyInternal (state, object, objectType, property, newValue, areaId) {
  if (!areaId) {
    object[property] = newValue
    let objectIdField = objectType.idField
    userProjectRef(state).collection(objectType.collectionName).doc(object[objectIdField]).set(object, { merge: true })
  } else {
    let dumbObject = {}
    dumbObject[property] = newValue
    let objectIdField = objectType.idField
    userProjectRef(state).collection('areas').doc(areaId).collection(objectType.collectionName).doc(object[objectIdField]).set(dumbObject, { merge: true })
  }
}

function userProjectRef (state) {
  return state.db.collection('projects').doc(state.user.projectId)
}

export const store = new Vuex.Store({
  state: {
    // структура кластеров (звездочки - обязательные при создании):
    // {
    //   id: '$asdfasdfasdf',
    //   *fullurl: 'https://vselaki.ru/123',
    //   *name: 'Кластер',
    //   priority: '1high',
    //   hierarchy: ['', 'geli-laki', 'bluesky'],
    //   parent: '',
    //   url: {
    //     hash:"",
    //     host:"vselaki.ru",
    //     hostname:"vselaki.ru",
    //     href:"https://vselaki.ru/123",
    //     pathname:"/123",
    //     protocol:"https:",
    //     search:""
    //   }
    // }

    // структура keyword:
    // {
    //   id: '3434523452345',
    //   keyword: 'запрос',
    //   type: 'wordstat'
    // }
    areas: [],
    selectedAreaId: undefined,
    user: null,
    error: null,
    db: null
  },
  mutations: {
    // areas
    updateArea (state, { object, property, newValue }) {
      updateProperyInternal(state, object, collectionsMeta.Area, property, newValue)
    },
    createNewArea (state, { area }) {
      let areaRef = userProjectRef(state).collection('areas').doc()
      area.id = areaRef.id
      areaRef.set(area)
    },
    addArea (state, { area }) {
      state.areas.push(area)
    },
    selectArea (state, { selectedAreaId }) {
      state.selectedAreaId = selectedAreaId
      router.push('/clusters')
    },

    // clusters
    moveClustersToNewArea (state, { clustersToMove, oldAreaId, newAreaId }) {
      clustersToMove.forEach(cluster => {
        let oldAreaRef = userProjectRef(state).collection('areas').doc(oldAreaId)
        let newAreaRef = userProjectRef(state).collection('areas').doc(newAreaId)
        let clusterToMoveRef = oldAreaRef.collection('clusters').doc(cluster.id)
        let newClusterRef = newAreaRef.collection('clusters').doc(cluster.id)

        clusterToMoveRef.get().then(function (doc) {
          if (doc.exists) {
            let clusterData = doc.data()
            newClusterRef.set(clusterData, { merge: true })
            clusterToMoveRef.delete()
          }
        })
      })
    },
    deleteCluster (state, { areaId, clusterId }) {
      userProjectRef(state).collection('areas').doc(areaId).collection('clusters').doc(clusterId).delete()
    },
    createNewCluster (state, { newCluster, areaId }) {
      if (state.user.projectId !== undefined && state.user.projectId !== null) {
        // находим область
        if (areaId !== undefined && areaId !== null && areaId !== '') {
          var areaRef = userProjectRef(state).collection(collectionsMeta.Area.collectionName).doc(areaId)
        } else {
          var areaRef = userProjectRef(state).collection(collectionsMeta.Area.collectionName).doc(collectionsMeta.Area.defaultId)
        }
        // создаем имя, если его не было
        if (!newCluster.name) {
          newCluster.name = newCluster.fullurl
        }
        parseClusterUrl(newCluster)
        // получаем ссылку на новый кластер и запоминаем id
        let newClusterRef = areaRef.collection('clusters').doc()
        newCluster.id = newClusterRef.id
        // сохраняем
        newClusterRef.set(newCluster, { merge: true })
      }
    },
    syncReplaceCluster (state, { areaId, cluster }) {
      let area = state.areas.find(ar => {
        return ar.id === areaId
      })
      area.clusters.splice(area.clusters.findIndex(el => {
        return el.id === cluster.id
      }), 1, cluster)
    },
    syncAddCluster (state, { cluster, areaId }) {
      let area = state.areas.find(ar => {
        return ar.id === areaId
      })
      if (!area.clusters) {
        area.clusters = []
      }
      area.clusters.push(cluster)
    },
    syncRemoveCluster (state, { cluster, areaId }) {
      let area = state.areas.find(ar => {
        return ar.id === areaId
      })
      area.clusters.splice(area.clusters.findIndex(el => {
        return el.id === cluster.id
      }), 1)
    },
    updateCluster (state, { areaId, object, property, newValue }) {
      if (property === 'fullurl') {
        object.fullurl = newValue
        parseClusterUrl(object)
        console.log('writing url:', object)
        userProjectRef(state).collection('areas').doc(areaId).collection('clusters').doc(object.id).set(object, { merge: true })
      } else {
        updateProperyInternal(state, object, collectionsMeta.Cluster, property, newValue, areaId)
      }
    },

    // login etc
    setUser (state, payload) {
      state.user = payload
    },
    setError (state, payload) {
      state.error = payload
    },
    addUserToProject (state, { projectId, userUid }) {
      console.log('Добавляем юзера "' + userUid + '" в проект ' + projectId)
      if (!state.db.collection('projects').doc(projectId).exists) {
        console.log('Нет проекта, создаем')
        state.db.collection('projects').doc(projectId).set({
          name: projectId
        }, { merge: true })
      }

      state.db.collection('users').doc(userUid).set({
        projectId: projectId,
        userUid: userUid,
        allowed: true
      }, { merge: true }).then(() => {
        console.log('Пользователь добавлен')
      })
    },

    // keywords
    createKeyword (state, { keyword, areaId }) {
      // приводим к нижнему регистру ключи
      let newKeyword = keyword //keysToLower(keyword)
      // записываем в БД
      console.log('creating keyword mutation:', keyword, areaId)
      if (state.user.projectId !== undefined && state.user.projectId !== null) {
        userProjectRef(state).collection('areas').doc(areaId).collection('keywords').doc(newKeyword.keyword).set(newKeyword, { merge: true })
      }
    },
    removeKeyword (state, { keyword, areaId }) {
      userProjectRef(state).collection('areas').doc(areaId).collection('keywords').doc(keyword.keyword).delete()
    },
    replaceKeyword (state, { areaId, keyword }) {
      let area = state.areas.find(ar => {
        return ar.id === areaId
      })
      area.keywords.splice(area.keywords.findIndex(el => {
        return el.keyword === keyword.keyword
      }), 1, keyword)
    },
    addNewUnassignedKeyword (state, { areaId, newKeyword }) {
      let newKeywordObj = {
        keyword: newKeyword
      }
      userProjectRef(state).collection('areas').doc(areaId).collection('keywords').doc(newKeyword).set(newKeywordObj, { merge: true })
    },
    assignKeyword (state, { areaId, keyword, clusterId }) {
      console.log('areaId:', areaId)
      console.log('Присваиваем кластеру запрос', keyword, clusterId)
      let docToChangeRef = userProjectRef(state).collection('areas').doc(areaId).collection('keywords').doc(keyword.keyword)
      docToChangeRef.get().then(function (doc) {
        if (!doc.exists) {
          // создаем документ
          var docToChange = keyword
        } else {
          var docToChange = doc.data()
        }
        if (clusterId) {
          docToChange.assignedCluster = clusterId
          console.log('assigning cluster')
        } else {
          console.log('deleteing assigned cluster')
          delete docToChange.assignedCluster
        }
        let result = docToChangeRef.set(docToChange, { merge: true })
        console.log('result:', result)
      }).catch(function (error) {
        console.log('Error getting document:', error)
      })
    },
    updateKeyword (state, { areaId, object, property, newValue }) {
      updateProperyInternal(state, object, collectionsMeta.Keyword, property, newValue, areaId)
    },
    updateKeywordFull (state, { areaId, keyword }) {
      if (state.user.projectId !== undefined && state.user.projectId !== null) {
        userProjectRef(state).collection('areas').doc(areaId).collection('keywords').doc(keyword.keyword).set(keyword, { merge: true })
      }
    },
    addKeyword (state, { keyword, areaId }) {
      let area = state.areas.find(ar => {
        return ar.id === areaId
      })
      if (!area.keywords) {
        area.keywords = []
      }
      area.keywords.push(keyword)
    },
    syncRemoveKeyword (state, { keyword: keyword, areaId: areaId }) {
      let area = state.areas.find(ar => {
        return ar.id === areaId
      })
      area.keywords.splice(area.keywords.findIndex(el => {
        return el.keyword === keyword.keyword
      }), 1)
    },

    // projects
    createNewProject (state, { projectType, projectId, areaId }) {
      console.log('createNewProject:', projectId, areaId)
      if (projectId) {
        let newProjectObj = {
          id: projectId,
          status: '',
          type: projectType
        }
        userProjectRef(state).collection('areas').doc(areaId).collection('projects').doc(projectId).set(newProjectObj)
      } else {
        console.log('projectId is empty')
      }
    },
    addProject (state, { project, areaId }) {
      let area = state.areas.find(ar => {
        return ar.id === areaId
      })
      if (!area.projects) {
        area.projects = []
      }
      area.projects.push(project)
    },
    replaceProject (state, { areaId, project }) {
      let area = state.areas.find(ar => {
        return ar.id === areaId
      })
      area.projects.splice(area.projects.findIndex(el => {
        return el.id === project.id
      }), 1, project)
    },
    storeWordstatResult (state, { project, areaId, result }) {
      // устанавливаем статус проекта
      project.statusId = 4
      if (result) {
        // устанавливаем результат
        project.data = result
      }
      // записываем в базу
      userProjectRef(state).collection('areas').doc(areaId).collection('projects').doc(project.id).set(project, { merge: true })
    },
    updateProject (state, { areaId, object, property, newValue }) {
      updateProperyInternal(state, object, collectionsMeta.Project, property, newValue, areaId)
    },
  },
  actions: {
    // areas
    addArea ({ state, commit }, { area }) {
      commit('addArea', { area: area })
    },

    // clusters
    syncAddCluster ({ state, commit }, { cluster, areaId }) {
      commit('syncAddCluster', { cluster: cluster, areaId: areaId })
    },
    syncRemoveCluster ({ state, commit }, { cluster, areaId }) {
      commit('syncRemoveCluster', { cluster: cluster, areaId: areaId })
    },
    createNewClusterWithKeyword ({ state, commit }, { cluster, areaId, keyword }) {
      // ищем кластер по его названию
      return new Promise((resolve, reject) => {
        userProjectRef(state).collection('areas').doc(areaId).collection('clusters').where("name", "==", cluster.name)
          .get()
          .then(function (querySnapshot) {
            let foundCluster;
            let clusterId;
            querySnapshot.forEach(function (doc) {
              foundCluster = doc.data()
            });
            if (!foundCluster) {
              // создаем кластер если его нет
              commit("createNewCluster", {
                newCluster: cluster,
                areaId: areaId
              });
              // по идее уже должны получить id
              clusterId = cluster.id;
            } else {
              if (!foundCluster.highlights) {
                // запоминаем подсветки
                commit("updateCluster", {
                  areaId: areaId,
                  object: foundCluster,
                  property: "highlights",
                  newValue: cluster.highlights
                });
              }
              clusterId = foundCluster.id;
            }
            // добавляем в него ключ
            keyword.assignedCluster = clusterId
            console.log('creating keyword:', keyword)
            commit("createKeyword", {
              keyword: keyword,
              areaId: areaId
            });
            // возвращаем результат
            resolve('all ok')
          })
      })
    },

    // keywords
    addKeyword ({ state, commit }, { keyword, areaId }) {
      commit('addKeyword', { keyword: keyword, areaId: areaId })
    },
    assignKeywords ({ state, getters, commit }, { areaId, keywords, clusterId }) {
      if (keywords !== undefined && keywords !== null) {
        console.log('Начинаем присваивать кластер запросам,', keywords, clusterId)
        keywords.forEach(el => {
          commit('assignKeyword', { areaId: areaId, keyword: el, clusterId: clusterId })
        })
      }
    },
    createKeyword ({ commit, store, state, dispatch }, { keyword, areaId }) {
      commit('createKeyword', { keyword: keyword, areaId: areaId })
    },
    removeKeyword ({ commit, store, state, dispatch }, { areaId, keyword }) {
      commit('removeKeyword', { keyword: keyword, areaId: areaId })
    },
    syncRemoveKeyword ({ commit, store, state, dispatch }, { areaId, keyword }) {
      commit('syncRemoveKeyword', { keyword: keyword, areaId: areaId })
    },
    updateKeys ({ commit, store, state, dispatch }, { areaId, keysArray }) {
      console.log('updateKeys, keysArray:', keysArray)
      keysArray.forEach(key => {
        commit('updateKeywordFull', {
          areaId: areaId,
          keyword: key
        })
      })
    },
    collectAllIntentsPixel ({ state, getters, commit, dispatch }, { areaId, onlyWithoutIntent, keywords }) {
      let area = state.areas.find(ar => {
        return ar.id === areaId
      })

      // цикл по 50 слов - предел АПИ
      let page_size = 99
      let initialKeys = keywords.filter(keyword => {
        if (onlyWithoutIntent) {
          return (keyword.intent === undefined || keyword.intent === null || keyword.intent === {})
        } else {
          return true
        }
      }).map(keyword => { return keyword.keyword })

      for (let page_number = 0; page_number < (initialKeys.length / page_size); page_number++) {
        let pagedKeys = initialKeys.slice(page_number * page_size, (page_number + 1) * page_size);
        // без частичных запросов
        let keywords = pagedKeys

        console.log('keywords:', keywords)
        // получаем запросы по маркерам
        axios.post('https://us-central1-autoseo-5d74f.cloudfunctions.net/getIntent', {
          keywords: keywords
        }).then(function (response) {
          console.log('response', response)
          if (!response.data.error) {
            // сразу обновляем данные слова
            dispatch('updateKeys', { keysArray: response.data, areaId: areaId })
          } else {
            console.log('Ошибка при вызове запроса:', response.data)
          }
        }).catch(function (error) {
          console.log('Ошибка:', error)
        })
      }
    },

    // projects
    addProject ({ state, commit, dispatch }, { project, areaId }) {
      commit('addProject', { project: project, areaId: areaId })
      // если проект не завершен - начинаем слушать его
      if (project.statusId !== 4 && !project.closed && project.type === 'wordstat') {
        console.log('starting listening to WORDSTAT project')
        // запускаем таймер
        project.timerId = setInterval(() => {
          // получаем данные по проекту
          axios.get('https://us-central1-autoseo-5d74f.cloudfunctions.net/getWordstatResult', {
            params: {
              projectId: project.id,
              projectType: 'wordstat'
            }
          }).then(response => {
            // создаем новый проект в зоне
            console.log('timer event, response:', response)
            if (response.data.status === '4') {
              // запоминаем все результаты вызова
              let result = response.data.data
              commit('storeWordstatResult', { project: project, areaId: areaId, result: result })
              // завершаем таймер
              console.log('project finished, clearing timer: ', project.timerId, ', result:', result)
              clearInterval(project.timerId)
            } else if (response.code === 500) {
              // ошибка - прекращаем слушать
              console.log('Ошибка, прекращаем слушать:', response.error)
              clearInterval(project.timerId)
            } else {
              // обновляем статус?? потом
            }
          }).catch(error => {
            console.log('error', error)
          })
        }, 30000)
      } else if (project.statusId !== 4 && !project.closed && project.type === 'wordstatFreq') {
        console.log('starting listening to WORDSTAT FREQ project')
        // запускаем таймер
        project.timerId = setInterval(() => {
          // получаем данные по проекту
          axios.get('https://us-central1-autoseo-5d74f.cloudfunctions.net/getWordstatResult', {
            params: {
              projectId: project.id,
              projectType: 'wordstatFreq'
            }
          }).then(response => {
            if (response.data.status === '4') {
              let keysArray = response.data.data
              // обновляем все ключи
              dispatch('updateKeys', { keysArray: keysArray, areaId: areaId })
              // запоминаем все результаты вызова
              commit('storeWordstatResult', { project: project, areaId: areaId })
              // завершаем таймер
              console.log('project finished, clearing timer: ', project.timerId)
              clearInterval(project.timerId)
            } else if (response.code === 500) {
              // ошибка - прекращаем слушать
              console.log('Ошибка, прекращаем слушать:', response.error)
              clearInterval(project.timerId)
            } else {
              // обновляем статус?? потом
            }
          }).catch(error => {
            console.log('error', error)
          })
        }, 30000)
      } else if (project.statusId !== 4 && !project.closed && project.type === 'clusterization') {
        console.log('starting listening to CLUSTERIZATION project')
        // запускаем таймер
        project.timerId = setInterval(() => {
          // получаем данные по проекту
          axios.get('https://us-central1-autoseo-5d74f.cloudfunctions.net/getClusterizationResult', {
            params: {
              projectId: project.id
            }
          }).then(response => {
            console.log('timer event, response:', response)
            if (response.data.error === undefined) {
              // запоминаем все результаты вызова
              let result = response.data
              commit('storeWordstatResult', { project: project, areaId: areaId, result: result })
              // завершаем таймер
              console.log('project finished, clearing timer: ', project.timerId, ', result:', result)
              clearInterval(project.timerId)
            } else if (response.code === 500) {
              // ошибка - прекращаем слушать
              console.log('Ошибка, прекращаем слушать:', response.error)
              clearInterval(project.timerId)
            } else {
              // обновляем статус?? потом
            }
          }).catch(error => {
            console.log('error', error)
          })
        }, 30000)
      }
    },

    // etc
    doClustering ({ state, getters, commit }, { areaId }) {
      let area = state.areas.find(ar => {
        return ar.id === areaId
      })

      // без частичных запросов
      let keywords = area.keywords.filter(keyword => {
        return keyword.type !== 'partitial'
      }).map(keyword => { return keyword.keyword })

      console.log('keywords:', keywords)
      // получаем запросы по маркерам
      axios.get('https://us-central1-autoseo-5d74f.cloudfunctions.net/doClustering', {
        params: {
          keywords: keywords
        }
      }).then(function (response) {
        console.log('response', response)
        if (!response.data.error) {
          // создаем новый проект по кластеризации в зоне
          let result = commit('createNewProject', { projectType: 'clusterization', projectId: response.data.report_id, areaId: areaId })
        } else {
          console.log('Ошибка при вызове запроса:', response.data)
        }
      }).catch(function (error) {
        console.log('Ошибка:', error)
      })
    },
    parseWordstat ({ state, getters, commit }, { areaId, includeKeysType, excludeKeysType, collectType, projectType, keywordsInitial }) {
      let area = state.areas.find(ar => {
        return ar.id === areaId
      })

      // запросы - это маркерные запросы зоны
      let keywords = keywordsInitial.filter(keyword => {
        if (includeKeysType) {
          return keyword.type === includeKeysType
        } else {
          return true
        }
      }).map(keyword => { return keyword.keyword })

      // стоп-слова - это минус-слова
      let stopwords = keywordsInitial.filter(keyword => {
        if (excludeKeysType) {
          return keyword.type === excludeKeysType
        } else {
          return false
        }
      }).map(keyword => { return keyword.keyword })

      console.log('keywords:', keywords)
      console.log('stopwords:', stopwords)

      // получаем запросы по маркерам
      let postParams = {
        regionid: '213',
        collecttype: collectType, // Тип сбора данныз 0:сбор частотностей ключевых слов, type 1: Сбор левой колонки Wordstat
        name: 'test api wordstat', //Имя проекта
        pages: 5, // Сколько нужно спарсить страниц левой колонки Wordstat (0-10 или 40(все)), Если выбран парсинг частотнности - 0, эта переменная не нужна
        normal: 1, // Базовая частотность - без кавычек и ! (0/1)
        quotationmark: 1, // Частотность в кавычках, например "автосервис" (0/1)
        exclamation: 1, // Точная частотность, например: "!автосервис"
        minwordstat: 0, // Автоматически подставить 0 для частотностей вида "автосервис" и "!автосервис", если базовая частотность меньше чем значение этой переменной
        swtype: 0, // Stopwords type: 0 - Фразовое соответствие, 1 - Символьное соответствие
        altfreq: 0, // Учитывать порядок слов [] (0/1)
        keywords: keywords,
        stopwords: stopwords
      }
      axios({
        method: 'post',
        url: 'https://us-central1-autoseo-5d74f.cloudfunctions.net/parseWordstat',
        data: postParams
      }).then(response => {
        // создаем новый проект в зоне
        console.log('response:', response, areaId)
        let result = commit('createNewProject', { projectType: projectType, projectId: response.data, areaId: areaId })
      }).catch(error => {
        console.log('error:', error)
      })
    },
    startListening ({ state, getters, commit, dispatch }) {
      // создаем дефолтную зону
      let defaultAreaRef = userProjectRef(state).collection(collectionsMeta.Area.collectionName).doc(collectionsMeta.Area.defaultId)
      defaultAreaRef.get()
        .then(doc => {
          if (!doc.exists) {
            let defaultArea = {
              name: 'Не распределенные кластеры'
            }
            defaultArea[collectionsMeta.Area.idField] = collectionsMeta.Area.defaultId
            defaultArea.keywords = []
            defaultArea.clusters = []
            defaultAreaRef.set(defaultArea)
          }
        })
      console.log('Начинаем слушать..')
      if (getters.user !== undefined && getters.user !== null) {
        if (getters.user.projectId !== undefined && getters.user.projectId !== null) {
          // проверяем что есть проект
          let returnedValue = userProjectRef(state).get()
            .then(doc => {
              if (doc.exists) {
                startUpdatingLocalCollection({
                  areaId: null,
                  docWithCollection: userProjectRef(state),
                  actionToAdd: 'addArea',
                  actionToRemove: 'removeArea',
                  mutationToReplace: 'replaceArea',
                  commit: commit,
                  dispatch: dispatch,
                  collectionName: 'areas',
                  elementIdField: 'name',
                  mutationParamsObjectName: 'area',
                  functionToCallOnEachNewOrChangedDoc: (area) => {
                    // запросы
                    startUpdatingLocalCollection({
                      areaId: area.id,
                      docWithCollection: userProjectRef(state).collection('areas').doc(area.id),
                      actionToAdd: 'addKeyword',
                      actionToRemove: 'syncRemoveKeyword',
                      mutationToReplace: 'replaceKeyword',
                      commit: commit,
                      dispatch: dispatch,
                      collectionName: 'keywords',
                      elementIdField: 'keyword',
                      mutationParamsObjectName: 'keyword',
                      functionToCallOnEachNewOrChangedDoc: null
                    })
                    // кластеры
                    startUpdatingLocalCollection({
                      areaId: area.id,
                      docWithCollection: userProjectRef(state).collection('areas').doc(area.id),
                      actionToAdd: 'syncAddCluster',
                      actionToRemove: 'syncRemoveCluster',
                      mutationToReplace: 'syncReplaceCluster',
                      commit: commit,
                      dispatch: dispatch,
                      collectionName: 'clusters',
                      elementIdField: 'id',
                      mutationParamsObjectName: 'cluster',
                      functionToCallOnEachNewOrChangedDoc: null
                    })
                    // проекты
                    startUpdatingLocalCollection({
                      areaId: area.id,
                      docWithCollection: userProjectRef(state).collection('areas').doc(area.id),
                      actionToAdd: 'addProject',
                      actionToRemove: 'removeProject',
                      mutationToReplace: 'replaceProject',
                      commit: commit,
                      dispatch: dispatch,
                      collectionName: 'projects',
                      elementIdField: 'id',
                      mutationParamsObjectName: 'project',
                      functionToCallOnEachNewOrChangedDoc: null
                    })
                  }
                })
                console.log('Успешно начали слушать')
              } else {
                console.log('Проект пользователя не найден, не начали слушать, userProjectDoc:', userProjectRef(state))
              }
            })
            .catch(error => {
              console.log('Ошибка при слушании:', error)
            })
        } else {
          console.log('user is undefined')
        }
      } else {
        // console.log('4')
      }
    },
    populateDatabaseAndStartListening ({ state, getters }) {
      // запомним базу
      state.db = firebase.firestore()
      // TODO запомним проект
    },
    signupUser ({ commit, dispatch }, { email, password, project }) {
      firebase.auth().createUserWithEmailAndPassword(email, password)
        .then(
        user => {
          // добавить пользователя к проекту, создает проект если его не было
          const newUser = {
            uid: user.uid,
            project: project
          }
          commit('addUserToProject', { projectId: project, userUid: newUser.uid })
          commit('setUser', newUser)
          dispatch('startListening')
        })
        .catch(
        error => {
          commit('setError', 'Ошибка при регистрации: ' + error)
        })
    },
    signinUser ({ commit, dispatch }, { email, password }) {
      firebase.auth().signInWithEmailAndPassword(email, password)
        .then(
        user => {
          const newUser = {
            id: user.uid,
            project: ''
          }
          commit('setUser', newUser)
          dispatch('startListening')
        })
        .catch(
        error => {
          commit('setError', 'Ошибка при входе: ' + error)
        })
    },
    autoSignin ({ commit, store, dispatch, state }, user) {
      state.db.collection('users').doc(user.uid).get()
        .then((doc) => {
          if (doc.exists) {
            var projectId = doc.data().projectId
            const newUser = {
              id: user.uid,
              projectId: projectId
            }
            commit('setUser', newUser)
            dispatch('startListening')
            router.push('/areas')
          } else {
            console.log('Проект пользователя не найден')
          }
        })
    }
  },
  getters: {
    selectedAreaId (state) {
      return state.selectedAreaId
    },
    allClustersForArea: (state, getters) => (areaId) => {
      let area = state.areas.find(ar => {
        return ar.id === areaId
      })
      return area.clusters
    },
    allProjects: (state, getters) => (areaId) => {
      let area = state.areas.find(ar => {
        return ar.id === areaId
      })
      if (area) {
        if (area.projects) {
          return area.projects.filter(project => {
            return project.closed !== true
          })
        }
      }
    },
    user (state) {
      return state.user
    },
    allKeywordsForArea: (state, getters) => (areaId) => {
      let area = state.areas.find(ar => {
        return ar.id === areaId
      })
      return area.keywords
    },
    allAreas (state) {
      return state.areas
    }
  }
})
function parseClusterUrl (newCluster) {
  // пустой юрл заменяем на дамми
  if (newCluster.fullurl === undefined && newCluster.fullurl === null && newCluster.fullurl === '') {
    newCluster.fullurl = 'https://vselaki.ru/undefined-cluster';
  }
  newCluster.fullurl = newCluster.fullurl.toLowerCase()
  // парсим юрл
  let url = getLocation(newCluster.fullurl);
  newCluster.url = url;
  newCluster.hierarchy = url.pathname.split('/');
  if (newCluster.url.pathname === '/') {
    newCluster.parent = '';
  }
  else if (newCluster.hierarchy.length === 2) {
    newCluster.parent = '/';
  }
  else {
    newCluster.parent = newCluster.hierarchy.reduce((result, current, index, arr) => {
      if (index + 1 !== arr.length) {
        return result + '/' + current;
      }
      else {
        return result;
      }
    });
  }
}

function startUpdatingLocalCollection ({ areaId, docWithCollection, actionToAdd, actionToRemove, mutationToReplace, commit, dispatch, collectionName, elementIdField, mutationParamsObjectName, functionToCallOnEachNewOrChangedDoc }) {
  // начинаем слушать
  docWithCollection.collection(collectionName)
    .onSnapshot(querySnapshot => {
      querySnapshot.docChanges.forEach(function (change) {
        // console.log('change:', change)
        let newDocData = change.doc.data()
        // console.log('newDocData:', newDocData)
        // ищем в массиве
        if (change.type === 'added') {
          // добавляем
          let actionParams = {}
          actionParams[mutationParamsObjectName] = newDocData
          if (areaId) {
            actionParams.areaId = areaId
          }
          dispatch(actionToAdd, actionParams)
          if (functionToCallOnEachNewOrChangedDoc) {
            functionToCallOnEachNewOrChangedDoc(newDocData)
          }
        } else if (change.type === 'modified') {
          // ищем в нашем массиве измененный документ и меняем его
          let mutationParams = {}
          mutationParams[mutationParamsObjectName] = newDocData
          if (areaId) {
            mutationParams.areaId = areaId
          }
          commit(mutationToReplace, mutationParams)

          if (functionToCallOnEachNewOrChangedDoc) {
            functionToCallOnEachNewOrChangedDoc(newDocData)
          }
        } else if (change.type === 'removed') {
          let actionParams = {}
          actionParams[mutationParamsObjectName] = newDocData
          if (areaId) {
            actionParams.areaId = areaId
          }
          dispatch(actionToRemove, actionParams)
        }
      })
    })
}

