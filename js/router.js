import Navigo from "https://cdn.jsdelivr.net/npm/navigo@8/+esm"
import { AnimeTitles, Teams, AnimeReleases } from './loadData.js' // Змінні з даними
import { renderHomePage } from './views/HomePage.js'
import { renderTeamDetail } from './views/TeamDetails.js'
import { renderList } from './renderList.js'
import { titleModal } from './views/TitleModal.js'
import * as Functions from './functions.js'

export const router = new Navigo('/', { hash: true })
export let currentRoute
export let currentHub

// Функція для відображення деталей аніме (якщо потрібна окрема сторінка)
function renderAnimeDetail(anime) {
    if (!anime) {
        app.innerHTML = '<h1>Аніме не знайдено</h1>'
        return
    }
    
    Functions.updateNavigation('Аніме', anime.title)
    
    // Тут можна додати власну логіку відображення аніме на окремій сторінці
    // Або перенаправити на модалку
    titleModal.open(anime.id)
}

export function setupRoutes() {
    (window.location.pathname === '/CPRcatalog/' || window.location.pathname === '/' || window.location.pathname === '/index.html') && window.location.hash === '' ? router.navigate('/') : null
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
        .on('/animehub/animes', (match) => {
            const initialFilters = {}
            currentHub = "animehub"
            if (match && match.params) {
                for (let key in match.params) {
                    if (match.params.hasOwnProperty(key)) {
                        initialFilters[key] = match.params[key].split(',')
                    }
                }
            }
            handleRoute('/animehub/animes', renderList, AnimeTitles, 'Аніме', initialFilters, AnimeReleases)()
        })
        // .on('/animehub/anime/:id', (match) => {
        //     currentHub = "animehub"
        //     const anime = AnimeTitles.find(a => a.id === match.data.id)
        //     handleRoute('/animehub/anime/:id', renderAnimeDetail, anime)()
        // })

        .on('/animehub/releases', (match) => {
            currentHub = "animehub"
            const initialFilters = {}
            if (match && match.params) {
                for (let key in match.params) {
                    if (match.params.hasOwnProperty(key)) {
                        initialFilters[key] = match.params[key].split(',')
                    }
                }
            }
            handleRoute('/animehub/releases', renderList, AnimeReleases, 'Релізи', initialFilters)()
        })
        
        .on('/animehub/teams', handleRoute('/animehub/teams', renderList, Teams.filter(team => 
              team.anime_releases.length > 0 && 
              team.type_activity && 
              team.type_activity.includes('Аніме')
          ), 'Команди'))
        .on('/animehub/team/:id', (match) => {
            currentHub = "animehub"
            const teamId = match.data.id
            const team = Teams.find(t => t.id == teamId)
            handleRoute('/animehub/team/:id', renderTeamDetail, team)()
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