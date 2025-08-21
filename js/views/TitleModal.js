import { AnimeTitles, Teams, AnimeReleases } from '../loadData.js'
import * as Functions from '../functions.js'
import { getAnimeClassificationInfo } from '../animeClassification.js'
import { renderList } from '../renderList.js'

export function createTitleModal() {
  const state = {
    modal: null,
    isOpen: false,
    currentView: 'anime', // 'anime' | 'release' | 'teamReleases'
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
          <button id="backButton" class="back-button" style="display:none;">
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

  // ===== Делегація та базові обробники =====
  function setupEventListeners() {
    const backBtn = state.modal.querySelector('#backButton')
    backBtn.onclick = goBack

    // Закриття по кліку на бекдроп
    state.modal.onclick = (e) => {
      const modalContent = state.modal.querySelector('.modal-content')
      if (!modalContent.contains(e.target)) close()
    }

    // ESC: лише з релізу повертаємось, інакше — закриваємо
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && state.isOpen) {
        if (state.currentView === 'release') {
          goBack()
        } else {
          close()
        }
      }
    })

    // Єдина делегація всередині модалки:
    // 1) .data-nav-link (команда / тайтл)
    // 2) .release-card (відкрити реліз)
    state.modal.addEventListener('click', (e) => {
      const navLink = e.target.closest('.data-nav-link')
      if (navLink) {
        e.preventDefault()
        e.stopPropagation()

        const teamId = navLink.getAttribute('data-team-id')
        if (teamId) {
          renderTeamDeteils(teamId)
          return
        }

        const animeId = navLink.getAttribute('data-anime-id')
        if (animeId) {
          const anime = AnimeTitles.find(a => a.id === animeId)
          if (anime) showAnimeDetail(anime)
        }
        return
      }

      const releaseCard = e.target.closest('.release-card')
      if (releaseCard && !releaseCard.classList.contains('header-card')) {
        const releaseId = releaseCard.dataset.releaseId
        if (releaseId) {
          const rel = AnimeReleases.find(r => r.id === releaseId)
          if (rel) showReleaseDetail(rel)
        }
      }
    })
  }

  // ===== Публічні переходи =====
  async function open(animeId) {
    if (state.isOpen) return
    state.isOpen = true
    const anime = AnimeTitles.find(a => a.id === animeId)
    if (!anime) return console.error('Аніме не знайдено:', animeId)

    state.currentAnime = anime
    state.currentRelease = null
    state.currentTeam = null
    state.currentView = 'anime'
    state.openedFromCatalog = false

    state.modal.showModal()
    document.body.classList.add('modal-open')
    // На тайтлі «Назад» не показуємо
    toggleBack(false)
    await renderAnimePage(anime)
  }

  function close() {
    if (!state.isOpen) return
    state.isOpen = false
    state.currentView = 'anime'
    state.currentAnime = null
    state.currentRelease = null
    state.currentTeam = null
    state.openedFromCatalog = false

    state.modal.close()
    document.body.classList.remove('modal-open')
    toggleBack(false)
    state.modal.querySelector('#animeModalContent').innerHTML = '<div class="loading-spinner">Завантаження...</div>'
  }

  function toggleBack(show) {
    state.modal.querySelector('#backButton').style.display = show ? 'flex' : 'none'
  }

  // ===== Рендер тайтлу =====
  async function renderAnimePage(anime) {
    const seasonTranslations = {
      winter: 'Зима',
      spring: 'Весна',
      summer: 'Літо',
      fall:   'Осінь'
    }

    const sourceTranslations = {
      manga: 'Манґа',
      web_manga: 'Веб-манґа',
      novel: 'Ранобе',
      light_novel: 'Ранобе',
      web_novel: 'Веб-новелла',
      visual_novel: 'Віз. новела',
      game: 'Гра',
      card_game: 'Картярська',
      original: 'Оригінальне',
      other: 'Інше'
    }

    function renderScore(type = 'MAL', rating, count) {
        if (!rating) {
            return `<span class="rating" title="Оцінка ${type}"><i class="bi bi-star"></i> —</span>`
        }
        const icon = rating >= 7 ? 'bi-star-fill' : 'bi-star-half'
        let ratingColor = ''
        if (rating >= 8.0) {
            ratingColor = '#4CAF50' // зелений для високих оцінок
        } else if (rating >= 7.0) {
            ratingColor = '#8BC34A' // світло-зелений
        } else if (rating >= 6.0) {
            ratingColor = '#FFC107' // жовтий
        } else if (rating >= 5.0) {
            ratingColor = '#FF9800' // помаранчевий
        } else {
            ratingColor = '#F44336' // червоний для низьких оцінок
        }
        return `
            <span class="rating" style="color: ${ratingColor};" title='${count} оцінок'>
              <i class="bi ${icon}" style="color: ${type === 'Hikka' ? '#ce31e3' : ratingColor}"> ${type}</i>
              <span>${rating.toFixed(1)}</span>
            </span>
        `
    }

    const cls = getAnimeClassificationInfo(anime.episodes, anime.duration, anime.format);
    const teams = (anime.teams || []).map(t => `<span class='team-link data-nav-link' data-team-id='${t.id}'><img src='${t.logo}'>${t.name}</span>`).join('')
    const cover = anime.cover ? `<div class='title-cover'><img src='${anime.cover}'></div>` : ''

    const HikkaBadge = anime.hikka_url
      ? `<a href="${anime.hikka_url}" target="_blank" class='badge'><img src='https://rosset-nocpes.github.io/ua-badges/src/hikka-dark.svg'></a>` : ''
    const AnitubeBadge = anime.anitube
      ? `<a href="${anime.anitube}" target="_blank" class='badge'><img src='https://rosset-nocpes.github.io/ua-badges/src/anitube-dark.svg'></a>` : ''
    const UaKinoBadge = anime.uakino
      ? `<a href="${anime.uakino}" target="_blank" class='badge'><img src='https://rosset-nocpes.github.io/ua-badges/src/uakino-dark.svg'></a>` : ''
    const UaSerialBadge = anime.uaserial
      ? `<a href="${anime.uaserial}" target="_blank" class='badge'><img src='https://rosset-nocpes.github.io/ua-badges/src/uaserial-dark.svg'></a>` : ''
    // const UaSerialsBadge = anime.uaserials
    //   ? `<a href="${anime.uaserials}" target="_blank" class='badge'><img src='https://rosset-nocpes.github.io/ua-badges/src/uaserials-dark.svg'></a>` : ''
    const MikaiBadge = anime.mikai
      ? `<a href="${anime.mikai}" target="_blank" class='badge'><img src='https://rosset-nocpes.github.io/ua-badges/src/mikai-dark.svg'></a>` : ''

    const html = `
      <div class='title-detail'>
        ${cover}
        <div class='top-section'>
          <div class='poster-gallery'>
            <img id='posterImage' class='title-poster' src='${anime.poster || ''}' alt='Постер'>
            <div id='posterMeta' class='poster-meta'></div>
            ${
              (anime.posters?.length || 0) > 1
              ? `<div class='poster-selector' id='posterSelector'>
                  ${anime.posters.map((_, i) => `<button class='poster-btn' data-index='${i}'>${i + 1}</button>`).join('')}
                </div>`
              : ''
            }
          </div>
          <div class='center-column'>
            <div style="text-align:center;">
              <h1>${anime.title}</h1>
              ${anime.hikkaSynonyms?.length
                ? `<button id="altNamesModalBtn" class="alt-names-btn">•••</button> <span>
                  ${anime.romaji}</span>
                    <dialog id="altNamesModal" class="alternative-names modal">
                      <span id="altNamesModalClose" class="modal-close">&times;</span>
                      <h2>Альтернативні назви</h2>
                      <div id="altNamesContent">${anime.hikkaSynonyms.map(title => `<span>
                        ${title}</span>`).join('')}
                      </div>
                    </dialog>`
                : `<span>${anime.romaji}</span>`}
            </div>
            <div class='title-info'>
              <span title='Формат на тб'>
                <i class="bi bi-film"></i>
                <span>${anime.format}</span>
              </span>
              <span title='Класифікація ЦПР'>
                <span title='${cls.description}'>${cls.displayText}</span>
              </span>
              <span title='Аніме сезон'>
                <i class="bi bi-calendar-check"></i>
                ${seasonTranslations[anime.season?.toLowerCase()] || anime.season || 'Невідомо'} ${anime.year || 'Не вказано'}
              </span>
              <span title='Загальна кількість'>
                <i class="bi bi-list-ol"></i> ${anime.episodes} еп.
              </span>
              <span title='Тривалість епізоду'>
                <i class="bi bi-clock-history"></i> ${anime.duration} хв.
              </span>
              <span title='Першоджерело'>
                <i class="bi bi-asterisk"></i>
                ${sourceTranslations[anime.source?.toLowerCase()] || anime.source || 'Невідомо'}
              </span>
              ${anime.franchise?.length ? `<span title='Франшиза'><i class="bi bi-ui-checks-grid"></i>${anime.franchise}</span>` : ''}
            </div>
            <div class='title-info'>
              ${renderScore('MAL', anime.scoreMAL, anime.scoredbyMAL)}
              ${renderScore('Hikka', anime.scoreHikka, anime.scoredbyHikka)}
            </div>
            <div class='watch-info'>${HikkaBadge}${AnitubeBadge}${UaKinoBadge}${UaSerialBadge}${MikaiBadge}</div>
            <div id='releasesList'>Завантаження інформації про релізи...</div>
          </div>
        </div>
      </div>
    `
    state.modal.querySelector('#animeModalContent').innerHTML = html

    // Галерея постерів
    initPosterGallery(anime)

    // Релізи цього тайтлу
    const releases = AnimeReleases.filter(r => r.animeIds?.includes(anime.id))
    const listEl = state.modal.querySelector('#releasesList')
    if (releases.length) {
      const cards = await renderAnimeReleases(releases)
      listEl.innerHTML = '<h2>Релізи:</h2>'
      listEl.appendChild(cards)
    } else {
      listEl.innerHTML = '<p>Релізи не знайдено</p>'
    }

    // Альтернативні назви (модалка)
    const altModal = state.modal.querySelector('#altNamesModal')
    const altBtn = state.modal.querySelector('#altNamesModalBtn')
    const altClose = state.modal.querySelector('#altNamesModalClose')
    if (altModal && altBtn) {
      altBtn.onclick = () => altModal.showModal()
      if (altClose) altClose.onclick = () => altModal.close()
      altModal.onclick = (e) => {
        const { left, right, top, bottom } = altModal.getBoundingClientRect()
        if (!(left <= e.clientX && e.clientX <= right && top <= e.clientY && e.clientX <= right) || e.target === altClose) {
          altModal.close()
        }
      }
    }
  }

  function initPosterGallery(anime) {
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
  }

  // ===== Рендер списка релізів (для тайтлу) =====
  async function renderAnimeReleases(releases) {
    const container = document.createElement('div')
    container.classList.add('releases-container')

    const header = document.createElement('div')
    header.classList.add('card', 'release-card', 'header-card')
    header.innerHTML = `
      <span>Команда</span>
      <span>Джерела перегляду</span>
      <span>Тип озвучки/субтитрів</span>
      <span>Серій</span>
      <span>Статус</span>
    `
    container.appendChild(header)

    for (const release of releases) {
      const card = document.createElement('div')
      card.classList.add('release-card', 'card')
      card.dataset.releaseId = release.id

      const teams = (release.teams || []).map(t => t.logo
        ? `<span>
          <img src='${t.logo}' 
          title="${t.name}"
      ></span>`
        : `<span class='team-initials' title="${t.name}">${(t.name || '').split(/\s+/).map(w => w[0]).join('').toUpperCase()}</span>`
      ).join('')

      const watchTags = (release.wereWatch || []).map(tag => {
        const color = (() => {
          switch (tag.color) {
            case 'gray':   return '#a5a5a555'
            case 'blue':   return '#42a8ff55'
            case 'green':  return '#02ff5055'
            case 'pink':   return 'pink'
            case 'purple': return '#a5a5a555'
            case 'orange': return 'orange'
            default:       return '#00000055'
          }
        })()
        return `<span class="watch-tag" style="background-color:${color}">${tag.name}</span>`
      }).join('')

      let hasSub = false, hasDub = false, subEpisodes = 0, dubEpisodes = 0
      if ('Саби' in release) {
        hasSub = true; hasDub = true
        subEpisodes = release.episodessub || 0
        dubEpisodes = release.episodes || 0
      } else if (release.title?.toLowerCase().includes('(суб)')) {
        hasSub = true; subEpisodes = release.episodes || 0
      } else {
        hasDub = true; dubEpisodes = release.episodes || 0
      }

      let audioSubHTML = ''
      if (hasDub) audioSubHTML += `<span class="dub-info" title="Озвучення"><i class="bi bi-badge-vo"></i> ${dubEpisodes}</span>`
      if (hasSub) {
        if (hasDub) audioSubHTML += ' '
        audioSubHTML += `<span class="sub-info" title="Субтитри"><i class="bi bi-badge-cc"></i> ${subEpisodes}</span>`
      }

      const status = () => {
        switch (release.status) {
          case 'В процесі': return `<span style="color:var(--ongoing);"><i class="bi bi-hourglass-split" title="${release.status}"></i></span>`
          case 'Завершено': return `<span style="color:var(--finished);"><i class="bi bi-list-check" title="${release.status}"></i></span>`
          case 'Закинуто': return `<span style="color:var(--droped);"><i class="bi bi-trash" title="${release.status}"></i></span>`
          case 'Відкладено': return `<span style="color:var(--paused);"><i class="bi bi-pause-fill" title="${release.status}"></i></span>`
          default: return `<span>
            <i class="bi bi-question" title="На перевірці"></i></span>`
        }
      }

      card.innerHTML = `
        <div class='teams-logos'>${teams}</div>
        ${watchTags ? `<div class='watch-tags'>${watchTags}</div>` : ''}
        ${release.dubinfo || release.subinfo
          ? `<div>
              <span>${release.dubinfo[0]?.name || ''}</span>
              <span>${release.subinfo[0]?.name || ''}</span>
            </div>`
          : ''
        }
        <div class="dub-sub-info">${audioSubHTML}</div>
        <div>${status()}</div>
      `
      container.appendChild(card)
    }
    return container
  }

  // ===== Реліз =====
  async function showReleaseDetail(release) {
    state.currentView = 'release'
    state.currentRelease = release
    // «Назад» показуємо тільки на релізі й тільки якщо є звідки повертатись
    const canGoBack = (state.currentAnime || state.currentTeam) && !state.openedFromCatalog
    toggleBack(!!canGoBack)
    await renderReleaseDetail(release)
  }

  async function renderReleaseDetail(release) {
    const anime = AnimeTitles.find(a => release.animeIds?.includes(a.id))
    const cover = anime?.cover ? `<div class='title-cover'><img src='${anime.cover}'></div>` : ''
    const poster = anime?.poster ? `<img class='title-poster' src='${anime.poster}'>` : ''

    const teams = (release.teams || [])
      .map(t => `<span class='team-link data-nav-link' data-team-id='${t.id}'><img src='${t.logo}'>${t.name}</span>`)
      .join('')

    const torrents = (release.torrentLinks || [])
      .filter(t => t.href)
      .map(t => `<a href='${t.href}' target="_blank">${t.text}</a>`)
      .join('') || ''

    const watchTags = (release.wereWatch || []).map(tag => {
      const color = (() => {
        switch (tag.color) {
          case 'gray':   return '#a5a5a555'
          case 'blue':   return '#42a8ff55'
          case 'green':  return '#02ff5055'
          case 'pink':   return 'pink'
          case 'purple': return '#a5a5a555'
          case 'orange': return 'orange'
          default:       return '#00000055'
        }
      })()
      return `<span class="watch-tag" style="background-color:${color}">${tag.name}</span>`
    }).join('')

    const status = () => {
      switch (release.status) {
        case 'В процесі': return `<span style="color:var(--ongoing);"><i class="bi bi-hourglass-split"></i> ${release.status}</span>`
        case 'Завершено': return `<span style="color:var(--finished);"><i class="bi bi-list-check"></i> ${release.status}</span>`
        case 'Закинуто': return `<span style="color:var(--droped);"><i class="bi bi-trash"></i> ${release.status}</span>`
        case 'Відкладено': return `<span style="color:var(--paused);"><i class="bi bi-pause-fill"></i> ${release.status}</span>`
        default: return `
          <span>
            <i class="bi bi-question"></i> 
            На перевірці
          </span>
        `
      }
    }

    state.modal.querySelector('#animeModalContent').innerHTML = `
      <div class='title-detail release-page'>
        ${cover}
        <div class='top-section'>
          <div class='poster-container'>
            ${poster}
          </div>
          <div class='center-column'>
            <div><h1>${release.title}</h1></div>
            <div class='title-info'>
              ${(release.animeIds || []).map(aID => {
                const animeItem = AnimeTitles.find(a => a.id === aID)
                return animeItem
                  ? `<span class='data-nav-link' data-anime-id="${animeItem.id}">
                       <i class="bi bi-film"></i>
                       ${animeItem.title} (${animeItem.format}, ${animeItem.year})
                     </span>`
                  : ''
              }).join('')}
            </div>
            <div class='title-info'>
              <div class='teams-logos'>${teams}</div>
            </div>
            <div class='title-info'>
              ${status()}
              <span title='Епізодів'>
                <i class="bi bi-list-ol">
                </i> ${release.episodes} еп.
              </span>
              <span>${release.dubinfo[0]?.name || ''}</span>
              <span>${release.subinfo[0]?.name || ''}</span>
              ${watchTags ? `<div class='watch-tags'>${watchTags}</div>` : ''}
            </div>
            ${torrents ? `<h2>Торенти</h2><p class='release-torrents'>${torrents}</p>` : ''}
            <div class='release-info'>
              <div class='dubbers-info'>
                <h3>Озвучували</h3>
                <div class='teams-logos'>Буде додано в наступних оновленях</div>
              </div>
              <div class='translators-info'>
                <h3>Перекладали</h3>
                <div class='teams-logos'>Буде додано в наступних оновленях</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `
  }

  // Виклик із каталогу/із зовнішньої картки (API, що використовується ззовні)
  async function renderReleaseDetailFromCatalog(release) {
    if (!release) return console.error('Реліз не знайдено')

    if (!state.isOpen) {
      state.isOpen = true
      state.modal.showModal()
      document.body.classList.add('modal-open')
      state.openedFromCatalog = true
    }
    state.currentView = 'release'
    state.currentRelease = release

    // Якщо відкрито з каталогу — «Назад» не показуємо
    const canGoBack = (state.currentAnime || state.currentTeam) && !state.openedFromCatalog
    toggleBack(!!canGoBack)

    await renderReleaseDetail(release)
  }

  // ===== Команда =====
  async function renderTeamDeteils(teamId) {
    if (!state.isOpen) {
      state.isOpen = true
      state.modal.showModal()
      document.body.classList.add('modal-open')
    }

    state.currentView = 'teamReleases'
    state.currentTeam = Teams.find(t => t.id === teamId)
    state.currentAnime = null
    state.currentRelease = null
    state.openedFromCatalog = false

    // На сторінці команди «Назад» не показуємо
    toggleBack(false)

    function getStatusStyle(status) {
        switch(status?.toLowerCase()) {
            case 'активна':
                return 'color: #4CAF50;'
            case 'малоактивна':
                return 'color: #FF9800;'
            case 'розформована':
            case 'неактивна':
                return 'color: #ff5b5b;'
            default:
                return 'color: #9E9E9E;'
        }
    }

    const AnitubeBadge = state.currentTeam.anitube
      ? `<a href="${state.currentTeam.anitube}" target="_blank" class='badge'><img src='https://rosset-nocpes.github.io/ua-badges/src/anitube-dark.svg'></a>` : ''
    const TGBadge = state.currentTeam.tg
      ? `<a href="${state.currentTeam.tg}" target="_blank" class='badge'><img src='https://rosset-nocpes.github.io/ua-badges/src/telegram-dark.svg'></a>` : ''
    
    const releases = AnimeReleases.filter(r => r.teams?.some(t => t.id === teamId))

    const headerHTML = `
      <div class='title-detail team-detail'>
        <div class='top-section'>
          <img class='team-logo' src='${state.currentTeam.logo || ''}' title='${state.currentTeam.name || 'Не вказано'}'>
          <div class='center-column'>
            <h1>${state.currentTeam.name || 'Не вказано'}</h1>
            ${state.currentTeam.altname.length > 0 ? `<h3>${state.currentTeam.altname.join(' / ')}</h3>` : ''}
            <div class='title-info'>
              <span title='Тип манди'>
                <i class="bi bi-collection-play"></i> 
                ${state.currentTeam.type_team.join(' • ') || 'Не вказано'}
              </span>
              <span title='Тип робіт'>
                <i class="bi bi-briefcase"></i> 
                ${state.currentTeam.type_activity.join(' • ') || 'Не вказано'}
              </span>
              <span style='${getStatusStyle(state.currentTeam.status)}' title='Статус'>
                <i class="bi bi-activity"></i> 
                ${state.currentTeam.status || 'Активна'}
              </span>
            </div>
            <div class='watch-info'>${AnitubeBadge}${TGBadge}</div>
          </div>
        </div>
        <div class="releases-section">
          <div id="teamReleasesList"></div>
        </div>
      </div>
    `
    state.modal.querySelector('#animeModalContent').innerHTML = headerHTML

    const container = state.modal.querySelector('#teamReleasesList')
    // Тут ми рендеримо звичайний список «Релізи» у контейнер модалки;
    // кліки по картках релізів перехоплює делегація (відкриє showReleaseDetail)
    renderList(releases, 'Релізи', null, null, container)
  }

  // ===== Назад (тільки на релізі) =====
  function goBack() {
    if (state.currentView !== 'release') {
      close()
      return
    }
    if (state.currentAnime) {
      // назад до тайтлу
      toggleBack(false)
      showAnimeDetail(state.currentAnime)
      return
    }
    if (state.currentTeam) {
      // назад до команди
      toggleBack(false)
      renderTeamDeteils(state.currentTeam.id)
      return
    }
    // реліз без контексту (відкрито з каталогу)
    close()
  }

  // Публічний перехід до тайтлу (використовується делегацією)
  async function showAnimeDetail(anime) {
    state.currentView = 'anime'
    state.currentAnime = anime
    state.currentTeam = null
    state.currentRelease = null
    toggleBack(false)
    await renderAnimePage(anime)
  }

  createModal()
  return {
    open,
    close,
    goBack,
    renderReleaseDetail: renderReleaseDetailFromCatalog,
    renderTeamDeteils
  }
}

export const titleModal = createTitleModal()