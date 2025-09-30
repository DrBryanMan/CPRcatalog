import { Teams, AnimeReleases } from '../loadData.js'
import { renderList } from '../renderList.js'
import { ModalUtils } from './ModalUtils.js'

export class TeamDetails {
  constructor(modal) {
    this.modal = modal
  }

  async render(teamId) {
    const team = Teams.find(t => t.id === teamId)
    if (!team) {
      console.error('Команда не знайдена:', teamId)
      return
    }

    const badges = this.generateBadges(team)
    const releaseIds = new Set(team.anime_releases.map(r => r.id));
    const releases = AnimeReleases.filter(r => releaseIds.has(r.id))

    const headerHTML = `
      <div class='title-detail team-detail'>
        <div class='top-section'>
          <img class='team-logo' src='${team.logo || ''}' title='${team.name || 'Не вказано'}'>
          <div class='center-column'>
            <h1>${team.name || 'Не вказано'}</h1>
            ${team.altname.length > 0 ? `<h3>${team.altname.join(' / ')}</h3>` : ''}
            <div class='title-info'>
              <span title='Тип команди'>
                <i class="bi bi-collection-play"></i> 
                ${team.type_team.join(' • ') || 'Не вказано'}
              </span>
              <span title='Тип робіт'>
                <i class="bi bi-briefcase"></i> 
                ${team.type_activity.join(' • ') || 'Не вказано'}
              </span>
              <span style='${this.getStatusStyle(team.status)}' title='Статус'>
                <i class="bi bi-activity"></i> 
                ${team.status || 'Активна'}
              </span>
            </div>
            <div class='watch-info'>${badges}</div>
          </div>
        </div>
        <div class="releases-section">
          <div id="teamReleasesList"></div>
        </div>
      </div>
    `

    this.modal.querySelector('#animeModalContent').innerHTML = headerHTML
    
    const container = this.modal.querySelector('#teamReleasesList')
    
    // Використовуємо renderList з опціями для модалки
    renderList(releases, 'Релізи', null, null, container, {
      isModal: true,              // це модалка
      updateNavigation: false,    // не оновлюємо навігацію
      updateUrl: false,           // не оновлюємо URL
      showFilters: false,         // не показуємо фільтри
      showSearch: true,           // показуємо пошук
      showViewControls: true,     // показуємо контроли виду
      itemsPerPage: 10            // менше елементів на сторінку для модалки
    })
  }

  generateBadges(team) {
    const badges = []
    
    if (team.anitube) {
      badges.push(`<a href="${team.anitube}" target="_blank" class='badge'><img src='https://rosset-nocpes.github.io/ua-badges/src/anitube-dark.svg'></a>`)
    }
    if (team.tg) {
      badges.push(`<a href="${team.tg}" target="_blank" class='badge'><img src='https://rosset-nocpes.github.io/ua-badges/src/telegram-dark.svg'></a>`)
    }
    
    return badges.join('')
  }

  getStatusStyle(status) {
    return ModalUtils.getTeamStatusStyle(status)
  }
}