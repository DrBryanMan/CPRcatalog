<<<<<<< HEAD
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
=======
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
>>>>>>> a59a2f8 (NEW VERSION)
    } catch (error) {
        console.error('Не вийшло отримати дані:', error)
        app.innerHTML = `<p>Виникла помилка при завантаженні: ${error.message}</p>`
    } finally {
<<<<<<< HEAD
        loadingОverlay.style.display = 'none'
    }
})
=======
        loadingOverlay.removeAttribute("loading", "")
    }
})
>>>>>>> a59a2f8 (NEW VERSION)
