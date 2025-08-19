// import { AnimeTitles, AnimeReleases, Teams } from './js/loadData.js' // Змінні з даними
import { initSearch } from './js/components/search.js'
import { loadDBData } from './js/loadData.js'
import { setupRoutes } from './js/router.js'
import './js/main.js'

document.addEventListener('DOMContentLoaded', async () => {
    try {
        loadingOverlay.setAttribute("loading", "")
        await loadDBData()
        // console.log(`Дані успішно завантажено: ${AnimeTitles.length}`)
        // console.log(`Дані успішно завантажено: ${AnimeReleases.length}`)
        // console.log(`Дані успішно завантажено: ${Teams.length}`)
        initSearch()
        setupRoutes()
        // window.onscroll = () => window.scrollY > 0 ? nav.classList.add('scrolled') : nav.classList.remove('scrolled') 
    } catch (error) {
        console.error('Не вийшло отримати дані:', error)
        app.innerHTML = `<p>Виникла помилка при завантаженні: ${error.message}</p>`
    } finally {
        loadingOverlay.removeAttribute("loading", "")
    }
})