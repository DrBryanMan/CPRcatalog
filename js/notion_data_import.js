const { Client } = require("@notionhq/client")
const axios = require('axios')
const fs = require("fs").promises
const path = require("path")
require("dotenv").config({ path: path.join(__dirname, "../.env") })

const HIKKA_API_URL = 'https://api.hikka.io/anime'
const MIKAI_API_URL = 'https://api.mikai.me/v1/integrations/hikka/anime'
const Notion = new Client({ 
  auth: process.env.NOTION_TOKEN
})

const UPDATE_ALL_HIKKA = false

const colors = {
  reset: "\x1b[0m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m"
}

const OUTPUT_MODES = {
  NEWLINE: 'newline',
  SAMELINE: 'sameline', 
  PROGRESS: 'progress'
}

const DATABASES = {
  ANIME_TITLES_DB: "174d30fa35d081fb8baccf7e405d5cf9",
  ANIME_RELEASES_DB: "174d30fa35d081278dcdf4335e149330",
  TEAMS_DB: "174d30fa35d081c4968cc340c89e4667"
}

process.stdout.setEncoding('utf8')
if (process.stdout.isTTY) {
  process.stdout.setNoDelay(true)
}

function colorLog(message, color = 'reset', mode = OUTPUT_MODES.NEWLINE) {
  const coloredMessage = `${colors[color]}${message}${colors.reset}`
  
  switch(mode) {
    case OUTPUT_MODES.SAMELINE:
      process.stdout.write(`\r${coloredMessage}`)
      break
    case OUTPUT_MODES.PROGRESS:
      process.stdout.write(`${coloredMessage}\n`)
      break
    case OUTPUT_MODES.NEWLINE:
    default:
      process.stdout.write(`${coloredMessage}\n`)
  }
}

async function loadPreviousData(fileName) {
  try {
    const filePath = path.join(__dirname, "../../CPRcatalog/json", fileName)
    const data = JSON.parse(await fs.readFile(filePath, "utf8"))
    colorLog(`Завантажено попередні дані з ${fileName}: ${data.length} записів`, 'blue')
    return data
  } catch (error) {
    colorLog(`Попередні дані з ${fileName} не знайдено або помилка читання: ${error.message}`, 'yellow')
    return []
  }
}

async function loadExternalData(url, name) {
  try {
    const response = await axios.get(url)
    colorLog(`Завантажено ${name}: ${response.data.length} записів`, 'blue')
    return response.data
  } catch (error) {
    colorLog(`Не вдалося завантажити ${name}: ${error.message}`, 'yellow')
    return []
  }
}

async function saveData(fileName, data) {
  try {
    const targetDir = path.join(__dirname, '../../CPRcatalog/json')
    await fs.mkdir(targetDir, { recursive: true })
    await fs.writeFile(
      path.join(targetDir, fileName),
      JSON.stringify(data, null, 2)
    )
    colorLog(`Успішно збережено дані у файл ${fileName}: ${data.length} записів`, 'green')
  } catch (error) {
    colorLog(`Помилка при збереженні даних у файл ${fileName}: ${error.message}`, 'red')
    throw error
  }
}

async function saveTestData(data, description = '') {
  try {
    const targetDir = path.join(__dirname, 'data')
    await fs.mkdir(targetDir, { recursive: true })
    
    const testData = {
      timestamp: new Date().toISOString(),
      description: description,
      count: Array.isArray(data) ? data.length : 1,
      data: data
    }
    
    await fs.writeFile(
      path.join(targetDir, '../../json/TestData.json'),
      JSON.stringify(testData, null, 2)
    )
    colorLog(`Тестові дані збережено у json/TestData.json: ${testData.count} записів`, 'green')
    return testData
  } catch (error) {
    colorLog(`Помилка при збереженні тестових даних: ${error.message}`, 'red')
    throw error
  }
}

async function getPageById(pageId) {
  try {
    return await Notion.pages.retrieve({ page_id: pageId })
  } catch (error) {
    console.error('Помилка при отриманні даних:', error)
    throw error
  }
}

async function getReleasesJson(options = {}) {
  const {
    useLocalBase = true,
    filter = {},
    onlyModified = true
  } = options

  if (useLocalBase && Object.keys(filter).length === 0) {
    return await loadPreviousData("AnimeReleasesDB.json")
  }

  let baseData = await loadPreviousData("AnimeReleasesDB.json")
  let newData = []

  if (!useLocalBase && Array.isArray(filter.ids) && filter.ids.length > 0) {
    // Отримуємо конкретні сторінки за ID
    const pages = []
    const norm = s => (s || '').toLowerCase().replace(/-/g, '')
    
    for (const idRaw of filter.ids.map(norm)) {
      try {
        const page = await getPageById(idRaw)
        pages.push(page)
      } catch (e) {
        colorLog(`Не вдалося отримати сторінку ${idRaw}: ${e.message}`, 'yellow')
      }
    }
    newData = await processReleaseData(pages)
  } else if (!useLocalBase) {
    return await importDataOptimized(
      DATABASES.ANIME_RELEASES_DB,
      "Аніме релізи",
      "AnimeReleasesDB.json",
      processReleaseData,
      null,
      onlyModified
    )
  }

  // Об'єднуємо дані
  let allData = useLocalBase ? baseData : mergeData(baseData, newData)

  // Зберігаємо ВСІ дані (не тільки відфільтровані!)
  if (!useLocalBase && newData.length > 0) {
    await saveData("AnimeReleasesDB.json", allData)
    colorLog(`Оновлено ${newData.length} записів релізів`, 'green')
  } else if (useLocalBase) {
    await saveData("AnimeReleasesDB.json", allData)
  }
}

async function getTeamsJson(options = {}) {
  const {
    useLocalBase = true,
    filter = {},
    onlyModified = true,
    releasesData = null
  } = options

  if (useLocalBase && Object.keys(filter).length === 0) {
    return await loadPreviousData("TeamsDB.json")
  }

  let baseData = await loadPreviousData("TeamsDB.json")
  let newData = []

  if (!useLocalBase && Array.isArray(filter.ids) && filter.ids.length > 0) {
    // Отримуємо конкретні сторінки за ID
    const pages = []
    const norm = s => (s || '').toLowerCase().replace(/-/g, '')
    
    for (const idRaw of filter.ids.map(norm)) {
      try {
        const page = await getPageById(idRaw)
        pages.push(page)
      } catch (e) {
        colorLog(`Не вдалося отримати сторінку ${idRaw}: ${e.message}`, 'yellow')
      }
    }
    newData = await processTeamData(pages, releasesData)
  } else if (!useLocalBase) {
    return await importDataOptimized(
      DATABASES.TEAMS_DB,
      "Команди фандабу",
      "TeamsDB.json",
      processTeamData,
      releasesData,
      onlyModified
    )
  }

  // Об'єднуємо дані
  let allData = useLocalBase ? baseData : mergeData(baseData, newData)

  // Зберігаємо ВСІ дані (не тільки відфільтровані!)
  if (!useLocalBase && newData.length > 0) {
    await saveData("TeamsDB.json", allData)
    colorLog(`Оновлено ${newData.length} записів команд`, 'green')
  } else if (useLocalBase) {
    await saveData("TeamsDB.json", allData)
  }
}

async function getAllPages(databaseId, dbTitle) {
  let pages = []
  let hasMore = true
  let nextCursor = null
  let totalProcessed = 0
  
  console.log(`Початок імпорту сторінок з бази даних ${dbTitle}`)

  while (hasMore) {
    const response = await Notion.databases.query({
      database_id: databaseId,
      start_cursor: nextCursor || undefined
    })

    const newPages = response.results
    totalProcessed += newPages.length
    colorLog(`Отримано ${totalProcessed} сторінок...`, 'reset', OUTPUT_MODES.PROGRESS)
    
    pages = pages.concat(response.results)
    hasMore = response.has_more
    nextCursor = response.next_cursor
  }
  
  colorLog(`\nЗавершено отримання сторінок. Всього: ${totalProcessed}`, 'reset')
  return pages
}

function filterModifiedPages(allPages, existingData) {
  // Створюємо мап існуючих даних за ID з часом останньої зміни
  const existingMap = new Map(
    existingData.map(item => [
      item.id, 
      new Date(item.last_edited || item.created_time || 0)
    ])
  )
  
  const modifiedPages = []
  const newPages = []
  
  for (const page of allPages) {
    const pageId = page.id
    const pageLastEdited = new Date(page.last_edited_time)
    
    if (!existingMap.has(pageId)) {
      // Нова сторінка
      newPages.push(page)
      modifiedPages.push(page)
    } else {
      const existingLastEdited = existingMap.get(pageId)
      
      // Порівнюємо час зміни (з невеликою похибкою в 1 секунду для запобігання проблем з точністю часу)
      if (pageLastEdited > existingLastEdited || 
          Math.abs(pageLastEdited - existingLastEdited) > 1000) {
        modifiedPages.push(page)
      }
    }
  }
  
  if (newPages.length > 0) {
    colorLog(`Нових сторінок: ${newPages.length}`, 'green')
  }
  
  if (modifiedPages.length > newPages.length) {
    colorLog(`Змінених існуючих сторінок: ${modifiedPages.length - newPages.length}`, 'yellow')
  }
  
  return modifiedPages
}

async function fetchHikkaData(urls) {
  const animeData = []
  let count = 0
  
  for (const url of urls) {
    try {
      const slug = url.split('/').pop()
      const response = await axios.get(`${HIKKA_API_URL}/${slug}`)
      const anime = response.data

      animeData.push({
        url,
        hikka_poster: anime.image,
        hikkaSynonyms: anime.synonyms,
        status: anime.status,
        season: anime.season,
        duration: anime.duration,
        scoreMAL: anime.score,
        scoredbyMAL: anime.scored_by,
        scoreHikka: anime.native_score,
        scoredbyHikka: anime.native_scored_by,
        source: anime.source,
        mal_id: anime.mal_id
      })
      count++
      colorLog(`Обробка: ${count}/${urls.length}. ${anime?.title_ua || anime?.title_jp || 'Невідомо для ' + anime.id}`, 'green', OUTPUT_MODES.PROGRESS)
    } catch (error) {
      console.error(`Помилка отримання даних ${url}:`, error.message)
      continue
    }
  }
  return animeData
}

function createMapsFromData(postersData, mikaiData) {
  const postersMap = new Map()
  for (const item of postersData) {
    if (item.hikka_url && Array.isArray(item.posters) && item.posters.length > 0) {
      postersMap.set(item.hikka_url, item.posters)
    }
  }

  const mikaiMap = new Map()
  for (const item of mikaiData) {
    if (item.malId) {
      mikaiMap.set(item.malId, item)
    }
  }

  return { postersMap, mikaiMap }
}

function shouldUpdateHikka(page, previousData, updateAll) {
  const hikkaUrl = page.properties.Hikka?.url
  const title = page.properties['Назва тайтлу']?.title?.[0]?.plain_text || 'Без назви'
  
  if (updateAll) {
    colorLog(`✓ Оновлюємо ${title} (режим updateAll)`, 'green')
    return true
  }
  
  if (!hikkaUrl) {
    colorLog(`✗ Пропускаємо ${title} (немає Hikka URL)`, 'yellow')
    return false
  }
  
  const existingRecord = previousData.find(eD => eD.hikka_url === hikkaUrl)
  
  if (!existingRecord) {
    colorLog(`✓ Оновлюємо ${title} (новий запис)`, 'green')
    return true
  }
  
  // Перевіряємо чи відсутні важливі дані з Хікки
  const missingHikkaData = !existingRecord.hikka_poster || 
                          existingRecord.hikka_poster === null ||
                          !existingRecord.scoreMAL || 
                          !existingRecord.hikkaSynonyms ||
                          !existingRecord.status ||
                          !existingRecord.mal_id
  
  if (missingHikkaData) {
    colorLog(`✓ Оновлюємо ${title} (відсутні Хікка дані: poster=${!!existingRecord.hikka_poster}, score=${!!existingRecord.scoreMAL}, mal_id=${!!existingRecord.mal_id})`, 'green')
    return true
  }
  
  colorLog(`✗ Пропускаємо ${title} (вже є всі Хікка дані)`, 'yellow')
  return false
}

function buildAnimeData(page, hikkaInfo, posterList, mikaiUrl, previousAnime) {
  const posterUrl = Array.isArray(posterList) && posterList.length > 0
    ? `https://raw.githubusercontent.com/DrBryanMan/UAPosters/refs/heads/main/${posterList[0].url}`
    : null

  return {
    id: page.id,
    hikka_url: page.properties.Hikka?.url,
    cover: page.cover?.external?.url || page.cover?.file?.url,
    hikka_poster: hikkaInfo?.hikka_poster,
    poster: posterUrl,
    posters: posterList || [],
    title: page.properties['Назва тайтлу'].title[0]?.plain_text,
    romaji: page.properties.Ромаджі.rich_text[0]?.plain_text,
    synonyms: page.properties.Синоніми.rich_text?.flatMap(i => i.plain_text.split('\n')),
    hikkaSynonyms: hikkaInfo?.synonyms,
    type: page.properties['Тип медіа'].multi_select[0]?.name,
    format: page.properties['Формат'].select?.name,
    format_cpr: page.properties['Формат цпр'].select?.name,
    year: page.properties['Рік виходу'].rich_text[0]?.plain_text,
    genre: page.properties.Жанри.select?.name,
    status: hikkaInfo?.status,
    season: hikkaInfo?.season,
    duration: hikkaInfo?.duration,
    scoreMAL: hikkaInfo?.scoreMAL,
    scoredbyMAL: hikkaInfo?.scoredbyMAL,
    scoreHikka: hikkaInfo?.scoreHikka,
    scoredbyHikka: hikkaInfo?.scoredbyHikka,
    anitube: page.properties.АніТюб.url,
    uaserial: page.properties.Uaserial.url,
    uakino: page.properties.Uakino.url,
    mikai: mikaiUrl,
    tg_channel: page.properties['Tg канал'].url,
    episodes: page.properties['Кількість серій'].rich_text[0]?.plain_text,
    releases: page.properties['🗂️ Релізи команд'].relation || [],
    relations: page.properties["Пов'язані частини"].relation || [],
    franchise: page.properties.Франшиза.relation.id || [],
    source: hikkaInfo?.source,
    mal_id: hikkaInfo?.mal_id,
    created_time: page.created_time,
    last_edited: page.last_edited_time
  }
}

async function processAnimeData(pages) {
  const previousData = await loadPreviousData("AnimeTitlesDB.json")
  const previousDataMap = new Map(previousData.map(anime => [anime.id, anime]))

  const postersData = await loadExternalData(
    'https://raw.githubusercontent.com/DrBryanMan/UAPosters/refs/heads/main/PostersList.json',
    'PostersData.json з GitHub'
  )
  const mikaiData = await loadExternalData(MIKAI_API_URL, 'Mikai дані')
  
  const { postersMap, mikaiMap } = createMapsFromData(postersData, mikaiData)
  
  const hikkaUrls = pages
    .filter(page => shouldUpdateHikka(page, previousData, UPDATE_ALL_HIKKA))
    .map(page => {
      const url = page.properties.Hikka?.url
      const title = page.properties['Назва тайтлу']?.title?.[0]?.plain_text || 'Без назви'
      if (!url) {
        colorLog(`!! Пропущено запис без Hikka URL: "${title}" (${page.id})`, 'yellow')
      }
      return url
    }).filter(Boolean)

  console.log(`Знайдено нових URL для завантаження: ${hikkaUrls.length}`)

  const newHikkaData = hikkaUrls.length === 0 
    ? (console.log("Не знайдено нових записів."), [])
    : (console.log("Завантаження нових записів..."), await fetchHikkaData(hikkaUrls))
  console.log(`Успішно завантажено ${newHikkaData.length} записів`)

  const existingData = new Map(
    previousData
      .filter(item => item.hikka_url && (item.hikka_poster || item.hikkaSynonyms || item.scoreMAL || item.scoredbyMAL))
      .map(item => [item.hikka_url, {
        hikka_poster: item.hikka_poster,
        hikkaSynonyms: item.hikkaSynonyms,
        status: item.status,
        season: item.season,
        duration: item.duration,
        scoreMAL: item.scoreMAL,
        scoredbyMAL: item.scoredbyMAL,
        scoreHikka: item.scoreHikka,
        scoredbyHikka: item.scoredbyHikka,
        source: item.source,
        mal_id: item.mal_id
      }])
  )

  newHikkaData.forEach(item => {
    existingData.set(item.url, item)
  })

  const results = []
  for (const page of pages) {
    const hikka_url = page.properties.Hikka?.url
    const hikkaInfo = hikka_url ? existingData.get(hikka_url) : null
    const previousAnime = previousDataMap.get(page.id)
    const posterList = hikka_url ? postersMap.get(hikka_url) : null

    let mikaiUrl = previousAnime?.mikai || null
    
    if (!mikaiUrl && hikkaInfo?.mal_id) {
      const mikaiItem = mikaiMap.get(hikkaInfo.mal_id)
      if (mikaiItem) {
        mikaiUrl = `https://mikai.me/anime/${mikaiItem.id}-${mikaiItem.slug}`
        colorLog(`Знайдено Mikai посилання для MAL ID ${hikkaInfo.mal_id}: ${mikaiUrl}`, 'blue')
      }
    }
    
    const newAnimeData = buildAnimeData(page, hikkaInfo, posterList, mikaiUrl, previousAnime)
    results.push(newAnimeData)
  }
  return results
}

function hasNewTorrentLinks(currentLinks, previousLinks) {
  const previousUrls = new Set((previousLinks || []).map(link => link.href))
  return currentLinks.some(link => !previousUrls.has(link.href))
}

function buildReleaseData(page, previousRelease) {
  const currentEpisodes = page.properties['Кількість'].rich_text[0]?.plain_text || null
  const currentTorrentLinks = page.properties['Торент посилання'].rich_text
    .filter(link => link !== null)
    .map(link => ({
      text: link.plain_text.trim(),
      href: link.href
    })) || []

  const previousTorrentLinks = previousRelease?.torrentLinks || []
  const hasNewLinks = hasNewTorrentLinks(currentTorrentLinks, previousTorrentLinks)

  return {
    id: page.id,
    title: page.properties['Назва релізу'].title[0]?.plain_text,
    animeIds: page.properties['Тайтл']?.relation.map(rel => rel.id),
    teams: page.properties['Команда']?.relation.map(rel => rel.id),
    teamscolab: page.properties['Спільно з']?.relation.map(rel => rel.id),
    dubinfo: page.properties['Озвучка'].multi_select.flatMap(sel => sel.name) || 'Не вказано',
    subinfo: page.properties['Саби'].multi_select.flatMap(sel => sel.name) || 'Не вказано',
    status: page.properties['Статус'].status?.name || 'Невідомо',
    episodes: currentEpisodes,
    episodessub: page.properties['Кількість суб'].rich_text[0]?.plain_text || null,
    wereWatch: page.properties['Дивитись'].multi_select.map(ms => ({ name: ms.name, color: ms.color })) || 'Не вказано',
    torrentLinks: currentTorrentLinks,
    fexlink: page.properties['FEX посилання']?.url,
    sitelink: page.properties['На сайті']?.url,
    problems: page.properties['Проблеми']?.multi_select,
    created_time: page.created_time,
    last_edited: page.last_edited_time,
    episodesLastUpdate: previousRelease && previousRelease.episodes !== currentEpisodes
      ? new Date().toISOString()
      : previousRelease?.episodesLastUpdate || null,
    torrentLinksLastAdded: hasNewLinks
      ? new Date().toISOString() 
      : previousRelease?.torrentLinksLastAdded || null
  }
}

async function processReleaseData(pages) {
  const previousData = await loadPreviousData("AnimeReleasesDB.json")
  const previousDataMap = new Map(previousData.map(release => [release.id, release]))
  
  const results = []
  for (const page of pages) {
    const previousRelease = previousDataMap.get(page.id)
    const newReleaseData = buildReleaseData(page, previousRelease)
    results.push(newReleaseData)
  }
  return results
}

function buildTeamReleases(teamsData, releasesData) {
  colorLog("Формування зв'язків релізів для команд...", 'blue')
  
  const teamsMap = new Map(teamsData.map(team => [team.id, team]))
  
  for (const release of releasesData) {
    const releaseInfo = { id: release.id }
    
    // Основні команди
    if (release.teams && Array.isArray(release.teams)) {
      for (const team of release.teams) {
        if (team.id && teamsMap.has(team.id)) {
          const teamData = teamsMap.get(team.id)
          if (!teamData.anime_releases) {
            teamData.anime_releases = []
          }
          if (!teamData.anime_releases.some(r => r.id === release.id)) {
            teamData.anime_releases.push(releaseInfo)
          }
        }
      }
    }
    
    // Команди-колаборанти
    if (release.teamscolab && Array.isArray(release.teamscolab)) {
      for (const team of release.teamscolab) {
        if (team.id && teamsMap.has(team.id)) {
          const teamData = teamsMap.get(team.id)
          if (!teamData.anime_releases) {
            teamData.anime_releases = []
          }
          if (!teamData.anime_releases.some(r => r.id === release.id)) {
            teamData.anime_releases.push(releaseInfo)
          }
        }
      }
    }
  }
  
  colorLog(`Сформовано зв'язки релізів для ${teamsData.length} команд`, 'green')
  return teamsData
}

function buildTeamData(page) {
  return {
    id: page.id,
    cover: page.cover,
    logo: page.icon?.external?.url || page.icon?.file?.url,
    name: page.properties['Назва команди']?.title[0]?.plain_text || 'Невідомо',
    altname: page.properties['Синоніми'].rich_text?.flatMap(i => i.plain_text.split('\n')),
    founded: page.properties['Дата заснування'].date,
    type_team: page.properties['Тип команди'].multi_select.map(item => item.name) || [],
    type_activity: page.properties['Тип роботи'].multi_select.map(item => item.name) || [],
    status: page.properties.Статус.select?.name || 'Невідомо',
    members: page.properties['Склад команди'].relation || [],
    anime_releases: [],
    site: page.properties.Сайт?.url,
    anitube: page.properties.AniTube?.url,
    youtube: page.properties.YouTube?.url,
    insta: page.properties.Instagram?.url,
    tiktok: page.properties.TikTok?.url,
    tg: page.properties.Telegram?.url,
    tg_video: page.properties['ТГ релізи']?.url,
    created_time: page.created_time,
    last_edited: page.last_edited_time
  }
}

async function processTeamData(pages, releasesData = []) {
  const results = []
  
  for (const page of pages) {
    const newTeamData = buildTeamData(page)
    results.push(newTeamData)
  }
  
  if (releasesData && releasesData.length > 0) {
    return buildTeamReleases(results, releasesData)
  }
  
  return results
}

function mergeData(existingData, newData) {
  const merged = new Map()
  newData.forEach(item => merged.set(item.id, item))
  existingData.forEach(item => {
    if (!merged.has(item.id)) {
      merged.set(item.id, item)
    }
  })
  return Array.from(merged.values())
}

function applyFilters(data, filter) {
  let targets = data
  const norm = s => (s || '').toLowerCase().replace(/-/g, '')

  if (filter.ids?.length) {
    const set = new Set(filter.ids.map(norm))
    targets = targets.filter(a => set.has(norm(a.id)))
  }
  if (filter.hikkaUrls?.length) {
    const set = new Set(filter.hikkaUrls)
    targets = targets.filter(a => a.hikka_url && set.has(a.hikka_url))
  }
  if (filter.malIds?.length) {
    const set = new Set(filter.malIds)
    targets = targets.filter(a => a.mal_id && set.has(a.mal_id))
  }

  return targets
}

function updateHikkaFields(item, fresh) {
  item.hikka_poster = fresh.hikka_poster ?? item.hikka_poster
  item.hikkaSynonyms = fresh.synonyms ?? item.hikkaSynonyms
  item.status = fresh.status ?? item.status
  item.season = fresh.season ?? item.season
  item.duration = fresh.duration ?? item.duration
  item.scoreMAL = fresh.scoreMAL ?? item.scoreMAL
  item.scoredbyMAL = fresh.scoredbyMAL ?? item.scoredbyMAL
  item.scoreHikka = fresh.scoreHikka ?? item.scoreHikka
  item.scoredbyHikka = fresh.scoredbyHikka ?? item.scoredbyHikka
  item.source = fresh.source ?? item.source
  item.mal_id = fresh.mal_id ?? item.mal_id
}

async function updateExternalData(targets, update) {
  const needHikka = update.hikka !== 'none'
  const needMikai = update.mikai !== 'none'

  // Оновлення Hikka
  if (needHikka) {
    let hikkaTargets = targets.filter(a => a.hikka_url)
    if (update.hikka === 'missing') {
      hikkaTargets = hikkaTargets.filter(a =>
        (!a.hikka_poster || !a.hikkaSynonyms || !a.scoreMAL || !a.scoredbyMAL || !a.status || !a.season || !a.duration)
      )
    }

    if (hikkaTargets.length) {
      const urls = hikkaTargets.map(a => a.hikka_url)
      const freshHikka = await fetchHikkaData(urls)
      const mapHikka = new Map(freshHikka.map(i => [i.url, i]))

      for (const item of hikkaTargets) {
        const fresh = mapHikka.get(item.hikka_url)
        if (!fresh) continue
        
        updateHikkaFields(item, fresh)
      }
    }
  }

  // Оновлення Mikai
  if (needMikai) {
    let mikaiTargets = targets.filter(a => a.mal_id)
    if (update.mikai === 'missing') {
      mikaiTargets = mikaiTargets.filter(a => !a.mikai)
    }

    if (mikaiTargets.length) {
      const mikaiData = await loadExternalData(MIKAI_API_URL, 'Mikai дані')
      const mikaiMap = new Map()
      for (const item of mikaiData) {
        if (item.malId) mikaiMap.set(item.malId, item)
      }
      
      for (const a of mikaiTargets) {
        if (!a.mal_id) continue
        if (a.mikai && update.mikai === 'missing') continue
        
        const mi = mikaiMap.get(a.mal_id)
        if (mi) {
          a.mikai = `https://mikai.me/anime/${mi.id}-${mi.slug}`
        }
      }
    }
  }

  return targets
}

async function getAnimeTitlesJson(options = {}) {
  const {
    useLocalBase = true,
    update = { hikka: 'none', mikai: 'none' },
    filter = {},
    onlyModified = true
  } = options

  // Завжди завантажуємо існуючі дані для злиття та порівняння
  let baseData = await loadPreviousData("AnimeTitlesDB.json")
  let newData = []
  
  // Отримуємо нові дані
  if (!useLocalBase && Array.isArray(filter.ids) && filter.ids.length > 0) {
    // Отримуємо конкретні сторінки за ID
    const pages = []
    const norm = s => (s || '').toLowerCase().replace(/-/g, '')
    
    for (const idRaw of filter.ids.map(norm)) {
      try {
        const page = await getPageById(idRaw)
        pages.push(page)
      } catch (e) {
        colorLog(`Не вдалося отримати сторінку ${idRaw}: ${e.message}`, 'yellow')
      }
    }
    newData = await processAnimeData(pages)
  } else if (!useLocalBase) {
    // Отримуємо всі дані з Notion
    const allPages = await getAllPages(DATABASES.ANIME_TITLES_DB, "Аніме тайтли")
    
    let pagesToProcess = allPages
    
    if (onlyModified) {
      pagesToProcess = filterModifiedPages(allPages, baseData)
      colorLog(`Знайдено ${pagesToProcess.length} змінених сторінок з ${allPages.length} загальних`, 'blue')
    } else {
      colorLog(`Оброблюємо всі ${allPages.length} сторінок (повний режим)`, 'blue')
    }
    
    if (pagesToProcess.length > 0) {
      newData = await processAnimeData(pagesToProcess)
    } else {
      colorLog("Немає змінених сторінок для обробки", 'green')
    }
  }

  // Об'єднуємо дані (нові перезаписують існуючі за ID)
  let allData = useLocalBase ? baseData : mergeData(baseData, newData)

  // Оновлюємо дані
  allData = await updateExternalData(allData, update)

  // Зберігаємо ВСІ дані
  if (!useLocalBase && newData.length > 0) {
    await saveData("AnimeTitlesDB.json", allData)
    colorLog(`Оновлено ${newData.length} записів`, 'green')
  } else if (!useLocalBase && newData.length === 0 && !onlyModified) {
    await saveData("AnimeTitlesDB.json", allData)
  } else if (useLocalBase) {
    await saveData("AnimeTitlesDB.json", allData)
  }
}

async function importDataOptimized(databaseId, dbTitle, outputFileName, processFunction, additionalData = null, onlyModified = true) {
  console.log(`Початок імпорту даних для ${outputFileName}...`)
  try {
    const existingData = await loadPreviousData(outputFileName)
    const allPages = await getAllPages(databaseId, dbTitle)
    
    let pagesToProcess = allPages
    
    if (onlyModified) {
      pagesToProcess = filterModifiedPages(allPages, existingData)
      colorLog(`Знайдено ${pagesToProcess.length} змінених сторінок з ${allPages.length} загальних`, 'blue')
    } else {
      colorLog(`Оброблюємо всі ${allPages.length} сторінок (повний режим)`, 'blue')
    }
    
    let processedData = existingData
    
    if (pagesToProcess.length > 0) {
      const newData = await processFunction(pagesToProcess, additionalData)
      processedData = mergeData(existingData, newData)

      await saveData(outputFileName, processedData)
      colorLog(`Імпорт даних для ${outputFileName} успішно завершено. Оновлено ${pagesToProcess.length} записів.`, 'green')
    } else {
      colorLog(`Немає змінених даних для ${outputFileName}. Пропускаємо збереження.`, 'green')
    }
    
    return processedData
  } catch (error) {
    colorLog(`Помилка при імпорті даних для ${outputFileName}: ${error.message}`, 'red')
    throw error
  }
}

// Старі функції для зворотної сумісності
async function importTeams(releasesData, onlyModified = true) {
  return await importDataOptimized(
    DATABASES.TEAMS_DB,
    "Команди фандабу", 
    "TeamsDB.json",
    processTeamData,
    releasesData,
    onlyModified
  )
}

async function importData(databaseId, dbTitle, outputFileName, processFunction, additionalData = null) {
  console.log(`Початок імпорту даних для ${outputFileName}...`)
  try {
    const pages = await getAllPages(databaseId, dbTitle)
    const processedData = await processFunction(pages, additionalData)
    await saveData(outputFileName, processedData)
    colorLog(`Імпорт даних для ${outputFileName} успішно завершено.`, 'green')
    return processedData
  } catch (error) {
    colorLog(`Помилка при імпорті даних для ${outputFileName}: ${error.message}`, 'red')
    throw error
  }
}

async function runAllImports(onlyModified = false) {
  try {
    colorLog(`Запуск імпортів в режимі: ${onlyModified ? 'тільки змінені' : 'повний'}`, 'blue')

    // await getAnimeTitlesJson()
    // await getReleasesJson()
    await getAnimeTitlesJson({
      useLocalBase: false,
      update: { hikka: 'missing', mikai: 'missing' },
      // filter: { ids: ['174d30fa-35d0-81e1-92db-f94375dde776'] },
      onlyModified
    })
    
    await getReleasesJson({
      useLocalBase: false,
      // filter: { ids: ['174d30fa-35d0-8111-a03d-f52315383524'] },
      onlyModified
    })
    // await importTeams(releasesData, onlyModified)
    
    colorLog("Всі імпорти успішно завершено!", 'green')
  } catch (error) {
    colorLog(`Помилка під час виконання імпортів: ${error.message}`, 'red')
  }
}

const isTest = process.argv.includes('--test');

;(async () => {
  try {
    await runAllImports();
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
})()