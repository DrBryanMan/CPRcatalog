const { Client } = require("@notionhq/client")
const axios = require('axios')
const fs = require("fs").promises
const path = require("path")
require("dotenv").config()

const HIKKA_API_URL = 'https://api.hikka.io/anime'
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
  PEOPLES_DB: "910dbf9f4f4a416d9322ba5d12f75605",
  FSM_RELEASES_DB: "aeeb8936580a41ae95c472b5db7a9954",
  FSM_DB: "1298487f4c45458dbea35e7d9bdc887a",
  FRANCHISES_DB: "65e3170869d149fe80a37e50a717f8fc",
  COMICS_PUBLISHES_DB: "db303569819b4359932352683e8d5451",
  ANIME_RELEASES_DB: "7b5115df827e4ea59e9e1b8c96757a4e",
  TEAMS_DB: "494187f8f1894196839d0437f74ad0c4",
  ANIME_TITLES_DB: "2c56f87aefa1421599e91845dbf8e140",
  TV_STREAMS_DB: "c4655b9aa3174699b322646cf2ad6a80",
  PUBLISHES_DB: "8e9aed9714e0455fac4581bac9a62534",
  MANGA_TITLES_DB: "2633db218dd64b3e9a40c7646bd7e319",
  MANGA_PUBLISHES_DB: "ffe7b2a2b3a54ff4a38dd57c0cbfafa4"
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

async function getAllPages(databaseId, dbTitle, propertiesToExpand = []) {
  let pages = []
  let hasMore = true
  let nextCursor = null
  let pageCount = 0
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
    // hasMore = false
    hasMore = response.has_more
    nextCursor = response.next_cursor
  }
  colorLog(`\nЗавершено отримання сторінок. Всього: ${totalProcessed}`, 'reset')

  if (propertiesToExpand.length > 0) {
    colorLog(`Початок розширення властивостей: ${propertiesToExpand.join(', ')}`, 'reset')
    const processedPages = []
    for (const page of pages) {
      try {
        const processedPage = { ...page }
        for (const propertyName of propertiesToExpand) {
          if (processedPage.properties[propertyName]?.type === 'relation') {
            await new Promise(resolve => setTimeout(resolve, 100))
            try {
              const expandedRelations = await getAllRelatedIds(processedPage.id, processedPage.properties[propertyName].id)
              processedPage.properties[propertyName].relation = expandedRelations.map(id => ({ id }))
              processedPage.properties[propertyName].has_more = false
            } catch (error) {
              console.error(`Помилка при отриманні зв'язків для сторінки ${processedPage.id}:`, error.message)
              processedPage.properties[propertyName].relation = []
              processedPage.properties[propertyName].has_more = false
            }
          }
        }
        processedPages.push(processedPage)
        pageCount++
        const title = processedPage.properties['Назва тайтлу']?.title[0]?.plain_text || 
                      processedPage.properties['Назва релізу']?.title[0]?.plain_text || 
                      processedPage.properties['Назва команди']?.title[0]?.plain_text || 
                      processedPage.id
        colorLog(`Обробка ${pageCount}/${pages.length}: ${title}`, 'yellow', OUTPUT_MODES.PROGRESS)
      } catch (error) {
        colorLog(`Помилка при обробці сторінки ${page.id}: ${error.message}`, 'red')
        processedPages.push(page)
      }
    }
    return processedPages
  }

  for (const page of pages) {
    pageCount++
    const title = page.properties['Назва тайтлу']?.title[0]?.plain_text || 
                  page.properties['Назва релізу']?.title[0]?.plain_text || 
                  page.properties['Назва команди']?.title[0]?.plain_text || 
                  page.id
    colorLog(`Обробка ${pageCount}/${pages.length}: ${title}`, 'yellow', OUTPUT_MODES.PROGRESS)
  }
  return pages
}

async function getAllRelatedIds(pageId, propertyId) {
  let allIds = []
  let hasMore = true
  let startCursor = undefined
  let retryCount = 0
  const MAX_RETRIES = 3

  while (hasMore && retryCount < MAX_RETRIES) {
    try {
      const response = await Notion.pages.properties.retrieve({
        page_id: pageId,
        property_id: propertyId,
        start_cursor: startCursor,
      })

      allIds = allIds.concat(response.results.map(item => item.relation.id))
      hasMore = response.has_more
      startCursor = response.next_cursor
      retryCount = 0 // Скидаємо лічильник спроб після успішного запиту
      
      // Якщо є ще сторінки, додаємо невелику затримку
      if (hasMore) {
        await new Promise(resolve => setTimeout(resolve, 100))
      }
    } catch (error) {
      retryCount++
      console.error(`Спроба ${retryCount} отримати зв'язки не вдалася:`, error.message)
      
      if (retryCount < MAX_RETRIES) {
        // Чекаємо перед повторною спробою
        await new Promise(resolve => setTimeout(resolve, 1000 * retryCount))
      } else {
        console.error(`Досягнуто максимальну кількість спроб для pageId: ${pageId}`)
        hasMore = false
      }
    }
  }

  return allIds
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
        score: anime.score,
        scored_by: anime.scored_by
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
  let previousData = []
  const existingDataPath = path.join(__dirname, "../json/AnimeTitlesDB.json")
  previousData = JSON.parse(await fs.readFile(existingDataPath, "utf8"))

  const hikkaUrls = pages
    .filter(page => {
      const hikkaUrl = page.properties.Hikka?.url
      
      if (UPDATE_ALL_HIKKA) {
        return true
      }
      return hikkaUrl && !previousData.some(existingData => existingData.hikka_url === hikkaUrl && existingData.poster)
    })
    .map(page => page.properties.Hikka.url)

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
        synonyms: item.hikkaSynonyms,
        score: item.scoreMAL,
        scored_by: item.scoredbyMAL
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
    colorLog(`Обробка: ${count}/${pages.length}. ${page.properties['Назва тайтлу'].title[0]?.plain_text || 'Невідомо для' + page.id}`, 'green', OUTPUT_MODES.PROGRESS)
    results.push({
      id: page.id,
      last_edited: page.last_edited_time,
      hikka_url,
      cover: page.cover?.external?.url || page.cover?.file?.url,
      poster: hikkaInfo?.poster,
      title: page.properties['Назва тайтлу'].title[0]?.plain_text || 'Без назви',
      romaji: page.properties.Ромаджі.rich_text[0]?.plain_text,
      synonyms: page.properties.Синоніми.rich_text?.flatMap(i => i.plain_text.split('\n')),
      hikkaSynonyms: hikkaInfo?.synonyms,
      // 
      type: page.properties['Тип медіа'].multi_select[0]?.name,
      format: page.properties.Формат.select?.name,
      year: page.properties['Рік виходу'].rich_text[0]?.plain_text,
      scoreMAL: hikkaInfo?.score,
      scoredbyMAL: hikkaInfo?.scored_by,
      // 
      Анітюб: page.properties.АніТюб.url,
      Юакіно: page.properties.Uakino.url,
      тґ_канал: page.properties['Tg канал'].url,
      episodes: page.properties['Кількість серій'].rich_text[0]?.plain_text,
      releases: page.properties['🗂️ Релізи команд'].relation,
      relations: page.properties["Пов'язані частини"].relation,
      Франшиза: page.properties.Франшиза.relation,
      posters: page.properties.Постер?.files.map(i => ({
        name: i.name,
        url: i.external?.url || i.file.url
      })),
    })
  }
  return results
}

function processReleaseData(pages) {
  const results = []
  let count = 0
  for (const page of pages) {
    count++
    colorLog(`Обробка: ${count}/${pages.length}. ${page.properties['Назва релізу'].title[0]?.plain_text || 'Невідомо для' + page.id}`, 'blue', OUTPUT_MODES.PROGRESS)
    results.push({
      id: page.id,
      last_edited: page.last_edited_time,
      animeIds: page.properties['Тайтл']?.relation.map(r => r.id) || [],
      title: page.properties['Назва релізу'].title[0]?.plain_text || 'Без назви',
      cover: page.cover?.external?.url || page.cover?.file.url,
      teams: page.properties['Команда']?.relation,
      status: page.properties['Статус'].status?.name || 'Невідомо',
      episodes: page.properties['Кількість'].rich_text[0]?.plain_text || 'Невідомо',
      torrent: page.properties['Торент']?.select?.name || 'Невідомо',
      torrentLinks: page.properties['Торент посилання'].rich_text
        .filter(link => link !== null)
        .map(link => ({
          text: link.plain_text,
          href: link.href
        })),
      posters: page.properties.Постер?.files.map(i => ({
        name: i.name,
        url: i.external?.url || i.file.url
      })),
    })
  }
  return results
}

function processTeamData(pages) {
  const results = []
  for (const page of pages) {
    results.push({
      // Основна інформація
      id: page.id,
      last_edited: page.last_edited_time,
      cover: page.cover,
      logo: page.icon?.external?.url || page.icon?.file?.url,
      name: page.properties['Назва команди']?.title[0]?.plain_text || 'Невідомо',

      // Додаткова інформація
      status: page.properties.Статус.select?.name || 'Невідомо',
      type_activity: page.properties['Тип робіт'].multi_select.map(item => item.name) || 'Невідомо',
      members: page.properties['Склад команди'].relation,
      anime_releases: page.properties['Релізи аніме'].relation,

      // Соціальні посилання
      site: page.properties.Сайт?.url,
      anitube: page.properties.AniTube?.url,
      youtube: page.properties.YouTube?.url,
      insta: page.properties.Instagram?.url,
      tg: page.properties.Telegram?.url,
      tg_video: page.properties['ТҐ релізи']?.url,
    })
  }
  return results
}

async function importData(databaseId, dbTitle, outputFileName, propertiesToExpand = [], processFunction) {
  console.log(`Початок імпорту даних для ${outputFileName}...`)
  const pages = await getAllPages(databaseId, dbTitle, propertiesToExpand)
  await fs.writeFile(
    path.join(__dirname, '../json', outputFileName),
    JSON.stringify(await processFunction(pages), null, 2)
  )
  console.log('Імпорт завершено.')
}

async function importAnimeTitles() {
  const databaseId = DATABASES.ANIME_TITLES_DB
  await importData(databaseId, "Аніме тайтли", "AnimeTitlesDB.json", [], processAnimeData)
}

async function importReleases() {
  const databaseId = DATABASES.ANIME_RELEASES_DB
  await importData(databaseId, "Аніме релізи", "AnimeReleasesDB.json", [], processReleaseData)
}

async function importTeams() {
  const databaseId = DATABASES.TEAMS_DB
  await importData(databaseId, "Команди фандабу", "TeamsDB.json", ["Релізи аніме"], processTeamData)
}

async function runAllImports() {
  await importAnimeTitles()
  await importReleases()
  await importTeams()
  // getPageById('1427667f-790e-8093-bdf8-fbf745c32f44')
  // .then(page => {
  //   console.log('URL:', JSON.stringify(page, null, 2))
  // })
}

runAllImports()