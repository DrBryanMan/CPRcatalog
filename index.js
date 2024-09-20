import { initSearch } from './js/search.js'

// let currentAnime
// let typeofList
// let backPage

let allAnimes = []
let allReleases = []
let allTeams = []

// Завантаження даних про аніме
async function loadAnimeData() {
    if (allAnimes.length === 0) {
        try {
            const response = await fetch("AnimeTitlesDB.json")
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`)
            }
            const result = await response.json()
            
            allAnimes = result.map(anime => ({
                id: anime.id,
                cover: anime.cover?.external?.url || anime.cover?.file?.url || "https://img.notionusercontent.com/ext/https%3A%2F%2Fs4.anilist.co%2Ffile%2Fanilistcdn%2Fmedia%2Fanime%2Fbanner%2F20661-JwMKrCzeSTZ7.png/size/w=2000?exp=1726647160&sig=EgP5STWm5tSXYXsHut4fglLMAaMeVjHEfscBhXd2vwk",
                poster: anime.properties.Постер.files[0]?.external?.url || anime.properties.Постер.files[0]?.file.url || "https://www.1999.co.jp/itbig85/10852139a2_m.jpg",
                title: anime.properties['Назва тайтлу'].title[0]?.plain_text || "[додайте назву]",
                romaji: anime.properties.Ромаджі.rich_text[0]?.plain_text || "",
                type: anime.properties["Тип медіа"].multi_select[0]?.name || "",
                format: anime.properties.Формат.select?.name || "",
                year: anime.properties["Рік виходу"].rich_text[0]?.plain_text || "",
                episodes: anime.properties["Кількість серій"].rich_text[0]?.plain_text || "",
                releases: anime.properties['🗂️ Релізи команд'].relation || []
            }))
            console.log(allAnimes[0].cover)
        } catch (error) {
            console.error("Error loading anime data:", error)
            throw error // перекидаємо помилку далі
        }
    }
    return allAnimes
}

// Завантаження даних про команди
async function loadTeamsData() {
    if (allTeams.length === 0) {
        const response = await fetch("TeamsDB.json")
        const result = await response.json()
        allTeams = result.map(team => ({
            id: team.id,
            logo: team.icon?.file?.url || 'path/to/default/logo.png',
            name: team.properties['Назва команди'].title[0]?.plain_text || 'Невідомо'
        }))
    }
    return allTeams
}

// Завантаження даних про релізи
async function loadReleasesData() {
    if (allReleases.length === 0) {
        const response = await fetch("AnimeReleasesDB.json")
        const result = await response.json()
        allReleases = result.map(release => ({
            id: release.id,
            animeId: release.properties['Тайтл'].relation[0]?.id,
            // animeData: allAnimes.find(anime => anime.id === release.animeId),
            title: release.properties['Name'].title[0]?.plain_text || 'Без назви',
            cover: release.cover?.external?.url || release.cover?.file?.url || "",
            teams: (release.properties['Команда']?.relation || [])
            .map(r => ({
                logo: allTeams.find(t => t.id === r?.id)?.logo || 'Невідома команда',
                name: allTeams.find(t => t.id === r?.id)?.name || 'Невідома команда'
            })),
            status: release.properties['Статус'].status?.name || 'Невідомо',
            episodes: release.properties['Кількість'].rich_text[0]?.plain_text || 'Невідомо',
            torrent: release.properties['Торент'].select?.name || 'Невідомо',
            torrentLink: release.properties['Торент посилання'].rich_text[0]?.text.link?.url || '#'
        }))
    }
    return allReleases
}

function renderStatistics() {
    const statsSection = document.createElement('div')
    statsSection.classList.add('statistics-section')
    statsSection.innerHTML = `
        <h2>Статистика каталогу</h2>
        <div class="stats-container">
            <div class="stat-item">
                <span class="stat-value">${allAnimes.length}</span>
                <span class="stat-label">Аніме</span>
            </div>
            <div class="stat-item">
                <span class="stat-value">${allReleases.length}</span>
                <span class="stat-label">Релізів</span>
            </div>
            <div class="stat-item">
                <span class="stat-value">${allTeams.length}</span>
                <span class="stat-label">Команд</span>
            </div>
        </div>
    `
    return statsSection
}

function renderRandomAnime() {
    const anime = allAnimes[Math.floor(Math.random() * allAnimes.length)]
    const randomAnimeSection = document.createElement('div')
    randomAnimeSection.classList.add('random-anime-section')
    randomAnimeSection.innerHTML = `
        <h2>Випадкове аніме</h2>
        <div class="random-anime-container page-block">
            <img src="${anime.poster}" alt="${anime.title}" class="random-anime-poster">
            <div class="random-anime-info">
                <h3 class="truncate">${anime.title}</h3>
                <p>${anime.romaji}</p>
                <p>Тип: ${anime.type}</p>
                <p>Формат: ${anime.format}</p>
                <p>Рік: ${anime.year}</p>
                <p>Епізоди: ${anime.episodes}</p>
            </div>
        </div>
    `
    return randomAnimeSection
}

// Відображення секції релізів
async function renderReleasesSection(releases, title) {
    const section = document.createElement('div')
    section.classList.add('releases-section')
    section.innerHTML = `<h2>${title}</h2>`

    const releaseList = document.createElement('div')
    releaseList.classList.add('release-list')

    for (const release of releases) {
        const animeData = allAnimes.find(anime => anime.id === release.animeId)
        const teams = release.teams.map(t => `<img src="${t.logo}" style="width: 25px; height: auto; object-fit: contain;"> ${t.name}`)
        const listItem = document.createElement('div')
        listItem.classList.add('release-card')
        listItem.innerHTML = `
            <img src="${animeData.cover}" alt="" class="release-poster">
            <div class="release-info">
                <h3 class="truncate">${release.title}</h3>
                <p>${teams}</p>
                <p>Епізоди: ${release.episodes}</p>
            </div>
        `
        listItem.onclick = () => renderReleaseDetail(release, 'toReleaseList')
        releaseList.appendChild(listItem)
    }

    section.appendChild(releaseList)
    return section
}

// Відображення карток релізів
async function renderAnimeReleases(releases) {
    const cardsContainer = document.createElement('div')
    cardsContainer.classList.add('anime-releases-container')

    for (const release of releases) {
        const card = document.createElement('div')
        card.classList.add('release-card')

        const animeData = allAnimes.find(anime => anime.id === release.animeId)
        // const teamData = allTeams.find(team => team.id === release.teamId)
        const teams = release.teams.map(t => `<img src="${t.logo}" style="width: 25px; height: auto; object-fit: contain;"> ${t.name}`)
        const poster = animeData?.poster?.files?.url || 'path/to/default/logo.png'
        // const teamName = teamData?.name

        card.innerHTML = `
            <img src="${release.cover}" class="anime-poster">
            <h3 class="truncate">${release.title}</h3>
            <p>${teams}</p>
            <p>Епізоди: ${release.episodes}</p>
        `

        card.onclick = () => renderReleaseDetail(release, 'toTitle')
        cardsContainer.appendChild(card)
    }

    return cardsContainer
}

// Відображення деталей релізу
async function renderReleaseDetail(release, backPage) {
    showLoader()
    try {
        const app = document.getElementById("app")
        app.innerHTML = ""

        const detailDiv = document.createElement("div")
        detailDiv.classList.add("release-detail")

        const anime = allAnimes.find(a => a.id === release.animeId)
        const teams = release.teams.map(t => `<img src="${t.logo}" style="width: 25px; height: auto; object-fit: contain;"> ${t.name}`)

        detailDiv.innerHTML = `
        <div class="anime-cover"><img src="${anime.cover}"></div>
        <div class="top-section">
            <img class="anime-poster" src="${release.poster || anime.poster}">
            <div class="release">
                <div>
                    <h1>${release.title}</h1>
                </div>
                <div class="release-info">
                    <p>Аніме: ${anime?.title || 'Невідоме аніме'}</p>
                    <p>Команда: ${teams}</p>
                    <p>Статус: ${release.status}</p>
                    <p>Епізоди: ${release.episodes}</p>
                    <p>Торент: ${release.torrent}</p>
                    <a href="${release.torrentLink || '#'}" target="_blank">
                        ${release.torrentLink ? 'Завантажити торрент' : 'Посилання недоступне'}
                    </a>
                </div>
                <button id="backToReleasesButton">До списку релізів</button>
            </div>
        </div>
        `

        app.appendChild(detailDiv)

        const backButton = detailDiv.querySelector('#backToReleasesButton')
        if (backPage === 'toReleaseList') {
            backButton.textContent = 'До списку релізів'
            backButton.onclick = () => renderAnimeList(allReleases, "Release")
        } else if (backPage === 'toTitle') {
            backButton.textContent = 'До тайтлу'
            backButton.onclick = () => renderAnimeDetail(anime, "toAnimeList")
        }
    } finally {
        hideLoader()
    }
}

// Рендеринг деталей аніме
async function renderAnimeDetail(anime, backPage) {
    showLoader()
    try {
        // isViewingAnimeDetail = true
        app.innerHTML = ""
        // currentAnime = anime

        const detailDiv = document.createElement("div")
        detailDiv.classList.add("anime-detail")

        // Базова інформація про аніме
        detailDiv.innerHTML = `
        <div class="anime-cover"><img src="${anime.cover}"></div>
        <div class="top-section">
            <img class="anime-poster" src="${anime.poster}" title="${anime.title}">
            <div class="title">
                <div>
                    <h1>${anime.title}</h1>
                    <span>${anime.romaji}</span>
                </div>
                <div class="anime-info">
                    <p>Тип: ${anime.type}</p>
                    <p>Формат: ${anime.format}</p>
                    <p>Рік: ${anime.year}</p>
                    <p>Епізоди: ${anime.episodes}</p>
                </div>
                <div id="releasesList" class=''>Завантаження інформації про релізи...</div>
                <button id="backButton">Повернутись</button>
            </div>
        </div>
        `

        app.appendChild(detailDiv)

        // Завантаження та відображення інформації про релізи
        const releases = anime.releases ? allReleases.filter(r => r.animeId === anime.id) : []
        const releasesList = document.getElementById("releasesList")
        if (releases.length > 0) {
            const releaseCards = await renderAnimeReleases(releases)
            releasesList.innerHTML = '<h3>Релізи:</h3>'
            releasesList.appendChild(releaseCards)
        } else {
            releasesList.innerHTML = "<p>Релізи не знайдено</p>"
        }

        const backButton = detailDiv.querySelector("#backButton")
        if (backPage === 'toAnimeList') {
            backButton.textContent = 'До списку аніме'
            backButton.onclick = () => {
                renderAnimeList(allAnimes, "Anime")
            }
        }
    } finally {
        hideLoader()
    }
}

// Рендеринг списку аніме
function renderAnimeList(items, typeofList) {
    const itemsPerPage = 50
    let currentPage = 0
    let filteredItems = [...items]
    console.log(filteredItems)
    app.innerHTML = ""
    
    // Додаємо поле пошуку
    const searchDiv = document.createElement("div")
    searchDiv.classList.add("search-container")
    searchDiv.innerHTML = `
        <input type="text" id="localSearchInput" placeholder="Пошук...">
    `
    app.appendChild(searchDiv)
    
    const listDiv = document.createElement("div")
    listDiv.classList.add("anime-list")
    app.appendChild(listDiv)

    const searchInput = document.getElementById("localSearchInput")
    searchInput.addEventListener('input', handleSearch)

    function handleSearch() {
        const searchTerm = searchInput.value.toLowerCase()
        console.log(searchTerm)
        filteredItems = items.filter(item => {
            if (typeofList === "Anime") {
                return item.title.toLowerCase().includes(searchTerm) || 
                       item.romaji.toLowerCase().includes(searchTerm)
            } else {
                return item.title.toLowerCase().includes(searchTerm) || 
                       (allAnimes.find(anime => anime.id === item.animeId)?.title.toLowerCase().includes(searchTerm))
            }
        })
        console.log(filteredItems)
        
        currentPage = 0
        listDiv.innerHTML = ""
        loadMoreItems()
    }

    function loadMoreItems() {
        const startIndex = currentPage * itemsPerPage
        const endIndex = startIndex + itemsPerPage
        const itemsToRender = filteredItems.slice(startIndex, endIndex)
        
        itemsToRender.forEach((item) => {
            const card = document.createElement("div")
            card.classList.add(typeofList === "Anime" ? "title-card" : "release-card")
            
            if (typeofList === "Anime") {
                card.innerHTML = `
                    <div class="poster-box"><img src="${item.poster}" title="${item.title}"></div>
                    <span class="truncate" title="${item.title}">${item.title}</span>
                `
                card.onclick = () => renderAnimeDetail(item, 'toAnimeList')
            } else {
                const anime = allAnimes.find(anime => anime.id === item.animeId)
                const teams = item.teams.map(t => `<img src="${t.logo}" style="width: 25px; height: auto; object-fit: contain;"> ${t.name}`)
                if (!anime) return
                card.innerHTML = `
                    <img src="${anime.cover}" alt="" class="release-poster">
                    <div class="release-info">
                        <h3 class="truncate">${item.title}</h3>
                        <p>${teams}</p>
                        <p>Епізоди: ${item.episodes}</p>
                    </div>
                `
                card.onclick = () => renderReleaseDetail(item, 'toReleaseList')
            }
            
            listDiv.appendChild(card)
        })

        currentPage++
        
        if (endIndex >= filteredItems.length) {
            window.removeEventListener('scroll', handleScroll)
        } else {
            window.addEventListener('scroll', handleScroll)
        }
    }

    function handleScroll() {
        if ((window.innerHeight + window.scrollY) >= document.body.offsetHeight - 500) {
            loadMoreItems()
        }
    }

    loadMoreItems() // Завантажуємо перші елементи
}

// Ініціалізація кнопок навігації
const animeButton = document.getElementById("animeButton")
animeButton.onclick = () => renderAnimeList(allAnimes, "Anime")
const releasesButton = document.getElementById("releasesButton")
releasesButton.onclick = () => renderAnimeList(allReleases, "Release")

// Функція для рендерингу головної сторінки
async function renderHomePage() {
    showLoader()
    try {
        app.innerHTML = "<h1>Каталог Фандабу!</h1>"
        const randomAnimeSection = renderRandomAnime()

        // Створення блоку з останніми релізами
        const recentReleasesSection = await renderReleasesSection(allReleases.slice(0, 8), "Останні додані релізи")
        const recentReleasesButton = document.createElement('button')
        recentReleasesButton.textContent = 'Всі релізи'
        recentReleasesButton.onclick = () => renderAnimeList(allReleases, "Release")
        recentReleasesSection.appendChild(recentReleasesButton)
        
        // Створення блоку з поточними релізами
        const currentReleasesSection = await renderReleasesSection(allReleases.filter(release => release.status === "В процесі").slice(0, 8), "Поточні релізи")
        const currentReleasesButton = document.createElement('button')
        currentReleasesButton.textContent = 'Всі поточні релізи'
        currentReleasesButton.onclick = () => renderAnimeList(allReleases.filter(r => r.status === 'В процесі'), "Release")
        currentReleasesSection.appendChild(currentReleasesButton)

        const statsSection = renderStatistics()

        app.appendChild(randomAnimeSection)
        app.appendChild(recentReleasesSection)
        app.appendChild(currentReleasesSection)
        app.appendChild(statsSection)
    } finally {
        hideLoader()
    }
}

// Додаємо обробник для кнопки "На головну"
const homeButton = document.getElementById("homeButton")
homeButton.onclick = renderHomePage

function showLoader() {
    document.getElementById('loading-overlay').style.display = 'flex'
}
function hideLoader() {
    document.getElementById('loading-overlay').style.display = 'none'
}

// Викликаємо рендеринг головної сторінки при завантаженні сторінки
document.addEventListener('DOMContentLoaded', async () => {
    try {
        showLoader()
        console.log('DOM loaded, initializing...')
        await loadAnimeData()
        await loadTeamsData()
        await loadReleasesData()
        console.log('Data loaded')
        initSearch(allAnimes, allReleases, allTeams, renderAnimeDetail, renderReleaseDetail)
        console.log('Search initialized')
        await renderHomePage()
        console.log('Home page rendered')
    } catch (error) {
        console.error('Error during initialization:', error)
        hideLoader()
        document.getElementById('app').innerHTML = `<p>Виникла помилка при завантаженні: ${error.message}</p>`
    } finally {
        hideLoader()
    }
})