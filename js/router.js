import { allAnimes, allTeams, allReleases } from './loadData.js' // Змінні з даними
import { renderList } from './renderList.js'
import * as renderComponents from './renderComponents.js'

export const router = new Navigo('/', { hash: true })
export let currentRoute

export function setupRoutes() {
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
        .on('/', handleRoute('/', renderComponents.renderHomePage))
        .on('/animes', (match) => {
            const initialFilters = {}
            for (let key in match.params) {
                if (match.params.hasOwnProperty(key)) {
                    initialFilters[key] = match.params[key].split(',')
                }
            }
            handleRoute('/animes', renderList, allAnimes, 'Аніме', initialFilters)()
        })
        .on('/anime/:id', (match) => {
            const anime = allAnimes.find(a => a.id === match.data.id)
            handleRoute('/anime/:id', renderComponents.renderAnimeDetail, anime)()
        })
        .on('/releases', (match) => {
            const initialFilters = {}
            for (let key in match.params) {
                if (match.params.hasOwnProperty(key)) {
                    initialFilters[key] = match.params[key].split(',')
                }
            }
            handleRoute('/releases', renderList, allReleases, 'Релізи', initialFilters)()
        })
        .on('/release/:id', (match) => {
            const release = allReleases.find(r => r.id === match.data.id)
            handleRoute('/release/:id', renderComponents.renderReleaseDetail, release)()
        })
        .on('/teams', handleRoute('/teams', renderList, allTeams, 'Команди'))
        .on('/team/:id', (match) => {
            const team = allTeams.find(t => t.id === match.data.id)
            handleRoute('/team/:id', renderComponents.renderTeamDetail, team)()
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