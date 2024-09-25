const { Client } = require("@notionhq/client")
const fs = require("fs")
const path = require("path")
const crypto = require('crypto')

require("dotenv").config()

const notion = new Client({ auth: process.env.NOTION_TOKEN })

function hashObject(obj) {
  return crypto.createHash('md5').update(JSON.stringify(obj)).digest('hex')
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
      }

      pages.push(page)
      if (pageUpdated) {
        console.log(`Сторінка ${pageCount} оброблена успішно`)
      }
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

async function importData(databaseId, outputFileName, propertiesToExpand = []) {
  console.log(`Початок імпорту даних для ${outputFileName}...`)

  let previousData = {}
  const outputFile = path.join(__dirname, outputFileName)
  if (fs.existsSync(outputFile)) {
    const previousContent = fs.readFileSync(outputFile, 'utf8')
    const previousPages = JSON.parse(previousContent)
    previousData = previousPages.reduce((acc, page) => {
      acc[page.id] = hashObject(page)
      return acc
    }, {})
  }

  const pages = await getAllPages(databaseId, propertiesToExpand, previousData)

  fs.writeFileSync(outputFile, JSON.stringify(pages, null, 2))
  console.log(`Імпорт завершено. Записано ${pages.length} сторінок до файлу ${outputFile}`)
}

async function importAnimeTitles() {
  const databaseId = process.env.NOTION_ANIME_TITLES_DB
  await importData(databaseId, "AnimeTitlesDB.json")
}

async function importReleases() {
  const databaseId = process.env.NOTION_ANIME_RELEASES_DB
  await importData(databaseId, "AnimeReleasesDB.json")
}

async function importTeams() {
  const databaseId = process.env.NOTION_TEAMS_DB
  await importData(databaseId, "TeamsDB.json", ["Релізи аніме"])
}

async function runAllImports() {
  console.log("Початок імпорту всіх даних...")
  // await importAnimeTitles()
  // await importReleases()
  await importTeams()
  console.log("Всі імпорти завершено успішно.")
}

runAllImports()