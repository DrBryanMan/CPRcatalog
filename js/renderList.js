import * as Functions from './functions.js'
import { currentRoute, router } from './router.js'
import { createListCard } from './components/ListCard.js'
import { createPagination } from './components/Pagination.js'
import { createCatalogControls } from './components/CatalogControls.js'

// Рендеринг списку аніме
export function renderList(items, type, initialFilters, animeReleases = null, container = app, options = {}) {
    // Нові опції для управління поведінкою
    const {
        isModal = false,           // чи це модалка
        updateNavigation = true,   // чи оновлювати навігацію
        updateUrl = true,          // чи оновлювати URL
        showFilters = true,        // чи показувати фільтри
        showSearch = true,         // чи показувати пошук
        showViewControls = true,   // чи показувати контроли виду
        itemsPerPage = 20          // кількість елементів на сторінку
    } = options

    // Оновлюємо навігацію тільки якщо це не модалка
    if (updateNavigation) {
        Functions.updateNavigation(type)
    }

    let currentPage = 1
    let filteredItems = [...items]
    let activeFilters = initialFilters || {}
    let currentView

    // HTML структура з умовним показом елементів
    container.innerHTML = `
        <div class="filters-section" style="${showFilters || showSearch || showViewControls ? '' : 'display: none;'}">
            <div class="list-controls">
                <span id="itemsCounter"></span>
                ${showSearch ? `<input type="text" id="localSearchInput" placeholder="Пошук...">` : ''}
                ${showViewControls ? `
                    <div class="view-controls">
                        <button id="gridViewBtn"><i class="bi bi-grid"></i></button>
                        <button id="listViewBtn"><i class="bi bi-list-task"></i></button>
                    </div>
                ` : ''}
                ${type === 'Команди' && showFilters ? `
                    <div>
                        <button id="sortBtn"><i class="bi bi-filter-left"></i></button>
                        <div id="sortOptions" class="sort-options">
                            <button data-sort="name">За алфавітом</button>
                            <button data-sort="releases">За кількістю релізів</button>
                        </div>
                    </div>
                ` : ''}
                ${showFilters ? `<button id="filterBtn"><i class="bi bi-sliders2"></i></button>` : ''}
            </div>
            <div id="filterOptions" style="${showFilters ? '' : 'display: none;'}"></div>
        </div>
        <div class="items-list grid-view"></div>
        <div class="pagination-wrapper">
            <div id="pagination" class="pagination"></div>
        </div>
    `

    const listDiv = container.querySelector('.items-list')
    const searchInput = container.querySelector('#localSearchInput')
    const filterOptions = container.querySelector('#filterOptions')
    const sortOptions = container.querySelector('#sortOptions')
    const paginationDiv = container.querySelector('#pagination')
    const itemsCounter = container.querySelector('#itemsCounter')
    const gridViewBtn = container.querySelector('#gridViewBtn')
    const listViewBtn = container.querySelector('#listViewBtn')

    // Ініціалізація компонентів
    const cardComponent = createListCard()
    
    const pagination = createPagination(paginationDiv, (page) => {
        currentPage = page
        renderCurrentPage()
        
        // Прокрутка тільки якщо це не модалка
        if (!isModal) {
            const nav = document.querySelector('nav')
            const navHeight = nav?.offsetHeight || 0
            const y = listDiv.getBoundingClientRect().top + window.pageYOffset - navHeight * 2
            window.scrollTo({ top: y, behavior: 'smooth' })
        }
    }, itemsPerPage)

    const catalogControls = showFilters || showSearch ? createCatalogControls(
        searchInput, 
        filterOptions, 
        sortOptions, 
        (shouldUpdateUrl = false) => {
            const result = catalogControls.processItems(items, type)
            filteredItems = result.items
            
            if (result.activeFilters) {
                activeFilters = result.activeFilters
            }
            
            handleSearchError(result.error)
            
            currentPage = 1
            renderCurrentPage()
            
            // Оновлюємо URL тільки якщо це не модалка і дозволено
            if (shouldUpdateUrl && updateUrl && !isModal) {
                updateURL()
            }
        }
    ) : null

    // Ініціалізація перегляду
    initializeView()

    function initializeView() {
        currentView = Functions.getFromCache('currentView') || 'grid'
        updateViewButtons()
        if (listDiv) {
            listDiv.className = `items-list ${currentView}-view`
        }
    }

    function updateViewButtons() {
        if (!gridViewBtn || !listViewBtn) return
        
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
            if (listDiv) {
                listDiv.className = `items-list ${view}-view`
            }
            renderCurrentPage()
        }
    }

    function handleSearchError(error) {
        const existingNoResults = container.querySelector('.no-results')
        if (existingNoResults) {
            existingNoResults.remove()
        }

        if (error) {
            listDiv.innerHTML = ''
            
            const noResults = document.createElement('div')
            noResults.classList.add('no-results')
            noResults.innerHTML = error.message
            
            const filtersSection = container.querySelector('.filters-section')
            const paginationWrapper = container.querySelector('.pagination-wrapper')
            filtersSection.parentNode.insertBefore(noResults, paginationWrapper)
            
            paginationWrapper.style.display = 'none'
            
            if (itemsCounter) {
                itemsCounter.textContent = 'Результатів: 0'
            }
        } else {
            const paginationWrapper = container.querySelector('.pagination-wrapper')
            if (paginationWrapper) {
                paginationWrapper.style.display = 'flex'
            }
        }
    }

    function updateURL() {
        // Не оновлюємо URL якщо це модалка
        if (isModal || !updateUrl) return

        const params = new URLSearchParams()
        
        Object.entries(activeFilters).forEach(([key, values]) => {
            if (key === 'year') {
                if (values !== undefined && values !== null && values !== '') {
                    params.append(key, values.toString())
                }
            } else if (values && Array.isArray(values) && values.length > 0) {
                params.append(key, values.join(','))
            }
        })
        
        if (currentPage > 1) {
            params.set('page', currentPage)
        } else {
            params.delete('page')
        }
        
        const queryString = params.toString()
        const newUrl = queryString ? `#${currentRoute}?${queryString}` : `#${currentRoute}`
        const currentUrl = window.location.hash
        
        if (newUrl !== currentUrl) {
            history.replaceState(null, '', newUrl)
        }
    }

    function renderCurrentPage() {
        if (container.querySelector('.no-results')) {
            return
        }

        const startIndex = (currentPage - 1) * itemsPerPage
        const endIndex = Math.min(startIndex + itemsPerPage, filteredItems.length)
        const itemsToRender = filteredItems.slice(startIndex, endIndex)

        listDiv.innerHTML = ''

        itemsToRender.forEach((item) => {
            const card = cardComponent.createCard(item, type, currentView)
            listDiv.appendChild(card)
        })

        if (itemsCounter) {
            itemsCounter.textContent = `Результатів: ${filteredItems.length}`
        }
    
        const totalPages = Math.ceil(filteredItems.length / itemsPerPage)
        const paginationWrapper = container.querySelector('.pagination-wrapper')
        
        if (totalPages <= 1) {
            paginationWrapper.style.display = 'none'
        } else {
            paginationWrapper.style.display = 'flex'
            pagination.setData(filteredItems.length, currentPage)
        }
        
        // Оновлюємо URL тільки якщо це не модалка
        if (!isModal) {
            updateURL()
        }
    }

    function initializeFromURL() {
        // Ініціалізація з URL тільки якщо це не модалка
        if (isModal || !updateUrl) {
            currentPage = 1
            return
        }

        const hashParts = window.location.hash.split('?')
        if (hashParts.length > 1) {
            const urlParams = new URLSearchParams(hashParts[1])
            
            for (const [key, value] of urlParams.entries()) {
                if (key === 'year') {
                    const year = parseInt(value, 10)
                    if (!isNaN(year) && year >= 1960 && year <= 2030) {
                        activeFilters.year = year
                    }
                } else if (['season', 'format', 'status', 'sources'].includes(key)) {
                    activeFilters[key] = value.split(',')
                }
            }
            
            const page = parseInt(urlParams.get('page'))
            const totalPages = Math.ceil(filteredItems.length / itemsPerPage)
            
            if (page && page > 0) {
                if (page <= totalPages) {
                    currentPage = page
                } else {
                    currentPage = 1
                    urlParams.delete('page')
                    const newQueryString = urlParams.toString()
                    const newUrl = newQueryString ? `#${currentRoute}?${newQueryString}` : `#${currentRoute}`
                    history.replaceState(null, '', newUrl)
                }
            } else {
                currentPage = 1
            }
        } else {
            currentPage = 1
        }
    }

    // Обробники подій для кнопок перегляду
    if (gridViewBtn && listViewBtn) {
        gridViewBtn.onclick = () => changeView('grid')
        listViewBtn.onclick = () => changeView('list')
    }

    // Ініціалізація
    if (catalogControls) {
        catalogControls.initializeFilters(type, activeFilters)
        
        const initialResult = catalogControls.processItems(items, type)
        filteredItems = initialResult.items
        
        if (initialResult.activeFilters) {
            activeFilters = initialResult.activeFilters
        }
        
        handleSearchError(initialResult.error)
    }
    
    initializeFromURL()
    renderCurrentPage()

    return () => {}
}