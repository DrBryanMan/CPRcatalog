import * as Functions from './functions.js'
import { allAnimes } from './loadData.js' // Змінні з даними
import { router } from './router.js'

// Рендеринг списку аніме
export function renderList(items, type, initialFilters) {
    console.log(`Завантажено ${items.length} ${type}`)
    Functions.updateNavigation(type)
    const itemsPerPage = 10
    let currentPage = 0
    let isLoading = false
    let allItemsLoaded = false
    let filteredItems = [...items]
    let activeFilters = initialFilters || {}
    let currentView
    let currentSort

    app.innerHTML = `
        <div class="filters-section">
            <div class="list-controls">
                <span id="itemsCounter"></span>
                <input type="text" id="localSearchInput" placeholder="Пошук...">
                <div class="view-controls">
                    <button id="gridViewBtn"><i class="material-symbols-rounded">grid_view</i></button>
                    <button id="listViewBtn"><i class="material-symbols-rounded">event_list</i></button>
                </div>
                ${type === 'Команди' ? `
                    <button id="sortBtn"><i class="material-symbols-rounded">sort</i></button>
                    <div id="sortOptions" class="sort-options">
                        <button data-sort="name">За алфавітом</button>
                        <button data-sort="releases">За кількістю релізів</button>
                    </div>
                ` : ''}
                <button id="filterBtn"><i class="material-symbols-rounded">tune</i></button>
                <div id="filterOptions"></div>
            </div>
        </div>
        <div class="items-list grid-view"></div>
        <div id="loading" style="display: none">Завантаження...</div>
    `

    const listDiv = document.querySelector('.items-list')
    const searchInput = document.getElementById('localSearchInput')
    const gridViewBtn = document.getElementById('gridViewBtn')
    const listViewBtn = document.getElementById('listViewBtn')
    // const filterBtn = document.getElementById('filterBtn')
    const filterOptions = document.getElementById('filterOptions')
    const loadingDiv = document.getElementById('loading')
    // const itemsCounter = document.getElementById('itemsCounter')

    searchInput.addEventListener('input', handleSearch)
    gridViewBtn.addEventListener('click', () => changeView('grid'))
    listViewBtn.addEventListener('click', () => changeView('list'))
    // filterBtn.addEventListener('click', toggleFilterOptions)
    
    initializeView()

    function handleSearch() {
        const query = searchInput.value.toLowerCase()
        const noResults = document.createElement('p')
        noResults.classList.add('no-results')
        
        const existingNoResults = document.querySelector('.no-results')
        if (existingNoResults) {
            existingNoResults.remove()
        }
        if (query.length === 0) {
            filteredItems = [...items]
            resetList(filteredItems.length)
            return
        }
        if (query.length < 3) {
            filteredItems = []
            noResults.innerHTML = '<i class="material-symbols-rounded">error</i><span>Введіть більше двох символів.</span>'
            listDiv.after(noResults)
            resetList(0)
            return
        }
        filteredItems = items.filter(item => {
            switch (type) {
                case 'Аніме':
                    return  item.title?.toLowerCase().includes(query) || 
                            item.romaji?.toLowerCase().includes(query)
                case 'Релізи':
                    const anime = allAnimes.find(anime => item.animeIds.includes(anime.id))
                    return  item.title.toLowerCase().includes(query) || 
                            anime?.title.toLowerCase().includes(query) || 
                            anime?.romaji?.toLowerCase().includes(query)
                case 'Команди':
                    return item.name.toLowerCase().includes(query)
            }
            return false
        })
        if (filteredItems.length === 0) {
            noResults.innerHTML = `
                <i class="material-symbols-rounded">data_alert</i>
                <span>За вашим запитом нічого не знайдено :(</span>
            `
            listDiv.after(noResults)
        }
        resetList(filteredItems.length)
    }

    function initializeView() {
        currentView = Functions.getFromCache('currentView') || 'grid'
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
            Functions.saveToCache('currentView', view)
            updateViewButtons()
            listDiv.className = `items-list ${view}-view`
            resetList(filteredItems.length)
        }
    }

    function sortItems() {
        if (type === 'Команди') {
            switch (currentSort) {
                case 'name':
                    filteredItems.sort((a, b) => a.name.localeCompare(b.name))
                    break
                case 'releases':
                    filteredItems.sort((a, b) => b.anime_releases.length - a.anime_releases.length)
                    break
            }
        }
    }
    if (type === 'Команди') {
        // const sortBtn = document.getElementById('sortBtn')
        // const sortOptions = document.getElementById('sortOptions')
        
        // sortBtn.addEventListener('click', () => {
        //     sortBtn.classList.toggle('active')
        //     sortOptions.classList.toggle('active')
        // })

        sortOptions.addEventListener('click', (e) => {
            if (e.target.tagName === 'BUTTON') {
                const sortType = e.target.dataset.sort
                currentSort = sortType
                sortItems()
                resetList(filteredItems.length)
                // sortBtn.classList.remove('active')
                // sortOptions.classList.remove('active')
            }
        })
    }

    // function toggleFilterOptions() {
    //     // filterOptions.style.display = filterOptions.style.display === 'none' ? 'flex' : 'none'
    //     filterBtn.classList.toggle('active')
    //     filterOptions.classList.toggle('active')
    // }

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
        resetList(filteredItems.length)
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

    function resetList(count) {
        listDiv.innerHTML = ''
        currentPage = 0
        allItemsLoaded = false
        itemsCounter.textContent = `Результатів: ${count}`
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
        const divider = ' • '

        switch (type) {
            case 'Аніме':
                card.classList.add('anime-card')
                switch (currentView) {
                    case 'grid':
                        card.innerHTML = `
                            <div class='poster-box'>
                                <img src='${item.posters[0]?.url.replace("/upload/", "/upload/q_70/") || item.poster}' title='${item.title}'">
                            </div>
                            <div class='info'>
                                <h3 class='truncate' title='${item.title}'>${item.title}</h3>
                                <small>${item.year}${item.year ? divider : ''}${item.format}</small>
                            </div>
                        `
                        break
                    case 'list':
                        const cover = item.cover ? `<div class='anime-cover'><img src='${item.cover}'"></div>` : ''
                        card.innerHTML = `
                            ${cover}
                            <div class='poster-box'>
                                <img src='${item.posters[0]?.url || item.poster}' title='${item.title}'">
                            </div>
                            <div class='info'>
                                <h3 class='truncate' title='${item.title}'>${item.title}</h3>
                                <small>${item.year}${item.year ? divider : ''}${item.format}</small>
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
                        // item.posters[0]?.url || 
                        card.innerHTML = `
                            <div class='poster-box'>
                                <img src='${anime?.posters[0]?.url.replace("/upload/", "/upload/q_70/") || anime?.poster}' title='${item.title}'">
                            </div>
                            <div class='info'>
                                <h3 class='truncate'>${item.title}</h3>
                                <p class='teams-logos'>${teams}</p>
                                <p>Епізоди: ${item.episodes}</p>
                            </div>
                        `
                        break
                    case 'list':
                        const cover = anime?.cover ? `<div class='anime-cover'><img src='${anime.cover}'"></div>` : ''
                        // item.posters[0]?.url || 
                        card.innerHTML = `
                            ${cover}
                            <div class='poster-box'>
                                <img src='${anime?.posters[0]?.url || anime?.poster}' title='${item.title}'">
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
    return () => window.removeEventListener('scroll', handleScroll)
}