import { AnimeTitles, AnimeReleases, PostersData } from '../loadData.js'
import { getAnimeClassificationInfo } from '../animeClassification.js'
import { ModalUtils } from './ModalUtils.js'

export class AnimeDetails {
  constructor(modal) {
    this.modal = modal
  }

  async render(anime) {
    const seasonTranslations = {
      winter: 'Зима',
      spring: 'Весна',
      summer: 'Літо',
      fall: 'Осінь'
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

    const cls = getAnimeClassificationInfo(anime.episodes, anime.duration, anime.format)
    const teams = (anime.teams || []).map(t => `<span class='team-link data-nav-link' data-team-id='${t.id}'><img src='${t.logo}'>${t.name}</span>`).join('')
    const cover = anime.cover ? `<div class='title-cover'><img src='${anime.cover}'></div>` : ''
    const posterList = PostersData.find(i => i.hikka_url === anime.hikka_url)?.posters
    const posterUrl = Array.isArray(posterList) && posterList.length > 0
        ? `https://raw.githubusercontent.com/DrBryanMan/UAPosters/refs/heads/main/${posterList[0].url}`
        : anime?.hikka_poster

    const badges = this.generateBadges(anime)

    const html = `
      <div class='title-detail'>
        ${cover}
        <div class='top-section'>
          <div class='poster-gallery'>
            <img id='posterImage' class='title-poster' src="${posterUrl || ''}" alt='Постер'>
            <div id='posterMeta' class='poster-meta'></div>
            ${this.generatePosterSelector(posterList)}
          </div>
          <div class='center-column'>
            <div style="text-align:center;">
              <h1>${anime.title}</h1>
              ${this.generateAlternativeNames(anime)}
            </div>
            <div class='title-info'>
              <span title='Формат на тб'>
                <i class="bi bi-film"></i>
                <span>${anime.format}</span>
              </span>
              <span title='Класифікація ЦПР '>
                <span title='${cls.description}'>${cls.displayText}</span>
              </span>
              <span title='Аніме сезон'>
                <i class="bi bi-calendar-check"></i>
                ${seasonTranslations[anime.season?.toLowerCase()] || anime.season || 'Невідомо'} ${anime.year || 'Не вказано'}
              </span>
              <span title='Загальна кількість'>
                <i class="bi bi-list-ol"></i> ${anime.episodes || '?'} еп.
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
              ${this.renderScore('MAL', anime.scoreMAL, anime.scoredbyMAL)}
              ${this.renderScore('Hikka', anime.scoreHikka, anime.scoredbyHikka)}
            </div>
            <div class='watch-info'>${badges}</div>
            <div id='releasesList'>Завантаження інформації про релізи...</div>
          </div>
        </div>
      </div>
    `

    this.modal.querySelector('#animeModalContent').innerHTML = html
    this.initPosterGallery(posterList)
    await this.loadReleases(anime)
    this.setupAlternativeNamesModal()
  }

  generateBadges(anime) {
    const badges = []
    
    if (anime.hikka_url) {
      badges.push(`<a href="${anime.hikka_url}" target="_blank" class='badge'><img src='https://rosset-nocpes.github.io/ua-badges/src/hikka-dark.svg'></a>`)
    }
    if (anime.anitube) {
      badges.push(`<a href="${anime.anitube}" target="_blank" class='badge'><img src='https://rosset-nocpes.github.io/ua-badges/src/anitube-dark.svg'></a>`)
    }
    if (anime.uakino) {
      badges.push(`<a href="${anime.uakino}" target="_blank" class='badge'><img src='https://rosset-nocpes.github.io/ua-badges/src/uakino-dark.svg'></a>`)
    }
    if (anime.uaserial) {
      badges.push(`<a href="${anime.uaserial}" target="_blank" class='badge'><img src='https://rosset-nocpes.github.io/ua-badges/src/uaserial-dark.svg'></a>`)
    }
    if (anime.mikai) {
      badges.push(`<a href="${anime.mikai}" target="_blank" class='badge'><img src='https://rosset-nocpes.github.io/ua-badges/src/mikai-dark.svg'></a>`)
    }

    return badges.join('')
  }

  generatePosterSelector(posterList) {
    if ((posterList?.length || 0) <= 1) return ''
    
    return `<div class='poster-selector' id='posterSelector'>
      ${posterList.map((_, i) => `<button class='poster-btn' data-index='${i}'>${i + 1}</button>`).join('')}
    </div>`
  }

  generateAlternativeNames(anime) {
    if (!anime.hikkaSynonyms?.length) {
      return `<span>${anime.romaji}</span>`
    }

    return `<button id="altNamesModalBtn" class="alt-names-btn">•••</button> <span>
      ${anime.romaji}</span>
        <dialog id="altNamesModal" class="alternative-names modal">
          <span id="altNamesModalClose" class="modal-close">&times;</span>
          <h2>Альтернативні назви</h2>
          <div id="altNamesContent">${anime.hikkaSynonyms.map(title => `<span>
            ${title}</span>`).join('')}
          </div>
        </dialog>`
  }

  renderScore(type, rating, count) {
    if (!rating) {
      return `<span class="rating" title="Оцінка ${type}"><i class="bi bi-star"></i> —</span>`
    }
    
    const icon = rating >= 7 ? 'bi-star-fill' : 'bi-star-half'
    let color = ''
    if (rating >= 8.0) {
      color = '#4CAF50' // зелений для високих оцінок
    } else if (rating >= 7.0) {
      color = '#8BC34A' // світло-зелений
    } else if (rating >= 6.0) {
      color = '#ffef29' // жовтий
    } else if (rating >= 5.0) {
      color = '#FF9800' // помаранчевий
    } else {
      color = '#F44336' // червоний для низьких оцінок
    }
    
    return `
      <span class="rating" title='${count} оцінок'>
        <span style="color: ${type === 'Hikka' ? '#e83bff' : "#5c87ff"}">
          <i class="bi ${icon}"></i>  
          ${type}
        </span>
        <span style="color: ${color}">${rating.toFixed(1)}</span>
      </span>
    `
  }

  initPosterGallery(posterList) {
    let posterIndex = 0
    const posterImage = this.modal.querySelector('#posterImage')
    const posterMeta = this.modal.querySelector('#posterMeta')
    const posterSelector = this.modal.querySelector('#posterSelector')

    const updatePosterView = () => {
      if (!posterList.length) return
      const current = posterList[posterIndex]
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

    // if (posters.length > 0) {
    //   updatePosterView()
    // }
  }

  async loadReleases(anime) {
    const releases = AnimeReleases.filter(r => r.animeIds?.includes(anime.id))
    const listEl = this.modal.querySelector('#releasesList')
    
    if (releases.length) {
      const cards = await this.renderAnimeReleases(releases)
      listEl.innerHTML = '<h2>Релізи:</h2>'
      listEl.appendChild(cards)
    } else {
      listEl.innerHTML = '<p>Релізи не знайдено</p>'
    }
  }

  async renderAnimeReleases(releases) {
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
      const card = this.createReleaseCard(release)
      container.appendChild(card)
    }
    
    return container
  }

  createReleaseCard(release) {
    const card = document.createElement('div')
    card.classList.add('release-card', 'card')
    card.dataset.releaseId = release.id

    const teams = (release.teams || []).map(t => t.logo
      ? `<span><img src='${t.logo}' title="${t.name}"></span>`
      : `<span class='team-initials' title="${t.name}">${(t.name || '').split(/\s+/).map(w => w[0]).join('').toUpperCase()}</span>`
    ).join('')

    const watchTags = this.generateWatchTags(release)
    const audioSubHTML = this.generateAudioSubInfo(release)
    const statusIcon = this.getStatusIcon(release.status)

    card.innerHTML = `
      <div class='teams-logos'>${teams}</div>
      ${watchTags ? `<div class='watch-tags'>${watchTags}</div>` : '<div>—</div>'}
      ${release.dubinfo || release.subinfo
        ? `<div>
            ${release.dubinfo.map(d => `<span>${d}</span>`) || '—'}
            ${release.subinfo.map(s => `<span>${s}</span>`) || '—'}
          </div>`
        : '<div>—</div>'
      }
      <div class="dub-sub-info">${audioSubHTML}</div>
      <div>${statusIcon}</div>
    `
    
    return card
  }

  generateWatchTags(release) {
    return ModalUtils.generateWatchTags(release)
  }

  getTagColor(color) {
    return ModalUtils.getTagColor(color)
  }

  generateAudioSubInfo(release) {
    return ModalUtils.generateAudioSubInfo(release)
  }

  getStatusIcon(status) {
    return ModalUtils.getStatusIcon(status)
  }

  setupAlternativeNamesModal() {
    const altModal = this.modal.querySelector('#altNamesModal')
    const altBtn = this.modal.querySelector('#altNamesModalBtn')
    const altClose = this.modal.querySelector('#altNamesModalClose')
    
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
}