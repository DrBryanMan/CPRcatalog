import { allAnimes, allTeams, allReleases } from './loadData.js'
import * as Components from './renderComponents.js'

export function initSearch() {
    searchModal.onclick = (e) => {
        const {left, right, top, bottom} = searchModal.getBoundingClientRect();
        (!((left <= e.clientX && e.clientX <= right && top <= e.clientY && e.clientY <= bottom)) || 
           e.target === searchClose) && searchModal.close();
    }

    const searchInput = document.getElementById('searchInput')
    const searchResults = document.getElementById('searchResults')
    const searchTypeInputs = document.querySelectorAll('input[name="searchType"]')

    let searchTimeout

    searchInput.addEventListener('input', () => {
        clearTimeout(searchTimeout)
        searchTimeout = setTimeout(performSearch, 300)
    })
    
    searchTypeInputs.forEach(input => input.addEventListener('change', performSearch))

    function searchAnime(query) {
        return allAnimes.filter(anime => 
            anime.title?.toLowerCase().includes(query) || 
            anime.romaji?.toLowerCase().includes(query)
        ).slice(0, 20)
    }

    function searchReleases(query) {
        return allReleases.filter(release => {
            const anime = allAnimes.find(anime => release.animeIds.includes(anime.id))
            return release.title.toLowerCase().includes(query) ||
                anime?.title?.toLowerCase().includes(query) || 
                anime?.romaji?.toLowerCase().includes(query)
        }).slice(0, 20)
    }

    function searchTeams(query) {
        return allTeams.filter(team => 
            team.name.toLowerCase().includes(query)
        ).slice(0, 20)
    }

    function displayResults(results, type) {
        searchResults.innerHTML = ''
        results.forEach(result => {
            const div = document.createElement('div')
            div.classList.add('search-result')
            
            switch(type) {
                case 'anime':
                    div.innerHTML = `
                        <img src="${result.poster}">
                        <div>
                            <div><label class="truncate" title="${result.title}">${result.title}</label></div>
                            <p>${result.year}</p>
                        </div>
                    `
                    div.onclick = () => (Components.renderAnimeDetail(result), searchModal.close())
                    break
                case 'releases':
                    const anime = allAnimes.find(anime => result.animeIds.includes(anime.id))
                    div.innerHTML = `
                        <img src="${anime?.poster}">
                        <div>
                            <div><label class="truncate" title="${result.title}">${result.title}</label></div>
                            <p>Епізоди: ${result.episodes}</p>
                        </div>
                    `
                    div.onclick = () => (Components.renderReleaseDetail(result), searchModal.close())
                    break
                case 'teams':
                    div.innerHTML = `
                        <img src="${result.logo}"">
                        <div>
                            <strong>${result.name}</strong>
                            <p>Релізів: ${result.anime_releases.length}</p>
                        </div>
                    `
                    div.onclick = () => (Components.renderTeamDetail(result), searchModal.close())
                    break
            }
            
            searchResults.appendChild(div)
        })
    }

    function performSearch() {
        const query = searchInput.value.toLowerCase()
        const searchType = document.querySelector('input[name="searchType"]:checked').value
        
        if (query.length < 3) {
            searchResults.innerHTML = '<p>Введіть більше двох символів.</p>'
            return
        }

        let results
        switch(searchType) {
            case 'anime':
                results = searchAnime(query)
                break
            case 'releases':
                results = searchReleases(query)
                break
            case 'teams':
                results = searchTeams(query)
                break
        }
        if (!results || results.length === 0) {
            searchResults.innerHTML = '<p>За вашим запитом нічого не знайдено :(</p>'
            return
        }

        displayResults(results, searchType)
    }
}