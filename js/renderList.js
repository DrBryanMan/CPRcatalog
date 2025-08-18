import * as Functions from './functions.js'
import { currentRoute, router } from './router.js'
import { createTitleCard } from './components/TitleCard.js'
import { createPagination } from './components/Pagination.js'
import { createCatalogControls } from './components/CatalogControls.js'

// Рендеринг списку аніме
export function renderList(items, type, initialFilters) {
    console.log(`Завантажено ${items.length} ${type}`)
    Functions.updateNavigation(type)
    const itemsPerPage = 20
    let currentPage = 1
    let filteredItems = [...items]
    let activeFilters = initialFilters || {} // Додаємо змінну для зберігання активних фільтрів
    let currentView

    app.innerHTML = `
        <div class="filters-section">
            <div class="list-controls">
                <span id="itemsCounter"></span>
                <input type="text" id="localSearchInput" placeholder="Пошук...">
                <div class="view-controls">
                    <button id="gridViewBtn"><i class="bi bi-grid"></i></button>
                    <button id="listViewBtn"><i class="bi bi-list-task"></i></button>
                </div>
                ${type === 'Команди' ? `
                    <div>
                        <button id="sortBtn"><i class="bi bi-filter-left"></i></button>
                        <div id="sortOptions" class="sort-options">
                            <button data-sort="name">За алфавітом</button>
                            <button data-sort="releases">За кількістю релізів</button>
                        </div>
                    </div>
                ` : ''}
                <button id="filterBtn"><i class="bi bi-sliders2"></i></button>
            </div>
            <div id="filterOptions"></div>
        </div>
        <div class="items-list grid-view"></div>
        <div class="pagination-wrapper">
            <div id="pagination" class="pagination"></div>
        </div>
    `

    const listDiv = document.querySelector('.items-list')
    const searchInput = document.getElementById('localSearchInput')
    const filterOptions = document.getElementById('filterOptions')
    const sortOptions = document.getElementById('sortOptions')
    const paginationDiv = document.getElementById('pagination')
    const itemsCounter = document.getElementById('itemsCounter')
    const gridViewBtn = document.getElementById('gridViewBtn')
    const listViewBtn = document.getElementById('listViewBtn')

    // Ініціалізація компонентів
    const cardComponent = createTitleCard()
    
    const pagination = createPagination(paginationDiv, (page) => {
        currentPage = page
        renderCurrentPage()
        const nav = document.querySelector('nav') // або .header / .top-bar тощо
        const navHeight = nav?.offsetHeight || 0
        const y = listDiv.getBoundingClientRect().top + window.pageYOffset - navHeight * 2

        window.scrollTo({ top: y, behavior: 'smooth' })
    }, itemsPerPage) // Передаємо itemsPerPage в конструктор

    const catalogControls = createCatalogControls(
        searchInput, 
        filterOptions, 
        sortOptions, 
        (shouldUpdateUrl = false) => {
            const result = catalogControls.processItems(items, type)
            filteredItems = result.items
            
            // Оновлюємо activeFilters з результату обробки
            if (result.activeFilters) {
                activeFilters = result.activeFilters
            }
            
            // Обробка помилок пошуку
            handleSearchError(result.error)
            
            currentPage = 1
            renderCurrentPage()
            
            if (shouldUpdateUrl) {
                updateURL()
            }
        }
    )

    // Ініціалізація перегляду
    initializeView()

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
            renderCurrentPage()
        }
    }

    function handleSearchError(error) {
        // Видаляємо попередні повідомлення про помилки
        const existingNoResults = document.querySelector('.no-results')
        if (existingNoResults) {
            existingNoResults.remove()
        }

        if (error) {
            // Очищуємо список перед показом повідомлення про помилку
            listDiv.innerHTML = ''
            
            // Створюємо та вставляємо повідомлення про помилку
            const noResults = document.createElement('div')
            noResults.classList.add('no-results')
            noResults.innerHTML = error.message
            
            // Вставляємо повідомлення після контролів, але перед пагінацією
            const filtersSection = document.querySelector('.filters-section')
            const paginationWrapper = document.querySelector('.pagination-wrapper')
            filtersSection.parentNode.insertBefore(noResults, paginationWrapper)
            
            // Приховуємо пагінацію при помилці
            paginationWrapper.style.display = 'none'
            
            // Оновлюємо лічильник
            itemsCounter.textContent = 'Результатів: 0'
        } else {
            // Показуємо пагінацію, якщо немає помилок
            const paginationWrapper = document.querySelector('.pagination-wrapper')
            if (paginationWrapper) {
                paginationWrapper.style.display = 'flex'
            }
        }
    }

    function updateURL() {
        const params = new URLSearchParams()
        
        // Використовуємо локальну змінну activeFilters
        Object.entries(activeFilters).forEach(([key, values]) => {
            if (key === 'year') {
                // Для року перевіряємо, чи він існує та є числом
                if (values !== undefined && values !== null && values !== '') {
                    params.append(key, values.toString())
                }
            } else if (values && Array.isArray(values) && values.length > 0) {
                // Для інших фільтрів використовуємо стару логіку
                params.append(key, values.join(','))
            }
        })
        
        // Додаємо номер сторінки тільки якщо він не 1
        if (currentPage > 1) {
            params.set('page', currentPage)
        }
        else {
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
        // Якщо є помилка, не рендеримо нічого
        if (document.querySelector('.no-results')) {
            return
        }

        const startIndex = (currentPage - 1) * itemsPerPage
        const endIndex = Math.min(startIndex + itemsPerPage, filteredItems.length)
        const itemsToRender = filteredItems.slice(startIndex, endIndex)

        // Очищуємо список
        listDiv.innerHTML = ''

        // Рендеримо елементи поточної сторінки
        itemsToRender.forEach((item) => {
            const card = cardComponent.createCard(item, type, currentView)
            listDiv.appendChild(card)
        })

        // Оновлюємо лічильник
        itemsCounter.textContent = `Результатів: ${filteredItems.length}`
    
        // Визначаємо кількість сторінок
        const totalPages = Math.ceil(filteredItems.length / itemsPerPage)
        const paginationWrapper = document.querySelector('.pagination-wrapper')
        
        // Показуємо/приховуємо пагінацію залежно від кількості сторінок
        if (totalPages <= 1) {
            paginationWrapper.style.display = 'none'
        } else {
            paginationWrapper.style.display = 'flex'
            // Оновлюємо пагінацію тільки якщо її потрібно показувати
            pagination.setData(filteredItems.length, currentPage)
        }
        
        // Оновлюємо URL
        updateURL()
    }

    function initializeFromURL() {
        const hashParts = window.location.hash.split('?')
        if (hashParts.length > 1) {
            const urlParams = new URLSearchParams(hashParts[1])
            
            // Обробляємо параметри фільтрів з URL
            for (const [key, value] of urlParams.entries()) {
                if (key === 'year') {
                    const year = parseInt(value, 10)
                    if (!isNaN(year) && year >= 1960 && year <= 2030) {
                        activeFilters.year = year // зберігаємо як число
                    }
                } else if (['season', 'format', 'status', 'sources'].includes(key)) {
                    activeFilters[key] = value.split(',')
                }
            }
            
            const page = parseInt(urlParams.get('page'))
            const totalPages = Math.ceil(filteredItems.length / itemsPerPage)
            
            // Перевіряємо чи валідний номер сторінки ПІСЛЯ того як filteredItems готові
            if (page && page > 0) {
                if (page <= totalPages) {
                    currentPage = page
                } else {
                    currentPage = 1
                    // Видаляємо некоректний параметр page з URL
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
    gridViewBtn.onclick = () => changeView('grid')
    listViewBtn.onclick = () => changeView('list')

    // Ініціалізація
    catalogControls.initializeFilters(type, activeFilters)
    
    // Початкова обробка даних
    const initialResult = catalogControls.processItems(items, type)
    filteredItems = initialResult.items
    
    // Оновлюємо activeFilters з результату обробки
    if (initialResult.activeFilters) {
        activeFilters = initialResult.activeFilters
    }
    
    handleSearchError(initialResult.error)
    
    // ВИПРАВЛЕННЯ: Ініціалізуємо URL параметри ПІСЛЯ обробки даних
    initializeFromURL()
    renderCurrentPage()

    // Видаляємо обробник scroll, оскільки він більше не потрібен
    return () => {}
}