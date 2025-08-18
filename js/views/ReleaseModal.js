import * as Functions from './functions.js'
import { AnimeTitles } from './loadData.js'

export async function renderReleaseDetail(release) {
    Functions.updateNavigation('Релізи', release.title)
    const anime = AnimeTitles.find(anime => release.animeIds.includes(anime.id))
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
    console.log(poster)
    app.innerHTML = `
    <div class='title-detail release-page'>
        ${cover}
        <div class='top-section'>
            <div class='poster-container'>
                ${poster}
                <div class='dub-info page-block'>
                    <h3>Від ${release.teams.length == 1 ? 'команди' : 'команд'}</h3>
                    <div class='teams-logos'>${teams}</div>
                </div>
            </div>
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