export function initSearch(animesData, releasesData, teamsData, renderAnimeDetail, renderReleaseDetail) {
    searchModalButton.onclick = () => searchModal.classList.add('is-visible')
    window.onclick = (event) => (event.target == searchModal || event.target == closeModal) && searchModal.classList.remove('is-visible')

    const searchInput = document.getElementById('searchInput')
    const searchResults = document.getElementById('searchResults')
    const searchTypeInputs = document.querySelectorAll('input[name="searchType"]')

    let searchTimeout

    searchInput.addEventListener('input', () => {
        clearTimeout(searchTimeout)
        searchTimeout = setTimeout(performSearch, 300)
    })

    function searchAnime(query) {
        return animesData.filter(anime => 
            anime.title.toLowerCase().includes(query) || 
            anime.romaji.toLowerCase().includes(query)
        ).slice(0, 5)
    }

    function searchReleases(query) {
        return releasesData.filter(release => 
            release.title.toLowerCase().includes(query)
        ).slice(0, 5)
    }

    function searchTeams(query) {
        return teamsData.filter(team => 
            team.name.toLowerCase().includes(query)
        ).slice(0, 5)
    }

    function displayResults(results, type) {
        searchResults.innerHTML = ''
        results.forEach(result => {
            const div = document.createElement('div')
            div.classList.add('search-result')
            
            switch(type) {
                case 'anime':
                    div.innerHTML = `
                        <img src="${result.poster}" alt="${result.title}">
                        <div>
                            <div><label class="truncate">${result.title}</label></div>
                            <p>${result.year}</p>
                        </div>
                    `
                    console.log(result)
                    div.onclick = () => {
                        renderAnimeDetail(result)
                        searchModal.style.display = 'none'
                    }
                    break
                case 'releases':
                    div.innerHTML = `
                        <img src="${result.poster}"">
                        <div>
                            <div><label class="truncate">${result.title}</label></div>
                            <p>Епізоди: ${result.episodes}</p>
                        </div>
                    `
                    div.onclick = () => {
                        renderReleaseDetail(result)
                        searchModal.style.display = 'none'
                    }
                    break
                case 'teams':
                    div.innerHTML = `
                        <img src="${result.logo}"">
                        <div>
                            <strong>${result.name}</strong>
                            <p>Релізів: ${result.releases.length}</p>
                        </div>
                    `
                    // Додайте відповідну функцію для відображення деталей команди
                    break
            }
            
            searchResults.appendChild(div)
        })
    }

    function performSearch() {
        const query = searchInput.value.toLowerCase()
        const searchType = document.querySelector('input[name="searchType"]:checked').value
        
        if (query.length < 3) {
            searchResults.innerHTML = ''
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

        displayResults(results, searchType)
    }
}