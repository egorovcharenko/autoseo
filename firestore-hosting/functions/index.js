const functions = require('firebase-functions')
const admin = require('firebase-admin')
const cors = require('cors')({ origin: true })
const soap = require('soap')
const axios = require('axios')
const htmlToJson = require('html-to-json')
const parseString = require('xml2js').parseString
const XLSX = require('xlsx')
const queryString = require('query-string')
const moment = require('moment');

admin.initializeApp(functions.config().firebase)

exports.parseWordstat = functions.https.onRequest((req, res) => {
  cors(req, res, () => {
    console.log('req:', req)
    console.log('req.body:', req.body)
    let url = 'http://api.rush-analytics.ru/api.php'
    let hash = '23078d24a0367d375e0810dd83e0148d'

    // формируем хмл для запросов
    keywordsXml = ''
    req.body.keywords.forEach(keyword => {
      keywordsXml += '<arr xsi:type="xsd:string">' + keyword + '</arr>'
    })
    stopwordsXml = ''
    if (req.body.stopwords) {
      req.body.stopwords.forEach(stopword => {
        stopwordsXml += '<arr xsi:type="xsd:string">' + stopword + '</arr>'
      })
    }

    let requestText = `<?xml version = '1.0' encoding = 'UTF-8'?>
    <soapenv:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:urn="urn:uploadwsdl">
      <soapenv:Header/>
      <soapenv:Body>
        <urn:rushapi__create_wordstat_project soapenv:encodingStyle="http://schemas.xmlsoap.org/soap/encoding/">
            <hash xsi:type="xsd:string">${hash}</hash>
            <name xsi:type="xsd:string">${req.body.name}</name>
            <regionid xsi:type="xsd:string">${req.body.regionid}</regionid>
            <collecttype xsi:type="xsd:string">${req.body.collecttype}</collecttype>
            <pages xsi:type="xsd:string">${req.body.pages}</pages>
            <normal xsi:type="xsd:string">${req.body.normal}</normal>
            <quotationmark xsi:type="xsd:string">${req.body.quotationmark}</quotationmark>
            <exclamation xsi:type="xsd:string">${req.body.exclamation}</exclamation>
            <minwordstat xsi:type="xsd:string">${req.body.minwordstat}</minwordstat>
            <keywords xsi:type="urn:stringarr">${keywordsXml}</keywords>
            <stopwords xsi:type="urn:stringarr">${stopwordsXml}</stopwords>
            <swtype xsi:type="xsd:string">${req.body.swtype}</swtype>
            <altfreq xsi:type="xsd:string">${req.body.altfreq}</altfreq>
        </urn:rushapi__create_wordstat_project>
      </soapenv:Body>
    </soapenv:Envelope>`

    console.log('requestText', requestText)


    var config = {
      headers: { 'Content-Type': 'text/xml; charset=utf-8' },
      responseType: 'document'
    }

    axios.post(url, requestText, config)
      .then(function (response) {
        parseString((response.data), (err, result) => {
          console.log('json data:', result['SOAP-ENV:Envelope']['SOAP-ENV:Body'][0]['ns1:rushapi__create_wordstat_projectResponse'][0])
          let resultingId = result['SOAP-ENV:Envelope']['SOAP-ENV:Body'][0]['ns1:rushapi__create_wordstat_projectResponse'][0]['return'][0]['_']
          if (resultingId === 'ERROR_LOW_BALANCE') {
            res.status(500).send('Не достаточно средств на балансе')
          } else {
            res.status(response.status).send(resultingId)
          }
        })
      })
  })
})

exports.getWordstatResult = functions.https.onRequest((req, res) => {
  let url = 'http://api.rush-analytics.ru/api.php'
  let hash = '23078d24a0367d375e0810dd83e0148d'

  // формируем хмл для запросов
  let requestText = `<?xml version = '1.0' encoding = 'UTF-8'?>
    <soapenv:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:urn="urn:uploadwsdl">
      <soapenv:Header/>
      <soapenv:Body>
        <urn:rushapi__wordstat_project_status soapenv:encodingStyle="http://schemas.xmlsoap.org/soap/encoding/">
            <hash xsi:type="xsd:string">${hash}</hash>
            <sessionid xsi:type="xsd:string">${req.query.projectId}</sessionid>
        </urn:rushapi__wordstat_project_status>
      </soapenv:Body>
    </soapenv:Envelope>`

  cors(req, res, () => {
    var config = {
      headers: { 'Content-Type': 'text/xml' },
      responseType: 'document'
    }
    axios.post(url, requestText, config)
      .then(function (response) {
        parseString((response.data), (err, result) => {
          let projectResult = result['SOAP-ENV:Envelope']['SOAP-ENV:Body'][0]['ns1:rushapi__wordstat_project_statusResponse'][0]['return'][0]['_']
          console.log('projectResult', projectResult)
          if (projectResult) {
            let resultArray = projectResult.split('|')
            if (resultArray[0] === '4') {
              // если проект выполнен - получаем файл
              let data = []

              axios.get(resultArray[1], {
                responseType: 'arraybuffer'
              }).then(function (responseFile) {
                let workbook = XLSX.read(responseFile.data, { type: 'buffer' })

                var worksheet = workbook.Sheets[workbook.SheetNames[0]]
                let i = 2
                while (true) {
                  let cell = worksheet[`A${i}`]
                  let word = (cell ? cell.v : undefined)
                  console.log('word:', word)
                  if (word === null || word === undefined || word === '') {
                    break
                  }
                  if (req.query.projectType === 'wordstatFreq') {
                    data.push({
                      keyword: word,
                      freqBroad: worksheet[`B${i}`].v,
                      freqPartitial: worksheet[`C${i}`].v,
                      freqExact: worksheet[`D${i}`].v
                    })
                  } else {
                    data.push({
                      keyword: word,
                      freq: worksheet[`B${i}`].v
                    })
                  }
                  i++
                }
                res.status(responseFile.status).send({ status: resultArray[0], data: data })
              })
            } else {
              // иначе отдаем статус
              res.status(response.status).send({ status: resultArray[0] })
            }
          } else {
            res.status(response.status).send({ status: '-1' })
          }
        })
      })
  })
})

exports.doClustering = functions.https.onRequest((req, res) => {
  let url = 'https://tools.pixelplus.ru/api/gruppirovka?key=e7c0b6a47ddc14bb491ee47d272b70c8'

  cors(req, res, () => {
    let data = queryString.stringify({ requests: req.query.keywords, rel_url: 'https://vselaki.ru' }, { arrayFormat: 'bracket' })
    console.log('data:', data)
    axios({
      method: 'post',
      url: url,
      data: data,
      headers: {
        'Content-type': 'application/x-www-form-urlencoded'
      }
    }).then(function (response) {
      //console.log(response)
      console.log(response.data)
      console.log(response.status);
      console.log(response.statusText);
      console.log(response.headers);
      console.log(response.config);
      res.status(200).send(response.data)
    }).catch(function (error) {
      if (error.response) {
        // The request was made and the server responded with a status code
        // that falls out of the range of 2xx
        console.log(error.response.data)
        console.log(error.response.status)
        console.log(error.response.headers)
      } else if (error.request) {
        // The request was made but no response was received
        // `error.request` is an instance of XMLHttpRequest in the browser and an instance of
        // http.ClientRequest in node.js
        console.log(error.request)
      } else {
        // Something happened in setting up the request that triggered an Error
        console.log('Error', error.message)
      }
      console.log(error.config)
    })
  })
})

exports.getClusterizationResult = functions.https.onRequest((req, res) => {
  let url = 'https://tools.pixelplus.ru/api/gruppirovka?key=e7c0b6a47ddc14bb491ee47d272b70c8&report_id=' + req.query.projectId

  cors(req, res, () => {
    var config = {
      headers: { 'Content-Type': 'text/xml' }
    }
    axios.get(url, {}, config)
      .then(function (response) {
        console.log(response.data)
        res.status(200).send(response.data)
      })
  })
})

exports.getIntent = functions.https.onRequest((req, res) => {
  let url = 'https://tools.pixelplus.ru/api/intent?key=e7c0b6a47ddc14bb491ee47d272b70c8'

  cors(req, res, () => {
    let data = queryString.stringify({ requests: req.body.keywords, lr: 213 }, { arrayFormat: 'bracket' })
    console.log('request data:', data)
    axios({
      method: 'post',
      url: url,
      data: data,
      headers: {
        'Content-type': 'application/x-www-form-urlencoded'
      }
    }).then(response => {
      // преобразуем в нужный формат
      let result = []
      if (response.data) {
        if (response.data.data) {
          for (let key in response.data.data) {
            let newKey = {
              keyword: key,
              intent: response.data.data[key]
            }
            result.push(newKey)
          }
        }
      }
      res.status(200).send(result)
    }).catch(function (error) {
      if (error.response) {
        // The request was made and the server responded with a status code
        // that falls out of the range of 2xx
        console.log(error.response.data)
        console.log(error.response.status)
        console.log(error.response.headers)
      } else if (error.request) {
        // The request was made but no response was received
        // `error.request` is an instance of XMLHttpRequest in the browser and an instance of
        // http.ClientRequest in node.js
        console.log(error.request)
      } else {
        // Something happened in setting up the request that triggered an Error
        console.log('Error', error.message)
      }
      console.log(error.config)
    })
  })
})

exports.getPositions = functions.https.onRequest((req, res) => {
  let url = 'https://tools.pixelplus.ru/api/fastcheck?key=e7c0b6a47ddc14bb491ee47d272b70c8'

  cors(req, res, () => {
    let data = queryString.stringify({ url: 'https://vselaki.ru', requests: req.body.keywords, lr: 213 }, { arrayFormat: 'bracket' })
    console.log('request data:', data)
    axios({
      method: 'post',
      url: url,
      data: data,
      headers: {
        'Content-type': 'application/x-www-form-urlencoded'
      }
    }).then(response => {
      // преобразуем в нужный формат
      let result = []
      if (response.data) {
        if (response.data.queries) {
          for (let key in response.data.queries) {
            let newKey = {
              keyword: key,
              newPosition: response.data.queries[key].position,
              relevantUrl: response.data.queries[key].full_relevant_URL
            }
            result.push(newKey)
          }
        }
      }
      res.status(200).send(result)
    }).catch(function (error) {
      if (error.response) {
        // The request was made and the server responded with a status code
        // that falls out of the range of 2xx
        console.log(error.response.data)
        console.log(error.response.status)
        console.log(error.response.headers)
      } else if (error.request) {
        // The request was made but no response was received
        // `error.request` is an instance of XMLHttpRequest in the browser and an instance of
        // http.ClientRequest in node.js
        console.log(error.request)
      } else {
        // Something happened in setting up the request that triggered an Error
        console.log('Error', error.message)
      }
      console.log(error.config)
    })
  })
})