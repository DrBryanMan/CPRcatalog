const { Client } = require("@notionhq/client")
const fs = require("fs")
const path = require("path")
const crypto = require('crypto')

require("dotenv").config()

const notion = new Client({ auth: process.env.NOTION_TOKEN })

function hashObject(obj) {
  return crypto.createHash('md5').update(JSON.stringify(obj)).digest('hex')
}

async function getAllPages(databaseId, dbTitle, propertiesToExpand = [], previousData = null) {
  let pages = []
  let hasMore = true
  let nextCursor = null
  let pageCount = 0
  let updatedCount = 0

  console.log(`Початок імпорту сторінок з бази даних ${dbTitle}`)

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
  return pages
  .filter(page => page.properties.Постер.files.length > 0)
  .map(page => ({
    id: page.id,
    hikkaUrl: page.properties.Hikka.url,
    title: page.properties['Назва тайтлу'].title[0]?.plain_text || 'Без назви',
    poster: page.properties.Постер.files[0]?.external?.url || page.properties.Постер.files[0]?.file.url || []
  }))
}

function processReleaseData(pages) {
  return pages
  .filter(page => page.properties.Постер.files.length > 0)
  .map(page => ({
    id: page.id,
    title: page.properties['Name'].title[0]?.plain_text || 'Без назви',
    poster: page.properties.Постер.files[0]?.external?.url || page.properties.Постер.files[0]?.file.url || []
  }))
}

function processTeamData(pages) {
  return pages.map(page => ({
    // main info
    id: page.id,
    cover: page.cover,
    logo: page.icon?.file?.url || null,
    // second info
  }))
}

async function importData(databaseId, dbTitle, outputFileName, propertiesToExpand = [], processFunction) {
  console.log(`Початок імпорту даних для ${outputFileName}...`)

  let previousData = {}
  const outputFile = path.join(__dirname, '../json', outputFileName)
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

  const pages = await getAllPages(databaseId, dbTitle, propertiesToExpand, previousData)
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
  await importData(databaseId, "Аніме тайтли", "AnimeTitlesPostersDB.json", [], processAnimeData)
}

async function importReleases() {
  const databaseId = process.env.NOTION_ANIME_RELEASES_DB
  await importData(databaseId, "Аніме релізи", "AnimeReleasesPostersDB.json", [], processReleaseData)
}

async function importTeams() {
  const databaseId = process.env.NOTION_TEAMS_DB
  await importData(databaseId, "Команди фандабу", "TeamsLogosDB.json", ["Релізи аніме"], processTeamData)
}

async function runAllImports() {
  await importAnimeTitles()
  await importReleases()
  await importTeams()
  console.log("Всі імпорти завершено успішно.")
}

runAllImports().catch(error => {
  console.error("Виникла помилка під час виконання імпорту:", error)
})