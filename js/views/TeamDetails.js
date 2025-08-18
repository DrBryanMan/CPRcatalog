import * as Functions from '../functions.js'
import { AnimeReleases, AnimeTitles } from '../loadData.js'
import { renderList } from '../renderList.js'

export async function renderTeamDetail(team) {
    // Functions.updateNavigation('Команди', team.name || 'Не вказано')
    
    // Знаходимо релізи команди
    const releases = AnimeReleases.filter(release => release.teams && release.teams.some(t => t.id === team.id))
    if (releases.length > 0) {
        renderList(releases, 'Релізи')
    } else {
        app.innerHTML = '<p>Релізи не знайдено</p>'
    }

    // Відображаємо інформацію про команду
    const teamInfo = document.createElement('div')
    teamInfo.classList.add('team-detail')
    teamInfo.innerHTML = `
        <div class='team-detail'>
            <div class='top-section'>
                <img class='team-logo' src='${team.logo}' title='${team.name || 'Не вказано'}'>
                <div class='info-section'>
                    <h1>${team.name || 'Не вказано'}</h1>
                    <div class='team-info'>
                        <p><i class="bi bi-briefcase"></i> Тип робіт: ${team.type || 'Не вказано'}</p>
                        <p><i class="bi bi-activity"></i> Статус: ${team.status || 'Активна'}</p>
                    </div>
                </div>
            </div>
            <div class="releases-section">
                <h2>Релізи команди:</h2>
            </div>
        </div>
    `
    app.prepend(teamInfo)
}