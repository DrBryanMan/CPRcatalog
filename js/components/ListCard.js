import { AnimeTitles, AnimeReleases } from '../loadData.js'
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

    function getAgeRating(genre) {
        if (!genre || genre.trim() === '') return null
        const adultGenres = ['Біляхентай', 'Хентай', 'Яой', 'Юрі']
        return adultGenres.includes(genre.trim()) ? '18+' : '16+'
    }

    function analyzeReleases(animeId, releases) {
        if (!Array.isArray(AnimeReleases)) return { hasDub: false, hasSub: false, dubEpisodes: 0, subEpisodes: 0 }

        const animeReleases = AnimeReleases.filter(release => release.animeIds?.includes(animeId))

        let hasDub = false
        let hasSub = false
        let maxDubEpisodes = 0
        let maxSubEpisodes = 0

        animeReleases.forEach(release => {
            let localHasDub = false
            let localHasSub = false
            let dubEps = 0
            let subEps = 0

            if ('subinfo' in release) {
                localHasSub = true
                localHasDub = true
                subEps = release.episodessub || 0
                dubEps = release.episodes || 0
            } else if (release.title?.toLowerCase().includes('(суб)')) {
                localHasSub = true
                subEps = release.episodes || 0
            } else {
                localHasDub = true
                dubEps = release.episodes || 0
            }

            if (localHasDub) {
                hasDub = true
                maxDubEpisodes = Math.max(maxDubEpisodes, dubEps)
            }

            if (localHasSub) {
                hasSub = true
                maxSubEpisodes = Math.max(maxSubEpisodes, subEps)
            }
        })

        return {
            hasDub,
            hasSub,
            dubEpisodes: maxDubEpisodes,
            subEpisodes: maxSubEpisodes
        }
    }


    function createRatingBlock(rating, ageRating) {
        let html = ''
        if (rating) {
            // Визначаємо колір оцінки залежно від значення
            let ratingColor = ''
            if (rating >= 8.0) {
                ratingColor = 'style="color: #4CAF50;"' // зелений для високих оцінок
            } else if (rating >= 7.0) {
                ratingColor = 'style="color: #8BC34A;"' // світло-зелений
            } else if (rating >= 6.0) {
                ratingColor = 'style="color: #FFC107;"' // жовтий
            } else if (rating >= 5.0) {
                ratingColor = 'style="color: #FF9800;"' // помаранчевий
            } else {
                ratingColor = 'style="color: #F44336;"' // червоний для низьких оцінок
            }
            
            html += `<span class="rating" ${ratingColor}><i class="bi bi-star-fill"></i> ${rating}</span>`
        }
        if (ageRating) html += `<span class="age-rating">${ageRating}</span>`
        return html ? `<div class="ratings">${html}</div>` : ''
    }

    function createAudioSubBlock(info, item) {
        if (!info.hasDub && !info.hasSub) return ''
        let html = ''
        if (info.hasDub) html += `<span class="dub-info" title="Озвучення"><i class="bi bi-badge-vo"></i> ${info.dubEpisodes}</span>`
        if (info.hasSub) {
            if (info.hasDub) html += ' '
            html += `<span class="sub-info" title="Субтитри"><i class="bi bi-badge-cc"></i> ${info.subEpisodes}</span>`
        }
        const totalEpisodes = item?.episodes || item?.totalEpisodes || 0
        return `<div class="dub-sub-info">${html}${totalEpisodes ? `<span class="episode-count">${totalEpisodes}</span>` : ''}</div>`
    }

    function createAnimeCard(item, currentView) {
        const card = document.createElement('div')
        card.classList.add('card', 'anime-card')
        const ageRating = getAgeRating(item.genre)
        const releaseInfo = analyzeReleases(item.id)
        const cover = item.cover ? `<div class='anime-cover'><img src='${item.cover}'"></div>` : ''

        card.innerHTML = currentView === 'grid' ? `
            <div class='poster-box'>
                ${createRatingBlock(item?.scoreMAL, ageRating)}
                ${createImageWithSkeleton(item?.poster || '', item?.title || 'Без назви')}
                ${createAudioSubBlock(releaseInfo, item)}
                <div class='teams-logos'><span title="Кількість релізів"><i class="bi bi-collection-play"></i> ${item.releases.length}</span></div>
            </div>
            <div class='info'>
                <h3 class='truncate' title='${item?.title || 'Без назви'}'>${item?.title || 'Без назви'}</h3>
                <small>${item?.year || ''}${item?.year ? ' • ' : ''}${getAnimeClassificationInfo(item?.episodes, item?.duration, item?.format).displayText}</small>
            </div>
        ` : `
            ${cover}
            <div class='poster-box'>
                ${createImageWithSkeleton(item?.poster || '', item?.title || 'Без назви')}
            </div>
            <div class='info'>
                <h3 class='truncate' title='${item?.title || 'Без назви'}'>${item?.title || 'Без назви'}</h3>
                <small>${item?.year || ''}${item?.year ? ' • ' : ''}${item?.format || ''}</small>
                ${createRatingBlock(item?.scoreMAL, ageRating)}
                ${item?.episodes ? `<small class="episode-count">Серій: ${item?.episodes}</small>` : ''}
                ${createAudioSubBlock(releaseInfo)}
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

        let hasSub = false
        let hasDub = false
        let subEpisodes = 0
        let dubEpisodes = 0

        if ('Саби' in item) {
            hasSub = true
            hasDub = true
            subEpisodes = item.episodessub || ''
            dubEpisodes = item.episodes || ''
        } else if (item.title?.toLowerCase().includes('(суб)')) {
            hasSub = true
            subEpisodes = item.episodes || ''
        } else {
            hasDub = true
            dubEpisodes = item.episodes || ''
        }

        let audioSubHTML = ''
        if (hasDub) {
            audioSubHTML += `<span class="dub-info" title="Озвучення"><i class="bi bi-badge-vo"></i> ${dubEpisodes}</span>`
        }
        if (hasSub) {
            if (hasDub) audioSubHTML += ' '
            audioSubHTML += `<span class="sub-info" title="Субтитри"><i class="bi bi-badge-cc"></i> ${subEpisodes}</span>`
        }

        card.innerHTML = currentView === 'grid' ? `
            <div class='poster-box'>
                ${createImageWithSkeleton(animeInfo?.poster || '', item?.title || 'Без назви')}
                <div class="dub-sub-info">${audioSubHTML}<span class="episode-count">${animeInfo?.episodes || '??'}</span></div>
                <div class='teams-logos'>${teams}</div>
            </div>
            <div class='info'>
                <h3 class='truncate'>${item?.title || 'Без назви'}</h3>
            </div>
        ` : `
            ${cover}
            <div class='poster-box'>
                ${createImageWithSkeleton(animeInfo?.poster || '', item?.title || 'Без назви')}
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
                const poster = anime?.poster || ''
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
            card.onclick = () => titleModal.renderTeamReleases(item.id)
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
                    titleModal.renderTeamReleases(item.id)
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