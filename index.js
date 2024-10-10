import { initSearch } from './js/search.js'

let allAnimes = []
let allReleases = []
let allTeams = []
let hikkaAnimeData = []
const router = new Navigo('/', { hash: true })
let currentRoute

function saveToCache(key, data) {
    localStorage.setItem(key, JSON.stringify(data))
}
function getFromCache(key) {
    const data = localStorage.getItem(key)
    return data ? JSON.parse(data) : null
}
function clearCache() {
    localStorage.removeItem('allAnimes')
    localStorage.removeItem('allReleases')
    localStorage.removeItem('allTeams')
    localStorage.removeItem('hikkaAnimeData')
    localStorage.removeItem('currentView')
}

function setupRoutes() {
    let cleanup = null

    function cleanupAndRender(renderFunction, ...args) {
        typeof cleanup === 'function' && cleanup()
        cleanup = renderFunction(...args) || null
    }

    function handleRoute(route, renderFunction, ...args) {
        return () => {
            currentRoute = route
            cleanupAndRender(renderFunction, ...args)
        }
    }

    router
        .on('*', () => window.scrollTo(0, 0))
        .on('/', handleRoute('/', renderHomePage))
        .on('/animes', handleRoute('/animes', renderList, allAnimes, 'Аніме'))
        .on('/anime/:id', (match) => {
            const anime = allAnimes.find(a => a.id === match.data.id)
            handleRoute('/anime/:id', renderAnimeDetail, anime)()
        })
        .on('/releases', (match) => {
            const initialFilters = {}
            for (let key in match.params) {
                if (match.params.hasOwnProperty(key)) {
                    initialFilters[key] = match.params[key].split(',')
                }
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
            if (typeof cleanup === 'function') {
                cleanup()
            }
            cleanup = null
            app.innerHTML = `
            <h1>404 - Сторінку не знайдено</h1>
            <img src='https://www.1999.co.jp/itbig85/10852139a2_m.jpg'>
            `
            currentRoute = 'notFound'
        })
    router.resolve()
}

// Отримуємо всі дані
async function loadData() {
    if (allAnimes.length === 0) {
    // const cachedAnimes = getFromCache('allAnimes')
    // const cachedReleases = getFromCache('allReleases')
    // const cachedTeams = getFromCache('allTeams')
    // const cachedHikkaData = getFromCache('hikkaAnimeData')

    // if (cachedAnimes && cachedReleases && cachedTeams && cachedHikkaData) {
    //     allAnimes = cachedAnimes
    //     allReleases = cachedReleases
    //     allTeams = cachedTeams
    //     hikkaAnimeData = cachedHikkaData
    //     console.log('Дані з кешу отримано')
    // } else {
        try {
            const [animeData, teamData, releaseData, hikkaData] = await Promise.all([
                fetch('AnimeTitlesDB.json').then(res => res.json()),
                fetch('TeamsDB.json').then(res => res.json()),
                fetch('AnimeReleasesDB.json').then(res => res.json()),
                fetch('hikkaData.json').then(res => res.json())
            ])
            hikkaAnimeData = hikkaData
            allTeams = teamData.sort((a, b) => a.name.localeCompare(b.name))
                
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
                .filter(link => link !== null)
                .map(link => ({
                    text: link.plain_text,
                    href: link.href
                }))
            }))

            allAnimes = animeData.map(anime => ({
                id: anime.id,
                hikkaUrl: anime.properties.Hikka.url,
                cover: anime.cover?.external?.url || anime.cover?.file?.url,
                poster: anime.properties.Постер.files[0]?.external?.url || anime.properties.Постер.files[0]?.file.url,
                hikkaPoster: hikkaAnimeData.find(hikka => hikka.url === anime.properties.Hikka.url)?.poster,
                title: anime.properties['Назва тайтлу'].title[0]?.plain_text || 'Без назви',
                romaji: anime.properties.Ромаджі.rich_text[0]?.plain_text || '',
                type: anime.properties['Тип медіа'].multi_select[0]?.name || '',
                format: anime.properties.Формат.select?.name || '',
                year: anime.properties['Рік виходу'].rich_text[0]?.plain_text || '',
                episodes: anime.properties['Кількість серій'].rich_text[0]?.plain_text || '',
                releases: anime.properties['🗂️ Релізи команд'].relation
                    .map(rel => allReleases.find(release => release.id === rel.id))
                    .filter(Boolean)
            })).filter(anime => anime.releases.length > 0)

            // Додаємо унікальні команди до аніме
            allAnimes = allAnimes.map(anime => {
                const teams = new Set()
                anime.releases.forEach(release => {
                    release.teams.forEach(team => {
                        teams.add(JSON.stringify(team))
                    })
                })
                return {...anime, teams: Array.from(teams).map(JSON.parse)}
            })

            // Додаткові дані до релізів
            allReleases = allReleases.map(release => ({
                ...release,
                animeData: allAnimes.find(anime => release.animeIds.includes(anime.id))
            }))

            // saveToCache('allAnimes', allAnimes)
            // saveToCache('allReleases', allReleases)
            // saveToCache('allTeams', allTeams)
            // saveToCache('hikkaAnimeData', hikkaAnimeData)
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
        <div class='main-header'>
            <h2>Статистика каталогу</h2>
        </div>
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
    const randomAnimeSection = document.createElement('div')
    randomAnimeSection.classList.add('random-anime-section')
    
    function updateAnimeContent() {
        const anime = allAnimes[Math.floor(Math.random() * allAnimes.length)]
        const container = randomAnimeSection.querySelector('#randomAnime')
        container.innerHTML = `
            <div class='poster-box'>
                <img src='${anime.poster || anime.hikkaPoster}' title='${anime.title}' loading="lazy">
            </div>
            <div class='info'>
                <h3 class='truncate'>${anime.title}</h3>
                <p>${anime.romaji}</p>
                <p>Тип: ${anime.type}</p>
                <p>Формат: ${anime.format}</p>
                <p>Рік: ${anime.year}</p>
                <p>Епізоди: ${anime.episodes}</p>
            </div>
        `
    // const card = randomAnimeSection.querySelector('.card')
    container.onclick = () => router.navigate(`/anime/${anime.id}`)
    }

    randomAnimeSection.innerHTML = `
        <div class='main-header'>
            <h2>Випадкове аніме</h2>
            <button id='randomizeButton' title='Оновити'><i class="fa-solid fa-rotate-right"></i></button>
        </div>
        <div class='items-list list-view'>
            <div id='randomAnime' class='random-anime-container card'>
            </div>
        </div>
    `
    updateAnimeContent()

    const randomButton = randomAnimeSection.querySelector('#randomizeButton')
    randomButton.onclick = updateAnimeContent

    return randomAnimeSection
}
function renderReleasesSection(items, title, type, route) {
    const section = document.createElement('div')
    section.classList.add('releases-section')
    section.innerHTML = `<div class='releases-header main-header'><h2>${title}</h2><a href='${route}' data-navigo><i class="fa-solid fa-angles-right"></i></a></div>`

    const itemList = document.createElement('div')
    itemList.classList.add('items-list')

    for (const item of items) {
        const listItem = document.createElement('div')

        switch (type) {
            case 'Аніме':
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
        
            case 'Реліз':
                listItem.classList.add('release-card', 'card')
                const animeData = allAnimes.find(anime => item.animeIds.includes(anime.id))
                const teams = item.teams.map(t => `<span class='truncate'><img src='${t.logo}'>${t.name}</span>`).join('')
                // <img src='${animeData?.cover || item?.cover || '' }' class='release-poster'>
                listItem.innerHTML = `
                    <div class='poster-box'>
                        <img src='${item.poster || animeData?.poster || animeData?.hikkaPoster || ''}' title='${item.title}'>
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
function updateNavigation(type, secondCrumbText = null) {
    firstCrumb.textContent = type
    let secondCrumb = nav.querySelector('#secondCrumb')
    
    secondCrumbText
        ? (secondCrumb = secondCrumb || (() => {
                secondCrumb = document.createElement('span')
                secondCrumb.id = 'secondCrumb'
                nav.appendChild(secondCrumb)
                return secondCrumb
            })(),
            secondCrumb.textContent = secondCrumbText)
        : secondCrumb && secondCrumb.remove()
}

// Відображення сторінки команди
async function renderTeamDetail(team) {
    updateNavigation('Команди', team.name)
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

    // Завантаження та відображення інформації про релізи
    const releases = team.anime_releases.length > 0 ? allReleases.filter(release => team.anime_releases.some(r => r.id === release.id)) : []
    
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
        const teams = release.teams.map(t => `<span class='truncate'><img src='${t.logo}'>${t.name}</span>`).join('')

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
    updateNavigation('Релізи', release.title)
    const anime = allAnimes.find(anime => release.animeIds.includes(anime.id))
    const teams = release.teams.map(t => `<span><img src='${t.logo}'>${t.name}</span>`).join('')
    const torrents = release.torrentLinks.map(t => `<a href='${t.href}' class='external-link'>${t.text}</a>`).join('')
    const cover = anime?.cover ? `<div class='anime-cover'><img src='${anime.cover}'></div>` : ''

    app.innerHTML = `
    <div class='title-detail'>
        ${cover}
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
    // Add this event listener
    const externalLinks = app.querySelectorAll('.external-link')
    externalLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault()
            const href = e.currentTarget.getAttribute('href')
            window.open(href, '_blank')
        })
    })
}

// Відображення деталей аніме
async function renderAnimeDetail(anime) {
    updateNavigation('Аніме', anime.title)
    const teams = anime.teams.map(t => `<span><img src='${t.logo}'>${t.name}</span>`).join('')

    app.innerHTML = `
    <div class='title-detail'>
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
                    <p class='teams-logos'>Команда: ${teams}</p>
                </div>
            </div>
        </div>
        <div id='releasesList' class='page-block'>Завантаження інформації про релізи...</div>
    </div>
    `
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
function renderList(items, type, initialFilters) {
    console.log(`Завантажено ${items.length} ${type}`)
    updateNavigation(type)
    const itemsPerPage = 20
    let currentPage = 0
    let isLoading = false
    let allItemsLoaded = false
    let filteredItems = [...items]
    let activeFilters = initialFilters || {}
    let currentView

    app.innerHTML = `
        <div class="filters-section">
            <div class="list-controls">
                <input type="text" id="localSearchInput" placeholder="Пошук...">
                <div class="view-controls">
                <button id="gridViewBtn"><i class="material-symbols-rounded">grid_view</i></button>
                <button id="listViewBtn"><i class="material-symbols-rounded">event_list</i></button>
                </div>
                <button id="filterBtn"><i class="material-symbols-rounded">tune</i></button>
            </div>
            <div id="filterOptions">
                <!-- Фільтри будуть додані тут динамічно -->
            </div>
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

    searchInput.addEventListener('input', handleSearch)
    gridViewBtn.addEventListener('click', () => changeView('grid'))
    listViewBtn.addEventListener('click', () => changeView('list'))
    filterBtn.addEventListener('click', toggleFilterOptions)
    
    initializeView()

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
        // filterOptions.style.display = filterOptions.style.display === 'none' ? 'flex' : 'none'
        filterBtn.classList.toggle('active')
        filterOptions.classList.toggle('active')
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
                applyFilters(true)
            })
        })

        // Встановлюємо початковий стан фільтрів
        Object.entries(activeFilters).forEach(([filterType, values]) => {
            values.forEach(value => {
                const button = document.querySelector(`.filter-btn[data-filter="${filterType}"][data-value="${value}"]`)
                if (button) {
                    button.classList.add('active')
                }
            })
        })
    }

    function applyFilters(shouldUpdateUrl = false) {
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
        if (shouldUpdateUrl) {
          updateURL()
        }
    }
    function updateURL() {
        const params = new URLSearchParams()
        Object.entries(activeFilters).forEach(([key, values]) => values && values.length > 0 && params.append(key, values.join(',')))
        const newUrl = `#${currentRoute}?${params.toString()}`
        const currentUrl = window.location.hash
        
        if (newUrl !== currentUrl) {
            history.pushState(null, '', newUrl)
        }
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
                        break
                    case 'list':
                        const cover = item.cover ? `<div class='anime-cover'><img src='${item.cover}' loading="lazy"></div>` : ''
                        card.innerHTML = `
                            ${cover}
                            <div class='poster-box'>
                                <img src='${item.poster || item.hikkaPoster}' title='${item.title}' loading="lazy">
                            </div>
                            <div class='info'>
                                <h3 class='truncate' title='${item.title}'>${item.title}</h3>
                                <small>${item.year} / ${item.format}</small>
                            </div>
                        `
                        break
                }
                card.onclick = () => router.navigate(`/anime/${item.id}`)
                break
            case 'Релізи':
                const anime = allAnimes.find(anime => item.animeIds.includes(anime.id))
                const teams = item.teams.map(t => `<span class='truncate'><img src='${t.logo}'>${t.name}</span>`).join('')
                card.classList.add('release-card')
                
                switch (currentView) {
                    case 'grid':
                        card.innerHTML = `
                            <div class='poster-box'>
                                <img src='${item.poster || anime?.hikkaPoster}' title='${item.title}' loading="lazy">
                            </div>
                            <div class='info'>
                                <h3 class='truncate'>${item.title}</h3>
                                <p class='teams-logos'>${teams}</p>
                                <p>Епізоди: ${item.episodes}</p>
                            </div>
                        `
                        break
                    case 'list':
                        const cover = anime?.cover ? `<div class='anime-cover'><img src='${anime.cover}' loading="lazy"></div>` : ''
                        card.innerHTML = `
                            ${cover}
                            <div class='poster-box'>
                                <img src='${item.poster || anime?.hikkaPoster}' title='${item.title}' loading="lazy">
                            </div>
                            <div class='info'>
                                <h3 class='truncate'>${item.title}</h3>
                                <p class='teams-logos'>${teams}</p>
                                <p>Епізоди: ${item.episodes}</p>
                            </div>
                        `
                    break
                }
                card.onclick = () => router.navigate(`/release/${item.id}`)
                break
            case 'Команди':
                const logo = item.logo ? `<img src='${item.logo}' class='team-logo' title='${item.name}'></img>` : ''
                card.classList.add('team-card')
                switch (currentView) {
                    case 'grid':
                        card.innerHTML = `
                            ${logo}
                            <div class='info'>
                                <h3 class='truncate'>${item.name}</h3>
                                <p>Релізи: ${item.anime_releases.length}</p>
                            </div>
                        `
                        break
                    case 'list':
                        card.innerHTML = `
                            ${logo}
                            <div class='info'>
                                <h3>${item.name}</h3>
                                <p>Релізи: ${item.anime_releases.length}</p>
                            </div>
                        `
                        break
                }
                card.onclick = () => router.navigate(`/team/${item.id}`)
        }

        return card
    }

    function handleScroll() {
        if ((window.innerHeight + window.scrollY) >= document.body.offsetHeight - 500) {
            loadMoreItems()
        }
    }

    initializeFilters(type)
    applyFilters()
    loadMoreItems()

    window.addEventListener('scroll', handleScroll)
    return () => {
        window.removeEventListener('scroll', handleScroll)
    }
}

// Функція для рендерингу головної сторінки
async function renderHomePage() {
    updateNavigation('Головна')
    app.innerHTML = ''
    const randomAnimeSection = renderRandomAnime()
    const statsSection = renderStatistics()
    const recentAnimesSection = renderReleasesSection(allAnimes.slice(0, 6), 'Останні додані аніме', 'Аніме', '/animes')
    const recentReleasesSection = renderReleasesSection(allReleases.slice(0, 6), 'Останні додані релізи', 'Реліз', '/releases')
    const currentReleasesSection = renderReleasesSection(allReleases.slice(0, 6), 'Поточні релізи', 'Реліз', '/releases?status=В процесі')

    app.appendChild(randomAnimeSection)
    app.appendChild(recentAnimesSection)
    app.appendChild(recentReleasesSection)
    app.appendChild(currentReleasesSection)
    app.appendChild(statsSection)
}

// Викликаємо рендеринг головної сторінки при завантаженні сторінки
document.addEventListener('DOMContentLoaded', async () => {
    try {
        (window.location.pathname === '/CPRcatalog/' || window.location.pathname === '/' || window.location.pathname === '/index.html') && window.location.hash === '' ? router.navigate('/') : null
        loadingОverlay.style.display = 'flex'
        await loadData()
        initSearch(allAnimes, allReleases, allTeams, 
            (anime) => router.navigate(`/anime/${anime.id}`),
            (release) => router.navigate(`/release/${release.id}`)
        )
        setupRoutes()

        document.body.addEventListener('click', function(event) {
            if (event.target.tagName === 'a') {
              const href = event.target.getAttribute('href')
              
              // Перевіряємо, чи є посилання зовнішнім
              if (href.startsWith('http') || href.startsWith('https') || event.target.hasAttribute('data-external')) {
                // Дозволяємо стандартну поведінку для зовнішніх посилань
                return
              }
              
              // Для внутрішніх посилань застосовуємо клієнтський роутинг
              event.preventDefault()
              router.navigate(href)
            }
        })

        cacheButton.onclick = () => {
            clearCache()
            location.reload()
        }
        window.onscroll = () => window.scrollY > 0 ? nav.classList.add('scrolled') : nav.classList.remove('scrolled') 
    } catch (error) {
        console.error('Не вийшло отримати дані:', error)
        app.innerHTML = `<p>Виникла помилка при завантаженні: ${error.message}</p>`
    } finally {
        loadingОverlay.style.display = 'none'
    }
})