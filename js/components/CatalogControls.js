import { AnimeTitles, AnimeReleases } from '../loadData.js'

export function createCatalogControls(searchInput, filterContainer, sortContainer, onDataChange) {
    const state = {
        searchInput,
        filterContainer,
        sortContainer,
        onDataChange,
        currentQuery: '',
        activeFilters: {},
        currentSort: null
    }

    function initSearch() {
        state.searchInput.addEventListener('input', () => {
            state.currentQuery = state.searchInput.value.toLowerCase()
            handleDataChange()
        })
    }

    function initSort() {
        if (state.sortContainer) {
            state.sortContainer.addEventListener('click', (e) => {
                if (e.target.tagName === 'BUTTON') {
                    state.currentSort = e.target.dataset.sort
                    handleDataChange()
                }
            })
        }
    }

    function initializeFilters(type, initialFilters = {}) {
        state.activeFilters = initialFilters
        renderFilters(type)
        addFilterEventListeners()
        setInitialFilterState()
    }

    function renderFilters(type) {
        let filterHTML = ''
        if (type === 'Аніме' || type === 'Релізи') {
            filterHTML += `
                <div>
                    <h4>Рік:</h4>
                    <input type="number" id="yearFilter" placeholder="2025" min="1960" max="2030">
                </div>
                <div>
                    <h4>Сезон:</h4>
                    <button class="filter-btn" data-filter="season" data-value="winter">Зима</button>
                    <button class="filter-btn" data-filter="season" data-value="spring">Весна</button>
                    <button class="filter-btn" data-filter="season" data-value="summer">Літо</button>
                    <button class="filter-btn" data-filter="season" data-value="fall">Осінь</button>
                </div>
                <div>
                    <h4>Тип:</h4>
                    <button class="filter-btn" data-filter="format" data-value="ТБ">ТБ</button>
                    <button class="filter-btn" data-filter="format" data-value="Фільм">Фільм</button>
                    <button class="filter-btn" data-filter="format" data-value="ОВА">ОВА</button>
                    <button class="filter-btn" data-filter="format" data-value="ОМА">ОМА</button>
                    <button class="filter-btn" data-filter="format" data-value="Спешл">Спешл</button>
                </div>
            `
        }
        if (type === 'Релізи') {
            filterHTML += `
                <div>
                    <h4>Статус:</h4>
                    <button class="filter-btn" data-filter="status" data-value="Завершено">Завершено</button>
                    <button class="filter-btn" data-filter="status" data-value="В процесі">В процесі</button>
                    <button class="filter-btn" data-filter="status" data-value="Закинуто">Закинуто</button>
                </div>
                <div>
                    <h4>Джерела:</h4>
                    <button class="filter-btn" data-filter="sources" data-value="толока">Toloka</button>
                    <button class="filter-btn" data-filter="sources" data-value="FEX">FEX</button>
                    <button class="filter-btn" data-filter="sources" data-value="тг">Telegram</button>
                    <button class="filter-btn" data-filter="sources" data-value="юакіно">Uakino</button>
                    <button class="filter-btn" data-filter="sources" data-value="юасеріал">Uaserial</button>
                    <button class="filter-btn" data-filter="sources" data-value="анітюб">Anitube</button>
                </div>`
        }
        if (type === 'Команди') {
            filterHTML += `
                <div>
                    <h4>Тип команди:</h4>
                    <button class="filter-btn" data-filter="type_team" data-value="Фандаб">Фандаб</button>
                    <button class="filter-btn" data-filter="type_team" data-value="Фансаб">Фансаб</button>
                    <button class="filter-btn" data-filter="type_team" data-value="Офдаб">Офдаб</button>
                </div>
                <div>
                    <h4>Тип активності:</h4>
                    <button class="filter-btn" data-filter="type_activity" data-value="Аніме">Аніме</button>
                    <button class="filter-btn" data-filter="type_activity" data-value="Фільми">Фільми</button>
                    <button class="filter-btn" data-filter="type_activity" data-value="Серіали">Серіали</button>
                </div>
                <div>
                    <h4>Статус:</h4>
                    <button class="filter-btn" data-filter="status" data-value="Активна">Активна</button>
                    <button class="filter-btn" data-filter="status" data-value="Малоактивна">Малоактивна</button>
                    <button class="filter-btn" data-filter="status" data-value="Невідомо">Невідомо</button>
                    <button class="filter-btn" data-filter="status" data-value="Неактивна">Неактивна</button>
                    <button class="filter-btn" data-filter="status" data-value="Розформовано">Розформовано</button>
                </div>`
        }
        state.filterContainer.innerHTML = filterHTML
    }

    function addFilterEventListeners() {
        const filterButtons = state.filterContainer.querySelectorAll('.filter-btn')
        filterButtons.forEach(button => {
            button.addEventListener('click', () => {
                const filterType = button.dataset.filter
                const filterValue = button.dataset.value
                if (state.activeFilters[filterType]?.includes(filterValue)) {
                    state.activeFilters[filterType] = state.activeFilters[filterType].filter(v => v !== filterValue)
                    // Якщо масив стає порожнім, видаляємо фільтр повністю
                    if (state.activeFilters[filterType].length === 0) {
                        delete state.activeFilters[filterType]
                    }
                    button.classList.remove('active')
                } else {
                    if (!state.activeFilters[filterType]) state.activeFilters[filterType] = []
                    state.activeFilters[filterType].push(filterValue)
                    button.classList.add('active')
                }
                handleDataChange(true)
            })
        })

        // Обробник для року
        const yearInput = state.filterContainer.querySelector('#yearFilter')
        const clearYearBtn = state.filterContainer.querySelector('#clearYear')

        if (yearInput) {
            const handleYearChange = () => {
                const yearValue = yearInput.value.trim()
                
                if (yearValue === '') {
                    delete state.activeFilters.year
                } else {
                    const year = parseInt(yearValue, 10)
                    if (!isNaN(year) && year >= 1960 && year <= 2030) {
                        // Зберігаємо як число для простоти порівняння
                        state.activeFilters.year = year
                    } else {
                        delete state.activeFilters.year
                    }
                }
                
                handleDataChange(true)
            }

            // Додаємо кілька подій для надійності
            yearInput.addEventListener('input', handleYearChange)
            yearInput.addEventListener('change', handleYearChange)
            yearInput.addEventListener('keyup', handleYearChange)
        }

        if (clearYearBtn) {
            clearYearBtn.addEventListener('click', () => {
                yearInput.value = ''
                delete state.activeFilters.year
                handleDataChange(true)
            })
        }
    }

    function setInitialFilterState() {
        Object.entries(state.activeFilters).forEach(([filterType, values]) => {
            if (filterType === 'year') {
                // Обробляємо рік окремо
                const yearInput = state.filterContainer.querySelector('#yearFilter')
                if (yearInput && values) {
                    yearInput.value = values
                    state.activeFilters.year = parseInt(values, 10)
                }
            } else if (Array.isArray(values)) {
                // Обробляємо інші фільтри
                values.forEach(value => {
                    const button = state.filterContainer.querySelector(`.filter-btn[data-filter="${filterType}"][data-value="${value}"]`)
                    if (button) button.classList.add('active')
                })
            }
        })
    }

    function processItems(items, type) {
        let processed = [...items]
        let error = null
        processed = applyFilters(processed, type)
        const searchRes = searchItems(processed, type)
        processed = searchRes.items
        error = searchRes.error
        processed = sortItems(processed, type)
        return { items: processed, error, activeFilters: state.activeFilters }
    }

    function searchItems(items, type) {
        const query = state.currentQuery
        if (query.length === 0) return { items: [...items], error: null }
        if (query.length < 3) return { items: [], error: { message: '<i class="bi bi-emoji-expressionless"></i><span>Агов! Введи більше двох символів.</span>' } }
        
        const filtered = items.filter(item => {
            switch (type) {
                case 'Аніме': {
                    // Базовий пошук по назві та romaji
                    const basicMatch = item.title?.toLowerCase().includes(query) ||
                                       item.romaji?.toLowerCase().includes(query) ||
                                       item.hikka_url?.toLowerCase().includes(query) ||
                                       item.synonyms.some(synonym => synonym?.toLowerCase().includes(query)) ||
                                       item.hikkaSynonyms?.some(synonym => synonym?.toLowerCase().includes(query))
                    
                    // Пошук по назвам релізів цього тайтла
                    let releaseMatch = false
                    if (item.releases && Array.isArray(item.releases) && window.AnimeReleases) {
                        // Отримуємо ID релізів з масиву releases
                        const releaseIds = item.releases.map(release => release.id)
                        
                        // Шукаємо релізи в AnimeReleases по цим ID
                        const relatedReleases = AnimeReleases.filter(release => 
                            releaseIds.includes(release.id)
                        )
                        
                        // Перевіряємо, чи збігається запит з назвою будь-якого релізу
                        releaseMatch = relatedReleases.some(release => 
                            release.title?.toLowerCase().includes(query)
                        )
                    }
                    
                    return basicMatch || releaseMatch
                }
                case 'Релізи': {
                    if (!item.animeIds || !Array.isArray(item.animeIds)) return item.title?.toLowerCase().includes(query)
                    const anime = AnimeTitles?.find(anime => item.animeIds.includes(anime.id))
                    return item.title?.toLowerCase().includes(query) || 
                           anime?.title?.toLowerCase().includes(query) || 
                           anime?.romaji?.toLowerCase().includes(query)
                }
                case 'Команди': return item.name?.toLowerCase().includes(query)
                default: return false
            }
        })
        
        if (!filtered.length) return { items: [], error: { message: `<i class="bi bi-emoji-frown"></i><span>Оце ти намудрив. Результати відсутні.</span>` } }
        return { items: filtered, error: null }
    }

    function applyFilters(items, type) {
        return items.filter(item => {
            if (type === 'Аніме') {
                const formatMatch = !state.activeFilters.format || state.activeFilters.format.includes(item.format)
                const seasonMatch = !state.activeFilters.season || state.activeFilters.season.includes(item.season)
                
                let yearMatch = true
                if (state.activeFilters.year) {
                    const filterYear = state.activeFilters.year
                    const itemYear = parseInt(item.year)
                    yearMatch = itemYear === filterYear
                }
                
                return formatMatch && seasonMatch && yearMatch
            }
            
            if (type === 'Релізи') {
                let formatMatch = true, yearMatch = true, seasonMatch = true
                
                if (!item.animeIds || !AnimeTitles) {
                    formatMatch = !state.activeFilters.format
                    yearMatch = !state.activeFilters.year
                } else {
                    const anime = AnimeTitles.find(anime => item.animeIds.includes(anime.id))
                    formatMatch = !state.activeFilters.format || state.activeFilters.format.includes(anime?.format)
                    
                    if (state.activeFilters.year && anime) {
                        const filterYear = state.activeFilters.year
                        const animeYear = parseInt(anime.year)
                        yearMatch = animeYear === filterYear
                    }
                    
                    if (state.activeFilters.season && anime) {
                        seasonMatch = state.activeFilters.season.includes(anime.season)
                    }
                }
                
                const statusMatch = !state.activeFilters.status || state.activeFilters.status.includes(item.status)
                
                let sourcesMatch = true
                if (state.activeFilters.sources) {
                    const hasSelectedSource = state.activeFilters.sources.some(source => {
                        if (!item.wereWatch || !Array.isArray(item.wereWatch)) return false
                        return item.wereWatch.some(watch => {
                            const watchName = watch.name?.toLowerCase()
                            const sourceName = source.toLowerCase()
                            return watchName === sourceName
                        })
                    })
                    sourcesMatch = hasSelectedSource
                }
                
                return formatMatch && statusMatch && sourcesMatch && seasonMatch && yearMatch
            }
            
            if (type === 'Команди') {
                let teamTypeMatch = true, activityMatch = true, statusMatch = true
                
                // Фільтрація за типом команди
                if (state.activeFilters.type_team) {
                    teamTypeMatch = state.activeFilters.type_team.some(teamType => {
                        return Array.isArray(item.type_team) && item.type_team.includes(teamType)
                    })
                }
                
                // Фільтрація за типом активності
                if (state.activeFilters.type_activity) {
                    activityMatch = state.activeFilters.type_activity.some(activity => {
                        return Array.isArray(item.type_activity) && item.type_activity.includes(activity)
                    })
                }
                
                // Фільтрація за статусом
                if (state.activeFilters.status) {
                    statusMatch = state.activeFilters.status.includes(item.status)
                }
                
                return teamTypeMatch && activityMatch && statusMatch
            }
            
            return true
        })
    }

    function sortItems(items, type) {
        if (!state.currentSort) return items
        const sorted = [...items]
        if (type === 'Команди') {
            if (state.currentSort === 'name') sorted.sort((a, b) => (a.name || '').localeCompare(b.name || ''))
            if (state.currentSort === 'releases') sorted.sort((a, b) => (b.anime_releases?.length || 0) - (a.anime_releases?.length || 0))
        }
        return sorted
    }

    function handleDataChange(shouldUpdateUrl = false) {
        state.onDataChange?.(shouldUpdateUrl)
    }

    initSearch()
    initSort()
    return { initializeFilters, processItems }
}