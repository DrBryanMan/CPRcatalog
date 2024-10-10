const { Client } = require("@notionhq/client")
const fs = require("fs")
const path = require("path")
const crypto = require('crypto')

require("dotenv").config()

const notion = new Client({ auth: process.env.NOTION_TOKEN })

function hashObject(obj) {
  return crypto.createHash('md5').update(JSON.stringify(obj)).digest('hex')
}

async function getFirstPage(databaseId) {
  try {
    const response = await notion.databases.query({
      database_id: databaseId,
      // page_size: 1, // Запитуємо лише одну сторінку
    })

    if (response.results.length > 0) {
      const page = response.results[0]
      console.log('Дані першої сторінки:')
      console.log(JSON.stringify(page, null, 2))
    } else {
      console.log('База даних порожня')
    }
  } catch (error) {
    console.error('Помилка при отриманні даних:', error)
  }
}

async function getAllPages(databaseId, propertiesToExpand = [], previousData = null) {
  let pages = []
  let hasMore = true
  let nextCursor = null
  let pageCount = 0
  let updatedCount = 0

  console.log(`Початок імпорту сторінок з бази даних ${databaseId}`)

  while (hasMore) {
    const response = await notion.databases.query({
      database_id: databaseId,
      start_cursor: nextCursor || undefined,
    })

    for (const page of response.results) {
      pageCount++
      let pageUpdated = false

      for (const propertyName of propertiesToExpand) {
        if (page.properties[propertyName] && page.properties[propertyName].type === 'relation') {
          const expandedRelations = await getAllRelatedIds(page.id, page.properties[propertyName].id)
          page.properties[propertyName].relation = expandedRelations.map(id => ({ id }))
          page.properties[propertyName].has_more = false
        }
      }

      const newHash = hashObject(page)
      if (!previousData || !previousData[page.id] || previousData[page.id] !== newHash) {
        pageUpdated = true
        updatedCount++
        console.log(`Сторінка ${pageCount} (${page.id}) оновлена або додана`)
      } else {
        console.log(`Сторінка ${pageCount} (${page.id}) не змінилася`)
      }

      pages.push(page)
      console.log(`Сторінка ${pageCount} оброблена`)
    }

    hasMore = response.has_more
    nextCursor = response.next_cursor
  }

  console.log(`Оброблено ${pageCount} сторінок. Оновлено або додано ${updatedCount} сторінок.`)
  return pages
}

async function getAllRelatedIds(pageId, propertyId) {
  let allIds = []
  let hasMore = true
  let startCursor = undefined

  while (hasMore) {
    const response = await notion.pages.properties.retrieve({
      page_id: pageId,
      property_id: propertyId,
      start_cursor: startCursor,
    })

    allIds = allIds.concat(response.results.map(item => item.relation.id))

    hasMore = response.has_more
    startCursor = response.next_cursor
  }

  return allIds
}

function processAnimeData(pages) {
  return pages.map(page => ({
    id: page.id,
    hikkaUrl: page.properties.Hikka.url,
    cover: page.cover?.external?.url || page.cover?.file?.url,
    poster: page.properties.Постер.files[0]?.external?.url || page.properties.Постер.files[0]?.file.url,
    title: page.properties['Назва тайтлу'].title[0]?.plain_text || 'Без назви',
    romaji: page.properties.Ромаджі.rich_text[0]?.plain_text || '',
    type: page.properties['Тип медіа'].multi_select[0]?.name || '',
    format: page.properties.Формат.select?.name || '',
    year: page.properties['Рік виходу'].rich_text[0]?.plain_text || '',
    episodes: page.properties['Кількість серій'].rich_text[0]?.plain_text || '',
    releases: page.properties['🗂️ Релізи команд'].relation || []
  }))
}

function processReleaseData(pages) {
  return pages.map(page => ({
    id: page.id,
    animeIds: page.properties['Тайтл']?.relation.map(r => r.id) || [],
    title: page.properties['Name'].title[0]?.plain_text || 'Без назви',
    cover: page.cover?.external?.url || page.cover?.file?.url || '',
    poster: page.properties.Постер.files[0]?.external?.url || page.properties.Постер.files[0]?.file.url,
    teams: page.properties['Команда']?.relation || [],
    status: page.properties['Статус'].status?.name || 'Невідомо',
    episodes: page.properties['Кількість'].rich_text[0]?.plain_text || 'Невідомо',
    torrent: page.properties['Торент'].select?.name || 'Невідомо',
    torrentLinks: page.properties['Торент посилання'].rich_text
      .filter(link => link !== null)
      .map(link => ({
        text: link.plain_text,
        href: link.href
      }))
  }))
}

function processTeamData(pages) {
  return pages.map(page => ({
    // main info
    id: page.id,
    last_edited: page.last_edited_time,
    cover: page.cover,
    logo: page.icon?.file?.url || null,
    name: page.properties['Назва команди'].title[0]?.plain_text || 'Невідомо',
    // second info
    status: page.properties.Статус.select?.name || 'Невідомо',
    type_activity: page.properties['Тип робіт'].multi_select.map(item => item.name) || 'Невідомо',
    members: page.properties['Склад команди'].relation || [],
    anime_releases: page.properties['Релізи аніме'].relation || [],
    // social info
    site: page.properties.Сайт.url,
    anitube: page.properties.AniTube.url,
    youtube: page.properties.YouTube.url,
    insta: page.properties.Instagram.url,
    tg: page.properties.Telegram.url,
    tg_video: page.properties['ТҐ релізи'].url
  }))
}

async function importData(databaseId, outputFileName, propertiesToExpand = [], processFunction) {
  console.log(`Початок імпорту даних для ${outputFileName}...`)

  let previousData = {}
  const outputFile = path.join(__dirname, outputFileName)
  if (fs.existsSync(outputFile)) {
    try {
      const previousContent = fs.readFileSync(outputFile, 'utf8')
      const previousPages = JSON.parse(previousContent)
      previousData = previousPages.reduce((acc, page) => {
        acc[page.id] = hashObject(page)
        return acc
      }, {})
    } catch (error) {
      console.error(`Помилка при читанні попередніх даних: ${error.message}`)
    }
  }

  const pages = await getAllPages(databaseId, propertiesToExpand, previousData)
  const processedData = processFunction(pages)

  try {
    fs.writeFileSync(outputFile, JSON.stringify(processedData, null, 2))
    console.log(`Імпорт завершено. Записано ${processedData.length} елементів до файлу ${outputFile}`)
  } catch (error) {
    console.error(`Помилка при записі даних: ${error.message}`)
  }
}

async function importAnimeTitles() {
  const databaseId = process.env.NOTION_ANIME_TITLES_DB
  await importData(databaseId, "AnimeTitlesDB.json", [], processAnimeData)
}

async function importReleases() {
  const databaseId = process.env.NOTION_ANIME_RELEASES_DB
  await importData(databaseId, "AnimeReleasesDB.json", [], processReleaseData)
}

async function importTeams() {
  const databaseId = process.env.NOTION_TEAMS_DB
  await importData(databaseId, "TeamsDB.json", ["Релізи аніме"], processTeamData)
}

async function runAllImports() {
  console.log("Початок імпорту всіх даних...")
  // await importAnimeTitles()
  // await importReleases()
  await importTeams()
  // getFirstPage(process.env.NOTION_ANIME_TITLES_DB)
  // getFirstPage(process.env.NOTION_ANIME_RELEASES_DB)
  // getFirstPage(process.env.NOTION_TEAMS_DB)
  console.log("Всі імпорти завершено успішно.")
}

runAllImports().catch(error => {
  console.error("Виникла помилка під час виконання імпорту:", error)
})