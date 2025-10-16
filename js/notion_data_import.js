const { Client } = require("@notionhq/client")
const axios = require('axios')
const fs = require("fs").promises
const path = require("path")
require("dotenv").config({ path: path.join(__dirname, "../.env") })

const MIKAI_API_URL = 'https://api.mikai.me/v1/integrations/hikka/anime'
const HIKKA_FORGE_API_URL = 'https://hikka-forge.lorgon.org/anime'

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

const MIKAI_UPDATE_MODES = {
  NONE: 'none',
  MISSING: 'missing',
  ALL: 'all'
}

const HIKKA_UPDATE_MODES = {
  NONE: 'none',
  MISSING: 'missing',
  ALL: 'all'
}

const REQUIRED_HIKKA_FIELDS = [
  'hikka_poster',
  'scoreMAL',
  'scoredbyMAL',
  'mal_id'
]

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
      process.stdout.write(`\r${coloredMessage}\n`)
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

async function loadMikaiData() {
  try {
    colorLog('Завантаження даних Mikai...', 'blue')
    const response = await axios.get(MIKAI_API_URL)
    colorLog(`Завантажено Mikai даних: ${response.data.length} записів`, 'green')
    return response.data
  } catch (error) {
    colorLog(`Не вдалося завантажити Mikai дані: ${error.message}`, 'yellow')
    return []
  }
}

function createMikaiMap(mikaiData) {
  const mikaiMap = new Map()
  
  for (const item of mikaiData) {
    if (item.malId) {
      mikaiMap.set(item.malId, {
        id: item.id,
        slug: item.slug,
        url: `https://mikai.me/anime/${item.id}-${item.slug}`
      })
    }
  }
  
  return mikaiMap
}

async function updateMikaiLinks(animeData, mode = MIKAI_UPDATE_MODES.NONE) {
  if (mode === MIKAI_UPDATE_MODES.NONE) {
    colorLog('Оновлення Mikai пропущено (режим: none)', 'yellow')
    return animeData
  }
  
  colorLog(`Оновлення Mikai посилань (режим: ${mode})...`, 'blue')
  
  const mikaiData = await loadMikaiData()
  if (mikaiData.length === 0) {
    colorLog('Немає даних Mikai для оновлення', 'yellow')
    return animeData
  }
  
  const mikaiMap = createMikaiMap(mikaiData)
  let updatedCount = 0
  
  const animesToUpdate = animeData.filter(anime => {
      if (!anime.mal_id) return false;
      return mode === MIKAI_UPDATE_MODES.ALL || (mode === MIKAI_UPDATE_MODES.MISSING && !anime.mikai);
  });

  if (animesToUpdate.length > 0) {
    colorLog(`Знайдено ${animesToUpdate.length} аніме для оновлення з Mikai`, 'blue');
  }

  for (let i = 0; i < animeData.length; i++) {
    const anime = animeData[i];
    if (!anime.mal_id) continue;

    const shouldUpdate = mode === MIKAI_UPDATE_MODES.ALL || 
                        (mode === MIKAI_UPDATE_MODES.MISSING && !anime.mikai);

    if (!shouldUpdate) continue;

    const mikaiInfo = mikaiMap.get(anime.mal_id);
    if (mikaiInfo) {
      colorLog(
        `Обробка Mikai: ${i + 1}/${animeData.length}. ${anime.title || 'Без назви'}`,
        'green',
        OUTPUT_MODES.PROGRESS
      );
      anime.mikai = mikaiInfo.url;
      updatedCount++;
    }
  }
  
  if (updatedCount > 0) {
      colorLog(`\nОновлено Mikai посилань: ${updatedCount}`, 'green');
  } else {
      colorLog('Не знайдено аніме для оновлення з Mikai', 'green');
  }

  return animeData
}

// ========== HIKKA FORGE FUNCTIONS ==========

function getMissingHikkaFields(anime) {
  const missing = [];
  for (const field of REQUIRED_HIKKA_FIELDS) {
    if (!anime.hasOwnProperty(field)) {
      missing.push(field);
    }
  }
  return missing;
}

function extractSlugFromUrl(hikkaUrl) {
  if (!hikkaUrl) return null
  
  try {
    const parts = hikkaUrl.split('/')
    return parts[parts.length - 1]
  } catch (error) {
    colorLog(`Помилка при витягуванні slug з URL ${hikkaUrl}: ${error.message}`, 'yellow')
    return null
  }
}

async function fetchHikkaForgeAnime(slug) {
  try {
    const response = await axios.get(`${HIKKA_FORGE_API_URL}/${slug}`)
    return response.data
  } catch (error) {
    colorLog(`Помилка при отриманні даних Hikka Forge для ${slug}: ${error.message}`, 'yellow')
    return null
  }
}

function extractHikkaForgeData(forgeResponse) {
  if (!forgeResponse) return null
  
  return {
    hikka_poster: forgeResponse.imageUrl || null,
    scoreMAL: forgeResponse.score || null,
    scoredbyMAL: forgeResponse.scoredBy || null,
    mal_id: forgeResponse.malId || null
  }
}

function needsHikkaUpdate(anime, mode) {
  if (!anime.hikka_url) {
    return false
  }
  
  if (mode === HIKKA_UPDATE_MODES.ALL) {
    return true
  }
  
  if (mode === HIKKA_UPDATE_MODES.MISSING) {
    return getMissingHikkaFields(anime).length > 0
  }
  
  return false
}

async function updateAnimeWithHikka(anime, hikkaData) {
  if (!hikkaData) return anime
  
  for (const [key, value] of Object.entries(hikkaData)) {
    if (value !== null && value !== undefined) {
      anime[key] = value
    }
  }
  
  return anime
}

async function updateHikkaForgeData(animeData, mode = HIKKA_UPDATE_MODES.NONE) {
  if (mode === HIKKA_UPDATE_MODES.NONE) {
    colorLog('Оновлення Hikka Forge пропущено (режим: none)', 'yellow')
    return animeData
  }
  
  colorLog(`Оновлення Hikka Forge даних (режим: ${mode})...`, 'blue')
  
  const animesToUpdate = animeData.filter(anime => needsHikkaUpdate(anime, mode))
  
  if (animesToUpdate.length === 0) {
    colorLog('Немає аніме для оновлення з Hikka Forge', 'green')
    return animeData
  }
  
  colorLog(`Знайдено ${animesToUpdate.length} аніме для оновлення з Hikka Forge`, 'blue')
  
  let updatedCount = 0
  let errorCount = 0
  
  for (let i = 0; i < animesToUpdate.length; i++) {
    const anime = animesToUpdate[i]
    const slug = extractSlugFromUrl(anime.hikka_url)
    
    if (!slug) {
      errorCount++
      continue
    }
    
    let logDetails = `(${slug})`
    if (mode === HIKKA_UPDATE_MODES.MISSING) {
        const missingFields = getMissingHikkaFields(anime)
        if (missingFields.length > 0) {
            logDetails = `(missing: ${missingFields.join(', ')})`
        }
    }
    
    colorLog(
      `Обробка Hikka Forge: ${i + 1}/${animesToUpdate.length}. ${anime.title || 'Без назви'} ${logDetails}`,
      'green',
      OUTPUT_MODES.PROGRESS
    )
    
    const forgeResponse = await fetchHikkaForgeAnime(slug)
    
    if (forgeResponse) {
      const hikkaData = extractHikkaForgeData(forgeResponse)
      await updateAnimeWithHikka(anime, hikkaData)
      updatedCount++
    } else {
      errorCount++
    }
    
    await new Promise(resolve => setTimeout(resolve, 100))
  }
  
  colorLog(`\nОновлено Hikka Forge даних: ${updatedCount}`, 'green')
  
  if (errorCount > 0) {
    colorLog(`Помилок при оновленні: ${errorCount}`, 'yellow')
  }
  
  return animeData
}

// ========== NOTION FUNCTIONS ==========

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

function buildAnimeData(page, previousAnime = null) {
  return {
    id: page.id,
    hikka_url: page.properties.Hikka?.url,
    cover: page.cover?.external?.url || page.cover?.file?.url,
    title: page.properties['Назва тайтлу']?.title[0]?.plain_text,
    romaji: page.properties.Ромаджі?.rich_text[0]?.plain_text,
    synonyms: page.properties.Синоніми?.rich_text?.flatMap(i => i.plain_text.split('\n')) || [],
    type: page.properties['Тип медіа']?.multi_select[0]?.name,
    format: page.properties['Формат']?.select?.name,
    format_cpr: page.properties['Формат цпр']?.select?.name,
    year: page.properties['Рік виходу']?.rich_text[0]?.plain_text,
    genre: page.properties.Жанри?.select?.name,
    anitube: page.properties.АніТюб?.url,
    uaserial: page.properties.Uaserial?.url,
    uakino: page.properties.Uakino?.url,
    tg_channel: page.properties['Tg канал']?.url,
    episodes: page.properties['Кількість серій']?.rich_text[0]?.plain_text,
    releases: page.properties['🗂️ Релізи команд']?.relation || [],
    relations: page.properties["Пов'язані частини"]?.relation || [],
    franchise: page.properties.Франшиза?.relation?.id || [],
    hikka_poster: previousAnime?.hikka_poster || null,
    scoreMAL: previousAnime?.scoreMAL || null,
    scoredbyMAL: previousAnime?.scoredbyMAL || null,
    mal_id: previousAnime?.mal_id || null,
    mikai: previousAnime?.mikai || null,
    created_time: page.created_time,
    last_edited: page.last_edited_time
  }
}

async function processAnimeData(pages) {
  const previousData = await loadPreviousData("AnimeTitlesDB.json")
  const previousDataMap = new Map(previousData.map(anime => [anime.id, anime]))
  
  const results = []
  
  for (const page of pages) {
    const previousAnime = previousDataMap.get(page.id)
    const newAnimeData = buildAnimeData(page, previousAnime)
    results.push(newAnimeData)
  }
  
  return results
}

function hasNewTorrentLinks(currentLinks, previousLinks) {
  const previousUrls = new Set((previousLinks || []).map(link => link.href))
  return currentLinks.some(link => !previousUrls.has(link.href))
}

function buildReleaseData(page, previousRelease) {
  const currentEpisodes = page.properties['Кількість']?.rich_text[0]?.plain_text || null
  const currentTorrentLinks = page.properties['Торент посилання']?.rich_text
    .filter(link => link !== null)
    .map(link => ({
      text: link.plain_text.trim(),
      href: link.href
    })) || []

  const previousTorrentLinks = previousRelease?.torrentLinks || []
  const hasNewLinks = hasNewTorrentLinks(currentTorrentLinks, previousTorrentLinks)

  return {
    id: page.id,
    title: page.properties['Назва релізу']?.title[0]?.plain_text,
    animeIds: page.properties['Тайтл']?.relation?.map(rel => rel.id) || [],
    teams: page.properties['Команда']?.relation?.map(rel => rel.id) || [],
    teamscolab: page.properties['Спільно з']?.relation?.map(rel => rel.id) || [],
    dubinfo: page.properties['Озвучка']?.multi_select?.flatMap(sel => sel.name) || 'Не вказано',
    subinfo: page.properties['Саби']?.multi_select?.flatMap(sel => sel.name) || 'Не вказано',
    status: page.properties['Статус']?.status?.name || 'Невідомо',
    episodes: currentEpisodes,
    episodessub: page.properties['Кількість суб']?.rich_text[0]?.plain_text || null,
    wereWatch: page.properties['Дивитись']?.multi_select?.map(ms => ({ name: ms.name, color: ms.color })) || 'Не вказано',
    torrentLinks: currentTorrentLinks,
    fexlink: page.properties['FEX посилання']?.url,
    sitelink: page.properties['На сайті']?.url,
    problems: page.properties['Проблеми']?.multi_select || [],
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
      for (const teamId of release.teams) {
        if (teamsMap.has(teamId)) {
          const teamData = teamsMap.get(teamId)
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
      for (const teamId of release.teamscolab) {
        if (teamsMap.has(teamId)) {
          const teamData = teamsMap.get(teamId)
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
    altname: page.properties['Синоніми']?.rich_text?.flatMap(i => i.plain_text.split('\n')) || [],
    founded: page.properties['Дата заснування']?.date,
    type_team: page.properties['Тип команди']?.multi_select?.map(item => item.name) || [],
    type_activity: page.properties['Тип роботи']?.multi_select?.map(item => item.name) || [],
    status: page.properties.Статус?.select?.name || 'Невідомо',
    members: page.properties['Склад команди']?.relation || [],
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

async function processTeamData(pages) {
  const results = []
  for (const page of pages) {
    const teamData = buildTeamData(page)
    results.push(teamData)
  }
  return results
}

function mergeData(existingData, newData) {
  const merged = new Map()
  
  existingData.forEach(item => merged.set(item.id, item))
  newData.forEach(item => merged.set(item.id, item))
  
  return Array.from(merged.values())
}

async function getAnimeTitlesJson(options = {}) {
  const {
    onlyModified = true,
    update = { hikka: 'none', mikai: 'none' }
  } = options
  
  colorLog('\n1. Імпорт аніме тайтлів...', 'blue')
  
  const allAnimePages = await getAllPages(DATABASES.ANIME_TITLES_DB, 'Аніме тайтли')
  const previousAnimeData = await loadPreviousData("AnimeTitlesDB.json")
  
  let pagesToProcess = onlyModified 
    ? filterModifiedPages(allAnimePages, previousAnimeData)
    : allAnimePages
  
  if (!onlyModified) {
    colorLog(`Оброблюємо всі ${allAnimePages.length} сторінок (повний режим)`, 'blue')
  }
  
  let animeData = []
  if (pagesToProcess.length > 0) {
    colorLog(`Обробка ${pagesToProcess.length} ${onlyModified ? 'змінених' : ''} аніме тайтлів...`, 'blue')
    
    if (onlyModified) {
        for (const page of pagesToProcess) {
            const title = page.properties['Назва тайтлу']?.title[0]?.plain_text || `ID: ${page.id}`;
            colorLog(`  -> ${title}`, 'yellow');
        }
    }
    
    const processedAnime = await processAnimeData(pagesToProcess)
    
    const existingMap = new Map(previousAnimeData.map(anime => [anime.id, anime]))
    for (const anime of processedAnime) {
      existingMap.set(anime.id, anime)
    }
    animeData = Array.from(existingMap.values())
    
    animeData = await updateHikkaForgeData(animeData, HIKKA_UPDATE_MODES[update.hikka.toUpperCase()])
    animeData = await updateMikaiLinks(animeData, MIKAI_UPDATE_MODES[update.mikai.toUpperCase()])
    
    await saveData("AnimeTitlesDB.json", animeData)
  } else {
    colorLog('Немає змін в аніме тайтлах', 'green')
    animeData = previousAnimeData
  }
  
  return animeData
}

async function getReleasesJson(options = {}) {
  const { onlyModified = true } = options
  
  colorLog('\n2. Імпорт релізів...', 'blue')
  
  const allReleasePages = await getAllPages(DATABASES.ANIME_RELEASES_DB, 'Аніме релізи')
  const previousReleaseData = await loadPreviousData("AnimeReleasesDB.json")
  
  let pagesToProcess = onlyModified
    ? filterModifiedPages(allReleasePages, previousReleaseData)
    : allReleasePages
  
  if (!onlyModified) {
    colorLog(`Оброблюємо всі ${allReleasePages.length} сторінок (повний режим)`, 'blue')
  }
  
  let releaseData = []
  if (pagesToProcess.length > 0) {
    colorLog(`Обробка ${pagesToProcess.length} ${onlyModified ? 'змінених' : ''} релізів...`, 'blue')

    if (onlyModified) {
      for (const page of pagesToProcess) {
          const title = page.properties['Назва релізу']?.title[0]?.plain_text || `ID: ${page.id}`;
          colorLog(`  -> ${title}`, 'yellow');
      }
    }
    
    const processedReleases = await processReleaseData(pagesToProcess)
    
    const existingMap = new Map(previousReleaseData.map(release => [release.id, release]))
    for (const release of processedReleases) {
      existingMap.set(release.id, release)
    }
    releaseData = Array.from(existingMap.values())
    
    await saveData("AnimeReleasesDB.json", releaseData)
  } else {
    colorLog('Немає змін в релізах', 'green')
    releaseData = previousReleaseData
  }
  
  return releaseData
}

async function getTeamsJson(releasesData, options = {}) {
  const { onlyModified = true } = options
  
  colorLog('\n3. Імпорт команд...', 'blue')
  
  const allTeamPages = await getAllPages(DATABASES.TEAMS_DB, 'Команди')
  const previousTeamData = await loadPreviousData("TeamsDB.json")
  
  let pagesToProcess = onlyModified
    ? filterModifiedPages(allTeamPages, previousTeamData)
    : allTeamPages
  
  if (!onlyModified) {
    colorLog(`Оброблюємо всі ${allTeamPages.length} сторінок (повний режим)`, 'blue')
  }
  
  let teamData = []
  if (pagesToProcess.length > 0) {
    colorLog(`Обробка ${pagesToProcess.length} ${onlyModified ? 'змінених' : ''} команд...`, 'blue')

    if (onlyModified) {
      for (const page of pagesToProcess) {
          const title = page.properties['Назва команди']?.title[0]?.plain_text || `ID: ${page.id}`;
          colorLog(`  -> ${title}`, 'yellow');
      }
    }

    const processedTeams = await processTeamData(pagesToProcess)
    
    const existingMap = new Map(previousTeamData.map(team => [team.id, team]))
    for (const team of processedTeams) {
      existingMap.set(team.id, team)
    }
    teamData = Array.from(existingMap.values())
    
    teamData = buildTeamReleases(teamData, releasesData)
    await saveData("TeamsDB.json", teamData)
  } else {
    colorLog('Немає змін в командах', 'green')
    teamData = previousTeamData
  }
  
  return teamData
}

async function runAllImports(options = {}) {
  const {
    anime = { onlyModified: true, update: { hikka: 'missing', mikai: 'missing' } },
    releases = { onlyModified: true },
    teams = { onlyModified: true }
  } = options
  
  try {
    colorLog('\n=== ПОЧАТОК ІМПОРТУ ДАНИХ ===\n', 'blue')
    
    const animeData = await getAnimeTitlesJson(anime)
    const releasesData = await getReleasesJson(releases)
    await getTeamsJson(releasesData, teams)
    
    colorLog('\n=== ІМПОРТ ЗАВЕРШЕНО УСПІШНО ===\n', 'green')
  } catch (error) {
    colorLog(`\n=== КРИТИЧНА ПОМИЛКА ===`, 'red')
    colorLog(`${error.message}`, 'red')
    colorLog(`${error.stack}`, 'red')
    process.exit(1)
  }
}

;(async () => {
  try {
    // ЗА ЗАМОВЧУВАННЯМ: тільки змінені, з оновленням відсутніх полів
    await runAllImports({
      anime: { onlyModified: true, update: { hikka: 'missing', mikai: 'missing' } },
      releases: { onlyModified: true },
      teams: { onlyModified: true }
    })
  } catch (err) {
    console.error(err)
    process.exit(1)
  }
})()
