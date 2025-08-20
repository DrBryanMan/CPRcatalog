import { AnimeTitles } from './loadData.js'
import { titleModal } from './views/TitleModal.js'

const themeSwitchBtn = document.getElementById('themeSwitch')
const icon = themeSwitchBtn.querySelector('i')
// const randomAnimeBtn = document.getElementById('randomAnimeBtn')

function setTheme(isLight) {
  document.body.classList.toggle('light', isLight)
  icon.classList.remove('bi-sun', 'bi-moon')
  icon.classList.add(isLight ? 'bi-moon' : 'bi-sun')

  localStorage.setItem('theme', isLight ? 'light' : 'dark')
}

// Перемикання теми по кліку
themeSwitchBtn.onclick = () => {
  const isLight = !document.body.classList.contains('light')
  setTheme(isLight)
}

const savedTheme = localStorage.getItem('theme')
if (savedTheme) {
  setTheme(savedTheme === 'light')
}

// Кнопка випадкового аніме
randomAnimeBtn.onclick = () => {
  if (!AnimeTitles || !AnimeTitles.length) return
  const random = AnimeTitles[Math.floor(Math.random() * AnimeTitles.length)]
  titleModal.open(random.id)
}