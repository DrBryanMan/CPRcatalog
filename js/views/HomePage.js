import * as Functions from '../functions.js'

export function renderHomePage() {
  Functions.updateNavigation('Головна')

  app.innerHTML = `
    <div class="home-page">
      <div class="home-info">
        <i class="bi bi-info-circle"></i>
        CPRcatalog — це сайт-аґреґатор з інформацією про різний контент українською.
        <b>Читати чи дивитись тут немає можливості</b>.
        Але ви можете зручно знайти інформацію про аніме, релізи та команди.
      </div>

      <div class="home-actions">
        <a href="#/animehub/animes" class="home-btn">
          <span><i class="bi bi-card-heading"></i> Аніме</span>
          <p>Каталоґ аніме тайтлів, багато фільтрів, зручний пошук.</p>
        </a>
        <a href="#/animehub/releases" class="home-btn">
          <span><i class="bi bi-collection"></i> Релізи</span>
          <p>Каталоґ релізів аніме — це те, що озвучили або переклали команди.</p>
        </a>
        <a href="#/animehub/teams" class="home-btn">
          <span><i class="bi bi-people"></i> Команди</span>
          <p>Всі команди фандабу та їх роботи у зручному списку.</p>
        </a>
      </div>

      <div class="home-features">
        <h2>Що ви знайдете у каталозі?</h2>
        <ul>
          <li><i class="bi bi-search"></i> Зручний пошук за назвою, роком, сезоном та форматом</li>
          <li><i class="bi bi-collection-play"></i> Перегляд інформації про релізи українською</li>
          <li><i class="bi bi-people"></i> Деталі про команди, які працюють над озвученням і перекладом</li>
          <li><i class="bi bi-images"></i> Додаткові постери та матеріали до аніме</li>
        </ul>
      </div>
    </div>
  `
  return () => {}
}