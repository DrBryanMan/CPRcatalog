import { AnimeTitles, AnimeReleases, PostersData } from '../loadData.js'
import { currentHub, router } from '../router.js'
import { titleModal } from '../views/TitleModal.js'
import { getAnimeClassificationInfo } from '../animeClassification.js'

export function createListCard() {
    function createImageWithSkeleton(src, title, className = '') {
        return `
            <div class="image-container ${className}">
                <div class="skeleton-loader"></div>
                <img src="${src}" title="${title}" 
                    onload="this.parentElement.querySelector('.skeleton-loader').style.display='none'; this.style.opacity='1';" 
                    onerror="this.parentElement.querySelector('.skeleton-loader').style.display='none'; this.style.opacity='1';">
            </div>
        `
    }
    
    function renderScore(type, rating) {
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
          <span class="rating" title='Оцінка ${type}' style="color: ${color}; font-weight: bold;">
            <i class="bi ${icon}" style="color: ${type === 'Hikka' ? '#e83bff' : "#5c87ff"}"></i> 
            ${rating.toFixed(1)}
          </span>
        `
    }
    
    function getAgeRating(genre) {
        if (!genre || genre.trim() === '') return null
        const adultGenres = ['Біляхентай', 'Хентай', 'Яой', 'Юрі']
        return adultGenres.includes(genre.trim()) ? '18+' : '16+'
    }

    // Універсальні парсери
    function parseEpisodes(value, { mode = 'first' } = {}) {
      if (value === undefined || value === null) return 0
      const nums = String(value).match(/\d+/g) // усі числа в рядку
      if (!nums || nums.length === 0) return 0
      const arr = nums.map(n => parseInt(n, 10))

      switch (mode) {
        case 'sum': return arr.reduce((a, b) => a + b, 0)   // "12 + 1" -> 13
        case 'max': return Math.max(...arr)                 // "1-12" -> 12
        case 'first':
        default:    return arr[0]                           // "10/12" -> 10
      }
    }

    function parseEpisodesAuto(value) {
      const s = String(value ?? '').trim()
      if (!s) return 0

      // "+" => сумуємо (OVA/спешли додаються)
      if (/\+/.test(s)) return parseEpisodes(s, { mode: 'sum' })

      // "10/12" => беремо прогрес (перше число)
      if (/[\/\\]/.test(s)) return parseEpisodes(s, { mode: 'first' })

      // Діапазони "1-12" або "1–12" => максимум
      if (/[–-]/.test(s)) return parseEpisodes(s, { mode: 'max' })

      // За замовчуванням — перше число
      return parseEpisodes(s, { mode: 'first' })
    }

    // Універсальна функція для аналізу аудіо/субтитрів
    function analyzeAudioSubs(release) {
        const result = {
            hasDub: false,
            hasSub: false,
            dubEpisodes: 0,
            subEpisodes: 0
        }

        // Перевіряємо чи є subinfo та чи він не містить "Відсутні"
        const hasValidSubInfo = release.subinfo.length > 0 && !release.subinfo.includes('Відсутні')
        
        // Перевіряємо чи є dubinfo
        const hasValidDubInfo = release.dubinfo.length > 0
        
        // Перевіряємо чи title містить "(суб)"
        const titleHasSub = release.title?.toLowerCase().includes('(суб)')

        // Логіка визначення типу релізу
        if (hasValidSubInfo && hasValidDubInfo) {
            // Є і озвучка і субтитри
            result.hasDub = true
            result.hasSub = true
            result.dubEpisodes = parseEpisodesAuto(release.episodes)
            result.subEpisodes = release.episodessub 
                ? parseEpisodesAuto(release.episodessub)
                : parseEpisodesAuto(release.episodes)
        } else if (!hasValidDubInfo || titleHasSub) {
            // Тільки субтитри
            result.hasSub = true
            result.subEpisodes = parseEpisodesAuto(release.episodes)
        } else {
            // Тільки озвучка
            result.hasDub = true
            result.dubEpisodes = parseEpisodesAuto(release.episodes)
        }

        return result
    }

    // Аналіз релізів для аніме
    function analyzeAnimeReleases(animeId) {
        if (!Array.isArray(AnimeReleases)) {
            return { hasDub: false, hasSub: false}
            // return { hasDub: false, hasSub: false, dubEpisodes: 0, subEpisodes: 0 }
        }

        const animeReleases = AnimeReleases.filter(release => 
            release.animeIds?.includes(animeId)
        )

        let hasDub = false
        let hasSub = false
        // let maxDubEpisodes = 0
        // let maxSubEpisodes = 0

        animeReleases.forEach(release => {
            const analysis = analyzeAudioSubs(release)
            
            if (analysis.hasDub) {
                hasDub = true
                // maxDubEpisodes = Math.max(maxDubEpisodes, analysis.dubEpisodes)
            }
            
            if (analysis.hasSub) {
                hasSub = true
                // maxSubEpisodes = Math.max(maxSubEpisodes, analysis.subEpisodes)
            }
        })

        return {
            hasDub,
            hasSub,
            // dubEpisodes: maxDubEpisodes,
            // subEpisodes: maxSubEpisodes
        }
    }

    function createRatingBlock(ratingmal, ratinghikka, ageRating) {
        let html = ''
        html += renderScore('MAL', ratingmal)
        if (ageRating) html += `<span class="age-rating">${ageRating}</span>`
        html += renderScore('Hikka', ratinghikka)
        return html ? `<div class="ratings">${html}</div>` : ''
    }

    function createAudioSubBlock(audioSubInfo, item) {
        if (!audioSubInfo.hasDub && !audioSubInfo.hasSub) return ''
        
        let html = ''
        if (audioSubInfo.hasDub) {
            html += `<span class="dub-info" title="Озвучення"><i class="bi bi-badge-vo"></i></span>`
        }
        if (audioSubInfo.hasSub) {
            if (audioSubInfo.hasDub) html += ' '
            html += `<span class="sub-info" title="Субтитри"><i class="bi bi-badge-cc"></i></span>`
        }
        
        const totalEpisodes = item?.episodes || item?.totalEpisodes || 0
        return `<div class="dub-sub-info">${html}${totalEpisodes ? `<span class="episode-count">${totalEpisodes}</span>` : ''}</div>`
    }

    function createAnimeCard(item, currentView) {
        const card = document.createElement('div')
        card.classList.add('card', 'anime-card')
        const ageRating = getAgeRating(item.genre)
        const releaseInfo = analyzeAnimeReleases(item.id)
        const cover = item.cover ? `<div class='anime-cover'><img src='${item.cover}'"></div>` : ''
        const posterList = PostersData.find(i => i.hikka_url === item.hikka_url)?.posters
        const posterUrl = Array.isArray(posterList) && posterList.length > 0
            ? `https://raw.githubusercontent.com/DrBryanMan/UAPosters/refs/heads/main/${posterList[0].url}`
            : item?.hikka_poster

        card.innerHTML = currentView === 'grid' ? `
            <div class='poster-box'>
                ${createRatingBlock(item?.scoreMAL, item?.scoreHikka, ageRating)}
                ${createImageWithSkeleton(posterUrl, item?.title || 'Без назви')}
                ${createAudioSubBlock(releaseInfo, item)}
                <div class='teams-logos'><span title="Кількість релізів"><i class="bi bi-collection-play"></i> ${item.releases.length}</span></div>
            </div>
            <div class='info'>
                <h3 class='truncate' title='${item?.title || 'Без назви'}'>${item?.title || 'Без назви'}</h3>
                <small>${item?.year || ''}${item?.year ? ' • ' : ''}${item?.format || ''}${item?.format ? ' • ' : ''}${getAnimeClassificationInfo(item?.episodes, item?.duration, item?.format).displayText}</small>
            </div>
        ` : `
            ${cover}
            <div class='poster-box'>
                ${createImageWithSkeleton(item?.poster || item?.hikka_poster, item?.title || 'Без назви')}
            </div>
            <div class='info'>
                <h3 class='truncate' title='${item?.title || 'Без назви'}'>${item?.title || 'Без назви'}</h3>
                <small>${item?.year || ''}${item?.year ? ' • ' : ''}${item?.format || ''}</small>
                ${createRatingBlock(item?.scoreMAL, item?.scoreHikka, ageRating)}
                ${item?.episodes ? `<small class="episode-count">Серій: ${item?.episodes}</small>` : ''}
                ${createAudioSubBlock(releaseInfo, item)}
            </div>
        `

        card.onclick = () => titleModal.open(item?.id)
        return card
    }

    function createReleaseCard(item, currentView) {
        const card = document.createElement('div')
        card.classList.add('card', 'release-card')
        const animeInfo = item?.animeIds && Array.isArray(item.animeIds)
            ? AnimeTitles.find(anime => item.animeIds.includes(anime.id))
            : null
        const teams = (item?.teams || [])
            .map(t => `<span><img src='${t?.logo || ''}'></span>`).join('')
        const cover = animeInfo?.cover ? `<div class='anime-cover'><img src='${animeInfo.cover}'></div>` : ''

        // Використовуємо універсальну функцію аналізу
        const audioSubInfo = analyzeAudioSubs(item)
        
        let audioSubHTML = ''
        if (audioSubInfo.hasDub) {
            audioSubHTML += `<span class="dub-info" title="Озвучення"><i class="bi bi-badge-vo"></i> ${audioSubInfo.dubEpisodes}</span>`
        }
        if (audioSubInfo.hasSub) {
            if (audioSubInfo.hasDub) audioSubHTML += ' '
            audioSubHTML += `<span class="sub-info" title="Субтитри"><i class="bi bi-badge-cc"></i> ${audioSubInfo.subEpisodes}</span>`
        }

        function getStatusHTML(status) {
            switch (status) {
                case 'В процесі': return `<span style="color:var(--ongoing);"><i class="bi bi-hourglass-split"></i></span>`
                case 'Завершено': return `<span style="color:var(--finished);"><i class="bi bi-list-check"></i></span>`
                case 'Закинуто': return `<span style="color:var(--droped);"><i class="bi bi-trash"></i></span>`
                case 'Відкладено': return `<span style="color:var(--paused);"><i class="bi bi-pause-fill"></i></span>`
                default: return `<span><i class="bi bi-question"></i>??</span>`
            }
        }

        card.innerHTML = currentView === 'grid' ? `
            <div class='poster-box'>
                ${createImageWithSkeleton(animeInfo?.poster || animeInfo?.hikka_poster, item?.title || 'Без назви')}
                <div class="dub-sub-info">${audioSubHTML}<span class="episode-count">${animeInfo?.episodes || '??'}</span>${getStatusHTML(item.status)}</div>
                <div class='teams-logos'>${teams}</div>
            </div>
            <div class='info'>
                <h3 class='truncate'>${item?.title || 'Без назви'}</h3>
            </div>
        ` : `
            ${cover}
            <div class='poster-box'>
                ${createImageWithSkeleton(animeInfo?.poster || animeInfo?.hikka_poster, item?.title || 'Без назви')}
            </div>
            <div class='info'>
                <h3 class='truncate'>${item?.title || 'Без назви'}</h3>
                <p class='teams-logos'>${teams}</p>
                <p>Епізоди: ${item?.episodes || 'Невідомо'}</p>
            </div>
        `
        
        card.onclick = async (e) => {
          e.preventDefault();
          e.stopPropagation();
          const { titleModal } = await import('../views/TitleModal.js');
          titleModal.renderReleaseDetail(item);
        };
        return card
    }

    function createTeamCard(item, currentView) {
        const card = document.createElement('div')
        card.classList.add('card', 'team-card')

        const logo = item?.logo
            ? createImageWithSkeleton(item.logo, item?.name || 'Без назви', 'team-logo')
            : ''

        const teamType = Array.isArray(item?.type_team) && item.type_team.length
            ? item.type_team.join(' • ')
            : 'Тип команди не вказано'

        const teamActivity = Array.isArray(item?.type_activity) && item.type_activity.length
            ? item.type_activity.join(' • ')
            : 'Тип діяльності не вказано'

        const totalReleases = Array.isArray(item?.anime_releases)
            ? item.anime_releases.length
            : AnimeReleases.filter(r => r.teams?.some(t => t.id === item.id)).length

        function getLatestReleases(teamId, limit = 3) {
            const releases = AnimeReleases
                .filter(r => r.teams?.some(t => t.id === teamId))
                .slice(0, limit)

            return releases.map(rel => {
                const anime = AnimeTitles.find(a => rel.animeIds?.includes(a.id))
                const poster = anime?.poster || anime?.hikka_poster
                const title = rel.title || anime?.title || 'Без назви'
                return `
                    <div class="card team-release" data-release-id="${rel.id}" title="${title}">
                        <div class="image-container">
                            <div class="skeleton-loader"></div>
                            <img src="${poster}" alt="${title}"
                                 onload="this.parentElement.querySelector('.skeleton-loader').style.display='none'; this.style.opacity='1';"
                                 onerror="this.parentElement.querySelector('.skeleton-loader').style.display='none'; this.style.opacity='1';">
                        </div>
                        <span class="truncate">${title}</span>
                        <span class="truncate">Епізодів: ${rel.episodes}</span>
                    </div>
                `
            }).join('')
        }
        
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

        const headerHTML = `
            <div class="team-header">
                ${logo}
                <div class="team-head">
                    <h3 class='truncate'>${item?.name || 'Без назви'} <span class="team-status" style="${getStatusStyle(item?.status)}; font-size: 0.8em; margin-left: 8px;">${item?.status || 'Невідомо'}</span></h3>
                    <div>
                        <span class="team-type">${teamType}</span>
                        <span class="team-activity">${teamActivity}</span>
                    </div>
                </div>
            </div>
        `

        const latestHTML = `
            <div class="team-latest">
                <h4 class="team-section-title">Останні релізи</h4>
                <div class="team-releases-row">
                    ${getLatestReleases(item.id, 3) || '<span class="muted">Релізів поки немає</span>'}
                </div>
            </div>
        `

        const footerHTML = `
            <div class="team-footer">
                <span class="team-total">Всього релізів: ${totalReleases}</span>
                <button class="team-more-btn">Перейти до команди</button>
            </div>
        `

        card.innerHTML = currentView === 'grid'
            ? `
                ${logo}
                <div class='info'>
                    <h3 class='truncate'>${item?.name || 'Без назви'}</h3>
                    <p>Релізи: ${item?.anime_releases?.length || 0}</p>
                </div>
            ` : `
                ${headerHTML}
                ${latestHTML}
                ${footerHTML}
            `

        if (currentView === 'grid') {
            // У grid режимі - натискання на всю картку
            card.onclick = () => titleModal.showTeamDetails(item.id)
        } else {
            // У list режимі - тільки на окремі елементи
            
            // Обробники для карток релізів
            card.querySelectorAll('.team-release').forEach(el => {
                el.addEventListener('click', (e) => {
                    e.stopPropagation()
                    const id = el.getAttribute('data-release-id')
                    const release = AnimeReleases.find(r => r.id === id)
                    if (release) titleModal.renderReleaseDetail(release)
                })
            })

            // Обробник для кнопки "Перейти до команди"
            const moreBtn = card.querySelector('.team-more-btn')
            if (moreBtn) {
                moreBtn.addEventListener('click', (e) => {
                    e.stopPropagation()
                    titleModal.showTeamDetails(item.id)
                })
            }
        }

        return card
    }

    function createCard(item, type, currentView) {
        switch (type) {
            case 'Аніме': return createAnimeCard(item, currentView)
            case 'Релізи': return createReleaseCard(item, currentView)
            case 'Команди': return createTeamCard(item, currentView)
            default: throw new Error(`Невідомий тип: ${type}`)
        }
    }

    return { createCard }
}