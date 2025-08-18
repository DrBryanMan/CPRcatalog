const themeSwitchBtn = document.getElementById('themeSwitch')
const icon = themeSwitchBtn.querySelector('i')

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