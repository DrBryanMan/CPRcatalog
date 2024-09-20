export function initSearch(animesData, releasesData, teamsData, renderAnimeDetail, renderReleaseDetail) {

    // Відкриття модального вікна
    // const searchButton = document.getElementById('searchButton')
    // const searchModal = document.getElementById('searchModal')
    const closeBtn = searchModal.querySelector('.close')

    searchButton.onclick = () => {
        searchModal.style.display = 'block'
    }

    closeBtn.onclick = () => {
        searchModal.style.display = 'none'
    }

    window.onclick = (event) => {
        if (event.target == searchModal) {
            searchModal.style.display = 'none'
        }
    }

    // Функціонал пошуку
    const searchInput = document.getElementById('searchInput')
    const searchResults = document.getElementById('searchResults')
    const searchTypeInputs = document.querySelectorAll('input[name="searchType"]')

    let searchTimeout

    searchInput.addEventListener('input', () => {
        clearTimeout(searchTimeout)
        searchTimeout = setTimeout(performSearch, 300)
    })

    function performSearch() {
        const query = searchInput.value.toLowerCase()
        const searchType = document.querySelector('input[name="searchType"]:checked').value
        
        if (query.length < 2) {
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

    function searchAnime(query) {
        return animesData.filter(anime => 
            anime.title.toLowerCase().includes(query) || 
            anime.romaji.toLowerCase().includes(query)
        ).slice(0, 5)
    }

    function searchReleases(query) {
        return releasesData.filter(release => 
            release.properties.Name.title[0].plain_text.toLowerCase().includes(query)
        ).slice(0, 5)
    }

    function searchTeams(query) {
        return teamsData.filter(team => 
            team.properties['Назва команди'].title[0].plain_text.toLowerCase().includes(query)
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
                        <div>
                            <div><label class="truncate">${result.properties.Name.title[0].plain_text}</label></div>
                            <p>Епізоди: ${result.properties.Кількість.rich_text[0]?.plain_text || 'Невідомо'}</p>
                        </div>
                    `
                    div.onclick = () => {
                        renderReleaseDetail(result)
                        searchModal.style.display = 'none'
                    }
                    break
                case 'teams':
                    div.innerHTML = `
                        <div>
                            <div><label class="truncate">${result.title}</label></div>
                            <strong>${result.properties['Назва команди'].title[0].plain_text}</strong>
                        </div>
                    `
                    // Додайте відповідну функцію для відображення деталей команди
                    break
            }
            
            searchResults.appendChild(div)
        })
    }
}