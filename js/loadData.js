// import * as Functions from './functions.js'
export let [allAnimes, allReleases, allTeams] = [[], [], []]

// Отримуємо всі дані
export async function loadData() {
    // const cachedAnimes = Functions.getFromCache('allAnimes')
    // const cachedReleases = Functions.getFromCache('allReleases')
    // const cachedTeams = Functions.getFromCache('allTeams')

    // if (cachedAnimes && cachedReleases && cachedTeams) {
    //     allAnimes = cachedAnimes
    //     allReleases = cachedReleases
    //     allTeams = cachedTeams
    //     console.log('Дані з кешу отримано')
    // } else {
        const [animeData, teamData, releaseData] = await Promise.all([
            fetch('json/AnimeTitlesDB.json').then(res => res.json()),
            fetch('json/TeamsDB.json').then(res => res.json()),
            fetch('json/AnimeReleasesDB.json').then(res => res.json()),
        ])
        allTeams = teamData.sort((a, b) => b.anime_releases.length - a.anime_releases.length)
        // allTeams = teamData.sort((a, b) => a.name.localeCompare(b.name))
        allReleases = releaseData.map(release => ({
            ...release,
            teams: release.teams.map(team => {
                const foundTeam = allTeams.find(t => t.id === team.id)
                return {
                    id: team.id,
                    logo: foundTeam?.logo || '',
                    name: foundTeam?.name || 'Невідома команда'
                }
            })
        }))

        allAnimes = animeData.map(anime => ({
            ...anime,
            releases: anime.releases.map(rel => allReleases.find(release => release.id === rel.id))
            }))
            .filter(anime => anime.releases.length > 0)

        // Додаємо унікальні команди до аніме
        allAnimes = allAnimes.map(anime => {
            try {
                const teams = new Set()
                anime.releases.forEach(release => {
                    release.teams?.forEach(team => {
                        teams.add(JSON.stringify(team))
                    })
                })
                return {...anime, teams: Array.from(teams).map(JSON.parse)}
            } catch (error) {
                console.error(`Помилка при завантаженні даних ${anime.title}:`, error)
                throw error
            }
        })

        // Додаткові дані до релізів
        allReleases = allReleases.map(release => ({
            ...release,
            animeData: allAnimes.find(anime => release.animeIds.includes(anime.id))
        }))

        // Functions.saveToCache('allAnimes', allAnimes)
        // Functions.saveToCache('allReleases', allReleases)
        // Functions.saveToCache('allTeams', allTeams)
    // }
}