import { initSearch } from './js/search.js'

let allAnimes = []
let allReleases = []
let allTeams = []
let hikkaAnimeData = []

async function loadData() {
    if (allAnimes.length === 0) {
        try {
            const [animeData, teamData, releaseData, hikkaData] = await Promise.all([
                fetch('AnimeTitlesDB.json').then(res => res.json()),
                fetch('TeamsDB.json').then(res => res.json()),
                fetch('AnimeReleasesDB.json').then(res => res.json()),
                fetch('hikkaData.json').then(res => res.json())
            ])
            hikkaAnimeData = hikkaData
            allAnimes = animeData.map(anime => ({
                id: anime.id,
                hikkaUrl: anime.properties.Hikka.url,
                cover: anime.cover?.external?.url || anime.cover?.file?.url,
                poster: anime.properties.Постер.files[0]?.external?.url || anime.properties.Постер.files[0]?.file.url,
                title: anime.properties['Назва тайтлу'].title[0]?.plain_text || 'Без назви',
                romaji: anime.properties.Ромаджі.rich_text[0]?.plain_text || '',
                type: anime.properties["Тип медіа"].multi_select[0]?.name || '',
                format: anime.properties.Формат.select?.name || '',
                year: anime.properties["Рік виходу"].rich_text[0]?.plain_text || '',
                episodes: anime.properties["Кількість серій"].rich_text[0]?.plain_text || '',
                releases: anime.properties['🗂️ Релізи команд'].relation || []
            }))
            allAnimes = allAnimes.map(anime => ({
                ...anime,
                hikkaPoster: hikkaAnimeData.find(hikka => hikka.url === anime.hikkaUrl)?.poster
            }))
            allTeams = teamData.map(team => ({
                id: team.id,
                logo: team.icon?.file?.url,
                name: team.properties['Назва команди'].title[0]?.plain_text || 'Невідомо',
                releases: team.properties['Релізи аніме'].relation || []
            }))
            allReleases = releaseData.map(release => ({
                id: release.id,
                animeId: release.properties['Тайтл']?.relation[0]?.id || "",
                title: release.properties['Name'].title[0]?.plain_text || 'Без назви',
                cover: release.cover?.external?.url || release.cover?.file?.url || "",
                poster: release.properties.Постер.files[0]?.external?.url || release.properties.Постер.files[0]?.file.url,
                teams: (release.properties['Команда']?.relation || [])
                .map(r => ({
                    logo: allTeams.find(t => t.id === r?.id)?.logo || 'Невідома команда',
                    name: allTeams.find(t => t.id === r?.id)?.name || 'Невідома команда'
                })),
                status: release.properties['Статус'].status?.name || 'Невідомо',
                episodes: release.properties['Кількість'].rich_text[0]?.plain_text || 'Невідомо',
                torrent: release.properties['Торент'].select?.name || 'Невідомо',
                // torrentLink: release.properties['Торент посилання'].rich_text[0]?.text.link?.url || '#',
                torrentLinks: release.properties['Торент посилання'].rich_text
                .filter(link => link.href !== null)
                .map(link => ({
                    text: link.plain_text,
                    href: link.href
                }))
            }))
            allReleases = allReleases.map(release => ({
                ...release,
                animeData: allAnimes.find(anime => anime.id === release.animeId)
            }))
            // console.log(allReleases[108].torrentLinks)
        } catch (error) {
            console.error("Помилка при завантаженні даних:", error)
            throw error
        }
    }
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
            <img src="${anime.poster || anime.hikkaPoster}" alt="${anime.title}" class="random-anime-poster">
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
        const teams = release.teams.map(t => `<img src="${t.logo}">${t.name}`)
        const listItem = document.createElement('div')
        listItem.classList.add('release-card')
        listItem.innerHTML = `
            <img src="${animeData?.cover || release?.cover || '' }" class="release-poster">
            <div class="release-info">
                <h3 class="truncate">${release.title}</h3>
                <p class='teams-logos'>${teams}</p>
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
        const teams = release.teams.map(t => `<img src="${t.logo}">${t.name}`)

        card.innerHTML = `
            <img src="${release.cover}" class="anime-poster">
            <h3 class="truncate">${release.title}</h3>
            <p class='teams-logos'>${teams}</p>
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
        const teams = release.teams.map(t => `<img src="${t.logo}">${t.name}`)
        const torrents = release.torrentLinks.map(t => `<a href="${t.url}" target="_blank">${t.text}</a>`).join('')

        detailDiv.innerHTML = `
        <div class="anime-cover"><img src="${anime.cover}"></div>
        <div class="top-section">
            <img class="anime-poster" src="${release.poster || anime.poster || anime.hikkaPoster}">
            <div class="release">
                <div>
                    <h1>${release.title}</h1>
                </div>
                <div class="release-info">
                    <p>Аніме: ${anime?.title || 'Невідоме аніме'}</p>
                    <p class='teams-logos'>Команда: ${teams}</p>
                    <p>Статус: ${release.status}</p>
                    <p>Епізоди: ${release.episodes}</p>
                    <p>Торент: ${release.torrent}</p>
                    <p class='release-torrents'>${torrents}</p>
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
            <img class="anime-poster" src="${anime.poster || anime.hikkaPoster}" title="${anime.title}">
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
                // const hikkaPoster = hikkaAnimeData.find(hikka => hikka.url === item.hikkaUrl)
                card.innerHTML = `
                    <div class="poster-box">
                        <img src="${item.poster || item.hikkaPoster}" title="${item.title}">
                    </div>
                    <div class='title-info'>
                        <span class="truncate" title="${item.title}">${item.title}</span>
                        <small>${item.year} / ${item.format}</small>
                    </div>
                `
                card.onclick = () => renderAnimeDetail(item, 'toAnimeList')
            } else {
                const anime = allAnimes.find(anime => anime.id === item.animeId)
                const teams = item.teams.map(t => `<img src="${t.logo}">${t.name}`)
                if (!anime) return
                card.innerHTML = `
                    <img src="${anime.cover}" alt="" class="release-poster">
                    <div class="release-info">
                        <h3 class="truncate">${item.title}</h3>
                        <p class='teams-logos'>${teams}</p>
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
        await loadData()
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