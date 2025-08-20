export let AnimeTitles, AnimeReleases, Teams

// Отримуємо всі дані
export async function loadDBData() {
  [AnimeTitles, Teams, AnimeReleases] = await Promise.all([
    fetch('json/AnimeTitlesDB.json').then(res => res.json()),
    fetch('json/TeamsDB.json').then(res => res.json()),
    fetch('json/AnimeReleasesDB.json').then(res => res.json()),
    // Завантажуємо дані про постери з GitHub
    // fetch('https://raw.githubusercontent.com/DrBryanMan/UAPosters/refs/heads/main/PostersList.json')
    //   .then(res => res.json())
    //   .catch(error => {
    //     console.warn('Не вдалося завантажити додаткові постери:', error)
    //     return [] // Повертаємо порожній масив якщо не вдалося завантажити
    //   }),
  ])

  // Створюємо Map для швидкого пошуку постерів за hikka_url
  // const postersMap = new Map()
  // if (PostersData && Array.isArray(PostersData)) {
  //   PostersData.forEach(item => {
  //     if (item.hikka_url && item.posters && item.posters.length > 0) {
  //       postersMap.set(item.hikka_url, item.posters)
  //     }
  //   })
  // }

  // Сортуємо Команди за кількістю релізів
  Teams = Teams.sort((a, b) => b.anime_releases.length - a.anime_releases.length)

  // Додаємо в релізи інфу команд
  AnimeReleases = AnimeReleases.map(release => ({
      ...release,
      teams: release.teams.map(team => {
          const foundTeam = Teams.find(t => t.id === team.id)
          return {
              id: team.id,
              logo: foundTeam?.logo || '',
              name: foundTeam?.name || ''
          }
      })
  }))

  // Додаємо тайтлам інфу про релізи та додаткові постери
  AnimeTitles = AnimeTitles.map(anime => {
      const animeWithReleases = {
          ...anime,
          releases: anime.releases.map(rel => AnimeReleases.find(release => release.id === rel.id))
      }

      // Додаємо додаткові постери якщо є hikka_url
      // if (anime.hikka_url && postersMap.has(anime.hikka_url)) {
      //     const additionalPosters = postersMap.get(anime.hikka_url)
      //     animeWithReleases.additionalPosters = additionalPosters
          
      //     // Якщо є додаткові постери, використовуємо перший з них як основний постер
      //     if (additionalPosters.length > 0) {
      //         animeWithReleases.posterUrl = `https://raw.githubusercontent.com/DrBryanMan/UAPosters/refs/heads/main/${additionalPosters[0].url}`
      //         animeWithReleases.posterAuthor = additionalPosters[0].author
      //     }
      // }

      return animeWithReleases
  })
  .filter(anime => anime.releases.length > 0)

  // Додаємо унікальні команди до аніме
  AnimeTitles = AnimeTitles.map(anime => {
      try {
          const teams = new Set()
          anime.releases.forEach(release => {
              release?.teams?.forEach(team => {
                  teams.add(JSON.stringify(team))
              })
          })
          return {...anime, teams: Array.from(teams).map(JSON.parse)}
      } catch (error) {
          console.error(`Помилка при завантаженні даних ${anime.title}:`, error)
          throw error
      }
  })
  // AnimeTitles = AnimeTitles.slice(0,100)

  // Додаткові дані до релізів
  AnimeReleases = AnimeReleases.map(release => ({
      ...release,
      animeData: AnimeTitles.find(anime => release.animeIds.includes(anime.id))
  }))

  // console.log(`Завантажено ${PostersData?.length || 0} записів з додатковими постерами`)
}