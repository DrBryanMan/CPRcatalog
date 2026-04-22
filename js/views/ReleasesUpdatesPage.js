import { AnimeReleases } from '../loadData.js'
import * as Functions from '../functions.js'
import { titleModal } from './TitleModal.js'

const SEASON_DEFINITIONS = [
    { key: 'winter', label: 'Зима' },
    { key: 'spring', label: 'Весна' },
    { key: 'summer', label: 'Літо' },
    { key: 'autumn', label: 'Осінь' },
]

const ANIME_SEASON_MAP = {
    winter: 'winter',
    spring: 'spring',
    summer: 'summer',
    fall: 'autumn',
    autumn: 'autumn',
}

const MONTHS_GENITIVE = [
    'січня',
    'лютого',
    'березня',
    'квітня',
    'травня',
    'червня',
    'липня',
    'серпня',
    'вересня',
    'жовтня',
    'листопада',
    'грудня',
]

const MONTHS_NOMINATIVE = [
    'Січень',
    'Лютий',
    'Березень',
    'Квітень',
    'Травень',
    'Червень',
    'Липень',
    'Серпень',
    'Вересень',
    'Жовтень',
    'Листопад',
    'Грудень',
]

const EVENT_PRIORITY = {
    instant: 0,
    end: 1,
    start: 2,
}

export function renderReleasesUpdatesPage() {
    Functions.updateNavigation('Оновлення')

    const today = new Date()
    const timelineEvents = buildTimelineEvents(AnimeReleases)
    const seasonOptions = getSeasonOptions(today)
    const state = createInitialState(today, seasonOptions)

    app.innerHTML = ''

    const page = document.createElement('div')
    page.classList.add('release-updates-page')

    const statsPanel = document.createElement('section')
    statsPanel.classList.add('release-stats-panel')

    const timelineSection = document.createElement('section')
    timelineSection.classList.add('release-updates-timeline')

    function renderPage() {
        renderStatsPanel(statsPanel, state, timelineEvents, seasonOptions, today, renderPage)
        renderTimelineSection(timelineSection, state, timelineEvents, seasonOptions, today)
    }

    renderPage()

    page.appendChild(statsPanel)
    page.appendChild(timelineSection)
    app.appendChild(page)

    return () => {}
}

function createInitialState(today, seasonOptions) {
    const activeSeason = seasonOptions.find(option => option.isCurrent && !option.isFuture)
        || seasonOptions.find(option => !option.isFuture)
        || seasonOptions[0]

    return {
        activeMode: 'season',
        seasonOptionId: activeSeason?.id || '',
        monthValue: today.getMonth() + 1,
        monthStatus: 'start',
        yearValue: today.getFullYear(),
        yearStatus: 'start',
    }
}

function renderStatsPanel(container, state, events, seasonOptions, today, rerender) {
    const currentYear = today.getFullYear()
    const activeStats = getActiveStats(state, events, seasonOptions, currentYear)

    container.innerHTML = `
        <div class="release-stats-panel__header">
            <div>
                <p class="release-stats-panel__eyebrow">Фільтри та статистика</p>
                <h2>Оновлення релізів</h2>
            </div>
            <div class="release-stats-panel__active-label">${activeStats.description}</div>
        </div>
        <div class="release-stats-panel__controls"></div>
        <div class="release-stats-panel__summary"></div>
    `

    const controls = container.querySelector('.release-stats-panel__controls')
    controls.appendChild(createSeasonControl({
        state,
        seasonOptions,
        currentYear,
        onSelect: (seasonId) => {
            state.activeMode = 'season'
            state.seasonOptionId = seasonId
            rerender()
        },
    }))
    controls.appendChild(createMonthControl({
        state,
        currentYear,
        currentMonth: today.getMonth() + 1,
        onMonthChange: (monthValue) => {
            state.activeMode = 'month'
            state.monthValue = monthValue
            rerender()
        },
        onStatusChange: (status) => {
            state.activeMode = 'month'
            state.monthStatus = status
            rerender()
        },
    }))
    controls.appendChild(createYearControl({
        state,
        currentYear,
        onStatusChange: (status) => {
            state.activeMode = 'year'
            state.yearStatus = status
            rerender()
        },
    }))

    const summary = container.querySelector('.release-stats-panel__summary')
    summary.innerHTML = `
        <div class="release-stats-grid ${activeStats.cards.length > 2 ? 'release-stats-grid--four' : 'release-stats-grid--two'}">
            ${activeStats.cards.map(card => createStatCard(card.label, card.value, card.icon)).join('')}
        </div>
    `
}

function createSeasonControl({ state, seasonOptions, currentYear, onSelect }) {
    const section = document.createElement('div')
    section.classList.add('release-stats-control')
    state.activeMode === 'season' && section.classList.add('release-stats-control--active')

    section.innerHTML = `
        <div class="release-stats-control__header">
            <p class="release-stats-control__eyebrow">Сезонна статистика</p>
        </div>
        <div class="release-stats-control__actions release-stats-control__actions--buttons"></div>
    `

    const actions = section.querySelector('.release-stats-control__actions')
    seasonOptions.forEach(option => {
        const button = document.createElement('button')
        button.type = 'button'
        button.classList.add('release-stats-pill')
        option.id === state.seasonOptionId && state.activeMode === 'season' && button.classList.add('is-active')
        option.isFuture && button.classList.add('is-disabled')
        button.disabled = option.isFuture
        button.textContent = option.buttonLabel
        button.onclick = () => onSelect(option.id)
        actions.appendChild(button)
    })

    return section
}

function createStatsSelect({ label, value, options, onChange, parseValue = rawValue => rawValue, variant = 'default', icon = 'bi bi-calendar3' }) {
    const selectWrap = document.createElement('div')
    selectWrap.classList.add('release-stats-select')
    variant === 'icon' && selectWrap.classList.add('release-stats-select--icon')

    if (variant !== 'icon') {
        const title = document.createElement('span')
        title.textContent = label
        selectWrap.appendChild(title)
    }

    const select = document.createElement('select')
    select.classList.add('release-stats-select__control')
    select.setAttribute('aria-label', label)

    const button = document.createElement('button')
    button.type = 'button'
    button.classList.add('release-stats-select__button')

    if (variant === 'icon') {
        const iconElement = document.createElement('i')
        iconElement.className = icon
        iconElement.setAttribute('aria-hidden', 'true')
        button.appendChild(iconElement)
    }

    const selectedContent = document.createElement('selectedcontent')
    selectedContent.classList.add('release-stats-select__selectedcontent')
    button.appendChild(selectedContent)
    select.appendChild(button)

    options.forEach(optionData => {
        const option = document.createElement('option')
        option.value = String(optionData.value)
        option.textContent = optionData.label
        option.disabled = Boolean(optionData.disabled)
        option.selected = String(optionData.value) === String(value)
        select.appendChild(option)
    })

    select.onchange = () => onChange(parseValue(select.value))
    selectWrap.appendChild(select)

    return selectWrap
}

function createMonthControl({ state, currentYear, currentMonth, onMonthChange, onStatusChange }) {
    const section = document.createElement('div')
    section.classList.add('release-stats-control')
    state.activeMode === 'month' && section.classList.add('release-stats-control--active')

    section.innerHTML = `
        <div class="release-stats-control__header">
            <p class="release-stats-control__eyebrow">Місячна статистика</p>
            <span class="release-stats-control__meta">${formatStatsMonth(state.monthValue)}</span>
        </div>
        <div class="release-stats-control__actions release-stats-control__actions--split"></div>
    `

    const actions = section.querySelector('.release-stats-control__actions')
    const toggle = document.createElement('div')
    toggle.classList.add('release-stats-toggle')
    toggle.appendChild(createStatusToggleButton('Все', 'all', state.monthStatus, state.activeMode === 'month', () => onStatusChange('all')))
    toggle.appendChild(createStatusToggleButton('Почато', 'start', state.monthStatus, state.activeMode === 'month', () => onStatusChange('start')))
    toggle.appendChild(createStatusToggleButton('Закінчено', 'end', state.monthStatus, state.activeMode === 'month', () => onStatusChange('end')))
    actions.appendChild(toggle)

    actions.appendChild(createStatsSelect({
        label: 'Місяць',
        value: state.monthValue,
        options: MONTHS_NOMINATIVE.map((monthLabel, index) => ({
            value: index + 1,
            label: monthLabel,
            disabled: index + 1 > currentMonth,
        })),
        onChange: onMonthChange,
        parseValue: Number,
        variant: 'icon',
    }))

    return section
}

function createYearControl({ state, currentYear, onStatusChange }) {
    const section = document.createElement('div')
    section.classList.add('release-stats-control')
    state.activeMode === 'year' && section.classList.add('release-stats-control--active')

    section.innerHTML = `
        <div class="release-stats-control__header">
            <p class="release-stats-control__eyebrow">Річна статистика</p>
        </div>
        <div class="release-stats-control__actions"></div>
    `

    const actions = section.querySelector('.release-stats-control__actions')
    const toggle = document.createElement('div')
    toggle.classList.add('release-stats-toggle')
    toggle.appendChild(createStatusToggleButton('Все', 'all', state.yearStatus, state.activeMode === 'year', () => onStatusChange('all')))
    toggle.appendChild(createStatusToggleButton('Почато', 'start', state.yearStatus, state.activeMode === 'year', () => onStatusChange('start')))
    toggle.appendChild(createStatusToggleButton('Закінчено', 'end', state.yearStatus, state.activeMode === 'year', () => onStatusChange('end')))
    actions.appendChild(toggle)

    return section
}

function createStatusToggleButton(label, value, activeValue, isSectionActive, onClick) {
    const button = document.createElement('button')
    button.type = 'button'
    button.classList.add('release-stats-pill')
    value === activeValue && isSectionActive && button.classList.add('is-active')
    button.textContent = label
    button.onclick = onClick
    return button
}

function formatStatsMonth(monthValue) {
    return MONTHS_NOMINATIVE[monthValue - 1]
}

function createPeriodStatsCards(events, status) {
    if (status === 'all') {
        const startedStats = getPeriodStats(filterEventsByStatus(events, 'start'))
        const finishedStats = getPeriodStats(filterEventsByStatus(events, 'end'))

        return [
            { label: 'Почато аніме', value: startedStats.animeCount, icon: 'bi bi-film' },
            { label: 'Почато релізів', value: startedStats.releaseCount, icon: 'bi bi-collection-play' },
            { label: 'Завершено аніме', value: finishedStats.animeCount, icon: 'bi bi-check2-square' },
            { label: 'Завершено релізів', value: finishedStats.releaseCount, icon: 'bi bi-flag' },
        ]
    }

    const stats = getPeriodStats(events)

    return [
        {
            label: status === 'start' ? 'Почато аніме' : 'Завершено аніме',
            value: stats.animeCount,
            icon: status === 'start' ? 'bi bi-film' : 'bi bi-check2-square',
        },
        {
            label: status === 'start' ? 'Почато релізів' : 'Завершено релізів',
            value: stats.releaseCount,
            icon: status === 'start' ? 'bi bi-collection-play' : 'bi bi-flag',
        },
    ]
}

function getStatusDescriptionLabel(status) {
    if (status === 'all') return 'Усі події'
    return status === 'start' ? 'Почато' : 'Закінчено'
}

function getActiveStats(state, events, seasonOptions, currentYear) {
    if (state.activeMode === 'month') {
        const filteredEvents = filterEventsByMonth(events, currentYear, state.monthValue, state.monthStatus)

        return {
            description: `Активний фільтр: ${MONTHS_NOMINATIVE[state.monthValue - 1]} ${currentYear} · ${getStatusDescriptionLabel(state.monthStatus)}.`,
            cards: createPeriodStatsCards(filteredEvents, state.monthStatus),
        }
    }

    if (state.activeMode === 'year') {
        const filteredEvents = filterEventsByYear(events, state.yearValue, state.yearStatus)

        return {
            description: `Активний фільтр: ${state.yearValue} рік · ${getStatusDescriptionLabel(state.yearStatus)}.`,
            cards: createPeriodStatsCards(filteredEvents, state.yearStatus),
        }
    }

    const option = getSeasonOptionById(seasonOptions, state.seasonOptionId) || seasonOptions[0]
    const filteredEvents = filterEventsByAnimeSeason(events, option)
    const stats = getSeasonStats(filteredEvents)

    return {
        description: `Активний фільтр: аніме сезону ${option.label} ${option.year}.`,
        cards: [
            { label: 'Почато аніме', value: stats.startedAnimeCount, icon: 'bi bi-film' },
            { label: 'Почато релізів', value: stats.startedReleaseCount, icon: 'bi bi-collection-play' },
            { label: 'Завершено аніме', value: stats.finishedAnimeCount, icon: 'bi bi-check2-square' },
            { label: 'Завершено релізів', value: stats.finishedReleaseCount, icon: 'bi bi-flag' },
        ],
    }
}

function renderTimelineSection(container, state, events, seasonOptions, today) {
    const filteredEvents = getTimelineEventsForState(state, events, seasonOptions, today)
    const dayGroups = groupTimelineByDayAndAnime(filteredEvents)
    const filterLabel = getTimelineFilterLabel(state, seasonOptions, today)

    container.innerHTML = `
        <div class="release-updates-timeline__header">
            <div>
                <p class="release-updates-timeline__eyebrow">Уся історія</p>
                <h2>Календар подій</h2>
            </div>
            <div class="release-updates-timeline__description">${filterLabel}</div>
        </div>
    `

    if (dayGroups.length === 0) {
        const empty = document.createElement('div')
        empty.classList.add('release-updates-empty')
        empty.innerHTML = `
            <i class="bi bi-calendar-x"></i>
            <div>
                <h3>За цим фільтром подій немає</h3>
                <p>Спробуйте інший сезон, місяць або рік.</p>
            </div>
        `
        container.appendChild(empty)
        return
    }

    dayGroups.forEach(group => {
        container.appendChild(createDaySection(group))
    })
}

function createDaySection(group) {
    const daySection = document.createElement('section')
    daySection.classList.add('release-updates-day')

    const header = document.createElement('div')
    header.classList.add('release-updates-day__header')
    header.innerHTML = `
        <h3>${formatStructuredDate(group.dateKey)}</h3>
        <span class="release-updates-day__count">${group.animes.length} ${pluralize(group.animes.length, ['аніме', 'аніме', 'аніме'])}</span>
    `

    const cards = document.createElement('div')
    cards.classList.add('release-updates-day__cards')

    group.animes.forEach(animeGroup => {
        cards.appendChild(createAnimeEventCard(animeGroup))
    })

    daySection.appendChild(header)
    daySection.appendChild(cards)
    return daySection
}

function createAnimeEventCard(animeGroup) {
    const card = document.createElement('article')
    card.classList.add('release-update-anime-card')

    const poster = animeGroup.anime?.poster || animeGroup.anime?.hikka_poster || ''

    card.innerHTML = `
        <div class="release-update-anime-card__main">
            <button type="button" class="release-update-anime-card__poster">
                ${poster ? `<img src="${poster}" alt="${escapeHtml(animeGroup.displayTitle)}">` : '<span class="release-update-anime-card__poster-fallback"><i class="bi bi-image"></i></span>'}
            </button>
            <div class="release-update-anime-card__body">
                <div class="release-update-anime-card__top">
                    <div>
                        <button type="button" class="release-update-anime-card__title">${escapeHtml(animeGroup.displayTitle)}</button>
                        <p class="release-update-anime-card__meta">
                            ${animeGroup.anime?.format ? `<span><i class="bi bi-tv"></i>${escapeHtml(animeGroup.anime.format)}</span>` : ''}
                            ${animeGroup.anime?.year ? `<span><i class="bi bi-calendar-event"></i>${escapeHtml(String(animeGroup.anime.year))}</span>` : ''}
                            ${animeGroup.anime?.season ? `<span><i class="bi bi-cloud-sun"></i>${getSeasonLabelFromAnime(animeGroup.anime.season)}</span>` : ''}
                            ${animeGroup.episodesLabel ? `<span><i class="bi bi-list-ol"></i>${escapeHtml(animeGroup.episodesLabel)} еп.</span>` : ''}
                        </p>
                    </div>
                </div>
                <div class="release-update-anime-card__rows"></div>
            </div>
        </div>
    `

    const posterButton = card.querySelector('.release-update-anime-card__poster')
    const titleButton = card.querySelector('.release-update-anime-card__title')
    const rowsContainer = card.querySelector('.release-update-anime-card__rows')

    const openAnime = () => {
        if (animeGroup.anime?.id) {
            titleModal.open(animeGroup.anime.id)
        }
    }

    posterButton.onclick = openAnime
    titleButton.onclick = openAnime

    animeGroup.events.forEach(event => {
        rowsContainer.appendChild(createReleaseEventRow(event))
    })

    return card
}

function createReleaseEventRow(event) {
    const row = document.createElement('button')
    row.type = 'button'
    row.classList.add('release-update-row', `release-update-row--${event.kind}`)

    const teamsHTML = event.teams.length
        ? event.teams.map(team => `
            <span class="release-update-row__team" title="${escapeHtml(team.name || '')}">
                ${team.logo ? `<img src="${team.logo}" alt="${escapeHtml(team.name || '')}">` : ''}
                <span>${escapeHtml(team.name || 'Без назви')}</span>
            </span>
        `).join('')
        : '<span class="release-update-row__team release-update-row__team--muted">Команду не вказано</span>'

    row.innerHTML = `
        <span class="release-update-row__badge">${getEventLabel(event.kind)}</span>
        <div class="release-update-row__body">
            <div class="release-update-row__info">
                ${teamsHTML}
                <div class="release-update-row__meta">
                    ${event.release.episodes ? `<span><i class="bi bi-list-ol"></i>${escapeHtml(event.release.episodes)} еп.</span>` : ''}
                </div>
            </div>
        </div>
    `

    row.onclick = () => titleModal.renderReleaseDetail(event.release)
    return row
}

function createStatCard(label, value, iconClass) {
    return `
        <article class="release-season-stat-card">
            <div class="release-season-stat-card__icon">
                <i class="${iconClass}"></i>
            </div>
            <div>
                <p>${label}</p>
                <strong>${value}</strong>
            </div>
        </article>
    `
}

function getTimelineEventsForState(state, events, seasonOptions, today) {
    if (state.activeMode === 'month') {
        return filterEventsByMonth(events, today.getFullYear(), state.monthValue, state.monthStatus)
    }

    if (state.activeMode === 'year') {
        return filterEventsByYear(events, state.yearValue, state.yearStatus)
    }

    const option = getSeasonOptionById(seasonOptions, state.seasonOptionId) || seasonOptions[0]
    return filterEventsByAnimeSeason(events, option)
}

function getTimelineFilterLabel(state, seasonOptions, today) {
    if (state.activeMode === 'month') {
        return `Показано події за ${MONTHS_NOMINATIVE[state.monthValue - 1]} ${today.getFullYear()} · ${getStatusDescriptionLabel(state.monthStatus)}.`
    }

    if (state.activeMode === 'year') {
        return `Показано події за ${state.yearValue} рік · ${getStatusDescriptionLabel(state.yearStatus)}.`
    }

    const option = getSeasonOptionById(seasonOptions, state.seasonOptionId) || seasonOptions[0]
    return `Показано всі події для аніме сезону ${option.label} ${option.year}.`
}

function filterEventsByAnimeSeason(events, seasonOption) {
    return events.filter(event => matchesAnimeSeason(event.anime, seasonOption))
}

function filterEventsByMonth(events, yearValue, monthValue, status) {
    return filterEventsByStatus(events, status).filter(event => {
        const date = parseStructuredDate(event.dateKey)
        return date && date.year === yearValue && date.month === monthValue
    })
}

function filterEventsByYear(events, yearValue, status) {
    return filterEventsByStatus(events, status).filter(event => {
        const date = parseStructuredDate(event.dateKey)
        return date && date.year === yearValue
    })
}

function filterEventsByStatus(events, status) {
    if (status === 'all') return events

    return events.filter(event => {
        if (status === 'start') return event.kind === 'start' || event.kind === 'instant'
        return event.kind === 'end' || event.kind === 'instant'
    })
}

function matchesAnimeSeason(anime, seasonOption) {
    if (!anime) return false

    const normalizedSeason = normalizeAnimeSeason(anime.season)
    const animeYear = Number(anime.year)

    return normalizedSeason === seasonOption.key && animeYear === seasonOption.year
}

function getSeasonStats(events) {
    const startedAnime = new Set()
    const finishedAnime = new Set()
    let startedReleaseCount = 0
    let finishedReleaseCount = 0

    events.forEach(event => {
        if (event.kind === 'start' || event.kind === 'instant') {
            startedReleaseCount += 1
            collectAnimeIds(event).forEach(id => startedAnime.add(id))
        }

        if (event.kind === 'end' || event.kind === 'instant') {
            finishedReleaseCount += 1
            collectAnimeIds(event).forEach(id => finishedAnime.add(id))
        }
    })

    return {
        startedAnimeCount: startedAnime.size,
        startedReleaseCount,
        finishedAnimeCount: finishedAnime.size,
        finishedReleaseCount,
    }
}

function getPeriodStats(events) {
    const animeIds = new Set()
    const releaseIds = new Set()

    events.forEach(event => {
        releaseIds.add(event.release.id)
        collectAnimeIds(event).forEach(id => animeIds.add(id))
    })

    return {
        animeCount: animeIds.size,
        releaseCount: releaseIds.size,
    }
}

function buildTimelineEvents(releases) {
    return releases
        .flatMap(release => {
            const anime = release.animeData || null
            const startDate = parseStructuredDate(release.start_date)
            const endDate = parseStructuredDate(release.end_date)
            const episodesTotal = getEpisodeCount(anime?.episodes)
            const isInstant = (startDate && endDate && startDate.key === endDate.key) || (episodesTotal === 1 && startDate)

            if (isInstant && startDate) {
                return [createEvent('instant', startDate.key, release, anime)]
            }

            const items = []

            if (startDate) {
                items.push(createEvent('start', startDate.key, release, anime))
            }

            if (endDate) {
                items.push(createEvent('end', endDate.key, release, anime))
            }

            return items
        })
        .sort((a, b) => {
            if (a.dateKey !== b.dateKey) {
                return b.dateKey.localeCompare(a.dateKey)
            }

            if (EVENT_PRIORITY[a.kind] !== EVENT_PRIORITY[b.kind]) {
                return EVENT_PRIORITY[a.kind] - EVENT_PRIORITY[b.kind]
            }

            return a.displayTitle.localeCompare(b.displayTitle, 'uk')
        })
}

function createEvent(kind, dateKey, release, anime) {
    return {
        id: `${release.id}:${kind}:${dateKey}`,
        kind,
        dateKey,
        release,
        anime,
        displayTitle: anime?.title || release.title || 'Без назви',
        teams: Array.isArray(release.teams) ? release.teams : [],
    }
}

function groupTimelineByDayAndAnime(events) {
    const daysMap = new Map()

    events.forEach(event => {
        if (!daysMap.has(event.dateKey)) {
            daysMap.set(event.dateKey, {
                dateKey: event.dateKey,
                animeMap: new Map(),
            })
        }

        const dayGroup = daysMap.get(event.dateKey)
        const animeKey = event.anime?.id || event.release.animeIds?.[0] || `release:${event.release.id}`

        if (!dayGroup.animeMap.has(animeKey)) {
            dayGroup.animeMap.set(animeKey, {
                animeKey,
                anime: event.anime,
                displayTitle: event.displayTitle,
                episodesLabel: event.anime?.episodes ? String(event.anime.episodes) : '',
                events: [],
            })
        }

        dayGroup.animeMap.get(animeKey).events.push(event)
    })

    return Array.from(daysMap.values())
        .sort((a, b) => b.dateKey.localeCompare(a.dateKey))
        .map(dayGroup => ({
            dateKey: dayGroup.dateKey,
            animes: Array.from(dayGroup.animeMap.values())
                .map(animeGroup => ({
                    ...animeGroup,
                    events: animeGroup.events.sort((a, b) => {
                        if (EVENT_PRIORITY[a.kind] !== EVENT_PRIORITY[b.kind]) {
                            return EVENT_PRIORITY[a.kind] - EVENT_PRIORITY[b.kind]
                        }

                        return (a.release.title || '').localeCompare(b.release.title || '', 'uk')
                    }),
                }))
                .sort((a, b) => a.displayTitle.localeCompare(b.displayTitle, 'uk')),
        }))
}

function getSeasonOptions(today) {
    const currentYear = today.getFullYear()
    const currentSeasonKey = getSeasonKeyByMonth(today.getMonth() + 1)
    const currentSeasonIndex = SEASON_DEFINITIONS.findIndex(season => season.key === currentSeasonKey)
    const options = SEASON_DEFINITIONS.map((season, index) => createSeasonOption(season, currentYear, false, index > currentSeasonIndex))

    if (today.getMonth() <= 2) {
        const previousAutumn = createSeasonOption(
            SEASON_DEFINITIONS.find(season => season.key === 'autumn'),
            currentYear - 1,
            true,
            false
        )
        options.unshift(previousAutumn)
    }

    return options.map(option => ({
        ...option,
        isCurrent: option.year === currentYear && option.key === currentSeasonKey,
    }))
}

function createSeasonOption(season, year, isPreviousYearExtra = false, isFuture = false) {
    return {
        id: `${season.key}-${year}`,
        key: season.key,
        year,
        label: season.label,
        title: `${season.label} ${year}`,
        buttonLabel: isPreviousYearExtra ? `${season.label} ${year}` : season.label,
        isPreviousYearExtra,
        isFuture,
    }
}

function getSeasonOptionById(seasonOptions, seasonId) {
    return seasonOptions.find(option => option.id === seasonId)
}

function getDefaultSeasonKey(seasonOptions, today) {
    const currentYear = today.getFullYear()
    const currentSeasonKey = getSeasonKeyByMonth(today.getMonth() + 1)
    const currentSeason = seasonOptions.find(option => option.year === currentYear && option.key === currentSeasonKey)

    return currentSeason?.id || seasonOptions.find(option => !option.isFuture)?.id || seasonOptions[0]?.id || ''
}

function collectAnimeIds(event) {
    if (Array.isArray(event.release.animeIds) && event.release.animeIds.length > 0) {
        return event.release.animeIds
    }

    return event.anime?.id ? [event.anime.id] : []
}

function parseStructuredDate(value) {
    if (!value || typeof value !== 'string') return null

    const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/)
    if (!match) return null

    const year = Number(match[1])
    const month = Number(match[2])
    const day = Number(match[3])

    if (month < 1 || month > 12 || day < 1 || day > 31) {
        return null
    }

    return {
        key: value,
        year,
        month,
        day,
    }
}

function formatStructuredDate(value) {
    const date = parseStructuredDate(value)
    if (!date) return 'Невідома дата'

    return `${date.day} ${MONTHS_GENITIVE[date.month - 1]} ${date.year} р.`
}

function getSeasonKeyByMonth(month) {
    if (month >= 1 && month <= 3) return 'winter'
    if (month >= 4 && month <= 6) return 'spring'
    if (month >= 7 && month <= 9) return 'summer'
    return 'autumn'
}

function getSeasonLabelFromAnime(seasonValue) {
    const normalized = normalizeAnimeSeason(seasonValue)
    return SEASON_DEFINITIONS.find(season => season.key === normalized)?.label || seasonValue || 'Невідомо'
}

function normalizeAnimeSeason(seasonValue) {
    return ANIME_SEASON_MAP[String(seasonValue || '').toLowerCase()] || null
}

function getEpisodeCount(value) {
    if (value === null || value === undefined) return 0

    const matches = String(value).match(/\d+/g)
    if (!matches || matches.length === 0) return 0

    return Math.max(...matches.map(item => Number(item)))
}

function getEventLabel(kind) {
    switch (kind) {
        case 'start': return 'Почато'
        case 'end': return 'Закінчено'
        case 'instant': return 'Одразу'
        default: return 'Подія'
    }
}

function pluralize(value, forms) {
    const absValue = Math.abs(value) % 100
    const lastDigit = absValue % 10

    if (absValue > 10 && absValue < 20) return forms[2]
    if (lastDigit > 1 && lastDigit < 5) return forms[1]
    if (lastDigit === 1) return forms[0]
    return forms[2]
}

function escapeHtml(value) {
    return String(value)
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#39;')
}
