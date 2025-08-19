import { AnimeTitles, Teams, AnimeReleases } from '../loadData.js'
import * as Functions from '../functions.js'
import { getAnimeClassificationInfo } from '../animeClassification.js'
import { renderList } from '../renderList.js'

export function createTitleModal() {
    const state = {
        modal: null,
        isOpen: false,
        currentView: 'anime', // 'anime', 'release' або 'teamReleases'
        currentAnime: null,
        currentRelease: null,
        currentTeam: null,
        openedFromCatalog: false
    }

    function createModal() {
        state.modal = document.createElement('dialog')
        state.modal.id = 'animeDetailModal'
        state.modal.classList.add('anime-detail-modal', 'modal')

        state.modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <button id="backButton" class="back-button" style="display: none;">
                        <i class="bi bi-arrow-left"></i> Повернутись
                    </button>
                </div>
                <div id="animeModalContent">
                    <div class="loading-spinner">Завантаження...</div>
                </div>
            </div>
        `
        document.body.appendChild(state.modal)
        setupEventListeners()
    }

    function setupEventListeners() {
        const backBtn = state.modal.querySelector('#backButton')

        backBtn.onclick = goBack

        state.modal.onclick = (e) => {
            const modalContent = state.modal.querySelector('.modal-content')
            if (!modalContent.contains(e.target)) close()
        }

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && state.isOpen) {
                if (state.currentView === 'release' || state.currentView === 'teamReleases') {
                    goBack()
                } else {
                    close()
                }
            }
        })
    }

    async function renderAnimeReleases(releases) {
        const container = document.createElement('div')
        container.classList.add('releases-container')

          // ⬇️ Картка-заголовок (перша)
          const header = document.createElement('div')
          header.classList.add('card', 'release-card', 'header-card')
          header.innerHTML = `
            <span>Команда</span>
            <span>Джерела перегляду</span>
            <span>Серій</span>
            <span>Статус</span>
          `
          // Щоб по ній не було кліків і hover-ефектів
          header.style.pointerEvents = 'none'
          header.style.fontWeight = '600'
          container.appendChild(header)

        for (const release of releases) {
            const card = document.createElement('div')
            card.classList.add('release-card', 'card')
            const teams = release.teams.map(t => t.logo 
                ? `<span><img src='${t.logo}' title='${t.name}'></span>`
                : `<span class='team-initials'>${t.name}</span>`
            ).join('')

            const watchTags = release.wereWatch?.map(tag => {
                const tagcolor = () => {
                    switch (tag.color) {
                        case 'gray':   return '#a5a5a555'
                        case 'blue':   return '#42a8ff55'
                        case 'green':  return '#02ff5055'
                        case 'pink':   return 'pink'
                        case 'purple': return '#a5a5a555'
                        case 'orange': return 'orange'
                        default:       return '#00000055'
                    }
                }
                return `<span class="watch-tag" style="background-color: ${tagcolor()}">${tag.name}</span>`
            }).join('');

            let audioSubHTML = ''
            let hasSub = false
            let hasDub = false
            let subEpisodes = 0
            let dubEpisodes = 0

            if ('Саби' in release) {
                hasSub = true
                hasDub = true
                subEpisodes = release.episodessub || 0
                dubEpisodes = release.episodes || 0
            } else if (release.title?.toLowerCase().includes('(суб)')) {
                hasSub = true
                subEpisodes = release.episodes || 0
            } else {
                hasDub = true
                dubEpisodes = release.episodes || 0
            }

            if (hasDub) {
                audioSubHTML += `<span class="dub-info" title="Озвучення"><i class="bi bi-badge-vo"></i> ${dubEpisodes}</span>`
            }
            if (hasSub) {
                if (hasDub) audioSubHTML += ' '
                audioSubHTML += `<span class="sub-info" title="Субтитри"><i class="bi bi-badge-cc"></i> ${subEpisodes}</span>`
            }

            const status = () => {
                switch (release.status) {
                    case 'В процесі': return `<span style="color: var(--ongoing);"><i class="bi bi-hourglass-split" title=' ${release.status}'></i></span>`
                    case 'Завершено': return `<span style="color: var(--finished);"><i class="bi bi-list-check" title=' ${release.status}'></i></span>`
                    case 'Закинуто': return `<span style="color: var(--droped);"><i class="bi bi-trash" title=' ${release.status}'></i></span>`
                    case 'Відкладено': return `<span style="color: var(--paused);"><i class="bi bi-pause-fill" title=' ${release.status}'></i></span>`
                    default: return `<span><i class="bi bi-question" title='На перевірці'></i></span>`
                }
            }

            card.innerHTML = `
                <div class='teams-logos'>${teams}</div>
                ${watchTags ? `<div class='watch-tags'>${watchTags}</div>` : ''}
                <div class="dub-sub-info">${audioSubHTML}</div>
                <div>${status()}</div>
            `
            card.onclick = (e) => {
                e.preventDefault()
                e.stopPropagation()
                showReleaseDetail(release)
            }
            container.appendChild(card)
        }
        return container
    }

    async function showReleaseDetail(release) {
        state.currentView = 'release'
        state.currentRelease = release
        
        // Показуємо кнопку назад тільки якщо є з чого повертатися
        // (є currentAnime або currentTeam, але НЕ якщо відкрито з каталогу)
        if ((state.currentAnime || state.currentTeam) && !state.openedFromCatalog) {
            state.modal.querySelector('#backButton').style.display = 'block'
        } else {
            state.modal.querySelector('#backButton').style.display = 'none'
        }
        
        await renderReleaseDetail(release)
    }
    

    async function renderReleaseDetail(release) {
        const anime = AnimeTitles.find(a => release.animeIds.includes(a.id))
        const teams = release.teams.map(t => `<span class='team-link'><img src='${t.logo}'>${t.name}</span>`).join('')
        const torrents = release.torrentLinks?.filter(t => t.href).map(t => `<a href='${t.href}' target="_blank">${t.text}</a>`).join('') || ''
        const cover = anime?.cover ? `<div class='title-cover'><img src='${anime.cover}'></div>` : ''
        const poster = anime?.poster ? `<img class='title-poster' src='${anime.poster}'>` : ''

        const status = () => {
            switch (release.status) {
                case 'В процесі': return `<span style="color: var(--ongoing);"><i class="bi bi-hourglass-split"></i> ${release.status}</span>`
                case 'Завершено': return `<span style="color: var(--finished);"><i class="bi bi-list-check"></i> ${release.status}</span>`
                case 'Закинуто': return `<span style="color: var(--droped);"><i class="bi bi-trash"></i> ${release.status}</span>`
                case 'Відкладено': return `<span style="color: var(--paused);"><i class="bi bi-pause-fill"></i> ${release.status}</span>`
                default: return `<span><i class="bi bi-question"></i> На перевірці</span>`
            }
        }

        const watchTags = release.wereWatch?.map(tag => {
            const tagcolor = () => {
                switch (tag.color) {
                    case 'gray':   return '#a5a5a555'
                    case 'blue':   return '#42a8ff55'
                    case 'green':  return '#02ff5055'
                    case 'pink':   return 'pink'
                    case 'purple': return '#a5a5a555'
                    case 'orange': return 'orange'
                    default:       return '#00000055'
                }
            }
            return `<span class="watch-tag" style="background-color: ${tagcolor()}">${tag.name}</span>`
        }).join('');

        state.modal.querySelector('#animeModalContent').innerHTML = `
            <div class='title-detail release-page'>
                ${cover}
                <div class='top-section'>
                    <div class='poster-container'>
                        ${poster}
                        <div class='dub-info'>
                            <h3>Від ${release.teams.length == 1 ? 'команди' : 'команд'}</h3>
                            <div class='teams-logos'>${teams}</div>
                        </div>
                    </div>
                    <div class='center-column'>
                        <div><h1>${release.title}</h1></div>
                        <div class='title-info'>
                            ${status()}
                            <span><i class="bi bi-list-ol"></i> ${release.episodes}</span>
                            ${watchTags ? `<div class='watch-tags'>${watchTags}</div>` : ''}
                        </div>
                        <div class='title-info'>
                            ${release.animeIds.map(aID => {
                                const animeItem = AnimeTitles.find(a => a.id == aID)
                                return `<span class='data-nav-link' data-anime-id="${animeItem.id}">
                                            <i class="bi bi-film"></i>
                                            ${animeItem.title} (${animeItem.format}, ${animeItem.year})
                                        </span>`
                            }).join('')}
                        </div>
                        ${torrents ? `<h2>Торенти</h2><p class='release-torrents'>${torrents}</p>` : ''}
                    </div>
                </div>
            </div>
        `

        state.modal.querySelectorAll('.data-nav-link').forEach(link => {
            link.onclick = (e) => {
                e.preventDefault()
                e.stopPropagation()
                const id = link.getAttribute('data-anime-id')
                const anime = AnimeTitles.find(a => a.id === id)
                if (anime) showAnimeDetail(anime)
            }
        })
    }

    async function showAnimeDetail(anime) {
        state.currentView = 'anime'
        state.currentAnime = anime
        state.modal.querySelector('#backButton').style.display = 'none'
        await renderContent(anime)
    }

    function goBack() {
        if (state.currentView === 'release' && state.currentAnime) {
            showAnimeDetail(state.currentAnime)
        } else if (state.currentView === 'release' && state.currentTeam) {
            // Повертаємося до списку релізів команди
            renderTeamReleases(state.currentTeam.id)
        } else if (state.currentView === 'teamReleases' && state.currentTeam) {
            close()
        }
    }

    async function open(animeId) {
        if (state.isOpen) return
        state.isOpen = true
        const anime = AnimeTitles.find(a => a.id === animeId)
        if (!anime) return console.error('Аніме не знайдено:', animeId)
        state.currentAnime = anime
        state.currentView = 'anime'

        state.modal.showModal()
        document.body.classList.add('modal-open')
        await renderContent(anime)
    }

    async function renderContent(anime) {
        const teams = anime.teams.map(t => `<span class='team-link'><img src='${t.logo}'>${t.name}</span>`).join('')
        const cover = anime.cover ? `<div class='title-cover'><img src='${anime.cover}'></div>` : ''

        const HikkaBadge = anime.hikka_url
            ? `<a href="${anime.hikka_url}" target="_blank" class='badge'><img src='https://rosset-nocpes.github.io/ua-badges/src/hikka-dark.svg'></a>` : ''
        const AnitubeBadge = anime.anitube
            ? `<a href="${anime.anitube}" target="_blank" class='badge'><img src='https://rosset-nocpes.github.io/ua-badges/src/anitube-dark.svg'></a>` : ''
        const UaKinoBadge = anime.uakino
            ? `<a href="${anime.uakino}" target="_blank" class='badge'><img src='https://rosset-nocpes.github.io/ua-badges/src/uakino-dark.svg'></a>` : ''
        const UaSerialBadge = anime.uaserial
            ? `<a href="${anime.uakino}" target="_blank" class='badge'><img src='https://rosset-nocpes.github.io/ua-badges/src/uaserial-dark.svg'></a>` : ''
        const UaSerialsBadge = anime.uaserials
            ? `<a href="${anime.uaserials}" target="_blank" class='badge'><img src='https://rosset-nocpes.github.io/ua-badges/src/uaserials-dark.svg'></a>` : ''
        const MikaiBadge = anime.mikai
            ? `<a href="${anime.mikai}" target="_blank" class='badge'><img src='https://rosset-nocpes.github.io/ua-badges/src/mikai-dark.svg'></a>` : ''

        const modalContent = `
            <div class='title-detail'>
                ${cover}
                <div class='top-section'>
                    <div class='poster-gallery'>
                        <img id='posterImage' class='title-poster' src='${anime.poster || ''}' alt='Постер'>
                        <div id='posterMeta' class='poster-meta'></div>
                        ${
                            anime.posters?.length > 1
                            ? `<div class='poster-selector' id='posterSelector'>
                                ${anime.posters.map((_, i) => `<button class='poster-btn' data-index='${i}'>${i + 1}</button>`).join('')}
                                </div>`
                            : ''
                        }
                    </div>
                    <div class='center-column'>
                        <div style="text-align: center;">
                            <h1>${anime.title}</h1>
                            ${anime.hikkaSynonyms?.length 
                                ? `<button id="altNamesModalBtn" class="alt-names-btn">•••</button> <span>${anime.romaji}</span>
                                    <dialog id="altNamesModal" class="alternative-names modal">
                                        <span id="altNamesModalClose" class="modal-close">&times;</span>
                                        <h2>Альтернативні назви</h2>
                                        <div id="altNamesContent">${anime.hikkaSynonyms.map(title => `<span>${title}</span>`).join('')}</div>
                                    </dialog>`
                                : `<span>${anime.romaji}</span>`}
                        </div>
                        <div class='title-info'>
                            <span title='Формат на ТБ'><i class="bi bi-film"></i> ${getAnimeClassificationInfo(anime.episodes, anime.duration, anime.format).displayText}</span>
                            <span title='Аніме сезон'><i class="bi bi-calendar-check"></i>${anime.season} ${anime.year || 'Не вказано'}</span>
                            <span title='Загальна кількість'><i class="bi bi-list-ol"></i> ${anime.episodes}</span>
                            <span title='Тривалість епізоду'><i class="bi bi-clock-history"></i> ${anime.duration}</span>
                            <span title='Першоджерело'><i class="bi bi-asterisk"></i>${anime.source}</span>
                            <span title='MAL ID'>MAL: ${anime.mal_id}</span>
                            ${anime.franchise?.length ? `<span title='Франшиза'><i class="bi bi-ui-checks-grid"></i>${anime.franchise}</span>` : ''}
                        </div>
                        <div class='watch-info'>${HikkaBadge}${AnitubeBadge}${UaKinoBadge}${UaSerialBadge}${UaSerialsBadge}${MikaiBadge}</div>
                        <div id='releasesList'>Завантаження інформації про релізи...</div>
                    </div>
                </div>
            </div>
        `
        state.modal.querySelector('#animeModalContent').innerHTML = modalContent

        // Галерея постерів
        let posterIndex = 0
        const posters = anime.posters || []
        const posterImage = state.modal.querySelector('#posterImage')
        const posterMeta = state.modal.querySelector('#posterMeta')
        const posterSelector = state.modal.querySelector('#posterSelector')

        function updatePosterView() {
          if (!posters.length) return
          const current = posters[posterIndex]
          posterImage.src = `https://raw.githubusercontent.com/DrBryanMan/UAPosters/refs/heads/main/${current.url}`
          posterMeta.innerHTML = `
            ${current.author ? `<p><strong>Автор:</strong> ${current.author}</p>` : ''}
            ${current.team ? `<p><strong>Команда:</strong> ${current.team}</p>` : ''}
          `
          posterSelector?.querySelectorAll('.poster-btn')?.forEach((btn, idx) => {
            btn.classList.toggle('active', idx === posterIndex)
          })
        }

        posterSelector?.querySelectorAll('.poster-btn')?.forEach((btn) => {
          btn.onclick = () => {
            posterIndex = parseInt(btn.dataset.index)
            updatePosterView()
          }
        })

        if (posters.length > 0) {
          updatePosterView()
        }

        const releases = anime.releases ? AnimeReleases.filter(r => r.animeIds.includes(anime.id)) : []
        const releasesList = state.modal.querySelector('#releasesList')
        if (releases.length) {
            const releaseCards = await renderAnimeReleases(releases)
            releasesList.innerHTML = '<h2>Релізи:</h2>'
            releasesList.appendChild(releaseCards)
        } else {
            releasesList.innerHTML = '<p>Релізи не знайдено</p>'
        }

        const altModal = state.modal.querySelector('#altNamesModal')
        const altBtn = state.modal.querySelector('#altNamesModalBtn')
        const altClose = state.modal.querySelector('#altNamesModalClose')
        if (altModal && altBtn) {
            altBtn.onclick = () => altModal.showModal()
            if (altClose) altClose.onclick = () => altModal.close()
            altModal.onclick = (e) => {
                const {left, right, top, bottom} = altModal.getBoundingClientRect()
                if (!(left <= e.clientX && e.clientX <= right && top <= e.clientY && e.clientY <= bottom) || e.target === altClose) {
                    altModal.close()
                }
            }
        }
    }

    function close() {
        if (!state.isOpen) return
        state.isOpen = false
        state.currentView = 'anime'
        state.currentAnime = null
        state.currentRelease = null
        state.openedFromCatalog = false
        state.modal.close()
        document.body.classList.remove('modal-open')
        state.modal.querySelector('#backButton').style.display = 'none'
        state.modal.querySelector('#animeModalContent').innerHTML = '<div class="loading-spinner">Завантаження...</div>'
    }

    async function renderReleaseDetailFromCatalog(release) {
        if (!release) return console.error('Реліз не знайдено');

        if (!state.isOpen) {
            state.isOpen = true;
            state.modal.showModal();
            document.body.classList.add('modal-open');
            state.openedFromCatalog = true; // тільки якщо модалка була закрита
        } else {
            // якщо модалка вже відкрита (з команди), не встановлюємо openedFromCatalog
            // залишаємо як є
        }

        state.currentView = 'release';
        state.currentRelease = release;
        
        // показуємо кнопку назад якщо є з чого повертатися
        if (state.currentAnime || state.currentTeam) {
            state.modal.querySelector('#backButton').style.display = 'block';
        } else {
            state.modal.querySelector('#backButton').style.display = 'none';
        }
        
        await renderReleaseDetail(release);
    }

    async function renderTeamReleases(teamId) {
        if (!state.isOpen) {
            state.isOpen = true
            state.modal.showModal()
            document.body.classList.add('modal-open')
        }
        
        state.currentView = 'teamReleases'
        state.currentTeam = Teams.find(t => t.id === teamId)
        state.openedFromCatalog = false // команда не є каталогом

        const teamReleases = AnimeReleases.filter(r => r.teams?.some(t => t.id === teamId))

        const headerHTML = `
            <div class='team-detail'>
                <div class='top-section'>
                    <img class='team-logo' src='${state.currentTeam.logo}' title='${state.currentTeam.name || 'Не вказано'}'>
                    <div class='info-section'>
                        <h1>${state.currentTeam.name || 'Не вказано'}</h1>
                        <div class='team-info'>
                            <p><i class="bi bi-briefcase"></i> Тип робіт: ${state.currentTeam.type || 'Не вказано'}</p>
                            <p><i class="bi bi-activity"></i> Статус: ${state.currentTeam.status || 'Активна'}</p>
                        </div>
                    </div>
                </div>
                <div class="releases-section">
                    <h2>Релізи команди:</h2>
                    <div id="teamReleasesList"></div>
                </div>
            </div>
        `

        state.modal.querySelector('#animeModalContent').innerHTML = headerHTML

        const container = state.modal.querySelector('#teamReleasesList')
        renderList(teamReleases, 'Релізи', null, null, container)
    }

    createModal()
    return { 
        open, 
        close, 
        goBack, 
        renderReleaseDetail: renderReleaseDetailFromCatalog,
        renderTeamReleases
    }
}

export const titleModal = createTitleModal()