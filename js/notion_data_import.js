/**
 * ╔══════════════════════════════════════════════════════════════════════════════╗
 * ║                        notion_data_import.js                               ║
 * ║              Імпорт та синхронізація даних з Notion → JSON                 ║
 * ╚══════════════════════════════════════════════════════════════════════════════╝
 *
 * ЗАГАЛЬНИЙ ВОРКФЛОВ:
 * ──────────────────
 *  1. АНІМЕ ТАЙТЛИ  (AnimeTitlesDB.json)
 *     • Отримуємо всі сторінки з Notion DB "Аніме тайтли"
 *     • Порівнюємо з попереднім JSON — знаходимо нові й змінені записи
 *     • Для кожного тайтлу підтягуємо постери (GitHub UAPosters) та Mikai-посилання
 *     • За потреби збагачуємо даними Hikka API:
 *         Hikka  →  (fallback)  →  Hikka-Forge
 *       Якщо основний Hikka повертає помилку ≥ 7 разів поспіль —
 *       автоматично переключаємось на Hikka-Forge для решти запитів.
 *     • Мержимо оброблені записи з попередніми та зберігаємо файл
 *
 *  2. РЕЛІЗИ  (AnimeReleasesDB.json)
 *     • Отримуємо всі сторінки з Notion DB "Аніме релізи"
 *     • Визначаємо нові/змінені релізи (аналогічно до тайтлів)
 *     • Зберігаємо торент-посилання та дату їх появи
 *     • Після обробки команд: якщо всі команди релізу мають
 *       неактивний статус — реліз автоматично позначається "Закинуто"
 *
 *  3. КОМАНДИ  (TeamsDB.json)
 *     • Отримуємо всі сторінки з Notion DB "Команди"
 *     • Будуємо зворотні зв'язки: кожна команда отримує масив
 *       своїх релізів (anime_releases) на основі оброблених релізів
 *
 *  4. ФІНАЛ
 *     • Оновлений AnimeReleasesDB.json зберігається повторно
 *       (зі статусами "Закинуто" після аналізу команд)
 *     • Виводиться підсумкова статистика та список помилок Hikka
 *
 * ЗАЛЕЖНОСТІ:
 *   @notionhq/client — Notion API
 *   axios            — HTTP-запити до зовнішніх API
 *   dotenv           — змінні середовища (.env → NOTION_TOKEN)
 *   fs/path          — читання/запис JSON-файлів
 */

import { Client } from "@notionhq/client"
import axios from 'axios'
import { promises as fs } from "fs"
import { join, dirname } from "path"
import { fileURLToPath } from "url"
import dotenv from 'dotenv'

const __dirname = dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: join(__dirname, "../.env") })

const HIKKA_API_URL = 'https://api.hikka.io/anime'
const HIKKA_FORGE_API_URL = 'https://hikka-forge.lorgon.dev/anime'
const MIKAI_API_URL = 'https://api.mikai.me/v1/integrations/hikka/anime'
const POSTERS_URL = 'https://raw.githubusercontent.com/DrBryanMan/UAPosters/refs/heads/main/PostersList.json'

const Notion = new Client({ auth: process.env.NOTION_TOKEN })

const colors = {
  reset: "\x1b[0m", red: "\x1b[31m", green: "\x1b[32m", yellow: "\x1b[33m", blue: "\x1b[34m"
}

const OUTPUT_MODES = { NEWLINE: 'newline', SAMELINE: 'sameline', PROGRESS: 'progress' }

const DATABASES = {
  ANIME_TITLES_DB: "174d30fa35d081fb8baccf7e405d5cf9",
  ANIME_RELEASES_DB: "174d30fa35d081278dcdf4335e149330",
  TEAMS_DB: "174d30fa35d081c4968cc340c89e4667"
}

const UPDATE_MODES = { NONE: 'none', MISSING: 'missing', ALL: 'all' }
const HIKKA_FAILURE_THRESHOLD = 7

process.stdout.setEncoding('utf8')
if (process.stdout.isTTY) process.stdout.setNoDelay(true)

function colorLog(message, color = 'reset', mode = OUTPUT_MODES.NEWLINE) {
  const coloredMessage = `${colors[color]}${message}${colors.reset}`
  switch(mode) {
    case OUTPUT_MODES.SAMELINE: process.stdout.write(`\r${coloredMessage}`); break
    case OUTPUT_MODES.PROGRESS: process.stdout.write(`\r${coloredMessage}\n`); break
    default: process.stdout.write(`${coloredMessage}\n`)
  }
}

async function loadPreviousData(fileName) {
  try {
    const filePath = join(__dirname, "../../CPRcatalog/json", fileName)
    const data = JSON.parse(await fs.readFile(filePath, "utf8"))
    colorLog(`Завантажено попередні дані з ${fileName}: ${data.length} записів`, 'blue')
    return data
  } catch (error) {
    colorLog(`Попередні дані з ${fileName} не знайдено: ${error.message}`, 'yellow')
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
    const targetDir = join(__dirname, '../../CPRcatalog/json')
    await fs.mkdir(targetDir, { recursive: true })
    await fs.writeFile(join(targetDir, fileName), JSON.stringify(data, null, 2))
    colorLog(`Успішно збережено дані у файл ${fileName}: ${data.length} записів`, 'green')
  } catch (error) {
    colorLog(`Помилка при збереженні ${fileName}: ${error.message}`, 'red')
    throw error
  }
}

async function getAllPages(databaseId, dbTitle) {
  let pages = [], hasMore = true, nextCursor = null, totalProcessed = 0
  console.log(`Початок імпорту сторінок з бази даних ${dbTitle}`)

  while (hasMore) {
    const response = await Notion.databases.query({
      database_id: databaseId,
      start_cursor: nextCursor || undefined
    })
    totalProcessed += response.results.length
    colorLog(`Отримано ${totalProcessed} сторінок...`, 'reset', OUTPUT_MODES.PROGRESS)
    pages = pages.concat(response.results)
    hasMore = response.has_more
    nextCursor = response.next_cursor
  }
  colorLog(`\nЗавершено отримання сторінок. Всього: ${totalProcessed}`, 'reset')
  return pages
}

function filterModifiedPages(allPages, existingData, checkMissingFields = false) {
  const existingMap = new Map(existingData.map(item => [item.id, new Date(item.last_edited || item.created_time || 0)]))
  const modifiedPages = [], newPages = []
  
  for (const page of allPages) {
    const pageLastEdited = new Date(page.last_edited_time)
    if (!existingMap.has(page.id)) {
      newPages.push(page)
      modifiedPages.push(page)
    } else {
      const existingLastEdited = existingMap.get(page.id)
      const existingAnime = existingData.find(item => item.id === page.id)
      
      const hasMissingFields = checkMissingFields && existingAnime && getMissingHikkaFields(existingAnime).length > 0
      
      if (pageLastEdited > existingLastEdited || Math.abs(pageLastEdited - existingLastEdited) > 1000 || hasMissingFields) {
        modifiedPages.push(page)
      }
    }
  }
  if (newPages.length > 0) {
    colorLog(`Нових сторінок: ${newPages.length}`, 'green')
    newPages.forEach((page, idx) => {
      const title = page.properties['Назва релізу']?.title[0]?.plain_text || 
                   page.properties['Назва тайтлу']?.title[0]?.plain_text ||
                   page.properties['Назва команди']?.title[0]?.plain_text ||
                   'Без назви'
      colorLog(`  ${idx + 1}. ${title}`, 'green')
    })
  }
  if (modifiedPages.length > newPages.length) colorLog(`Змінених існуючих: ${modifiedPages.length - newPages.length}`, 'yellow')
  return modifiedPages
}

function extractSlugFromUrl(hikkaUrl) {
  if (!hikkaUrl) return null
  try {
    return hikkaUrl.split('/').pop()
  } catch (error) {
    colorLog(`Помилка витягування slug з ${hikkaUrl}: ${error.message}`, 'yellow')
    return null
  }
}

async function fetchHikkaData(slug) {
  try {
    const response = await axios.get(`${HIKKA_API_URL}/${slug}`)
    const anime = response.data
    return {
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
    }
  } catch {
    return null
  }
}

async function fetchHikkaForgeData(slug) {
  try {
    const response = await axios.get(`${HIKKA_FORGE_API_URL}/${slug}`)
    const data = response.data
    return {
      hikka_poster: data.imageUrl || null,
      hikkaSynonyms: null,
      status: null,
      season: null,
      duration: null,
      scoreMAL: data.score || null,
      scoredbyMAL: data.scoredBy || null,
      scoreHikka: data.scoreHikka || null,
      scoredbyHikka: data.scoredByHikka || null,
      source: null,
      mal_id: data.malId || null
    }
  } catch {
    return null
  }
}

let hikkaErrors = []

function getMissingHikkaFields(anime) {
  const required = ['hikka_poster', 'scoreMAL', 'scoredbyMAL', 'scoreHikka', 'scoredbyHikka', 'mal_id']
  return required.filter(field => {
    const value = anime[field]
    // Поле вважається пропущеним тільки якщо воно null, undefined або порожній рядок
    // 0 - це валідне значення!
    return value === null || value === undefined || value === ''
  })
}

async function fetchHikkaDataWithFallback(urls) {
  const results = []
  let hikkaFailureCount = 0, useForgeOnly = false
  hikkaErrors = [] // Очищаємо список помилок
  
  for (let i = 0; i < urls.length; i++) {
    const slug = extractSlugFromUrl(urls[i])
    if (!slug) continue
    
    let hikkaData = null
    let source = null
    
    if (!useForgeOnly) {
      try {
        hikkaData = await fetchHikkaData(slug)
        if (!hikkaData) {
          hikkaFailureCount++
          colorLog(`Hikka помилка (${hikkaFailureCount}/${HIKKA_FAILURE_THRESHOLD}): ${slug}`, 'yellow')
          if (hikkaFailureCount >= HIKKA_FAILURE_THRESHOLD) {
            colorLog(`Перемикаємось на Hikka-Forge після ${HIKKA_FAILURE_THRESHOLD} помилок`, 'yellow')
            useForgeOnly = true
          }
        } else {
          hikkaFailureCount = 0
          source = 'Hikka'
        }
      } catch (error) {
        hikkaErrors.push({ slug, error: error.message, source: 'Hikka' })
        colorLog(`❌ Помилка Hikka для ${slug}: ${error.message}`, 'red')
        hikkaFailureCount++
        if (hikkaFailureCount >= HIKKA_FAILURE_THRESHOLD) {
          useForgeOnly = true
        }
        continue
      }
    }
    
    if (!hikkaData) {
      try {
        hikkaData = await fetchHikkaForgeData(slug)
        if (hikkaData) {
          source = 'Forge'
          colorLog(`Обробка: ${i + 1}/${urls.length}. ${slug} [Forge]`, 'blue', OUTPUT_MODES.PROGRESS)
        } else {
          hikkaErrors.push({ slug, error: 'Дані не знайдені ні в Hikka ні в Forge', source: 'Both' })
          colorLog(`❌ Помилка для ${slug} з обох джерел`, 'red')
          continue
        }
      } catch (error) {
        hikkaErrors.push({ slug, error: error.message, source: 'Forge' })
        colorLog(`❌ Помилка Forge для ${slug}: ${error.message}`, 'red')
        continue
      }
    } else if (!source) {
      source = 'Hikka'
    }
    
    const fieldsAvailable = Object.keys(hikkaData).filter(key => key !== 'url' && hikkaData[key] != null)
    colorLog(`Обробка: ${i + 1}/${urls.length}. ${slug} [${source}] (${fieldsAvailable.length} полів)`, 'green', OUTPUT_MODES.PROGRESS)
    
    results.push({ url: urls[i], ...hikkaData })
    await new Promise(resolve => setTimeout(resolve, 100))
  }
  
  return results
}

async function updateHikkaData(animeData, mode = UPDATE_MODES.NONE) {
  if (mode === UPDATE_MODES.NONE) {
    colorLog('Оновлення Hikka пропущено (режим: none)', 'yellow')
    return animeData
  }
  
  colorLog(`\nОновлення Hikka даних (режим: ${mode})...`, 'blue')
  const previousData = await loadPreviousData("AnimeTitlesDB.json")
  
  // ВИПРАВЛЕННЯ: створюємо Map з поточних даних для швидкого пошуку
  const currentDataMap = new Map(animeData.map(a => [a.hikka_url, a]))
  
  const animesToUpdate = animeData.filter(anime => {
    if (!anime.hikka_url) return false
    if (mode === UPDATE_MODES.ALL) return true
    if (mode === UPDATE_MODES.MISSING) {
      // Перевіряємо ПОТОЧНИЙ стан аніме, а не попередній
      const current = currentDataMap.get(anime.hikka_url)
      const missingFields = getMissingHikkaFields(current)
      
      if (missingFields.length > 0) {
        const title = anime.title || 'Без назви'
        colorLog(`✓ Оновлюємо ${title} (пропущені поля: ${missingFields.join(', ')})`, 'green')
        return true
      }
      return false
    }
    return false
  })
  
  if (animesToUpdate.length === 0) {
    colorLog('Немає аніме для оновлення з Hikka', 'green')
    return animeData
  }
  
  colorLog(`Знайдено ${animesToUpdate.length} аніме для оновлення`, 'blue')
  const urls = animesToUpdate.map(a => a.hikka_url).filter(Boolean)
  const hikkaResults = await fetchHikkaDataWithFallback(urls)
  const hikkaMap = new Map(hikkaResults.map(item => [item.url, item]))
  
  let updatedCount = 0
  for (const anime of animeData) {
    if (!anime.hikka_url) continue
    const hikkaData = hikkaMap.get(anime.hikka_url)
    if (hikkaData) {
      const updatedFields = []
      Object.entries(hikkaData).forEach(([key, value]) => {
        // Перезаписуємо тільки якщо поточне значення null, undefined або ''
        // НЕ перезаписуємо 0, бо це валідне значення!
        const currentValue = anime[key]
        const shouldUpdate = currentValue === null || currentValue === undefined || currentValue === ''
        
        if (key !== 'url' && value != null && shouldUpdate) {
          anime[key] = value
          updatedFields.push(key)
        }
      })
      if (updatedFields.length > 0) {
        const title = anime.title || 'Без назви'
        colorLog(`  ✓ ${title} (+${updatedFields.length} полів: ${updatedFields.join(', ')})`, 'green')
      }
      updatedCount++
    }
  }
  
  colorLog(`\nОновлено Hikka даних: ${updatedCount}`, 'green')
  
  if (hikkaErrors.length > 0) {
    colorLog(`\n!!  ПОМИЛКИ HIKKA (${hikkaErrors.length}):`, 'red')
    hikkaErrors.forEach((err, idx) => {
      colorLog(`  ${idx + 1}. ${err.slug} [${err.source}]: ${err.error}`, 'red')
    })
  }
  
  return animeData
}

async function updateMikaiLinks(animeData, mode = UPDATE_MODES.NONE) {
  if (mode === UPDATE_MODES.NONE) {
    colorLog('Оновлення Mikai пропущено (режим: none)', 'yellow')
    return animeData
  }
  
  colorLog(`Оновлення Mikai посилань (режим: ${mode})...`, 'blue')
  const mikaiData = await loadExternalData(MIKAI_API_URL, 'Mikai дані')
  if (mikaiData.length === 0) return animeData
  
  const { mikaiMap } = createMapsFromData([], mikaiData)
  let updatedCount = 0
  
  for (const anime of animeData) {
    if (!anime.mal_id) continue
    const shouldUpdate = mode === UPDATE_MODES.ALL || (mode === UPDATE_MODES.MISSING && !anime.mikai)
    if (!shouldUpdate) continue
    
    const mikaiInfo = mikaiMap.get(anime.mal_id)
    if (mikaiInfo) {
      anime.mikai = mikaiInfo.url
      updatedCount++
    }
  }
  if (updatedCount > 0) colorLog(`\nОновлено Mikai: ${updatedCount}`, 'green')
  return animeData
}

function createMapsFromData(postersData, mikaiData) {
  const postersMap = new Map()
  const mikaiMap = new Map()
  
  // Створюємо map для постерів за hikka_url
  if (postersData && Array.isArray(postersData)) {
    for (const item of postersData) {
      if (item.hikka_url && item.posters) {
        postersMap.set(item.hikka_url, item.posters)
      }
    }
  }
  
  // Створюємо map для Mikai за mal_id
  if (mikaiData && Array.isArray(mikaiData)) {
    for (const item of mikaiData) {
      if (item.mal_id && item.url) {
        mikaiMap.set(item.mal_id, { url: item.url })
      }
    }
  }
  
  return { postersMap, mikaiMap }
}

function buildAnimeData(page, previousAnime, posterList, mikaiUrl) {
  const posterUrl = posterList?.length > 0
    ? `https://raw.githubusercontent.com/DrBryanMan/UAPosters/refs/heads/main/${posterList[0].url}`
    : null

  return {
    id: page.id,
    hikka_url: page.properties.Hikka?.url,
    hikka_poster: previousAnime?.hikka_poster || null,
    cover: page.cover?.external?.url || page.cover?.file?.url,
    poster: posterUrl,
    posters: posterList || [],
    title: page.properties['Назва тайтлу']?.title[0]?.plain_text,
    romaji: page.properties.Ромаджі?.rich_text[0]?.plain_text,
    synonyms: page.properties.Синоніми?.rich_text?.flatMap(i => i.plain_text.split('\n')) || [],
    hikkaSynonyms: previousAnime?.hikkaSynonyms,
    type: page.properties['Тип медіа']?.multi_select[0]?.name,
    format: page.properties['Формат']?.select?.name,
    format_cpr: page.properties['Формат цпр']?.select?.name,
    year: page.properties['Рік виходу']?.rich_text[0]?.plain_text,
    genre: page.properties.Жанри?.select?.name,
    status: previousAnime?.status,
    season: previousAnime?.season,
    duration: previousAnime?.duration,
    scoreMAL: previousAnime?.scoreMAL,
    scoredbyMAL: previousAnime?.scoredbyMAL,
    scoreHikka: previousAnime?.scoreHikka,
    scoredbyHikka: previousAnime?.scoredbyHikka,
    anitube: page.properties.АніТюб?.url,
    uaserial: page.properties.Uaserial?.url,
    uakino: page.properties.Uakino?.url,
    mikai: mikaiUrl || previousAnime?.mikai || null,
    tg_channel: page.properties['Tg канал']?.url,
    episodes: page.properties['Кількість серій']?.rich_text[0]?.plain_text,
    releases: page.properties['🗂️ Релізи команд']?.relation || [],
    relations: page.properties["Пов'язані частини"]?.relation || [],
    franchise: page.properties.Франшиза?.relation?.id || [],
    source: previousAnime?.source,
    mal_id: previousAnime?.mal_id,
    created_time: page.created_time,
    last_edited: page.last_edited_time
  }
}

async function processAnimeData(pages) {
  const previousData = await loadPreviousData("AnimeTitlesDB.json")
  const previousDataMap = new Map(previousData.map(anime => [anime.id, anime]))
  const postersData = await loadExternalData(POSTERS_URL, 'Постери з GitHub')
  const mikaiData = await loadExternalData(MIKAI_API_URL, 'Mikai дані')
  
  const { postersMap, mikaiMap } = createMapsFromData(postersData, mikaiData)
  
  const results = []
  for (const page of pages) {
    const previousAnime = previousDataMap.get(page.id)
    const hikka_url = page.properties.Hikka?.url
    const posterList = hikka_url ? postersMap.get(hikka_url) : null
    let mikaiUrl = previousAnime?.mikai || null
    
    if (!mikaiUrl && previousAnime?.mal_id) {
      const mikaiInfo = mikaiMap.get(previousAnime.mal_id)
      if (mikaiInfo) mikaiUrl = mikaiInfo.url
    }
    results.push(buildAnimeData(page, previousAnime, posterList, mikaiUrl))
  }
  return results
}

function buildReleaseData(page, previousRelease) {
  const currentEpisodes = page.properties['Кількість']?.rich_text[0]?.plain_text || null
  const currentTorrentLinks = page.properties['Торент посилання']?.rich_text
    .filter(link => link)
    .map(link => ({ text: link.plain_text.trim(), href: link.href })) || []
  const previousTorrentLinks = previousRelease?.torrentLinks || []
  const previousUrls = new Set(previousTorrentLinks.map(link => link.href))
  const hasNewLinks = currentTorrentLinks.some(link => !previousUrls.has(link.href))

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
    torrentLinksLastAdded: hasNewLinks ? new Date().toISOString() : previousRelease?.torrentLinksLastAdded || null
  }
}

async function processReleaseData(pages) {
  const previousData = await loadPreviousData("AnimeReleasesDB.json")
  const previousDataMap = new Map(previousData.map(r => [r.id, r]))
  return pages.map(page => buildReleaseData(page, previousDataMap.get(page.id)))
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
    type_activity: page.properties['Тип робіт']?.multi_select?.map(item => item.name) || [],
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
  return pages.map(page => buildTeamData(page))
}

function buildTeamReleases(teamsData, releasesData) {
  colorLog("Формування зв'язків релізів...", 'blue')
  const teamsMap = new Map(teamsData.map(team => [team.id, team]))
  
  for (const release of releasesData) {
    const releaseInfo = { id: release.id }
    const allTeamIds = [...(release.teams || []), ...(release.teamscolab || [])]
    
    for (const teamId of allTeamIds) {
      if (teamsMap.has(teamId)) {
        const team = teamsMap.get(teamId)
        if (!team.anime_releases) team.anime_releases = []
        if (!team.anime_releases.some(r => r.id === release.id)) {
          team.anime_releases.push(releaseInfo)
        }
      }
    }
  }
  colorLog(`Сформовано зв'язки для ${teamsData.length} команд`, 'green')
  return teamsData
}

function mergeData(existingData, newData) {
  const merged = new Map()
  existingData.forEach(item => merged.set(item.id, item))
  newData.forEach(item => merged.set(item.id, item))
  return Array.from(merged.values())
}

async function updateAbandonedReleases(releasesData, teamsData) {
  colorLog('\nПеревірка статусів релізів...', 'blue')
  const teamsMap = new Map(teamsData.map(team => [team.id, team]))
  const inactiveStatuses = ['Неактивна', 'Припинено', 'Розформована']
  let updatedCount = 0
  
  for (const release of releasesData) {
    if (release.status !== 'В процесі' && release.status !== 'Відкладено') continue
    const allTeamIds = [...(release.teams || []), ...(release.teamscolab || [])]
    if (allTeamIds.length === 0) continue
    
    const allInactive = allTeamIds.every(id => {
      const team = teamsMap.get(id)
      return team && inactiveStatuses.includes(team.status)
    })
    
    if (allInactive) {
      colorLog(`  -> ${release.title}: "${release.status}" → "Закинуто"`, 'yellow')
      release.status = 'Закинуто'
      updatedCount++
    }
  }
  if (updatedCount > 0) colorLog(`\nОновлено статус ${updatedCount} релізів`, 'green')
  else colorLog('Немає релізів для оновлення', 'green')
  return releasesData
}

async function getAnimeTitlesJson(options = {}) {
  const { onlyModified = true, update = { hikka: 'none', mikai: 'none' } } = options
  colorLog('\n1. Імпорт аніме тайтлів...', 'blue')
  
  const allPages = await getAllPages(DATABASES.ANIME_TITLES_DB, 'Аніме тайтли')
  const previousData = await loadPreviousData("AnimeTitlesDB.json")
  let pagesToProcess = onlyModified ? filterModifiedPages(allPages, previousData, true) : allPages
  
  if (!onlyModified) colorLog(`Обробка всіх ${allPages.length} сторінок`, 'blue')
  
  let animeData = previousData
  if (pagesToProcess.length > 0) {
    colorLog(`Обробка ${pagesToProcess.length} ${onlyModified ? 'змінених' : ''} тайтлів...`, 'blue')
    const processedAnime = await processAnimeData(pagesToProcess)
    animeData = mergeData(previousData, processedAnime)
    animeData = await updateHikkaData(animeData, UPDATE_MODES[update.hikka.toUpperCase()])
    animeData = await updateMikaiLinks(animeData, UPDATE_MODES[update.mikai.toUpperCase()])
    await saveData("AnimeTitlesDB.json", animeData)
  } else {
    colorLog('Немає змін в аніме тайтлах', 'green')
  }
  return animeData
}

async function getReleasesJson(options = {}) {
  const { onlyModified = true } = options
  colorLog('\n2. Імпорт релізів...', 'blue')
  
  const allPages = await getAllPages(DATABASES.ANIME_RELEASES_DB, 'Аніме релізи')
  const previousData = await loadPreviousData("AnimeReleasesDB.json")
  let pagesToProcess = onlyModified ? filterModifiedPages(allPages, previousData) : allPages
  
  if (!onlyModified) colorLog(`Обробка всіх ${allPages.length} сторінок`, 'blue')
  
  let releaseData = previousData
  if (pagesToProcess.length > 0) {
    colorLog(`Обробка ${pagesToProcess.length} ${onlyModified ? 'змінених' : ''} релізів...`, 'blue')
    const processedReleases = await processReleaseData(pagesToProcess)
    releaseData = mergeData(previousData, processedReleases)
    await saveData("AnimeReleasesDB.json", releaseData)
  } else {
    colorLog('Немає змін в релізах', 'green')
  }
  return releaseData
}

async function getTeamsJson(releasesData, options = {}) {
  const { onlyModified = true } = options
  colorLog('\n3. Імпорт команд...', 'blue')
  
  const allPages = await getAllPages(DATABASES.TEAMS_DB, 'Команди')
  const previousData = await loadPreviousData("TeamsDB.json")
  let pagesToProcess = onlyModified ? filterModifiedPages(allPages, previousData) : allPages
  
  if (!onlyModified) colorLog(`Обробка всіх ${allPages.length} сторінок`, 'blue')
  
  let teamData = previousData
  if (pagesToProcess.length > 0) {
    colorLog(`Обробка ${pagesToProcess.length} ${onlyModified ? 'змінених' : ''} команд...`, 'blue')
    const processedTeams = await processTeamData(pagesToProcess)
    teamData = mergeData(previousData, processedTeams)
    teamData = buildTeamReleases(teamData, releasesData)
    await saveData("TeamsDB.json", teamData)
  } else {
    colorLog('Немає змін в командах', 'green')
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
    let releasesData = await getReleasesJson(releases)
    const teamsData = await getTeamsJson(releasesData, teams)
    releasesData = await updateAbandonedReleases(releasesData, teamsData)
    await saveData("AnimeReleasesDB.json", releasesData)
    
    colorLog(`\n📊 СТАТИСТИКА ІМПОРТУ:`, 'blue')
    colorLog(`  • Тайтлів: ${animeData.length}`, 'green')
    colorLog(`  • Релізів: ${releasesData.length}`, 'green')
    colorLog(`  • Команд: ${teamsData.length}`, 'green')
    
    // 🔥 Виводимо помилки в кінці
    if (hikkaErrors.length > 0) {
      colorLog(`\n!!  ЗАГАЛОМ ПОМИЛОК HIKKA: ${hikkaErrors.length}`, 'red')
    }
    
    colorLog('\n=== ІМПОРТ ЗАВЕРШЕНО УСПІШНО ===\n', 'green')
  } catch (error) {
    colorLog(`\n=== КРИТИЧНА ПОМИЛКА ===`, 'red')
    colorLog(`${error.message}\n${error.stack}`, 'red')
    process.exit(1)
  }
}

;(async () => {
  try {
    await runAllImports({
      anime: { 
        onlyModified: false,
        update: { 
          hikka: 'missing',
          mikai: 'missing'
        } 
      },
      releases: { onlyModified: false },
      teams: { onlyModified: false }
    })
  } catch (err) {
    console.error(err)
    process.exit(1)
  }
})()

/**
 * ╔══════════════════════════════════════════════════════════════════════════════╗
 * ║                          ДОВІДКА ПО РЕЖИМАХ                                  ║
 * ╚══════════════════════════════════════════════════════════════════════════════╝
 *
 * runAllImports() приймає об'єкт з трьома секціями: anime, releases, teams.
 * Кожна секція має свої параметри.
 *
 * ┌─────────────────────────────────────────────────────────────────────────────┐
 * │  onlyModified  (bool, для всіх трьох секцій)                                │
 * ├─────────────────────────────────────────────────────────────────────────────┤
 * │  true  — обробляються лише нові та змінені з моменту                        │
 * │          останнього запуску сторінки (порівняння по last_edited_time).      │
 * │          Швидкий режим для щоденної синхронізації.                          │
 * │                                                                             │
 * │  false — обробляються ВСІ сторінки незалежно від змін.                      │
 * │          Повний ребілд — потрібен при першому запуску або                   │
 * │          якщо структура даних суттєво змінилась.                            │
 * └─────────────────────────────────────────────────────────────────────────────┘
 *
 * ┌─────────────────────────────────────────────────────────────────────────────┐
 * │  update.hikka / update.mikai  (string, тільки для секції anime)             │
 * ├─────────────────────────────────────────────────────────────────────────────┤
 * │  'none'    — зовнішній API не викликається взагалі. Дані залишаються        │
 * │              такими, як є в JSON. Найшвидший режим, без мережевих запитів.  │
 * │                                                                             │
 * │  'missing' — API викликається лише для записів, у яких одне або більше      │
 * │              потрібних полів відсутні (null / undefined / '').              │
 * │              Hikka-поля: hikka_poster, scoreMAL, scoredbyMAL,               │
 * │                          scoreHikka, scoredbyHikka, mal_id                  │
 * │              Mikai-поле: mikai                                              │
 * │              Оптимальний баланс між актуальністю і кількістю запитів.       │
 * │                                                                             │
 * │  'all'     — API викликається для кожного аніме, що має hikka_url/mal_id.   │
 * │              Повне оновлення всіх полів. Увага: 0 — валідне значення        │
 * │              і НЕ перезаписується; перезаписуються лише null/undefined/''.  │
 * │              Використовувати рідко — генерує багато запитів до API.         │
 * └─────────────────────────────────────────────────────────────────────────────┘
 *
 * ПРИКЛАДИ ЗАПУСКУ:
 *
 *  // Звичайна щоденна синхронізація
 *  runAllImports({
 *    anime:    { onlyModified: true,  update: { hikka: 'missing', mikai: 'missing' } },
 *    releases: { onlyModified: true  },
 *    teams:    { onlyModified: true  }
 *  })
 *
 *  // Повний ребілд без звернень до зовнішніх API
 *  runAllImports({
 *    anime:    { onlyModified: false, update: { hikka: 'none', mikai: 'none' } },
 *    releases: { onlyModified: false },
 *    teams:    { onlyModified: false }
 *  })
 *
 *  // Примусове оновлення всіх Hikka-даних для змінених тайтлів
 *  runAllImports({
 *    anime:    { onlyModified: true,  update: { hikka: 'all', mikai: 'missing' } },
 *    releases: { onlyModified: true  },
 *    teams:    { onlyModified: true  }
 *  })
 */