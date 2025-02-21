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
    const filePath = path.join(__dirname, "../json", fileName)
    const data = JSON.parse(await fs.readFile(filePath, "utf8"))
    colorLog(`Завантажено попередні дані з ${fileName}: ${data.length} записів`, 'blue')
    return data
  } catch (error) {
    colorLog(`Попередні дані з ${fileName} не знайдено або помилка читання: ${error.message}`, 'yellow')
    return []
  }
}

// Функція для створення резервної копії файлу
async function createBackup(fileName) {
  try {
    const sourcePath = path.join(__dirname, '../json', fileName)
    const backupPath = path.join(
      __dirname, 
      '../json/backups', 
      `${path.parse(fileName).name}_backup_${new Date().toISOString().replace(/:/g, '-')}${path.parse(fileName).ext}`
    )
    
    // Створюємо директорію для резервних копій, якщо її не існує
    await fs.mkdir(path.join(__dirname, '../json/backups'), { recursive: true })
    
    await fs.copyFile(sourcePath, backupPath)
    colorLog(`Створено резервну копію: ${backupPath}`, 'green')
  } catch (error) {
    colorLog(`Не вдалося створити резервну копію: ${error.message}`, 'yellow')
  }
}

// Функція для збереження даних з можливістю створення резервної копії
async function saveData(fileName, data) {
  try {
    // Спершу робимо резервну копію
    await createBackup(fileName)
    
    // Зберігаємо нові дані
    await fs.writeFile(
      path.join(__dirname, '../json', fileName),
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
  const MAX_RETRIES = 10

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
        await new Promise(resolve => setTimeout(resolve, 2000 * retryCount))
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
  // Завантажуємо попередні дані
  const previousData = await loadPreviousData("AnimeTitlesDB.json")
  const previousDataMap = new Map(previousData.map(anime => [anime.id, anime]))
  
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
    
    const pageId = page.id
    const previousAnime = previousDataMap.get(pageId)
    const titleText = page.properties['Назва тайтлу'].title[0]?.plain_text || 'Невідомо для' + pageId
    colorLog(`Обробка: ${count}/${pages.length}. ${titleText}`, 'green', OUTPUT_MODES.PROGRESS)
    
    // Отримуємо нові дані з поточної сторінки
    const newAnimeData = {
      id: pageId,
      last_edited: page.last_edited_time,
      hikka_url,
      cover: page.cover?.external?.url || page.cover?.file?.url,
      poster: hikkaInfo?.poster,
      title: titleText,
      romaji: page.properties.Ромаджі.rich_text[0]?.plain_text,
      synonyms: page.properties.Синоніми.rich_text?.flatMap(i => i.plain_text.split('\n')),
      hikkaSynonyms: hikkaInfo?.synonyms,
      type: page.properties['Тип медіа'].multi_select[0]?.name,
      format: page.properties.Формат.select?.name,
      year: page.properties['Рік виходу'].rich_text[0]?.plain_text,
      scoreMAL: hikkaInfo?.score,
      scoredbyMAL: hikkaInfo?.scored_by,
      Анітюб: page.properties.АніТюб.url,
      Юакіно: page.properties.Uakino.url,
      тґ_канал: page.properties['Tg канал'].url,
      episodes: page.properties['Кількість серій'].rich_text[0]?.plain_text,
      releases: page.properties['🗂️ Релізи команд'].relation || [],
      relations: page.properties["Пов'язані частини"].relation || [],
      Франшиза: page.properties.Франшиза.relation || [],
      posters: page.properties.Постер?.files.map(i => ({
        name: i.name,
        url: i.external?.url || i.file.url
      })) || []
    }
    
    // Перевіряємо і зберігаємо попередні значення для порожніх масивів
    if (previousAnime) {
      if (newAnimeData.releases.length === 0 && previousAnime.releases && previousAnime.releases.length > 0) {
        newAnimeData.releases = previousAnime.releases;
        colorLog(`Збережено попередні дані релізів для "${titleText}" (${previousAnime.releases.length} релізів)`, 'yellow')
      }
      
      if (newAnimeData.relations.length === 0 && previousAnime.relations && previousAnime.relations.length > 0) {
        newAnimeData.relations = previousAnime.relations;
        colorLog(`Збережено попередні дані пов'язаних частин для "${titleText}"`, 'yellow')
      }
      
      if (newAnimeData.Франшиза.length === 0 && previousAnime.Франшиза && previousAnime.Франшиза.length > 0) {
        newAnimeData.Франшиза = previousAnime.Франшиза;
        colorLog(`Збережено попередні дані франшизи для "${titleText}"`, 'yellow')
      }
      
      if (newAnimeData.posters.length === 0 && previousAnime.posters && previousAnime.posters.length > 0) {
        newAnimeData.posters = previousAnime.posters;
        colorLog(`Збережено попередні постери для "${titleText}"`, 'yellow')
      }
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
    const titleText = page.properties['Назва релізу'].title[0]?.plain_text || 'Невідомо для' + pageId
    
    colorLog(`Обробка: ${count}/${pages.length}. ${titleText}`, 'blue', OUTPUT_MODES.PROGRESS)
    
    // Отримуємо нові дані
    const newReleaseData = {
      id: pageId,
      last_edited: page.last_edited_time,
      animeIds: page.properties['Тайтл']?.relation.map(r => r.id) || [],
      title: titleText,
      cover: page.cover?.external?.url || page.cover?.file.url,
      teams: page.properties['Команда']?.relation || [],
      status: page.properties['Статус'].status?.name || 'Невідомо',
      episodes: page.properties['Кількість'].rich_text[0]?.plain_text || 'Невідомо',
      torrent: page.properties['Торент']?.select?.name || 'Невідомо',
      torrentLinks: page.properties['Торент посилання'].rich_text
        .filter(link => link !== null)
        .map(link => ({
          text: link.plain_text,
          href: link.href
        })) || [],
      posters: page.properties.Постер?.files.map(i => ({
        name: i.name,
        url: i.external?.url || i.file.url
      })) || []
    }
    
    // Перевіряємо і зберігаємо попередні значення для порожніх масивів
    if (previousRelease) {
      if (newReleaseData.animeIds.length === 0 && previousRelease.animeIds && previousRelease.animeIds.length > 0) {
        newReleaseData.animeIds = previousRelease.animeIds;
        colorLog(`Збережено попередні ID аніме для релізу "${titleText}"`, 'yellow')
      }
      
      if (newReleaseData.teams.length === 0 && previousRelease.teams && previousRelease.teams.length > 0) {
        newReleaseData.teams = previousRelease.teams;
        colorLog(`Збережено попередні дані команд для релізу "${titleText}"`, 'yellow')
      }
      
      if (newReleaseData.torrentLinks.length === 0 && previousRelease.torrentLinks && previousRelease.torrentLinks.length > 0) {
        newReleaseData.torrentLinks = previousRelease.torrentLinks;
        colorLog(`Збережено попередні торент-посилання для релізу "${titleText}"`, 'yellow')
      }
      
      if (newReleaseData.posters.length === 0 && previousRelease.posters && previousRelease.posters.length > 0) {
        newReleaseData.posters = previousRelease.posters;
        colorLog(`Збережено попередні постери для релізу "${titleText}"`, 'yellow')
      }
    }
    
    results.push(newReleaseData)
  }
  return results
}

async function processTeamData(pages) {
  // Завантажуємо попередні дані
  const previousData = await loadPreviousData("TeamsDB.json")
  const previousDataMap = new Map(previousData.map(team => [team.id, team]))
  
  const results = []
  let count = 0
  
  for (const page of pages) {
    count++
    const pageId = page.id
    const previousTeam = previousDataMap.get(pageId)
    const teamName = page.properties['Назва команди']?.title[0]?.plain_text || 'Невідомо для' + pageId
    
    colorLog(`Обробка команди ${count}/${pages.length}: ${teamName}`, 'blue', OUTPUT_MODES.PROGRESS)
    
    // Отримуємо нові дані
    const newTeamData = {
      // Основна інформація
      id: pageId,
      last_edited: page.last_edited_time,
      cover: page.cover,
      logo: page.icon?.external?.url || page.icon?.file?.url,
      name: teamName,

      // Додаткова інформація
      status: page.properties.Статус.select?.name || 'Невідомо',
      type_activity: page.properties['Тип робіт'].multi_select.map(item => item.name) || [],
      members: page.properties['Склад команди'].relation || [],
      anime_releases: page.properties['Релізи аніме'].relation || [],

      // Соціальні посилання
      site: page.properties.Сайт?.url,
      anitube: page.properties.AniTube?.url,
      youtube: page.properties.YouTube?.url,
      insta: page.properties.Instagram?.url,
      tg: page.properties.Telegram?.url,
      tg_video: page.properties['ТҐ релізи']?.url,
    }
    
    // Перевіряємо і зберігаємо попередні значення для порожніх масивів
    if (previousTeam) {
      if (newTeamData.members.length === 0 && previousTeam.members && previousTeam.members.length > 0) {
        newTeamData.members = previousTeam.members;
        colorLog(`Збережено попередній склад команди "${teamName}"`, 'yellow')
      }
      
      if (newTeamData.anime_releases.length === 0 && previousTeam.anime_releases && previousTeam.anime_releases.length > 0) {
        newTeamData.anime_releases = previousTeam.anime_releases;
        colorLog(`Збережено попередні релізи команди "${teamName}" (${previousTeam.anime_releases.length} релізів)`, 'yellow')
      }
      
      if (newTeamData.type_activity.length === 0 && previousTeam.type_activity && previousTeam.type_activity.length > 0) {
        newTeamData.type_activity = previousTeam.type_activity;
        colorLog(`Збережено попередні типи діяльності команди "${teamName}"`, 'yellow')
      }
    }
    
    results.push(newTeamData)
  }
  
  return results
}

async function importData(databaseId, dbTitle, outputFileName, propertiesToExpand = [], processFunction) {
  console.log(`Початок імпорту даних для ${outputFileName}...`)
  try {
    const pages = await getAllPages(databaseId, dbTitle, propertiesToExpand)
    const processedData = await processFunction(pages)
    await saveData(outputFileName, processedData)
    colorLog(`Імпорт даних для ${outputFileName} успішно завершено.`, 'green')
  } catch (error) {
    colorLog(`Помилка при імпорті даних для ${outputFileName}: ${error.message}`, 'red')
    throw error
  }
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
  try {
    await importAnimeTitles()
    await importReleases()
    await importTeams()
    colorLog("Всі імпорти успішно завершено!", 'green')
  } catch (error) {
    colorLog(`Помилка під час виконання імпортів: ${error.message}`, 'red')
  }
}

// Функція для тестування
async function testGetPageById() {
  getPageById('174d30fa-35d0-810f-a927-fa233d7a7fd8')
  .then(page => {
    console.log('URL:', JSON.stringify(page, null, 2))
  })
}

// Виконуємо всі імпорти
runAllImports()