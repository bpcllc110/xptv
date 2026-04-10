const UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36"
const cheerio = createCheerio()

const appConfig = {
  ver: 1,
  title: '雷鲸',
  site: 'https://www.leijing.xyz',
  tabs: [
    { name: '剧集', ext: { id: '?tagId=42204684250355' } },
    { name: '电影', ext: { id: '?tagId=42204681950354' } },
    { name: '动漫', ext: { id: '?tagId=42204792950357' } },
    { name: '纪录片', ext: { id: '?tagId=42204697150356' } },
    { name: '综艺', ext: { id: '?tagId=42210356650363' } },
    { name: '影视原盘', ext: { id: '?tagId=42212287587456' } },
  ],
}

function parseDoc(html) {
  return cheerio(html)
}

function buildUrl(path) {
  if (!path) return appConfig.site
  if (/^https?:\/\//.test(path)) return path
  return `${appConfig.site}/${String(path).replace(/^\/+/, '')}`
}

function cleanTitle(title) {
  const regex = /(?:【.*?】)?(?:（.*?）)?([^\s.（]+(?:\s+[^\s.（]+)*)/
  const match = String(title || '').trim().match(regex)
  return match ? match[1] : String(title || '').trim()
}

function shouldSkipItem($, each) {
  if ($(each).find('.cms-lock-solid').length > 0) return true

  const summary = $(each).find('.summary').text()
  const tag = $(each).find('.tag').text()

  if (/content/.test(summary) && !/cloud/.test(summary)) return true
  if (/软件|游戏|书籍|图片|公告|音乐|课程/.test(tag)) return true
  return false
}

function extractCards($) {
  const cards = []

  $('.topicItem').each((index, each) => {
    if (shouldSkipItem($, each)) return

    const href = $(each).find('h2 a').attr('href')
    const title = $(each).find('h2 a').text()

    if (!href || !title) return

    cards.push({
      vod_id: href,
      vod_name: cleanTitle(title),
      vod_pic: '',
      vod_remarks: '',
      ext: {
        url: buildUrl(href),
      },
    })
  })

  return cards
}

async function getConfig() {
  return jsonify(appConfig)
}

async function getCards(ext) {
  ext = argsify(ext)
  const { page = 1, id = '' } = ext
  const url = `${appConfig.site}/${id}&page=${page}`

  const { data } = await $fetch.get(url, {
    headers: {
      Referer: `${appConfig.site}/`,
      'User-Agent': UA,
    },
  })

  const $ = parseDoc(data)
  return jsonify({ list: extractCards($) })
}

async function getTracks(ext) {
  ext = argsify(ext)
  const tracks = []
  const url = buildUrl(ext.url)

  const { data } = await $fetch.get(url, {
    headers: {
      Referer: `${appConfig.site}/`,
      'User-Agent': UA,
    },
  })

  const $ = parseDoc(data)
  const pans = new Set()
  const urlRegex = /(https?:\/\/[^\s）)]+)(?=[\s）)]|$)/g
  const panHostRegex = /(cloud\.189\.cn|pan\.quark\.cn|www\.aliyundrive\.com|www\.alipan\.com|115cdn\.com|115\.com)/

  const processUrl = (rawUrl) => {
    const value = String(rawUrl || '').trim().replace(/^http:\/\//, 'https://')
    if (!value || !panHostRegex.test(value) || pans.has(value)) return

    pans.add(value)
    tracks.push({
      name: '网盘',
      pan: value,
      ext: {},
    })
  }

  $('div,p,a').each((index, each) => {
    processUrl($(each).attr('href'))

    const text = $(each).text().trim()
    const urls = text.match(urlRegex)
    if (urls) urls.forEach(processUrl)
  })

  return jsonify({
    list: [{
      title: '默认分组',
      tracks,
    }],
  })
}

async function getPlayinfo(ext) {
  return jsonify({ urls: [] })
}

async function search(ext) {
  ext = argsify(ext)
  const text = encodeURIComponent(ext.text || '')
  const page = ext.page || 1
  const url = `${appConfig.site}/search?keyword=${text}&page=${page}`

  const { data } = await $fetch.get(url, {
    headers: {
      'User-Agent': UA,
      Referer: `${appConfig.site}/`,
    },
  })

  const $ = parseDoc(data)
  return jsonify({ list: extractCards($) })
}
