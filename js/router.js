import Navigo from "https://cdn.jsdelivr.net/npm/navigo@8/+esm"
import { AnimeTitles, Teams, AnimeReleases } from './loadData.js' // Змінні з даними
import { renderHomePage } from './views/HomePage.js'
import { renderAnimePage } from './views/AnimePage.js'
import { renderReleasesUpdatesPage } from './views/ReleasesUpdatesPage.js'
import { titleModal } from './views/TitleModal.js'
import { renderList } from './renderList.js'

export const router = new Navigo('/', { hash: true })
export let currentRoute
export let currentHub

export function setupRoutes() {
    (window.location.pathname === '/CPRcatalog/' || window.location.pathname === '/' || window.location.pathname === '/index.html') && window.location.hash === '' ? router.navigate('/') : null
    let cleanup = null
    let backgroundRoute = null

    function getFilteredTeams() {
        return Teams.filter(team =>
            team.anime_releases.length > 0 &&
            team.type_activity &&
            team.type_activity.includes('Аніме')
        )
    }

    function renderNotFoundPage(message = '404 - Сторінку не знайдено') {
        typeof cleanup === 'function' && cleanup()
        cleanup = null
        titleModal.close({ skipRouteSync: true })
        app.innerHTML = `
            <h1>${message}</h1>
            <img src='https://www.1999.co.jp/itbig85/10852139a2_m.jpg'>
        `
        currentRoute = 'notFound'
    }

    function cleanupAndRender(renderFunction, ...args) {
        typeof cleanup === 'function' && cleanup()
        cleanup = renderFunction(...args) || null
    }

    function handleRoute(route, renderFunction, ...args) {
        return () => {
            currentRoute = route
            backgroundRoute = route
            titleModal.close({ skipRouteSync: true })
            cleanupAndRender(renderFunction, ...args)
        }
    }

    function ensureBackgroundRoute() {
        if (backgroundRoute) return backgroundRoute

        currentRoute = '/'
        backgroundRoute = '/'
        cleanupAndRender(renderHomePage)
        return backgroundRoute
    }
    router
        .on('*', () => window.scrollTo(0, 0))
        .on('/', handleRoute('/', renderHomePage))
        .on('/animehub/', handleRoute('/animehub/', renderAnimePage))
        .on('/animehub/releases_updates', () => {
            currentHub = "animehub"
            handleRoute('/animehub/releases_updates', renderReleasesUpdatesPage)()
        })
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
        .on('/animehub/anime/:id', (match) => {
            currentHub = "animehub"
            const animeId = match?.data?.id
            const anime = AnimeTitles.find(item => item.id === animeId)
            if (!anime) {
                renderNotFoundPage(`404 - Аніме з id "${animeId}" не знайдено`)
                return
            }

            const returnRoute = ensureBackgroundRoute()
            titleModal.open(anime.id, { syncUrl: false, returnRoute: `#${returnRoute}` })
        })
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
        .on('/animehub/release/:id', (match) => {
            currentHub = "animehub"
            const releaseId = match?.data?.id
            const release = AnimeReleases.find(item => item.id === releaseId)
            if (!release) {
                renderNotFoundPage(`404 - Реліз з id "${releaseId}" не знайдено`)
                return
            }

            const returnRoute = ensureBackgroundRoute()
            titleModal.renderReleaseDetail(release, {
                syncUrl: false,
                openedFromCatalog: false,
                returnRoute: `#${returnRoute}`
            })
        })
        
        .on('/animehub/teams', (match) => {
            const initialFilters = {}
            currentHub = "animehub"
            if (match && match.params) {
                for (let key in match.params) {
                    if (match.params.hasOwnProperty(key)) {
                        initialFilters[key] = match.params[key].split(',')
                    }
                }
            }
            const filteredTeams = getFilteredTeams()
            handleRoute('/animehub/teams', renderList, filteredTeams, 'Команди', initialFilters)()
        })
        .on('/animehub/team/:id', (match) => {
            currentHub = "animehub"
            const teamId = match?.data?.id
            const team = Teams.find(item => item.id === teamId)
            if (!team) {
                renderNotFoundPage(`404 - Команду з id "${teamId}" не знайдено`)
                return
            }

            const returnRoute = ensureBackgroundRoute()
            titleModal.showTeamDetails(team.id, { syncUrl: false, returnRoute: `#${returnRoute}` })
        })
        .notFound(() => renderNotFoundPage())
    router.resolve()
}
