import { router } from './router.js'

export function saveToCache(key, data) {
    localStorage.setItem(key, JSON.stringify(data))
}
export function getFromCache(key) {
    const data = localStorage.getItem(key)
    return data ? JSON.parse(data) : null
}
export function clearCache() {
    localStorage.removeItem('allAnimes')
    localStorage.removeItem('allReleases')
    localStorage.removeItem('allTeams')
    localStorage.removeItem('currentView')
}

// Оновлення навігації
export function updateNavigation(type, secondCrumbText = null) {
    firstCrumb.textContent = type
    let secondCrumb = nav.querySelector('#secondCrumb')
    
    secondCrumbText
        ? (secondCrumb = secondCrumb || (() => {
                secondCrumb = document.createElement('span')
                secondCrumb.id = 'secondCrumb'
                nav.appendChild(secondCrumb)
                return secondCrumb
            })(),
            secondCrumb.textContent = secondCrumbText)
        : secondCrumb && secondCrumb.remove()
}

export function addExternalLinkEvent() {
    const navLinks = document.querySelectorAll('a')
    navLinks.forEach(link => {
        if (link.hasAttribute('blank-navigate')) {
            link.addEventListener('click', (e) => {
                const href = e.currentTarget.getAttribute('href')
                if (e.button === 1 || e.ctrlKey || e.metaKey) {
                    window.open(href, '_blank')
                } else {
                    router.navigate(href.replace('#', ''))
                }
            })
            return
        } else if (link.hasAttribute('external-link')) {
            link.addEventListener('click', (e) => {
                const href = e.currentTarget.getAttribute('href')
                window.open(href, '_blank')
            })
        }
    })
}