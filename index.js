import * as Functions from './js/functions.js'
import { initSearch } from './js/search.js'
import { loadData } from './js/loadData.js'
import { router, setupRoutes } from './js/router.js'


// Викликаємо рендеринг головної сторінки при завантаженні сторінки
document.addEventListener('DOMContentLoaded', async () => {
    try {
        loadingОverlay.style.display = 'flex'
        await loadData()
        setupRoutes()
        initSearch()
        Functions.addExternalLinkEvent()

        cacheButton.onclick = () => {
            Functions.clearCache()
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