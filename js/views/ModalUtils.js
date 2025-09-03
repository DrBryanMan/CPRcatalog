// Спільні утиліти для модулів деталей

export class ModalUtils {
  static getTagColor(color) {
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

  static getStatusIcon(status) {
    switch (status) {
      case 'В процесі': return `<span style="color:var(--ongoing);"><i class="bi bi-hourglass-split" title="${status}"></i></span>`
      case 'Завершено': return `<span style="color:var(--finished);"><i class="bi bi-list-check" title="${status}"></i></span>`
      case 'Закинуто': return `<span style="color:var(--droped);"><i class="bi bi-trash" title="${status}"></i></span>`
      case 'Відкладено': return `<span style="color:var(--paused);"><i class="bi bi-pause-fill" title="${status}"></i></span>`
      default: return `<span><i class="bi bi-question" title="На перевірці"></i></span>`
    }
  }

  static getStatusHTML(status) {
    switch (status) {
      case 'В процесі': return `<span style="color:var(--ongoing);"><i class="bi bi-hourglass-split"></i> ${status}</span>`
      case 'Завершено': return `<span style="color:var(--finished);"><i class="bi bi-list-check"></i> ${status}</span>`
      case 'Закинуто': return `<span style="color:var(--droped);"><i class="bi bi-trash"></i> ${status}</span>`
      case 'Відкладено': return `<span style="color:var(--paused);"><i class="bi bi-pause-fill"></i> ${status}</span>`
      default: return `<span><i class="bi bi-question"></i> На перевірці</span>`
    }
  }

  static generateWatchTags(release) {
    return (release.wereWatch || []).map(tag => {
      const color = this.getTagColor(tag.color)
      return `<span class="watch-tag" style="background-color:${color}">${tag.name}</span>`
    }).join('')
  }

  static generateAudioSubInfo(release) {
    let hasSub = false, hasDub = false, subEpisodes = 0, dubEpisodes = 0
    
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

    let audioSubHTML = ''
    if (hasDub) audioSubHTML += `<span class="dub-info" title="Озвучення"><i class="bi bi-badge-vo"></i> ${dubEpisodes}</span>`
    if (hasSub) {
      if (hasDub) audioSubHTML += ' '
      audioSubHTML += `<span class="sub-info" title="Субтитри"><i class="bi bi-badge-cc"></i> ${subEpisodes}</span>`
    }
    
    return audioSubHTML
  }

  static generateTeamsHTML(teams) {
    return teams
      .map(t => `<span class='team-link data-nav-link' data-team-id='${t.id}'><img src='${t.logo}'>${t.name}</span>`)
      .join('')
  }

  static getTeamStatusStyle(status) {
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
}