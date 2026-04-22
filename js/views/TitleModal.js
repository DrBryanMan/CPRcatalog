import { AnimeTitles, AnimeReleases } from '../loadData.js'
import { AnimeDetails } from './AnimeDetails.js'
import { ReleaseDetails } from './ReleaseDetails.js'
import { TeamDetails } from './TeamDetails.js'
import {
  buildAnimeRoute,
  buildReleaseRoute,
  buildTeamRoute,
  isEntityDetailHash,
  toHashRoute
} from '../utils/entityRoutes.js'

export function createTitleModal() {
  const state = {
    modal: null,
    isOpen: false,
    currentView: 'anime', // 'anime' | 'release' | 'teamReleases'
    currentAnime: null,
    currentRelease: null,
    currentTeam: null,
    openedFromCatalog: false,
    returnRoute: '#/'
  }

  // Ініціалізуємо деталі модулі
  let animeDetails, releaseDetails, teamDetails

  function navigateToRoute(route) {
    if (!isEntityDetailHash(window.location.hash)) {
      state.returnRoute = window.location.hash || '#/'
    }
    const targetHash = toHashRoute(route)
    if (window.location.hash !== targetHash) {
      window.location.hash = targetHash
    }
  }

  function ensureModalOpen() {
    if (state.isOpen) return
    state.isOpen = true
    state.modal.showModal()
    document.body.classList.add('modal-open')
  }

  function resetState() {
    state.isOpen = false
    state.currentView = 'anime'
    state.currentAnime = null
    state.currentRelease = null
    state.currentTeam = null
    state.openedFromCatalog = false
    state.returnRoute = '#/'
  }

  function resetModalContent() {
    toggleBack(false)
    state.modal.querySelector('#animeModalContent').innerHTML = '<div class="loading-spinner">Завантаження...</div>'
  }

  function closeImmediately() {
    if (!state.isOpen) return
    resetState()
    state.modal.close()
    document.body.classList.remove('modal-open')
    resetModalContent()
  }

  function createModal() {
    state.modal = document.createElement('dialog')
    state.modal.id = 'animeDetailModal'
    state.modal.classList.add('anime-detail-modal', 'modal')

    state.modal.innerHTML = `
      <div class="modal-content">
        <div class="modal-header">
          <button id="backButton" class="back-button" style="display:none;">
            <i class="bi bi-arrow-left"></i> Повернутися
          </button>
        </div>
        <div id="animeModalContent">
          <div class="loading-spinner">Завантаження...</div>
        </div>
      </div>
    `
    document.body.appendChild(state.modal)
    
    // Ініціалізуємо деталі модулі після створення модалки
    animeDetails = new AnimeDetails(state.modal)
    releaseDetails = new ReleaseDetails(state.modal)
    teamDetails = new TeamDetails(state.modal)
    
    setupEventListeners()
  }

  function setupEventListeners() {
    const backBtn = state.modal.querySelector('#backButton')
    backBtn.onclick = goBack

    // Закриття по кліку на бекдроп
    state.modal.onclick = (e) => {
      const modalContent = state.modal.querySelector('.modal-content')
      if (!modalContent.contains(e.target)) close()
    }

    // ESC: лише з релізу повертаємось, інакше — закриваємо
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && state.isOpen) {
        if (state.currentView === 'release') {
          goBack()
        } else {
          close()
        }
      }
    })

    // Єдина делегація всередині модалки
    state.modal.addEventListener('click', (e) => {
      // Ігноруємо кліки по елементам пагінації та контролах
      if (e.target.closest('.pagination') || 
          e.target.closest('.list-controls') || 
          e.target.closest('.view-controls') ||
          e.target.closest('.filter-options') ||
          e.target.closest('.sort-options') ||
          e.target.closest('#localSearchInput') ||
          e.target.closest('.pagination-btn') ||
          e.target.closest('.filters-section')) {
        return // просто виходимо, не зупиняємо пропагацію
      }

      const navLink = e.target.closest('.data-nav-link')
      if (navLink) {
        e.preventDefault()
        e.stopPropagation()

        const teamId = navLink.getAttribute('data-team-id')
        if (teamId) {
          showTeamDetails(teamId)
          return
        }

        const animeId = navLink.getAttribute('data-anime-id')
        if (animeId) {
          open(animeId)
        }
        return
      }

      const releaseCard = e.target.closest('.release-card')
      if (releaseCard && !releaseCard.classList.contains('header-card')) {
        const releaseId = releaseCard.dataset.releaseId
        if (releaseId) {
          const rel = AnimeReleases.find(r => r.id === releaseId)
          if (rel) showReleaseDetail(rel)
        }
      }
    })
  }

  // ===== Публічні переходи =====
  async function open(animeId, options = {}) {
    const { syncUrl = true, returnRoute = null } = options
    if (syncUrl) {
      navigateToRoute(buildAnimeRoute(animeId))
      return
    }

    const anime = AnimeTitles.find(a => a.id === animeId)
    if (!anime) return console.error('Аніме не знайдено:', animeId)

    ensureModalOpen()
    state.currentAnime = anime
    state.currentRelease = null
    state.currentTeam = null
    state.currentView = 'anime'
    state.openedFromCatalog = false
    if (returnRoute) state.returnRoute = returnRoute

    // На тайтлі «Назад» не показуємо
    toggleBack(false)
    await animeDetails.render(anime)
  }

  function close(options = {}) {
    const { skipRouteSync = false } = options
    if (!state.isOpen) return
    if (!skipRouteSync && isEntityDetailHash()) {
      const targetRoute = state.returnRoute || '#/'
      if (window.location.hash !== targetRoute) {
        window.location.hash = targetRoute
        return
      }
      closeImmediately()
      return
    }
    closeImmediately()
  }

  function toggleBack(show) {
    state.modal.querySelector('#backButton').style.display = show ? 'flex' : 'none'
  }

  // ===== Реліз =====
  async function showReleaseDetail(release, options = {}) {
    const { syncUrl = true, returnRoute = null } = options
    if (syncUrl) {
      navigateToRoute(buildReleaseRoute(release.id))
      return
    }

    ensureModalOpen()
    state.currentView = 'release'
    state.currentRelease = release
    if (returnRoute) state.returnRoute = returnRoute
    // «Назад» показуємо тільки на релізі й тільки якщо є звідки повертатись
    const canGoBack = (state.currentAnime || state.currentTeam) && !state.openedFromCatalog
    toggleBack(!!canGoBack)
    await releaseDetails.render(release)
  }

  // Виклик із каталогу/із зовнішньої картки (API, що використовується зовні)
  async function renderReleaseDetailFromCatalog(release, options = {}) {
    const { syncUrl = true, openedFromCatalog = true, returnRoute = null } = options
    if (!release) return console.error('Реліз не знайдено')
    if (syncUrl) {
      navigateToRoute(buildReleaseRoute(release.id))
      return
    }

    ensureModalOpen()
    state.openedFromCatalog = openedFromCatalog
    state.currentView = 'release'
    state.currentRelease = release
    if (returnRoute) state.returnRoute = returnRoute

    // Якщо відкрито з каталогу — «Назад» не показуємо
    const canGoBack = (state.currentAnime || state.currentTeam) && !state.openedFromCatalog
    toggleBack(!!canGoBack)

    await releaseDetails.render(release)
  }

  // ===== Команда =====
  async function showTeamDetails(teamId, options = {}) {
    const { syncUrl = true, returnRoute = null } = options
    if (syncUrl) {
      navigateToRoute(buildTeamRoute(teamId))
      return
    }

    ensureModalOpen()

    state.currentView = 'teamReleases'
    state.currentTeam = { id: teamId } // Зберігаємо мінімальну інформацію
    state.currentAnime = null
    state.currentRelease = null
    state.openedFromCatalog = false
    if (returnRoute) state.returnRoute = returnRoute

    // На сторінці команди «Назад» не показуємо
    toggleBack(false)
    
    await teamDetails.render(teamId)
  }

  // ===== Назад (тільки на релізі) =====
  function goBack() {
    if (state.currentView !== 'release') {
      close()
      return
    }
    if (state.currentAnime) {
      // назад до тайтлу
      open(state.currentAnime.id)
      return
    }
    if (state.currentTeam) {
      // назад до команди
      showTeamDetails(state.currentTeam.id)
      return
    }
    // реліз без контексту (відкрито з каталогу)
    close()
  }

  // Публічний перехід до тайтлу (використовується делегацією)
  async function showAnimeDetail(anime) {
    if (!anime?.id) return
    await open(anime.id)
  }

  createModal()
  return {
    open,
    close,
    goBack,
    renderReleaseDetail: renderReleaseDetailFromCatalog,
    showTeamDetails
  }
}

export const titleModal = createTitleModal()
