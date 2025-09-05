import { AnimeTitles } from '../loadData.js'
import { ModalUtils } from './ModalUtils.js'

export class ReleaseDetails {
  constructor(modal) {
    this.modal = modal
  }

  async render(release) {
    const anime = AnimeTitles.find(a => release.animeIds?.includes(a.id))
    const cover = anime?.cover ? `<div class='title-cover'><img src='${anime.cover}'></div>` : ''
    const posterList = PostersData.find(i => i.hikka_url === anime.hikka_url)?.posters
    const posterUrl = Array.isArray(posterList) && posterList.length > 0
        ? `https://raw.githubusercontent.com/DrBryanMan/UAPosters/refs/heads/main/${posterList[0].url}`
        : anime?.hikka_poster

    const teams = this.generateTeamsHTML(release.teams || [])
    const torrents = this.generateTorrentsHTML(release.torrentLinks || [])
    const watchTags = this.generateWatchTags(release)
    const statusHTML = this.getStatusHTML(release.status)
    const animeLinksHTML = this.generateAnimeLinksHTML(release.animeIds || [])

    this.modal.querySelector('#animeModalContent').innerHTML = `
      <div class='title-detail release-page'>
        ${cover}
        <div class='top-section'>
          <div class='poster-container'>
            <img class='title-poster' src='${posterUrl || anime.hikka_poster}'>
          </div>
          <div class='center-column'>
            <div><h1>${release.title}</h1></div>
            <div class='title-info'>
              ${animeLinksHTML}
            </div>
            <div class='title-info'>
              <div class='teams-logos'>${teams}</div>
            </div>
            <div class='title-info'>
              ${statusHTML}
              <span title='Епізодів'>
                <i class="bi bi-list-ol"></i> ${release.episodes || '?'} еп.
              </span>
              ${release.dubinfo.map(d => `<span>${d}</span>`) || '—'}
              ${release.subinfo.map(s => `<span>${s}</span>`) || '—'}
              ${watchTags ? `<div class='watch-tags'>${watchTags}</div>` : ''}
            </div>
            ${torrents ? `<h2>Торенти</h2><p class='release-torrents'>${torrents}</p>` : ''}
            <div class='release-info'>
              <div class='dubbers-info'>
                <h3>Озвучували</h3>
                <div class='teams-logos'>Буде додано в наступних оновленнях</div>
              </div>
              <div class='translators-info'>
                <h3>Перекладали</h3>
                <div class='teams-logos'>Буде додано в наступних оновленнях</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `
  }

  generateTeamsHTML(teams) {
    return teams
      .map(t => `<span class='team-link data-nav-link' data-team-id='${t.id}'><img src='${t.logo}'>${t.name}</span>`)
      .join('')
  }

  generateTorrentsHTML(torrentLinks) {
    return torrentLinks
      .filter(t => t.href)
      .map(t => `<a href='${t.href}' target="_blank">${t.text}</a>`)
      .join('')
  }

  generateWatchTags(release) {
    return (release.wereWatch || []).map(tag => {
      const color = this.getTagColor(tag.color)
      return `<span class="watch-tag" style="background-color:${color}">${tag.name}</span>`
    }).join('')
  }

  getTagColor(color) {
    switch (color) {
      case 'gray': return '#a5a5a555'
      case 'blue': return '#42a8ff55'
      case 'green': return '#02ff5055'
      case 'pink': return 'pink'
      case 'purple': return '#a5a5a555'
      case 'orange': return 'orange'
      default: return '#00000055'
    }
  }

  getStatusHTML(status) {
    switch (status) {
      case 'В процесі': return `<span style="color:var(--ongoing);"><i class="bi bi-hourglass-split"></i> ${status}</span>`
      case 'Завершено': return `<span style="color:var(--finished);"><i class="bi bi-list-check"></i> ${status}</span>`
      case 'Закинуто': return `<span style="color:var(--droped);"><i class="bi bi-trash"></i> ${status}</span>`
      case 'Відкладено': return `<span style="color:var(--paused);"><i class="bi bi-pause-fill"></i> ${status}</span>`
      default: return `<span><i class="bi bi-question"></i> На перевірці</span>`
    }
  }

  generateAnimeLinksHTML(animeIds) {
    return animeIds.map(aID => {
      const animeItem = AnimeTitles.find(a => a.id === aID)
      return animeItem
        ? `<span class='data-nav-link' data-anime-id="${animeItem.id}">
             <i class="bi bi-film"></i>
             ${animeItem.title} (${animeItem.format}, ${animeItem.year})
           </span>`
        : ''
    }).join('')
  }
}