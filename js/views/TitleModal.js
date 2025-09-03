import { AnimeTitles, AnimeReleases } from '../loadData.js'
import { AnimeDetails } from './AnimeDetails.js'
import { ReleaseDetails } from './ReleaseDetails.js'
import { TeamDetails } from './TeamDetails.js'

export function createTitleModal() {
  const state = {
    modal: null,
    isOpen: false,
    currentView: 'anime', // 'anime' | 'release' | 'teamReleases'
    currentAnime: null,
    currentRelease: null,
    currentTeam: null,
    openedFromCatalog: false
  }

  // Ініціалізуємо деталі модулі
  let animeDetails, releaseDetails, teamDetails

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
          const anime = AnimeTitles.find(a => a.id === animeId)
          if (anime) showAnimeDetail(anime)
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
  async function open(animeId) {
    if (state.isOpen) return
    state.isOpen = true
    const anime = AnimeTitles.find(a => a.id === animeId)
    if (!anime) return console.error('Аніме не знайдено:', animeId)

    state.currentAnime = anime
    state.currentRelease = null
    state.currentTeam = null
    state.currentView = 'anime'
    state.openedFromCatalog = false

    state.modal.showModal()
    document.body.classList.add('modal-open')
    // На тайтлі «Назад» не показуємо
    toggleBack(false)
    await animeDetails.render(anime)
  }

  function close() {
    if (!state.isOpen) return
    state.isOpen = false
    state.currentView = 'anime'
    state.currentAnime = null
    state.currentRelease = null
    state.currentTeam = null
    state.openedFromCatalog = false

    state.modal.close()
    document.body.classList.remove('modal-open')
    toggleBack(false)
    state.modal.querySelector('#animeModalContent').innerHTML = '<div class="loading-spinner">Завантаження...</div>'
  }

  function toggleBack(show) {
    state.modal.querySelector('#backButton').style.display = show ? 'flex' : 'none'
  }

  // ===== Реліз =====
  async function showReleaseDetail(release) {
    state.currentView = 'release'
    state.currentRelease = release
    // «Назад» показуємо тільки на релізі й тільки якщо є звідки повертатись
    const canGoBack = (state.currentAnime || state.currentTeam) && !state.openedFromCatalog
    toggleBack(!!canGoBack)
    await releaseDetails.render(release)
  }

  // Виклик із каталогу/із зовнішньої картки (API, що використовується зовні)
  async function renderReleaseDetailFromCatalog(release) {
    if (!release) return console.error('Реліз не знайдено')

    if (!state.isOpen) {
      state.isOpen = true
      state.modal.showModal()
      document.body.classList.add('modal-open')
      state.openedFromCatalog = true
    }
    state.currentView = 'release'
    state.currentRelease = release

    // Якщо відкрито з каталогу — «Назад» не показуємо
    const canGoBack = (state.currentAnime || state.currentTeam) && !state.openedFromCatalog
    toggleBack(!!canGoBack)

    await releaseDetails.render(release)
  }

  // ===== Команда =====
  async function showTeamDetails(teamId) {
    if (!state.isOpen) {
      state.isOpen = true
      state.modal.showModal()
      document.body.classList.add('modal-open')
    }

    state.currentView = 'teamReleases'
    state.currentTeam = { id: teamId } // Зберігаємо мінімальну інформацію
    state.currentAnime = null
    state.currentRelease = null
    state.openedFromCatalog = false

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
      toggleBack(false)
      showAnimeDetail(state.currentAnime)
      return
    }
    if (state.currentTeam) {
      // назад до команди
      toggleBack(false)
      showTeamDetails(state.currentTeam.id)
      return
    }
    // реліз без контексту (відкрито з каталогу)
    close()
  }

  // Публічний перехід до тайтлу (використовується делегацією)
  async function showAnimeDetail(anime) {
    state.currentView = 'anime'
    state.currentAnime = anime
    state.currentTeam = null
    state.currentRelease = null
    toggleBack(false)
    await animeDetails.render(anime)
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