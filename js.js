import { initSearch } from './js/components/search.js'
import { loadDBData } from './js/loadData.js'
import { setupRoutes } from './js/router.js'
import './js/main.js'

document.addEventListener('DOMContentLoaded', async () => {
    try {
        loadingOverlay.setAttribute("loading", "")
        await loadDBData()
        initSearch()
        setupRoutes()
    } catch (error) {
        console.error('Не вийшло отримати дані:', error)
        app.innerHTML = `<p>Виникла помилка при завантаженні: ${error.message}</p>`
    } finally {
        loadingOverlay.removeAttribute("loading", "")
    }
})