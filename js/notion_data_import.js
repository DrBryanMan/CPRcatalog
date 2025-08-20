const { Client } = require("@notionhq/client")
const axios = require('axios')
const fs = require("fs").promises
const path = require("path")
require("dotenv").config({ path: path.join(__dirname, "../.env") })

const HIKKA_API_URL = 'https://api.hikka.io/anime'
const MIKAI_API_URL = 'https://api.mikai.me/v1/integrations/hikka/anime'
const Notion = new Client({ 
  auth: process.env.NOTION_TOKEN,
  timeoutMs: 60000  // Збільшуємо timeout до 60 секунд
 })

const UPDATE_ALL_HIKKA = false

// Додаємо константи для кольорів
const colors = {
  reset: "\x1b[0m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m"
}
const OUTPUT_MODES = {
  NEWLINE: 'newline',    // Звичайний вивід з новим рядком
  SAMELINE: 'sameline',  // Вивід в той самий рядок
  PROGRESS: 'progress'   // Вивід прогресу з очищенням
}
const DATABASES = {
  PEOPLES_DB: "174d30fa35d081959d8ecf5ec1b563de",
  FSM_RELEASES_DB: "174d30fa35d081b3aeb1cc01a067bfaf",
  FSM_DB: "174d30fa35d08186932ff906ec9925c2",
  FRANCHISES_DB: "174d30fa35d08165aaf2d294f81e319f",
  COMICS_PUBLISHES_DB: "174d30fa35d081b98506d62e7d483cdc",
  ANIME_TITLES_DB: "174d30fa35d081fb8baccf7e405d5cf9",
  ANIME_RELEASES_DB: "174d30fa35d081278dcdf4335e149330",
  TEAMS_DB: "174d30fa35d081c4968cc340c89e4667",
  TV_STREAMS_DB: "174d30fa35d08146ae51f6caa79fcbda",
  PUBLISHES_DB: "174d30fa35d081899d50c6415546938f",
  MANGA_TITLES_DB: "174d30fa35d081818249d1b3f1d14e63",
  MANGA_PUBLISHES_DB: "174d30fa35d0815c8294ca83a8f13c96"
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

// Функція для завантаження попередніх даних з файлу
async function loadPreviousData(fileName) {
  try {
    const filePath = path.join(__dirname, "../../CPRcatalog 1.0/json", fileName)
    const data = JSON.parse(await fs.readFile(filePath, "utf8"))
    colorLog(`Завантажено попередні дані з ${fileName}: ${data.length} записів`, 'blue')
    return data
  } catch (error) {
    colorLog(`Попередні дані з ${fileName} не знайдено або помилка читання: ${error.message}`, 'yellow')
    return []
  }
}

async function loadPostersData() {
  try {
    const response = await axios.get('https://raw.githubusercontent.com/DrBryanMan/UAPosters/refs/heads/main/PostersList.json')
    const data = response.data
    colorLog(`Завантажено PostersData.json з GitHub: ${data.length} записів`, 'blue')
    return data
  } catch (error) {
    colorLog(`Не вдалося завантажити PostersData.json: ${error.message}`, 'yellow')
    return []
  }
}

// Функція для завантаження даних Mikai
async function loadMikaiData() {
  try {
    const response = await axios.get(MIKAI_API_URL)
    const data = response.data
    colorLog(`Завантажено Mikai дані: ${data.length} записів`, 'blue')
    return data
  } catch (error) {
    colorLog(`Не вдалося завантажити Mikai дані: ${error.message}`, 'yellow')
    return []
  }
}

// Функція для збереження даних (без резервної копії)
async function saveData(fileName, data) {
  try {
    const targetDir = path.join(__dirname, '../../CPRcatalog 1.0/json')
    // На випадок, якщо каталог ще не існує
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

async function getPageById(pageId) {
  try {
    const response = await Notion.pages.retrieve({
      page_id: pageId,
    })
    return response
  } catch (error) {
    console.error('Помилка при отриманні даних:', error)
    throw error
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
      start_cursor: nextCursor || undefined,
      // page_size: 100
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
        poster: anime.image,
        synonyms: anime.synonyms,
        status: anime.status,
        season: anime.season,
        duration: anime.duration,
        score: anime.score,
        scored_by: anime.scored_by,
        source: anime.source,
        mal_id: anime.mal_id
      })
      count++
      colorLog(`Обробка: ${count}/${urls.length}. ${anime?.title_ua || anime?.title_jp || 'Невідомо для' + anime.id}`, 'green', OUTPUT_MODES.PROGRESS)
    } catch (error) {
      console.error(`Помилка отримання даних ${url}:`, error.message)
      continue
    }
  }
  return animeData
}

const processAnimeData = async (pages) => {
  // Завантажуємо попередні дані
  const previousData = await loadPreviousData("AnimeTitlesDB.json")
  const previousDataMap = new Map(previousData.map(anime => [anime.id, anime]))

  const postersData = await loadPostersData()
  const postersMap = new Map()
  for (const item of postersData) {
    if (item.hikka_url && Array.isArray(item.posters) && item.posters.length > 0) {
      postersMap.set(item.hikka_url, item.posters)
    }
  }

  // Завантажуємо дані Mikai
  const mikaiData = await loadMikaiData()
  const mikaiMap = new Map()
  for (const item of mikaiData) {
    if (item.malId) {
      mikaiMap.set(item.malId, item)
    }
  }
  
  const hikkaUrls = pages
    .filter(page => {
      const hikkaUrl = page.properties.Hikka?.url
      
      if (UPDATE_ALL_HIKKA) {
        return true
      }
      return hikkaUrl && !previousData.some(eD =>
        eD.hikka_url === hikkaUrl && (eD.poster || eD.hikkaSynonyms || eD.scoreMAL || eD.scoredbyMAL)
      )
    })
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
      .filter(item => item.hikka_url && (item.poster || item.hikkaSynonyms || item.scoreMAL || item.scoredbyMAL))
      .map(item => [item.hikka_url, {
        poster: item.poster,
        synonyms: item.synonyms,
        status: item.status,
        season: item.season,
        duration: item.duration,
        score: item.score,
        scored_by: item.scored_by,
        source: item.source,
        mal_id: item.mal_id
      }])
  )

  // Додаємо нові дані до мапи
  newHikkaData.forEach(item => {
    existingData.set(item.url, item)
  })

  const results = []
  let count = 0
  for (const page of pages) {
    const hikka_url = page.properties.Hikka?.url
    const hikkaInfo = hikka_url ? existingData.get(hikka_url) : null
    count++
    
    const pageId = page.id
    const previousAnime = previousDataMap.get(pageId)

    const hikkaPoster = hikkaInfo?.poster
    const posterList = hikka_url ? postersMap.get(hikka_url) : null

    const posterUrl = Array.isArray(posterList) && posterList.length > 0
      ? `https://raw.githubusercontent.com/DrBryanMan/UAPosters/refs/heads/main/${posterList[0].url}`
      : hikkaPoster

    // Перевіряємо чи є вже посилання Mikai з попередніх даних
    let mikaiUrl = previousAnime?.mikai || null
    
    // Якщо немає посилання Mikai, спробуємо знайти його
    if (!mikaiUrl && hikkaInfo?.mal_id) {
      const mikaiItem = mikaiMap.get(hikkaInfo.mal_id)
      if (mikaiItem) {
        mikaiUrl = `https://mikai.me/anime/${mikaiItem.id}-${mikaiItem.slug}`
        colorLog(`Знайдено Mikai посилання для MAL ID ${hikkaInfo.mal_id}: ${mikaiUrl}`, 'blue')
      }
    }
    
    // Отримуємо нові дані з поточної сторінки
    const newAnimeData = {
      id: pageId,
      last_edited: page.last_edited_time,
      hikka_url,
      cover: page.cover?.external?.url || page.cover?.file?.url,
      poster: posterUrl,
      posters: posterList || [],
      title: page.properties['Назва тайтлу'].title[0]?.plain_text,
      romaji: page.properties.Ромаджі.rich_text[0]?.plain_text,
      synonyms: page.properties.Синоніми.rich_text?.flatMap(i => i.plain_text.split('\n')),
      hikkaSynonyms: hikkaInfo?.synonyms,
      type: page.properties['Тип медіа'].multi_select[0]?.name,
      format: page.properties.Формат.select?.name,
      year: page.properties['Рік виходу'].rich_text[0]?.plain_text,
      genre: page.properties.Жанри.select?.name,
      status: hikkaInfo?.status,
      season: hikkaInfo?.season,
      duration: hikkaInfo?.duration,
      scoreMAL: hikkaInfo?.score,
      scoredbyMAL: hikkaInfo?.scored_by,
      anitube: page.properties.АніТюб.url,
      uaserial: page.properties.Uaserial.url,
      uakino: page.properties.Uakino.url,
      mikai: mikaiUrl, // Додаємо поле mikai
      tg_channel: page.properties['Tg канал'].url,
      episodes: page.properties['Кількість серій'].rich_text[0]?.plain_text,
      releases: page.properties['🗂️ Релізи команд'].relation || [],
      relations: page.properties["Пов'язані частини"].relation || [],
      franchise: page.properties.Франшиза.relation.id || [],
      source: hikkaInfo?.source,
      mal_id: hikkaInfo?.mal_id
    }
    
    results.push(newAnimeData)
  }
  return results
}

async function processReleaseData(pages) {
  // Завантажуємо попередні дані
  const previousData = await loadPreviousData("AnimeReleasesDB.json")
  const previousDataMap = new Map(previousData.map(release => [release.id, release]))
  
  const results = []
  let count = 0
  for (const page of pages) {
    count++
    const pageId = page.id
    const previousRelease = previousDataMap.get(pageId)

    const currentEpisodes = page.properties['Кількість'].rich_text[0]?.plain_text || '??'

    // Отримуємо нові дані
    const newReleaseData = {
      id: pageId,
      last_edited: page.last_edited_time,
      animeIds: page.properties['Тайтл']?.relation.map(r => r.id) || [],
      title: page.properties['Назва релізу'].title[0]?.plain_text,
      teams: page.properties['Команда']?.relation || [],
      teamscolab: page.properties['Спільно з']?.relation,
      dubinfo: page.properties['Озвучка'].multi_select || 'Не вказано',
      subinfo: page.properties['Саби'].multi_select,
      status: page.properties['Статус'].status?.name || 'Невідомо',
      episodes: currentEpisodes,
      episodesLastUpdate: previousRelease && previousRelease.episodes !== currentEpisodes
        ? new Date().toISOString()
        : previousRelease?.episodesLastUpdate || null,
      wereWatch: page.properties['Дивитись'].multi_select || 'Не вказано',
      torrentLinks: page.properties['Торент посилання'].rich_text
        .filter(link => link !== null)
        .map(link => ({
          text: link.plain_text.trim(),
          href: link.href
        })) || [],
      fexlink: page.properties['FEX посилання']?.url,
      sitelink: page.properties['На сайті']?.url,
      problems: page.properties['Проблеми']?.multi_select
    }
    
    results.push(newReleaseData)
  }
  return results
}

// Функція для формування зв'язків релізів для команд
function buildTeamReleases(teamsData, releasesData) {
  colorLog("Формування зв'язків релізів для команд...", 'blue')
  
  // Створюємо мапу команд для швидкого пошуку
  const teamsMap = new Map(teamsData.map(team => [team.id, team]))
  
  // Проходимо по всім релізам і додаємо їх до відповідних команд
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
          // Перевіряємо, чи не додали вже цей реліз
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
          // Перевіряємо, чи не додали вже цей реліз
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

async function processTeamData(pages, releasesData = []) {
  // Завантажуємо попередні дані
  const previousData = await loadPreviousData("TeamsDB.json")
  const previousDataMap = new Map(previousData.map(team => [team.id, team]))
  
  const results = []
  let count = 0
  
  for (const page of pages) {
    count++
    
    // Отримуємо нові дані
    const newTeamData = {
      // Основна інформація
      id: page.id,
      last_edited: page.last_edited_time,
      cover: page.cover,
      logo: page.icon?.external?.url || page.icon?.file?.url,
      name: page.properties['Назва команди']?.title[0]?.plain_text || 'Невідомо',
      altname: page.properties['Синоніми'].rich_text?.flatMap(i => i.plain_text.split('\n')),
      founded: page.properties['Дата заснування'].date,

      // Додаткова інформація
      type_team: page.properties['Тип команди'].multi_select.map(item => item.name) || [],
      type_activity: page.properties['Тип робіт'].multi_select.map(item => item.name) || [],
      status: page.properties.Статус.select?.name || 'Невідомо',
      members: page.properties['Склад команди'].relation || [],
      anime_releases: [], // Поки що пустий, заповнимо пізніше

      // Соціальні посилання
      site: page.properties.Сайт?.url,
      anitube: page.properties.AniTube?.url,
      youtube: page.properties.YouTube?.url,
      insta: page.properties.Instagram?.url,
      tiktok: page.properties.TikTok?.url,
      tg: page.properties.Telegram?.url,
      tg_video: page.properties['ТГ релізи']?.url,
    }
    
    results.push(newTeamData)
  }
  
  // Якщо є дані релізів, формуємо зв'язки
  if (releasesData && releasesData.length > 0) {
    return buildTeamReleases(results, releasesData)
  }
  
  return results
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

async function importAnimeTitles() {
  const databaseId = DATABASES.ANIME_TITLES_DB
  return await importData(databaseId, "Аніме тайтли", "AnimeTitlesDB.json", processAnimeData)
}

async function importReleases() {
  const databaseId = DATABASES.ANIME_RELEASES_DB
  return await importData(databaseId, "Аніме релізи", "AnimeReleasesDB.json", processReleaseData)
}

async function importTeams(releasesData) {
  const databaseId = DATABASES.TEAMS_DB
  return await importData(databaseId, "Команди фандабу", "TeamsDB.json", processTeamData, releasesData)
}
async function getReleasesJson(useLocal = false) {
  if (useLocal) {
    // Використовуємо локальний файл
    return await loadPreviousData("AnimeReleasesDB.json")
  } else {
    // Тягнемо з Notion
    return await importReleases()
  }
}

async function runAllImports() {
  try {
    // await importAnimeTitles()
    const releasesData = await getReleasesJson(true) // true = з локального
    await importTeams(releasesData)
    colorLog("Всі імпорти успішно завершено!", 'green')
  } catch (error) {
    colorLog(`Помилка під час виконання імпортів: ${error.message}`, 'red')
  }
}

// Функція для тестування
async function testGetPageById() {
  // getPageById('1a1d30fa35d080549886d2d3c4a7e7d8') // тайтл
  // getPageById('1f2d30fa35d080fe9cfccbdd93ca7090') // реліз
  getPageById('24fd30fa-35d0-8088-91b0-ccab38dbf2e4') // команда
  .then(page => {
    console.log('URL:', JSON.stringify(page, null, 2))
  })
}

// Виконуємо всі імпорти
runAllImports()