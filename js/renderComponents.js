import { allAnimes, allTeams, allReleases } from './loadData.js' // Змінні з даними
import { router } from './router.js'
import * as Functions from './functions.js'
import { renderList } from './renderList.js'

// Функція для рендерингу головної сторінки
export async function renderHomePage() {
    Functions.updateNavigation('Головна')
    app.innerHTML = ''
    const randomAnimeSection = renderRandomAnime()
    const statsSection = renderStatistics()
    const recentAnimesSection = renderReleasesSection(allAnimes.slice(0, 5), 'Останні додані аніме', 'Аніме', '/animes')
    const recentReleasesSection = renderReleasesSection(allReleases.slice(0, 5), 'Останні додані релізи', 'Реліз', '/releases')
    const currentReleasesSection = renderReleasesSection(allReleases.filter(rel => rel.status == 'В процесі').slice(0, 5), 'Поточні релізи', 'Реліз', '/releases?status=В процесі')

    app.appendChild(randomAnimeSection)
    app.appendChild(recentAnimesSection)
    app.appendChild(recentReleasesSection)
    app.appendChild(currentReleasesSection)
    app.appendChild(statsSection)
}

function renderStatistics() {
    const statsSection = document.createElement('div')
    statsSection.classList.add('statistics-section')
    statsSection.innerHTML = `
        <div class='main-header'>
            <h2>Статистика каталогу</h2>
        </div>
        <div class='stats-container'>
            <div class='stat-item'>
                <span class='stat-value'>${allAnimes.length}</span>
                <span class='stat-label'>Аніме</span>
            </div>
            <div class='stat-item'>
                <span class='stat-value'>${allReleases.length}</span>
                <span class='stat-label'>Релізів</span>
            </div>
            <div class='stat-item'>
                <span class='stat-value'>${allTeams.length}</span>
                <span class='stat-label'>Команд</span>
            </div>
        </div>
    `
    return statsSection
}
function renderRandomAnime() {
    const randomAnimeSection = document.createElement('div')
    randomAnimeSection.classList.add('random-anime-section')
    
    function updateAnimeContent() {
        const anime = allAnimes[Math.floor(Math.random() * allAnimes.length)]
        const container = randomAnimeSection.querySelector('#randomAnime')
        container.innerHTML = `
            <div class='poster-box'>
                <img src='${anime.posters[0]?.url || anime.poster}' loading="lazy">
            </div>
            <div class='info'>
                <h3 class='truncate'>${anime.title}</h3>
                <p>${anime.romaji}</p>
                <p>Тип: ${anime.type}</p>
                <p>Формат: ${anime.format}</p>
                <p>Рік: ${anime.year}</p>
                <p>Епізоди: ${anime.episodes}</p>
            </div>
        `
    // const card = randomAnimeSection.querySelector('.card')
    container.onclick = () => router.navigate(`/anime/${anime.id}`)
    }

    randomAnimeSection.innerHTML = `
        <div class='main-header'>
            <h2>Випадкове аніме</h2>
            <button id='randomizeButton' title='Оновити'><i class="fa-solid fa-rotate-right"></i></button>
        </div>
        <div class='items-list list-view'>
            <div id='randomAnime' class='random-anime-container card'>
            </div>
        </div>
    `
    updateAnimeContent()

    const randomButton = randomAnimeSection.querySelector('#randomizeButton')
    randomButton.onclick = updateAnimeContent

    return randomAnimeSection
}
function renderReleasesSection(items, title, type, route) {
    const section = document.createElement('div')
    section.classList.add('releases-section')
    section.innerHTML = `<div class='releases-header main-header'><h2>${title}</h2><a href='${route}' data-navigo><i class="fa-solid fa-angles-right"></i></a></div>`

    const itemList = document.createElement('div')
    itemList.classList.add('items-list')

    for (const item of items) {
        const listItem = document.createElement('div')
        const divider = ' • '

        switch (type) {
            case 'Аніме':
                listItem.classList.add('anime-card', 'card')
                listItem.innerHTML = `
                    <div class='poster-box'>
                        <img src='${item.posters[0]?.url || item.poster}' loading="lazy">
                    </div>
                    <div class='info'>
                        <h3 class='truncate' title='${item.title}'>${item.title}</h3>
                        <small>${item.year}${item.year ? divider : ''}${item.format}</small>
                    </div>
                `
                listItem.onclick = () => router.navigate(`/anime/${item.id}`)
                break
        
            case 'Реліз':
                listItem.classList.add('release-card', 'card')
                const animeData = allAnimes.find(anime => item.animeIds.includes(anime.id))
                const teams = item.teams.map(t => `<span class='truncate'><img src='${t.logo}'>${t.name}</span>`).join('')
                listItem.innerHTML = `
                    <div class='poster-box'>
                        <img src='${item.poster || animeData?.posters[0]?.url || animeData?.poster || ''}'>
                    </div>
                    <div class='release-info'>
                        <h3 class='truncate'>${item.title}</h3>
                        <p class='teams-logos'>${teams}</p>
                        <p>Епізоди: ${item.episodes}</p>
                    </div>
                `
                listItem.onclick = () => router.navigate(`/release/${item.id}`)
                break
        }
        itemList.appendChild(listItem)
    }

    section.appendChild(itemList)
    return section
}

// Відображення сторінки команди
export async function renderTeamDetail(team) {
    Functions.updateNavigation('Команди', team.name)
    const releases = allReleases.filter(release => team.anime_releases.some(r => r.id === release.id))
    const releasesList = document.querySelector('.items-list')
    if (releases.length > 0) {
        renderList(releases, 'Релізи')
    } else {
        app.innerHTML = '<p>Релізи не знайдено</p>'
    }
    const teamInfo = document.createElement('div')
    teamInfo.classList.add('team-detail')
    teamInfo.innerHTML = `
        <div class='top-section'>
            <img class='team-logo' src='${team.logo}' title='${team.name}'>
            <div class='info-section'>
                <h1>${team.name}</h1>
                <div class='team-info'>
                    <p>Тип робіт: ${team.type}</p>
                    <p>Статус: ${team.status}</p>
                </div>
            </div>
        </div>
        <h2>Релізи:</h2>
    `
    app.prepend(teamInfo)
}

// Відображення карток релізів
export async function renderAnimeReleases(releases) {
    const cardsContainer = document.createElement('div')
    cardsContainer.classList.add('releases-container')

    for (const release of releases) {
        const card = document.createElement('div')
        card.classList.add('release-card', 'card')
        const teams = release.teams.map(t => `<span class='truncate'><img src='${t.logo}'>${t.name}</span>`).join('')
        card.innerHTML = `
            <h3 class='truncate'>${release.title}</h3>
            <p class='teams-logos'>${teams}</p>
            <p>Епізоди: ${release.episodes}</p>
        `
        card.onclick = () => router.navigate(`/release/${release.id}`)
        cardsContainer.appendChild(card)
    }
    return cardsContainer
}

// Відображення деталей релізу
export async function renderReleaseDetail(release) {
    Functions.updateNavigation('Релізи', release.title)
    const anime = allAnimes.find(anime => release.animeIds.includes(anime.id))
    const teams = release.teams.map(t => `<a href="/team/${t.id}" class='data-nav-link' data-navigo><span><img src='${t.logo}'>${t.name}</span></a>`).join('')
    const torrents = release.torrentLinks.filter(t => t.href).map(t => `<a href='${t.href}' external-link>${t.text}</a>`).join('')
    const cover = anime?.cover ? `<div class='title-cover'><img src='${anime.cover}'></div>` : ''
    const poster = anime?.poster ? `<img class='title-poster' src='${anime.posters[0]?.url || anime.poster}'>` : ''
    const status = () => {
        switch (release.status) {
            case 'В процесі':
                return `<span style="color: var(--ongoing);"><i class="material-symbols-rounded" title="Статус">calendar_month</i> ${release.status}</span>`;
            case 'Завершено':
                return `<span style="color: var(--finished);"><i class="material-symbols-rounded" title="Статус">task_alt</i> ${release.status}</span>`;
            case 'Закинуто':
                return `<span style="color: var(--droped);"><i class="material-symbols-rounded" title="Статус">delete</i> ${release.status}</span>`;
            case 'Відкладено':
                return `<span style="color: var(--paused);"><i class="material-symbols-rounded" title="Статус">pause</i> ${release.status}</span>`;
            default:
                return `<span><i class="material-symbols-rounded" title="Статус">help</i> На перевірці</span>`;
        }
    }
    // release.posters[0]?.url || Коли розберусь з постерами, поверну постери команд.
    app.innerHTML = `
    <div class='title-detail release-page'>
        ${cover}
        <div class='top-section'>
            ${poster}
            <div class='center-column'>
                <div>
                    <h1>${release.title}</h1>
                </div>
                <div class='title-info'>
                    ${status()}
                    <span><i class="material-symbols-rounded" title="Епізодів">format_list_numbered</i> ${release.episodes}</span>
                </div>
                <div class='title-info'>
                    ${release.animeIds.map(aID => {
                            const anime = allAnimes.find(anime => anime.id == aID)
                            return `<a href="/anime/${anime.id}" class='data-nav-link' data-navigo><span><i class="material-symbols-rounded" title="Тайтл">movie</i>${anime.title} (${anime.year})</span></a>`
                        }).join('')
                    }
                </div>
                ${torrents ? `
                    <h2>Торенти</h2>
                    <p class='release-torrents'>${torrents}</p>
                ` : ''
                }
            </div>
            <div class='dub-info page-block'>
                <h3>Від ${release.teams.length == 1 ? 'команди' : 'команд'}</h3>
                <div class='teams-logos'>${teams}</div>
            </div>
        </div>
    </div>
    `
                // <h3>Озвучували</h3>
                // <div>Дабери</div>
                // <h3>Перекладали</h3>
                // <div>Перекладачі</div>
                // <h3>Також працювали</h3>
                // <div>Інші корисні люди</div>
}

// Відображення деталей аніме
export async function renderAnimeDetail(anime) {
    Functions.updateNavigation('Аніме', anime.title)
    const teams = anime.teams.map(t => `<a href="/team/${t.id}" class='data-nav-link' data-navigo><span><img src='${t.logo}'>${t.name}</span></a>`).join('')
    const cover = anime.cover ? `<div class='title-cover'><img src='${anime.cover}'></div>` : ''
    const poster = anime?.poster ? `<img class='title-poster' src='${anime.posters[0]?.url || anime.poster}'>` : ''
    const HikkaLink = anime.hikka_url 
        ? `<a href="${anime.hikka_url}" target="_blank" class='badge' data-navigo>
                <img src='https://rosset-nocpes.github.io/ua-badges/src/hikka-dark.svg'>
           </a>` : ''
    const UaKinoLink = anime.Юакіно 
        ? `<a href="${anime.Юакіно}" target="_blank" class='badge' data-navigo>
                <img src='https://rosset-nocpes.github.io/ua-badges/src/uakino-dark.svg'>
           </a>` : ''
    const AnitubeLink = anime.Анітюб 
        ? `<a href="${anime.Анітюб}" target="_blank" class='badge' data-navigo>
                <img src='https://rosset-nocpes.github.io/ua-badges/src/anitube-dark.svg'>
           </a>` : ''
        
    app.innerHTML = `
    <div class='title-detail'>
        ${cover}
        <div class='top-section'>
            ${poster}
            <div class='center-column'>
                <div>
                    <h1>${anime.title}</h1>
                    ${anime.hikkaSynonyms?.length !== 0 ? `
                        <button id="altNamesModalBtn" onclick='altNamesModal.showModal()'>•••</button> <span> ${anime.romaji}</span>
                        <dialog id="altNamesModal" class="alternative-names modal">
                            <span id="altNamesModalClose" class="modal-close">&times;</span>
                            <h2>Альтернативні назви</h2>
                            <div id="altNamesContent">${anime.hikkaSynonyms?.map(title => `<span>${title}</span>`).join('')}</div>
                        </dialog>
                    ` : `<span> ${anime.romaji}</span>`}
                </div>
                <div class='title-info'>
                    <a href="/animes" class='data-nav-link' data-navigo><span><i class="material-symbols-rounded" title="Тип">category</i> ${anime.type}</span></a>
                    <a href="/animes?format=${anime.format}" class='data-nav-link' data-navigo><span><i class="material-symbols-rounded" title="Формат">spoke</i> ${anime.format}</span></a>
                    <span><i class="material-symbols-rounded" title="Рік">event_available</i> ${anime.year || 'Не вказано'}</span>
                    <span><i class="material-symbols-rounded" title="Епізодів">format_list_numbered</i> ${anime.episodes}</span>
                </div>
                <div class='watch-info'>${HikkaLink}${UaKinoLink}${AnitubeLink}</div>
                <div id='releasesList'>Завантаження інформації про релізи...</div>
            </div>
            <div class='dub-info page-block'>
                <h3>Від ${anime.teams.length == 1 ? 'команди' : 'команд'}</h3>
                <div class='teams-logos'>${teams}</div>
            </div>
        </div>
    </div>
    `
    const releases = anime.releases ? allReleases.filter(r => r.animeIds.includes(anime.id)) : []
    const releasesList = document.getElementById('releasesList')
    if (releases.length > 0) {
        const releaseCards = await renderAnimeReleases(releases)
        releasesList.innerHTML = '<h2>Релізи:</h2>'
        releasesList.appendChild(releaseCards)
    } else {
        releasesList.innerHTML = '<p>Релізи не знайдено</p>'
    }

    const altNamesModal = document.getElementById('altNamesModal')
    altNamesModal.onclick = (e) => {
        const {left, right, top, bottom} = altNamesModal.getBoundingClientRect();
        (!((left <= e.clientX && e.clientX <= right && top <= e.clientY && e.clientY <= bottom)) || 
           e.target === altNamesModalClose) && altNamesModal.close();
    }
}

// function showAlternativeNamesModal(anime) {
//     const altNamesModalBtn = document.getElementById('altNamesModalBtn')
//     const altNamesModal = document.getElementById('altNamesModal')
//     const altNamesContent = document.getElementById('altNamesContent')

//     altNamesContent.innerHTML = ``
// }