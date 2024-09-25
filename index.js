import { initSearch } from './js/search.js'

let allAnimes = []
let allReleases = []
let allTeams = []
let hikkaAnimeData = []

// Отримуємо всі дані
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
            allTeams.sort((a, b) => a.name.localeCompare(b.name))
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
function renderReleasesSection(releases, title) {
    const section = document.createElement('div')
    section.classList.add('releases-section')
    section.innerHTML = `<div class="releases-header"><h2>${title}</h2></div>`

    const releaseList = document.createElement('div')
    releaseList.classList.add('release-list')

    for (const release of releases) {
        const animeData = allAnimes.find(anime => anime.id === release.animeId)
        const teams = release.teams.map(t => `<span><img src="${t.logo}">${t.name}</span>`).join('')
        const listItem = document.createElement('div')
        listItem.classList.add('release-card', 'card')
        listItem.innerHTML = `
            <img src="${animeData?.cover || release?.cover || '' }" class="release-poster">
            <div class="release-info">
                <h3 class="truncate">${release.title}</h3>
                <p class='teams-logos'>${teams}</p>
                <p>Епізоди: ${release.episodes}</p>
            </div>
        `
        listItem.onclick = () => renderReleaseDetail(release, 'toReleasesList')
        releaseList.appendChild(listItem)
    }

    section.appendChild(releaseList)
    return section
}
// Оновлення навігайфї
function updateNavigation(secondCrumbText = null) {
    const nav = document.getElementById('nav');
    let secondCrumb = nav.querySelector('#secondCrumb');
    
    if (secondCrumbText) {
        if (!secondCrumb) {
            secondCrumb = document.createElement('span');
            secondCrumb.id = 'secondCrumb';
            nav.appendChild(secondCrumb);
        }
        secondCrumb.textContent = secondCrumbText;
    } else if (secondCrumb) {
        secondCrumb.remove();
    }
}

// Відображення сторінки команди
async function renderTeamDetail(team, backPage) {
    app.innerHTML = `
    <div class='team-detail'>
        <div class="top-section">
            <img class="team-logo" src="${team.logo}" title="${team.name}">
            <div class="info-section">
                <h1>${team.name}</h1>
                <div class="team-info">
                    <p>Тип робіт: ${team.type}</p>
                    <p>Статус: ${team.status}</p>
                </div>
                <button id="backButton">Повернутись</button>
            </div>
        </div>
        <div id="releasesList" class='page-block'>Завантаження інформації про релізи...</div>
    </div>
    `
    updateNavigation(team.name)

    // Завантаження та відображення інформації про релізи
    const releases = team.releases.length > 0 ? allReleases.filter(release => team.releases.some(r => r.id === release.id)) : []
    
    const releasesList = document.getElementById("releasesList")
    if (releases.length > 0) {
        const releaseCards = await renderAnimeReleases(releases)
        releasesList.innerHTML = '<h3>Релізи:</h3>'
        releasesList.appendChild(releaseCards)
    } else {
        releasesList.innerHTML = "<p>Релізи не знайдено</p>"
    }

    const backButton = document.querySelector("#backButton")
    if (backPage === 'toTeamsList') {
        backButton.textContent = 'До списку команд'
        backButton.onclick = () => {
            renderAnimeList(allTeams, "Teams")
        }
    }
}

// Відображення карток релізів
async function renderAnimeReleases(releases) {
    const cardsContainer = document.createElement('div')
    cardsContainer.classList.add('anime-releases-container')

    for (const release of releases) {
        const card = document.createElement('div')
        card.classList.add('anime-release-card', 'card')

        // const animeData = allAnimes.find(anime => anime.id === release.animeId)
        const teams = release.teams.map(t => `<span><img src="${t.logo}">${t.name}</span>`).join('')

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
    const anime = allAnimes.find(a => a.id === release.animeId)
    const teams = release.teams.map(t => `<span><img src="${t.logo}">${t.name}</span>`).join('')
    const torrents = release.torrentLinks.map(t => `<a href="${t.url}" target="_blank">${t.text}</a>`).join('')

    app.innerHTML = `
    <div class="release-detail">
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
    </div>
    `
    updateNavigation(release.title)

    const backButton = document.querySelector('#backToReleasesButton')
    if (backPage === 'toReleasesList') {
        backButton.textContent = 'До списку релізів'
        backButton.onclick = () => renderAnimeList(allReleases, "Releases")
    } else if (backPage === 'toTitle') {
        backButton.textContent = 'До тайтлу'
        backButton.onclick = () => renderAnimeDetail(anime, "toAnimesList")
    }
}

// Відображення деталей аніме
async function renderAnimeDetail(anime, backPage) {
    app.innerHTML = `
    <div class='anime-detail'>
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
                <button id="backButton">Повернутись</button>
            </div>
        </div>
        <div id="releasesList" class='page-block'>Завантаження інформації про релізи...</div>
    </div>
    `
    updateNavigation(anime.title)
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

    const backButton = document.querySelector("#backButton")
    if (backPage === 'toAnimesList') {
        backButton.textContent = 'До списку аніме'
        backButton.onclick = () => {
            renderAnimeList(allAnimes, "Animes")
        }
    }
}

// Рендеринг списку аніме
function renderAnimeList(items, typeofList) {
    console.log(items.length)
    const itemsPerPage = 50
    let currentPage = 0
    let filteredItems = [...items]

    updateNavigation()
    // const secondCrumb = document.getElementById('secondCrumb')
    // if (secondCrumb) {secondCrumb.remove()}

    app.innerHTML = `
        <input type="text" id="localSearchInput" placeholder="Пошук...">
        <div class='anime-list'></div>
    `
    const listDiv = document.querySelector('.anime-list')
    const searchInput = document.getElementById("localSearchInput")
    searchInput.addEventListener('input', handleSearch)

    function handleSearch() {
        const query = searchInput.value.toLowerCase()
        if (query.length === 0) {
            loadMoreItems()
        } else if (query.length < 3) {
            return
        }
        filteredItems = items.filter(item => {
            if (typeofList === "Animes") {
                return item.title.toLowerCase().includes(query) || 
                       item.romaji.toLowerCase().includes(query)
            }
            if (typeofList === "Releases") {
                return item.title.toLowerCase().includes(query) || 
                       (allAnimes.find(anime => anime.id === item.animeId)?.title.toLowerCase().includes(query)) || 
                       (allAnimes.find(anime => anime.id === item.animeId)?.romaji.toLowerCase().includes(query))
            }
            if (typeofList === "Teams") {
                return item.name.toLowerCase().includes(query)
            }
        })
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
            card.classList.add("card")
            
            if (typeofList === "Animes") {
                card.classList.add("title-card")
                card.innerHTML = `
                    <div class="poster-box">
                        <img src="${item.poster || item.hikkaPoster}" title="${item.title}">
                    </div>
                    <div class='info'>
                        <span class="truncate" title="${item.title}">${item.title}</span>
                        <small>${item.year} / ${item.format}</small>
                    </div>
                `
                card.onclick = () => renderAnimeDetail(item, 'toAnimesList')
            }
            if (typeofList === "Releases") {
                card.classList.add("release-card")
                const anime = allAnimes.find(anime => anime.id === item.animeId)
                const teams = item.teams.map(t => `<span><img src="${t.logo}">${t.name}</span>`).join('')
                // if (!anime) return
                card.innerHTML = `
                    <img src="${anime.cover}" class="release-poster" title="${item.title}">
                    <div class="info">
                        <h3 class="truncate">${item.title}</h3>
                        <p class='teams-logos'>${teams}</p>
                        <p>Епізоди: ${item.episodes}</p>
                    </div>
                `
                card.onclick = () => renderReleaseDetail(item, 'toReleasesList')
            }
            if (typeofList === "Teams") {
                card.classList.add("team-card")
            // const anime = allTeams.find(anime => anime.id === item.animeId)
                // const teams = item.teams.map(t => `<img src="${t.logo}">${t.name}`)
                // if (!anime) return
                card.innerHTML = `
                    <img src="${item.logo}" class="team-logo" title="${item.name}">
                    <div class="info">
                        <h3 class="truncate">${item.name}</h3>
                        <p>Релізи: ${item.releases.length}</p>
                    </div>
                `
                card.onclick = () => renderTeamDetail(item, 'toTeamsList')
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
    loadMoreItems()
}

// Ініціалізація кнопок
animeListButton.onclick = () => renderAnimeList(allAnimes, "Animes")
releasesListButton.onclick = () => renderAnimeList(allReleases, "Releases")
teamsListButton.onclick = () => renderAnimeList(allTeams, "Teams")
homeButton.onclick = renderHomePage

// Функція для рендерингу головної сторінки
async function renderHomePage() {
    app.innerHTML = "<h1>Каталог Фандабу!</h1>"
    updateNavigation()
    const randomAnimeSection = renderRandomAnime()

    // Створення блоку з останніми релізами    
    const recentReleasesSection = renderReleasesSection(allReleases.slice(0, 8), "Останні додані релізи")
    const recentReleasesButton = document.createElement('button')
    recentReleasesButton.textContent = 'Всі релізи'
    recentReleasesButton.onclick = () => renderAnimeList(allReleases, "Releases")
    recentReleasesSection.appendChild(recentReleasesButton)
    
    // Створення блоку з поточними релізами
    const currentReleasesSection = renderReleasesSection(allReleases.filter(release => release.status === "В процесі").slice(0, 8), "Поточні релізи")
    const currentReleasesButton = document.createElement('button')
    currentReleasesButton.textContent = 'Всі поточні релізи'
    currentReleasesButton.onclick = () => renderAnimeList(allReleases.filter(r => r.status === 'В процесі'), "Releases")
    currentReleasesSection.appendChild(currentReleasesButton)

    const statsSection = renderStatistics()

    app.appendChild(randomAnimeSection)
    app.appendChild(recentReleasesSection)
    app.appendChild(currentReleasesSection)
    app.appendChild(statsSection)
}

// Викликаємо рендеринг головної сторінки при завантаженні сторінки
document.addEventListener('DOMContentLoaded', async () => {
    try {
        loadingОverlay.style.display = 'flex'
        // showLoader()
        console.log('Сторінка завантажена, отримуємо дані...')
        await loadData()
        console.log('Дані отримано')
        initSearch(allAnimes, allReleases, allTeams, renderAnimeDetail, renderReleaseDetail)
        await renderHomePage()
        window.onscroll = () => {
            // const nav = document.querySelector('#nav')
            window.scrollY > 0 ? nav.classList.add('scrolled') : nav.classList.remove('scrolled')
        }
    } catch (error) {
        console.error('Не вийшло отримати дані:', error)
        // hideLoader()
        document.getElementById('app').innerHTML = `<p>Виникла помилка при завантаженні: ${error.message}</p>`
    } finally {
        loadingОverlay.style.display = 'none'
    // hideLoader()
    }
})