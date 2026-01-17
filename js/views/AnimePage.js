import { AnimeTitles, AnimeReleases, Teams, PostersData } from '../loadData.js'
import { router } from '../router.js'
import * as Functions from '../functions.js'

export function renderAnimePage() {
    function createImageWithSkeleton(src, title, className = '') {
        return `
            <div class="image-container ${className}">
                <div class="skeleton-loader"></div>
                <img src="${src}" title="${title}" 
                    onload="this.parentElement.querySelector('.skeleton-loader').style.display='none'; this.style.opacity='1';" 
                    onerror="this.parentElement.querySelector('.skeleton-loader').style.display='none'; this.style.opacity='1';">
            </div>
        `
    }

    Functions.updateNavigation('Аніме')
    app.innerHTML = ''
    
    const pageContainer = document.createElement('div')
    pageContainer.classList.add('anime-hub-page')
    
    // Заголовок сторінки
    const headerSection = document.createElement('div')
    headerSection.classList.add('page-header')
    headerSection.innerHTML = `
        <h1>Аніме Хаб</h1>
        <p>Знайдіть цікаве аніме українською</p>
    `
    
    // Контейнер для блоків (2 в ряд)
    const gridContainer = document.createElement('div')
    gridContainer.classList.add('content-grid')
    
    // Блок 1: Останні додані тайтли
    const latestAnimes = createContentBlock(
        'Останні додані тайтли',
        AnimeTitles.slice(0, 3),
        'anime',
        '/animehub/animes'
    )
    
    // Блок 2: Останні додані релізи
    const latestReleases = createContentBlock(
        'Останні додані релізи',
        AnimeReleases.slice(0, 3),
        'release',
        '/animehub/releases'
    )
    
    // Блок 3: Нові торенти (релізи з торентами)
    const releasesWithTorrents = AnimeReleases
        .filter(rel => rel.torrentLinks && rel.torrentLinks.length > 0 && rel.torrentLinks.some(t => t.href))
        .slice(0, 3)
    const newTorrents = createContentBlock(
        'Нові торенти',
        releasesWithTorrents,
        'release',
        '/animehub/releases'
    )
    
    // Блок 4: Нові серії онгоінгів
    const ongoingReleases = AnimeReleases
        .filter(rel => rel.status === 'В процесі')
        .slice(0, 3)
    const newEpisodes = createContentBlock(
        'Нові серії онгоінгів',
        ongoingReleases,
        'release',
        '/animehub/releases?status=В процесі'
    )
    
    // Додаємо всі блоки в сітку
    gridContainer.appendChild(latestAnimes)
    gridContainer.appendChild(latestReleases)
    gridContainer.appendChild(newTorrents)
    gridContainer.appendChild(newEpisodes)
    
    pageContainer.appendChild(headerSection)
    pageContainer.appendChild(gridContainer)
    app.appendChild(pageContainer)
    
    return () => {}
}

function createContentBlock(title, items, type, route) {
    const block = document.createElement('div')
    block.classList.add('content-block')
    
    const header = document.createElement('div')
    header.classList.add('block-header')
    header.innerHTML = `
        <h2>${title}</h2>
        <a href="${route}" data-navigo><i class="fa-solid fa-angles-right"></i></a>
    `
    
    const itemsList = document.createElement('div')
    itemsList.classList.add('block-items')
    
    if (items.length === 0) {
        itemsList.innerHTML = '<p class="no-items">Поки що немає даних</p>'
    } else {
        items.forEach(item => {
            const itemCard = createItemCard(item, type)
            itemsList.appendChild(itemCard)
        })
    }
    
    block.appendChild(header)
    block.appendChild(itemsList)
    
    return block
}

function createItemCard(item, type) {
    const card = document.createElement('div')
    card.classList.add('mini-card')
    
    if (type === 'anime') {
        const poster = item.poster || item.hikka_poster || ''
        card.innerHTML = `
            <div class='mini-poster'>
                <img src='${poster}' loading="lazy" alt='${item.title}'>
            </div>
            <div class='mini-info'>
                <h3 class='truncate' title='${item.title}'>${item.title}</h3>
                <small>${item.year || ''} • ${item.format}</small>
            </div>
        `
        card.onclick = () => router.navigate(`/animehub/anime/${item.id}`)
    } else if (type === 'release') {
        const animeData = AnimeTitles.find(anime => item.animeIds.includes(anime.id))
        const poster = item.poster || animeData?.poster || animeData.hikka_poster || ''
        const teams = item.teams.map(t => `<span class='mini-team'><img src='${t.logo}'>${t.name}</span>`).join('')
        
        card.innerHTML = `
            <div class='mini-poster'>
                <img src='${poster}' loading="lazy" alt='${item.title}'>
            </div>
            <div class='mini-info'>
                <h3 class='truncate' title='${item.title}'>${item.title}</h3>
                <div class='mini-teams'>${teams}</div>
                <small>Епізодів: ${item.episodes}</small>
            </div>
        `
        card.onclick = () => router.navigate(`/animehub/release/${item.id}`)
    }
    
    return card
}