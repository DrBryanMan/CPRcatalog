import { AnimeTitles, Teams, AnimeReleases } from '../loadData.js' // Змінні з даними
import * as Functions from '../functions.js'

async function renderAnimeReleases(releases) {
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

export async function renderAnimeDetail(anime) {
    Functions.updateNavigation('Аніме', anime.title)
    const teams = anime.teams.map(t => `<a href="/team/${t.id}" class='data-nav-link' data-navigo><span><img src='${t.logo}'>${t.name}</span></a>`).join('')
    const cover = anime.cover ? `<div class='title-cover'><img src='${anime.cover}'></div>` : ''
    const poster = anime?.poster ? `<img class='title-poster' src='${anime.poster}'>` : ''
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
    const releases = anime.releases ? AnimeReleases.filter(r => r.animeIds.includes(anime.id)) : []
    const releasesList = document.getElementById('releasesList')
    if (releases.length > 0) {
        const releaseCards = await renderAnimeReleases(releases)
        releasesList.innerHTML = '<h2>Релізи:</h2>'
        releasesList.appendChild(releaseCards)
    } else {
        releasesList.innerHTML = '<p>Релізи не знайдено</p>'
    }

    const altNamesModal = document.getElementById('altNamesModal')
    if (altNamesModal) {
        altNamesModal.onclick = (e) => {
            const {left, right, top, bottom} = altNamesModal.getBoundingClientRect();
            (!((left <= e.clientX && e.clientX <= right && top <= e.clientY && e.clientY <= bottom)) || 
               e.target === altNamesModalClose) && altNamesModal.close();
        }
    }
}