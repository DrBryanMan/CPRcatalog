const { Client } = require("@notionhq/client")
const fs = require("fs").promises
const path = require("path")
require("dotenv").config({ path: path.join(__dirname, "../.env") })

const Notion = new Client({ 
  auth: process.env.NOTION_TOKEN
})

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

async function getPageById(pageId) {
  try {
    return await Notion.pages.retrieve({ page_id: pageId })
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
      newPages.push(page)
      modifiedPages.push(page)
    } else {
      const existingLastEdited = existingMap.get(pageId)
      
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

function buildAnimeData(page) {
  return {
    id: page.id,
    hikka_url: page.properties.Hikka?.url,
    cover: page.cover?.external?.url || page.cover?.file?.url,
    title: page.properties['Назва тайтлу'].title[0]?.plain_text,
    romaji: page.properties.Ромаджі.rich_text[0]?.plain_text,
    synonyms: page.properties.Синоніми.rich_text?.flatMap(i => i.plain_text.split('\n')),
    type: page.properties['Тип медіа'].multi_select[0]?.name,
    format: page.properties['Формат'].select?.name,
    format_cpr: page.properties['Формат цпр'].select?.name,
    year: page.properties['Рік виходу'].rich_text[0]?.plain_text,
    genre: page.properties.Жанри.select?.name,
    anitube: page.properties.АніТюб.url,
    uaserial: page.properties.Uaserial.url,
    uakino: page.properties.Uakino.url,
    tg_channel: page.properties['Tg канал'].url,
    episodes: page.properties['Кількість серій'].rich_text[0]?.plain_text,
    releases: page.properties['🗂️ Релізи команд'].relation || [],
    relations: page.properties["Пов'язані частини"].relation || [],
    franchise: page.properties.Франшиза.relation.id || [],
    created_time: page.created_time,
    last_edited: page.last_edited_time
  }
}

async function processAnimeData(pages) {
  const results = []
  
  for (const page of pages) {
    const newAnimeData = buildAnimeData(page)
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
  
  existingData.forEach(item => merged.set(item.id, item))
  newData.forEach(item => merged.set(item.id, item))
  
  return Array.from(merged.values())
}

async function importDatabase(databaseId, dbTitle, outputFileName, processFunction, additionalData = null, onlyModified = true) {
  console.log(`Початок імпорту даних для ${outputFileName}...`)
  
  try {
    const existingData = await loadPreviousData(outputFileName)
    const allPages = await getAllPages(databaseId, dbTitle)
    
    let pagesToProcess = allPages
    
    if (onlyModified) {
      pagesToProcess = filterModifiedPages(allPages, existingData)
      colorLog(`Знайдено ${pagesToProcess.length} змінених сторінок з ${allPages.length} загальних`, 'blue')
    } else {
      colorLog(`Обробляємо всі ${allPages.length} сторінок (повний режим)`, 'blue')
    }
    
    if (pagesToProcess.length === 0) {
      colorLog(`Немає змінених даних для ${outputFileName}. Пропускаємо збереження.`, 'green')
      return existingData
    }
    
    const newData = await processFunction(pagesToProcess, additionalData)
    const processedData = mergeData(existingData, newData)

    await saveData(outputFileName, processedData)
    colorLog(`Імпорт даних для ${outputFileName} успішно завершено. Оновлено ${pagesToProcess.length} записів.`, 'green')
    
    return processedData
  } catch (error) {
    colorLog(`Помилка при імпорті даних для ${outputFileName}: ${error.message}`, 'red')
    throw error
  }
}

async function getAnimeTitlesJson(onlyModified = true) {
  return await importDatabase(
    DATABASES.ANIME_TITLES_DB,
    "Аніме тайтли",
    "AnimeTitlesDB.json",
    processAnimeData,
    null,
    onlyModified
  )
}

async function getReleasesJson(onlyModified = true) {
  return await importDatabase(
    DATABASES.ANIME_RELEASES_DB,
    "Аніме релізи",
    "AnimeReleasesDB.json",
    processReleaseData,
    null,
    onlyModified
  )
}

async function getTeamsJson(releasesData, onlyModified = true) {
  return await importDatabase(
    DATABASES.TEAMS_DB,
    "Команди фандабу",
    "TeamsDB.json",
    processTeamData,
    releasesData,
    onlyModified
  )
}

async function runAllImports(onlyModified = true) {
  try {
    colorLog(`Запуск імпортів в режимі: ${onlyModified ? 'тільки змінені' : 'повний'}`, 'blue')

    await getAnimeTitlesJson(onlyModified)
    const releasesData = await getReleasesJson(onlyModified)
    // await getTeamsJson(releasesData, onlyModified)
    
    colorLog("Всі імпорти успішно завершено!", 'green')
  } catch (error) {
    colorLog(`Помилка під час виконання імпортів: ${error.message}`, 'red')
    throw error
  }
}

;(async () => {
  try {
    await runAllImports()
  } catch (err) {
    console.error(err)
    process.exit(1)
  }
})()
