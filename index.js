import { initSearch } from './js/search.js'

let allAnimes = []
let allReleases = []
let allTeams = []
let hikkaAnimeData = []
const router = new Navigo('/', { hash: true })
let currentRoute

function saveToCache(key, data) {
    try {
        localStorage.setItem(key, JSON.stringify(data))
    } catch (error) {
        console.error('Error saving to cache:', error)
    }
}
function getFromCache(key) {
    try {
        const data = localStorage.getItem(key)
        return data ? JSON.parse(data) : null
    } catch (error) {
        console.error('Error getting from cache:', error)
        return null
    }
}
function clearCache() {
    localStorage.removeItem('allAnimes')
    localStorage.removeItem('allReleases')
    localStorage.removeItem('allTeams')
    localStorage.removeItem('hikkaAnimeData')
    localStorage.removeItem('currentView')
}

// Оновлення обробників подій для кнопок навігації
function updateNavigationHandlers() {
    animeListButton.onclick = () => router.navigate('/animes')
    releasesListButton.onclick = () => router.navigate('/releases')
    teamsListButton.onclick = () => router.navigate('/teams')
    homeButton.onclick = () => router.navigate('/')
}

// Налаштування маршрутів
function setupRoutes() {
    let cleanup = null
    const hash = window.location.hash
    const querySearch = hash.indexOf('?')
    const queryString = hash.slice(querySearch + 1)
    const params = new URLSearchParams(queryString)

    function resetScroll() {
        window.scrollTo(0, 0)
    }

    function cleanupAndRender(renderFunction, ...args) {
        if (typeof cleanup === 'function') {
            cleanup()
        }
        cleanup = renderFunction(...args) || null
    }

    function handleRoute(route, renderFunction, ...args) {
        return () => {
            currentRoute = route
            cleanupAndRender(renderFunction, ...args)
        }
    }

    router
        .on('/', handleRoute('/', renderHomePage))
        .on('/animes', handleRoute('/animes', renderList, allAnimes, 'Аніме'))
        .on('/anime/:id', (match) => {
            const anime = allAnimes.find(a => a.id === match.data.id)
            handleRoute('/anime/:id', renderAnimeDetail, anime)()
        })
        // .on('/releases', handleRoute('/releases', renderList, allReleases, 'Релізи'))
        .on('/releases', () => {
            let initialFilters = {
                format: params.get('format') ? params.get('format').split(',') : [],
                status: params.get('status') ? params.get('status').split(',') : []
            }
            handleRoute('/releases', renderList, allReleases, 'Релізи', initialFilters)()
        })
        .on('/release/:id', (match) => {
            const release = allReleases.find(r => r.id === match.data.id)
            handleRoute('/release/:id', renderReleaseDetail, release)()
        })
        .on('/teams', handleRoute('/teams', renderList, allTeams, 'Команди'))
        .on('/team/:id', (match) => {
            const team = allTeams.find(t => t.id === match.data.id)
            handleRoute('/team/:id', renderTeamDetail, team)()
        })
        .notFound(() => {
            app.innerHTML = `
            <h1>404 - Сторінку не знайдено</h1>
            <img src='https://www.1999.co.jp/itbig85/10852139a2_m.jpg'>
            `
            handleRoute('notFound')()
        })
        .on('*', () => querySearch)

    router.resolve()
}

// Отримуємо всі дані
async function loadData() {
    const cachedAnimes = getFromCache('allAnimes')
    const cachedReleases = getFromCache('allReleases')
    const cachedTeams = getFromCache('allTeams')
    const cachedHikkaData = getFromCache('hikkaAnimeData')

    if (cachedAnimes && cachedReleases && cachedTeams && cachedHikkaData) {
        allAnimes = cachedAnimes
        allReleases = cachedReleases
        allTeams = cachedTeams
        hikkaAnimeData = cachedHikkaData
        console.log('Дані з кешу отримано')
    } else {
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
                type: anime.properties['Тип медіа'].multi_select[0]?.name || '',
                format: anime.properties.Формат.select?.name || '',
                year: anime.properties['Рік виходу'].rich_text[0]?.plain_text || '',
                episodes: anime.properties['Кількість серій'].rich_text[0]?.plain_text || '',
                releases: anime.properties['🗂️ Релізи команд'].relation || []
            }))
            allAnimes = allAnimes.map(anime => ({
                ...anime,
                hikkaPoster: hikkaAnimeData.find(hikka => hikka.url === anime.hikkaUrl)?.poster
            })).filter(anime => anime.releases.length > 0)
            allTeams = teamData.map(team => ({
                id: team.id,
                logo: team.icon?.file?.url,
                name: team.properties['Назва команди'].title[0]?.plain_text || 'Невідомо',
                releases: team.properties['Релізи аніме'].relation || []
            }))
            allTeams.sort((a, b) => a.name.localeCompare(b.name))
            allReleases = releaseData.map(release => ({
                id: release.id,
                animeIds: release.properties['Тайтл']?.relation.map(r => r.id) || [],
                title: release.properties['Name'].title[0]?.plain_text || 'Без назви',
                cover: release.cover?.external?.url || release.cover?.file?.url || '',
                poster: release.properties.Постер.files[0]?.external?.url || release.properties.Постер.files[0]?.file.url,
                teams: (release.properties['Команда']?.relation || [])
                .map(r => ({
                    logo: allTeams.find(t => t.id === r?.id)?.logo || 'Невідома команда',
                    name: allTeams.find(t => t.id === r?.id)?.name || 'Невідома команда'
                })),
                status: release.properties['Статус'].status?.name || 'Невідомо',
                episodes: release.properties['Кількість'].rich_text[0]?.plain_text || 'Невідомо',
                torrent: release.properties['Торент'].select?.name || 'Невідомо',
                torrentLinks: release.properties['Торент посилання'].rich_text
                .filter(link => link.href !== null)
                .map(link => ({
                    text: link.plain_text,
                    href: link.href
                }))
            }))
            allReleases = allReleases.map(release => ({
                ...release,
                animeData: allAnimes.find(anime => release.animeIds.includes(anime.id))
            }))

            saveToCache('allAnimes', allAnimes)
            saveToCache('allReleases', allReleases)
            saveToCache('allTeams', allTeams)
            saveToCache('hikkaAnimeData', hikkaAnimeData)
        } catch (error) {
            console.error('Помилка при завантаженні даних:', error)
            throw error
        }
    }
}

function renderStatistics() {
    const statsSection = document.createElement('div')
    statsSection.classList.add('statistics-section')
    statsSection.innerHTML = `
        <h2>Статистика каталогу</h2>
        <div class='stats-container'>
            <div class='stat-item'>
                <span class='stat-value'>${allAnimes.length}</span>
                <span class='stat-label'>Аніме</span>
            </div>
            <div class='stat-item'>
                <span class='stat-value'>${allReleases.length}</span>
                <span class='stat-label'>Релізів</span>
            </div>
            <div class='stat-item'>
                <span class='stat-value'>${allTeams.length}</span>
                <span class='stat-label'>Команд</span>
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
        <div class='random-anime-container page-block'>
            <img src='${anime.poster || anime.hikkaPoster}' alt='${anime.title}' class='random-anime-poster'>
            <div class='random-anime-info'>
                <h3 class='truncate'>${anime.title}</h3>
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
function renderReleasesSection(items, title, type, route) {
    const section = document.createElement('div')
    section.classList.add('releases-section')
    section.innerHTML = `<div class='releases-header'><h2>${title}</h2><a href='${route}'><i class="fa-solid fa-angles-right"></i></a></div>`

    const itemList = document.createElement('div')
    itemList.classList.add('items-list')

    for (const item of items) {
        const listItem = document.createElement('div')

        switch (type) {
            case 'anime':
                listItem.classList.add('anime-card', 'card')
                listItem.innerHTML = `
                    <div class='poster-box'>
                        <img src='${item.poster || item.hikkaPoster}' title='${item.title}'>
                    </div>
                    <div class='info'>
                        <span class='truncate' title='${item.title}'>${item.title}</span>
                        <small>${item.year} / ${item.format}</small>
                    </div>
                `
                listItem.onclick = () => router.navigate(`/anime/${item.id}`)
                break
        
            case 'release':
                listItem.classList.add('release-card', 'card')
                const animeData = allAnimes.find(anime => item.animeIds.includes(anime.id))
                const teams = item.teams.map(t => `<span><img src='${t.logo}'>${t.name}</span>`).join('')
                // <img src='${animeData?.cover || item?.cover || '' }' class='release-poster'>
                listItem.innerHTML = `
                    <div class='poster-box'>
                        <img src='${animeData.hikkaPoster}' title='${item.title}'>
                    </div>
                    <div class='release-info'>
                        <h3 class='truncate'>${item.title}</h3>
                        <p class='teams-logos'>${teams}</p>
                        <p>Епізоди: ${item.episodes}</p>
                    </div>
                `
                listItem.onclick = () => router.navigate(`/release/${item.id}`)
                break
        }
        itemList.appendChild(listItem)
    }

    section.appendChild(itemList)
    return section
}
// Оновлення навігації
function updateNavigation(firstCrumbText, secondCrumbText = null) {
    firstCrumb.textContent = firstCrumbText
    const nav = document.getElementById('nav')
    let secondCrumb = nav.querySelector('#secondCrumb')
    
    if (secondCrumbText) {
        if (!secondCrumb) {
            secondCrumb = document.createElement('span')
            secondCrumb.id = 'secondCrumb'
            nav.appendChild(secondCrumb)
        }
        secondCrumb.textContent = secondCrumbText
    } else if (secondCrumb) {
        secondCrumb.remove()
    }
}

// Відображення сторінки команди
async function renderTeamDetail(team) {
    firstCrumb.textContent = 'Команди'
    app.innerHTML = `
    <div class='team-detail'>
        <div class='top-section'>
            <img class='team-logo' src='${team.logo}' title='${team.name}'>
            <div class='info-section'>
                <h1>${team.name}</h1>
                <div class='team-info'>
                    <p>Тип робіт: ${team.type}</p>
                    <p>Статус: ${team.status}</p>
                </div>
            </div>
        </div>
        <div id='releasesList' class='page-block'>Завантаження інформації про релізи...</div>
    </div>
    `
    updateNavigation(team.name)

    // Завантаження та відображення інформації про релізи
    const releases = team.releases.length > 0 ? allReleases.filter(release => team.releases.some(r => r.id === release.id)) : []
    
    const releasesList = document.getElementById('releasesList')
    if (releases.length > 0) {
        const releaseCards = await renderAnimeReleases(releases)
        releasesList.innerHTML = '<h3>Релізи:</h3>'
        releasesList.appendChild(releaseCards)
    } else {
        releasesList.innerHTML = '<p>Релізи не знайдено</p>'
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
        const teams = release.teams.map(t => `<span><img src='${t.logo}'>${t.name}</span>`).join('')

        card.innerHTML = `
            <img src='${release.cover}' class='anime-poster'>
            <h3 class='truncate'>${release.title}</h3>
            <p class='teams-logos'>${teams}</p>
            <p>Епізоди: ${release.episodes}</p>
        `

        card.onclick = () => router.navigate(`/release/${release.id}`)
        cardsContainer.appendChild(card)
    }

    return cardsContainer
}

// Відображення деталей релізу
async function renderReleaseDetail(release) {
    firstCrumb.textContent = 'Релізи'
    const anime = allAnimes.find(anime => release.animeIds.includes(anime.id))
    const teams = release.teams.map(t => `<span><img src='${t.logo}'>${t.name}</span>`).join('')
    const torrents = release.torrentLinks.map(t => `<a href='${t.url}' target='_blank'>${t.text}</a>`).join('')

    app.innerHTML = `
    <div class='release-detail'>
        <div class='anime-cover'><img src='${anime.cover}'></div>
        <div class='top-section'>
            <img class='anime-poster' src='${release.poster || anime.poster || anime.hikkaPoster}'>
            <div class='release'>
                <div>
                    <h1>${release.title}</h1>
                </div>
                <div class='release-info'>
                    <p>Аніме: ${anime?.title || 'Невідоме аніме'}</p>
                    <p class='teams-logos'>Команда: ${teams}</p>
                    <p>Статус: ${release.status}</p>
                    <p>Епізоди: ${release.episodes}</p>
                    <p>Торент: ${release.torrent}</p>
                    <p class='release-torrents'>${torrents}</p>
                </div>
            </div>
        </div>
    </div>
    `
    updateNavigation(release.title)
}

// Відображення деталей аніме
async function renderAnimeDetail(anime) {
    firstCrumb.textContent = 'Аніме'
    app.innerHTML = `
    <div class='anime-detail'>
        <div class='anime-cover'><img src='${anime.cover}'></div>
        <div class='top-section'>
            <img class='anime-poster' src='${anime.poster || anime.hikkaPoster}' title='${anime.title}'>
            <div class='title'>
                <div>
                    <h1>${anime.title}</h1>
                    <span>${anime.romaji}</span>
                </div>
                <div class='anime-info'>
                    <p>Тип: ${anime.type}</p>
                    <p>Формат: ${anime.format}</p>
                    <p>Рік: ${anime.year}</p>
                    <p>Епізоди: ${anime.episodes}</p>
                </div>
            </div>
        </div>
        <div id='releasesList' class='page-block'>Завантаження інформації про релізи...</div>
    </div>
    `
    updateNavigation(anime.title)
    // Завантаження та відображення інформації про релізи
    const releases = anime.releases ? allReleases.filter(r => r.animeIds.includes(anime.id)) : []
    const releasesList = document.getElementById('releasesList')
    if (releases.length > 0) {
        const releaseCards = await renderAnimeReleases(releases)
        releasesList.innerHTML = '<h3>Релізи:</h3>'
        releasesList.appendChild(releaseCards)
    } else {
        releasesList.innerHTML = '<p>Релізи не знайдено</p>'
    }
}

// Рендеринг списку аніме
function renderList(items, type, initialFilters = {}) {
    console.log(currentRoute)
    console.log(allAnimes.length)
    updateNavigation(type)
    const itemsPerPage = 20
    let currentPage = 0
    let isLoading = false
    let allItemsLoaded = false
    let filteredItems = [...items]
    let activeFilters = initialFilters
    let currentView
    app.innerHTML = `
        <div class="list-controls">
            <input type="text" id="localSearchInput" placeholder="Пошук...">
            <div class="view-controls">
                <button id="gridViewBtn" class="active"><i class="fas fa-th"></i></button>
                <button id="listViewBtn"><i class="fas fa-list"></i></button>
            </div>
            <button id="filterBtn"><i class="fas fa-filter"></i> Фільтр</button>
        </div>
        <div id="filterOptions" style="display: none">
            <!-- Фільтри будуть додані тут динамічно -->
        </div>
        <div class="items-list grid-view"></div>
        <div id="loading" style="display: none">Завантаження...</div>
    `

    const listDiv = document.querySelector('.items-list')
    const searchInput = document.getElementById('localSearchInput')
    const gridViewBtn = document.getElementById('gridViewBtn')
    const listViewBtn = document.getElementById('listViewBtn')
    const filterBtn = document.getElementById('filterBtn')
    const filterOptions = document.getElementById('filterOptions')
    const loadingDiv = document.getElementById('loading')

    initializeView()

    searchInput.addEventListener('input', handleSearch)
    gridViewBtn.addEventListener('click', () => changeView('grid'))
    listViewBtn.addEventListener('click', () => changeView('list'))
    filterBtn.addEventListener('click', toggleFilterOptions)

    function handleSearch() {
        const query = searchInput.value.toLowerCase()
        if (query.length === 0 || query.length >= 3) {
            filteredItems = items.filter(item => {
                switch (type) {
                    case 'Аніме':
                        return  item.title.toLowerCase().includes(query) || 
                                item.romaji.toLowerCase().includes(query)
                    case 'Релізи':
                        const anime = allAnimes.find(anime => item.animeIds.includes(anime.id))
                        return  item.title.toLowerCase().includes(query) || 
                                (anime?.title.toLowerCase().includes(query)) || 
                                (anime?.romaji.toLowerCase().includes(query))
                    case 'Команди':
                        return item.name.toLowerCase().includes(query)
                }
            })
            resetList()
        }
    }

    function initializeView() {
        currentView = getFromCache('currentView') || 'grid'
        updateViewButtons()
        listDiv.className = `items-list ${currentView}-view`
    }
    function updateViewButtons() {
        if (currentView === 'grid') {
            gridViewBtn.classList.add('active')
            listViewBtn.classList.remove('active')
        } else {
            listViewBtn.classList.add('active')
            gridViewBtn.classList.remove('active')
        }
    }
    function changeView(view) {
        if (view !== currentView) {
            currentView = view
            saveToCache('currentView', view)
            updateViewButtons()
            listDiv.className = `items-list ${view}-view`
            resetList()
        }
    }

    function toggleFilterOptions() {
        filterOptions.style.display = filterOptions.style.display === 'none' ? 'block' : 'none'
    }

    function initializeFilters(type) {
        const filterOptions = document.getElementById('filterOptions')
        let filterHTML = ''
    
        if (type === 'Аніме' || type === 'Релізи') {
            filterHTML += `
                <div>
                    <h4>Тип:</h4>
                    <button class="filter-btn" data-filter="format" data-value="ТБ">ТБ</button>
                    <button class="filter-btn" data-filter="format" data-value="Фільм">Фільм</button>
                    <button class="filter-btn" data-filter="format" data-value="ОВА">ОВА</button>
                </div>
            `
        }
    
        if (type === 'Релізи') {
            filterHTML += `
                <div>
                    <h4>Статус:</h4>
                    <button class="filter-btn" data-filter="status" data-value="В процесі">В процесі</button>
                    <button class="filter-btn" data-filter="status" data-value="Завершено">Завершено</button>
                </div>
            `
        }
    
        filterOptions.innerHTML = filterHTML
    
        // Додаємо обробники подій для кнопок фільтрів
        const filterButtons = document.querySelectorAll('.filter-btn')
        filterButtons.forEach(button => {
            button.addEventListener('click', () => {
                const filterType = button.dataset.filter
                const filterValue = button.dataset.value
                
                if (activeFilters[filterType]?.includes(filterValue)) {
                    activeFilters[filterType] = activeFilters[filterType].filter(v => v !== filterValue)
                    button.classList.remove('active')
                } else {
                    if (!activeFilters[filterType]) {
                        activeFilters[filterType] = []
                    }
                    activeFilters[filterType].push(filterValue)
                    button.classList.add('active')
                }
                
                applyFilters()
            })
        })

        // Встановлюємо початковий стан фільтрів
        Object.entries(activeFilters).forEach(([filterType, values]) => {
            values.forEach(value => {
                const button = document.querySelector(`.filter-btn[data-filter="${filterType}"][data-value="${value}"]`)
                button && button.classList.add('active')
            })
        })
    }

    function applyFilters() {
        filteredItems = items.filter(item => {
            let formatMatch = true
            let statusMatch = true

            switch (type) {
                case 'Аніме':
                    formatMatch = !activeFilters.format || activeFilters.format.length === 0 || activeFilters.format.includes(item.format)
                    break
            
                case 'Релізи':
                    const anime = allAnimes.find(anime => item.animeIds.includes(anime.id))
                    formatMatch = !activeFilters.format || activeFilters.format.length === 0 || (anime && activeFilters.format.includes(anime.format))
                    statusMatch = !activeFilters.status || activeFilters.status.length === 0 || activeFilters.status.includes(item.status)
                    break
            }

            return formatMatch && statusMatch
        })

        resetList()
        updateURL()
    }
    function updateURL() {
        const params = new URLSearchParams()
        Object.entries(activeFilters).forEach(([key, values]) => {
            if (values && values.length > 0) {
                params.append(key, values.join(','))
            }
        })
        const newURL = `#/releases?${params.toString()}`
        history.pushState(null, '', newURL)
    }

    function resetList() {
        listDiv.innerHTML = ''
        currentPage = 0
        allItemsLoaded = false
        loadMoreItems()
    }

    function loadMoreItems() {
        if (isLoading || allItemsLoaded) return

        isLoading = true
        loadingDiv.style.display = 'block'

        const startIndex = currentPage * itemsPerPage
        const endIndex = Math.min(startIndex + itemsPerPage, filteredItems.length)
        const itemsToRender = filteredItems.slice(startIndex, endIndex)

        itemsToRender.forEach((item) => {
            const card = createItemCard(item, type)
            listDiv.appendChild(card)
        })

        currentPage++
        isLoading = false
        loadingDiv.style.display = 'none'

        if (endIndex >= filteredItems.length) {
            allItemsLoaded = true
            loadingDiv.textContent = 'Всі елементи завантажено'
        }
    }

    function createItemCard(item, type) {
        const card = document.createElement('div')
        card.classList.add('card')

        switch (type) {
            case 'Аніме':
                card.classList.add('anime-card')
                switch (currentView) {
                    case 'grid':
                        card.innerHTML = `
                            <div class='poster-box'>
                                <img src='${item.poster || item.hikkaPoster}' title='${item.title}' loading="lazy">
                            </div>
                            <div class='info'>
                                <h3 class='truncate' title='${item.title}'>${item.title}</h3>
                                <small>${item.year} / ${item.format}</small>
                            </div>
                        `
                        card.onclick = () => router.navigate(`/anime/${item.id}`)
                        break
                    case 'list':
                        card.innerHTML = `
                            <div class='poster-box'>
                                <img src='${item.poster || item.hikkaPoster}' title='${item.title}' loading="lazy">
                            </div>
                            <div class='info'>
                                <img src='${item?.cover}' class='anime-cover' title='${item.title}' loading="lazy">
                                <h3 class='truncate' title='${item.title}'>${item.title}</h3>
                                <small>${item.year} / ${item.format}</small>
                            </div>
                        `
                        card.onclick = () => router.navigate(`/anime/${item.id}`)
                        break
                }
                break
            case 'Релізи':
                const anime = allAnimes.find(anime => item.animeIds.includes(anime.id))
                const teams = item.teams.map(t => `<span><img src='${t.logo}'>${t.name}</span>`).join('')
                card.classList.add('release-card')
                switch (currentView) {
                    case 'grid':
                        card.innerHTML = `
                            <img src='${anime?.cover}' class='release-poster' title='${item.title}' loading="lazy">
                            <div class='info'>
                                <h3 class='truncate'>${item.title}</h3>
                                <p class='teams-logos'>${teams}</p>
                                <p>Епізоди: ${item.episodes}</p>
                            </div>
                        `
                        card.onclick = () => router.navigate(`/release/${item.id}`)
                        break
                
                        case 'list':
                        card.innerHTML = `
                            <div class='poster-box'>
                                <img src='${anime.hikkaPoster}' title='${item.title}' loading="lazy">
                            </div>
                            <div class='info'>
                                <img src='${anime?.cover}' class='anime-cover' title='${item.title}' loading="lazy">
                                <h3 class='truncate'>${item.title}</h3>
                                <p class='teams-logos'>${teams}</p>
                                <p>Епізоди: ${item.episodes}</p>
                            </div>
                        `
                        card.onclick = () => router.navigate(`/release/${item.id}`)
                        break
                }
                break
            case 'Команди':
                card.classList.add('team-card')
                card.innerHTML = `
                    <img src='${item.logo}' class='team-logo' title='${item.name}'>
                    <div class='info'>
                        <h3 class='truncate'>${item.name}</h3>
                        <p>Релізи: ${item.releases.length}</p>
                    </div>
                `
                card.onclick = () => router.navigate(`/team/${item.id}`)
                break
        }

        return card
    }

    function handleScroll() {
        if ((window.innerHeight + window.scrollY) >= document.body.offsetHeight - 500) {
            loadMoreItems()
        }
    }

    window.addEventListener('scroll', handleScroll)
    initializeFilters(type)
    loadMoreItems()
    return () => window.removeEventListener('scroll', handleScroll)
}

function createCacheButton() {
    const cacheButton = document.createElement('button')
    cacheButton.textContent = 'Оновити кеш'
    cacheButton.setAttribute('id', 'cacheButton')
    cacheButton.onclick = () => {
        clearCache()
        location.reload()
    }
    footerLinks.append(cacheButton)
}

// Функція для рендерингу головної сторінки
async function renderHomePage() {
    updateNavigation('Головна')
    // app.innerHTML = '<h1>Каталог Фандабу!</h1>'
    const randomAnimeSection = renderRandomAnime()
    const statsSection = renderStatistics()
    const recentAnimesSection = renderReleasesSection(allAnimes.slice(0, 5), 'Останні додані аніме', 'anime', '#/animes')
    const recentReleasesSection = renderReleasesSection(allReleases.slice(0, 10), 'Останні додані релізи', 'release', '#/releases')
    const currentReleasesSection = renderReleasesSection(allReleases.slice(0, 10), 'Поточні релізи', 'release', '#/releases?status=В процесі')

    app.appendChild(randomAnimeSection)
    app.appendChild(recentAnimesSection)
    app.appendChild(recentReleasesSection)
    app.appendChild(currentReleasesSection)
    app.appendChild(statsSection)
    createCacheButton()
}

// Викликаємо рендеринг головної сторінки при завантаженні сторінки
document.addEventListener('DOMContentLoaded', async () => {
    try {
        loadingОverlay.style.display = 'flex'
        console.log('Сторінка завантажена, отримуємо дані...')
        await loadData()
        console.log('Дані отримано')
        initSearch(allAnimes, allReleases, allTeams, 
            (anime) => router.navigate(`/anime/${anime.id}`),
            (release) => router.navigate(`/release/${release.id}`)
        )
        setupRoutes()
        updateNavigationHandlers()
        window.onscroll = () => {
            window.scrollY > 0 ? nav.classList.add('scrolled') : nav.classList.remove('scrolled')
        }
    } catch (error) {
        console.error('Не вийшло отримати дані:', error)
        app.innerHTML = `<p>Виникла помилка при завантаженні: ${error.message}</p>`
    } finally {
        loadingОverlay.style.display = 'none'
    }
})