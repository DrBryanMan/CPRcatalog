const POSTERS_REPOSITORY_URL = 'https://raw.githubusercontent.com/DrBryanMan/UAPosters/refs/heads/main/'

export function getPosterList(anime, postersData = []) {
    if (!anime?.hikka_url || !Array.isArray(postersData)) return []

    return postersData.find(item => item.hikka_url === anime.hikka_url)?.posters || []
}

export function getOriginalPosterUrl(anime) {
    return anime?.hikka_poster || ''
}

export function getPosterUrl(poster) {
    if (!poster) return ''
    if (typeof poster === 'string') return poster
    if (!poster.url) return ''

    return poster.url.startsWith('http')
        ? poster.url
        : `${POSTERS_REPOSITORY_URL}${poster.url}`
}

export function getAnimePosterUrl(anime, postersData = []) {
    const posterList = getPosterList(anime, postersData)
    const customPosterUrl = getPosterUrl(posterList[0])

    return customPosterUrl || anime?.poster || getOriginalPosterUrl(anime)
}

export function applyPosterFallback(image, fallbackUrl) {
    if (!image || !fallbackUrl) return

    const currentSrc = image.getAttribute('src') || ''
    if (!currentSrc || currentSrc === fallbackUrl) return

    image.onerror = () => {
        if (image.dataset.fallbackPosterUsed === 'true') return

        image.dataset.fallbackPosterUsed = 'true'
        image.src = fallbackUrl
    }
}
