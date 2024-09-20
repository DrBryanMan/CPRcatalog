const { Client } = require("@notionhq/client");
const fs = require("fs");
const path = require("path");

// Sensitive data is stored in .env file
require("dotenv").config()

const notion = new Client({ auth: process.env.NOTION_TOKEN })

async function getAllPages(databaseId) {
  let pages = []
  let hasMore = true
  let nextCursor = null

  while (hasMore) {
    const response = await notion.databases.query({
      database_id: databaseId,
      ...(nextCursor && { start_cursor: nextCursor }) // Додаємо `start_cursor` тільки якщо він не null
    })

    pages = pages.concat(response.results)
    
    hasMore = response.has_more
    nextCursor = response.next_cursor
  }

  return pages
}

async function importAnimeTitles() {
  const databaseId = process.env.NOTION_ANIME_TITLES_DB
  const pages = await getAllPages(databaseId)

  // Write the result to file.
  const outputFile = path.join(__dirname, "AnimeTitlesDB.json")
  fs.writeFileSync(outputFile, JSON.stringify(pages, null, 2))
  console.log(`Записано ${pages.length} сторінок до файлу ${outputFile}`)
}

async function importReleases() {
  const databaseId = process.env.NOTION_ANIME_RELEASES_DB
  const pages = await getAllPages(databaseId)

  // Write the result to file.
  const outputFile = path.join(__dirname, "AnimeReleasesDB.json")
  fs.writeFileSync(outputFile, JSON.stringify(pages, null, 2))
  console.log(`Записано ${pages.length} сторінок до файлу ${outputFile}`)
}

async function importTeams() {
  const databaseId = process.env.NOTION_TEAMS_DB
  const pages = await getAllPages(databaseId)

  // Write the result to file.
  const outputFile = path.join(__dirname, "TeamsDB.json")
  fs.writeFileSync(outputFile, JSON.stringify(pages, null, 2))
  console.log(`Записано ${pages.length} сторінок до файлу ${outputFile}`)
}

importAnimeTitles()
importReleases()
importTeams()