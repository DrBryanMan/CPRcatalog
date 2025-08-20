// ---- Канонічні класи (тільки базові; ~варіанти додаються до name динамічно) ----
const CLASS_BY_CODE = {
  // F0/F1/F2/F3/F9/F10 — базові
  'F0':  { code: 'F0',  name: 'Zero',         description: 'Спешли, прологи' },
  'Z':   { code: 'F0',  name: 'Zero',         description: 'Спешли, прологи' },
  'F1':  { code: 'F1',  name: 'Chibi',        description: 'Міні-формат' },
  'Ch':  { code: 'F1',  name: 'Chibi',        description: 'Міні-формат' },
  'F2':  { code: 'F2',  name: 'Short',        description: 'Короткі історії' },
  'Sh':  { code: 'F2',  name: 'Short',        description: 'Короткі історії' },
  'F1/2A':{code: 'F1/2A',name: 'Anthology',   description: 'Антології, збірники' },
  'A':   { code: 'F1/2A',name: 'Anthology',   description: 'Антології, збірники' },
  'F3':  { code: 'F3',  name: 'Mini',         description: 'Стислі історії' },
  'Mn':  { code: 'F3',  name: 'Mini',         description: 'Стислі історії' },
  'F9':  { code: 'F9',  name: 'Special',      description: 'Спецвипуски' },
  'Sp':  { code: 'F9',  name: 'Special',      description: 'Спецвипуски' },
  'F10': { code: 'F10', name: 'Music Video',  description: 'Музичні відео/промо' },
  'MV':  { code: 'F10', name: 'Music Video',  description: 'Музичні відео/промо' },

  // F4 — сезони (діапазони зробимо в автологіці, а ручні — напряму)
  'F4':   { code: 'F4',   name: 'Season',    description: 'Класичний сезон (1 кур)' },
  'S':    { code: 'F4',   name: 'Season',    description: 'Класичний сезон (1 кур)' },
  'F4+':  { code: 'F4+',  name: 'Season+',   description: 'Класичний сезон (2 кури)' },
  'S+':   { code: 'F4+',  name: 'Season+',   description: 'Класичний сезон (2 кури)' },
  'F4++': { code: 'F4++', name: 'Season++',  description: 'Класичний сезон (3+ кури)' },
  'S++':  { code: 'F4++', name: 'Season++',  description: 'Класичний сезон (3+ кури)' },

  // Альтернативи/додаткові — лише вручну
  'F4~': { code: 'F4~', name: 'SAlter', description: 'Альтернативний сезон' },
  'S~':  { code: 'F4~', name: 'SAlter', description: 'Альтернативний сезон' },
  'F4x': { code: 'F4+', name: 'SExtra', description: 'Додаткові епізоди сезону (1–3)' },
  'Se':  { code: 'F4+', name: 'SExtra', description: 'Додаткові епізоди сезону (1–3)' },

  // F5 — довгі
  'F5': { code: 'F5', name: 'Maxi',  description: 'Довгі арки (50+)' },
  'Mx': { code: 'F5', name: 'Maxi',  description: 'Довгі арки (50+)' },
  'Mg': { code: 'F5', name: 'Mega',  description: 'Довгі арки (100+)' },
  'U':  { code: 'F5', name: 'Ultra', description: 'Довгі арки (500+)' },

  // F6 — фільми
  'F6': { code: 'F6', name: 'Movie', description: 'Повноцінне аніме-кіно' },
  'M':  { code: 'F6', name: 'Movie', description: 'Повноцінне аніме-кіно' },
  'F6~':{ code: 'F6~',name: 'MAlter',description: 'Альтернативна версія фільму' },
  'M~': { code: 'F6~',name: 'MAlter',description: 'Альтернативна версія фільму' },

  // F7 — репаки/компіляції
  'F7': { code: 'F7', name: 'Repack', description: 'Рекапи, компіляції' },
  'R':  { code: 'F7', name: 'Repack', description: 'Рекапи, компіляції' },

  // F8 — ремейки (тільки вручну)
  'F8': { code: 'F8', name: 'Remake', description: 'Ремейк, переосмислення' },
  'Rm': { code: 'F8', name: 'Remake', description: 'Ремейк, переосмислення' },
};

// ---- Розбір ручних кодів: "M", "S++", "M~spin", "R|MV, S~" тощо ----
function parseManualClassification(input) {
  if (!input) return null;

  const toArray = (val) => {
    if (Array.isArray(val)) return val;
    // коми/крапки з комою/пайп/слеш
    return String(val).split(/[,\|/;]+/).map(s => s.trim()).filter(Boolean);
  };

  const items = toArray(input);
  const picked = [];

  for (const raw of items) {
    // виділяємо базу + опційний варіант після "~"
    const m = String(raw).trim().match(/^([A-Za-z0-9+]+)(~[A-Za-z0-9-]+)?$/);
    if (!m) continue;
    let base = m[1];
    const variant = m[2] ? m[2].slice(1) : ''; // без "~"

    // підтримка вручну вказаних "S++", "F4++", "S+", "F4+" тощо
    // а також "M~" (де база "M~" з мапи) — якщо прямий ключ не знайдено, пробуємо "M"
    let def = CLASS_BY_CODE[base] || null;

    // спец: якщо база типу "F4++" — вже знайдемо; якщо ні, але це "S++" — теж є;
    // якщо база "M~alt" без двох частин — вище вже відсікли ~ у variant.
    if (!def) {
      // fallback: якщо база в стилі "F6~" або "M~" могла приїхати без варіанта
      if ((base === 'M' || base === 'F6') && variant) {
        // це все одно Movie, але з варіантом
        def = CLASS_BY_CODE['M'];
      }
    }
    if (!def) continue;

    // застосовуємо варіант: додаємо суфікс до name (напр. "Movie ~spin")
    const withVariant = variant
      ? { ...def, name: `${def.name} ~${variant}` }
      : def;

    // уникати дублювання однакових base+variant
    if (!picked.some(p => p.code === withVariant.code && p.name === withVariant.name)) {
      picked.push(withVariant);
    }
  }

  if (picked.length === 0) return null;
  if (picked.length === 1) return picked[0];

  return {
    code: picked.map(p => p.code).join('+'),
    name: picked.map(p => p.name).join(' + '),
    description: 'Вручну вказані класифікації',
    classifications: picked,
    manual: true,
  };
}

// ---- Автокласифікація за твоїми правилами ----
function classifyAnime(episodes, episodeDuration = 24, format, existingClassification = '') {
  // 0) Ручна класифікація має абсолютний пріоритет
  const manual = parseManualClassification(existingClassification);
  if (manual) return manual;

  // нормалізація
  episodes = Number(episodes);
  episodeDuration = Number(episodeDuration);

  if (!episodes || Number.isNaN(episodes) || Number.isNaN(episodeDuration)) {
    return { code: 'FN', name: 'None Format', description: 'Безформатні' };
  }

  // F7 — Repack за оригінальним format (Компіляція/Рекап) І з обмеженнями 1–2 еп. та 40+ хв
  if ((format === 'Компіляція' || format === 'Рекап') && episodes >= 1 && episodes <= 2 && episodeDuration >= 40) {
    return CLASS_BY_CODE['R'];
  }

  // F6 — Movie (1 епізод, 40+ хв)
  if (episodes === 1 && episodeDuration >= 40) {
    return CLASS_BY_CODE['M'];
  }

  // F10 — Music Video (1 епізод, 1–5 хв) — до F9
  if (episodes === 1 && episodeDuration >= 1 && episodeDuration <= 5) {
    return CLASS_BY_CODE['MV'];
  }

  // F0/F1 — 1–3 епізоди, до ~24 хв
  if (episodes >= 1 && episodes <= 3 && episodeDuration <= 24) {
    if (episodeDuration <= 15) return CLASS_BY_CODE['F1']; // Chibi
    return CLASS_BY_CODE['F0']; // Zero
  }

  // F2 — Short (4–12 епізодів, 3–15 хв)
  if (episodes >= 4 && episodes <= 12 && episodeDuration >= 3 && episodeDuration <= 15) {
    return CLASS_BY_CODE['F2'];
  }

  // F1/2A — Anthology (2–10 епізодів, 10–15 хв)
  if (episodes >= 2 && episodes <= 10 && episodeDuration >= 10 && episodeDuration <= 15) {
    return CLASS_BY_CODE['F1/2A'];
  }

  // F3 — Mini (2–10 епізодів, 20–40 хв)
  if (episodes >= 2 && episodes <= 10 && episodeDuration >= 20 && episodeDuration <= 40) {
    return CLASS_BY_CODE['F3'];
  }

  // F4 — Seasons (перероблені діапазони з таблиці) при ~24 хв (20–30)
  if (episodeDuration >= 20 && episodeDuration <= 30) {
    if (episodes >= 30) return CLASS_BY_CODE['F4++']; // 30+
    if (episodes >= 20) return CLASS_BY_CODE['F4+'];  // 20–29
    if (episodes >= 10) return CLASS_BY_CODE['F4'];   // 10–19
  }

  // F5 — Maxi/Mega/Ultra (50+, 100+, 500+)
  if (episodes >= 50) {
    if (episodes >= 500) return { ...CLASS_BY_CODE['U'],  name: 'Ultra' };
    if (episodes >= 100) return { ...CLASS_BY_CODE['Mg'], name: 'Mega'  };
    return CLASS_BY_CODE['Mx']; // Maxi
  }

  // F9 — Special (1–12 епізодів, варіативна тривалість) — catch-all для коротких серій
  if (episodes >= 1 && episodes <= 12) {
    return CLASS_BY_CODE['F9'];
  }

  // Інакше — невизначений
  return { code: 'FN', name: 'None Format', description: 'Безформатні' };
}

// ---- Інфо-хелпер (без подвійних викликів) ----
function getAnimeClassificationInfo(episodes, episodeDuration = 24, originalFormat = '', existingClassification = '') {
  const classification = classifyAnime(episodes, episodeDuration, originalFormat, existingClassification);

  return {
    ...classification,
    originalFormat,
    episodes,
    episodeDuration,
    totalMinutes: episodes * episodeDuration,
    description: classification.description,
    displayText: classification.name,
  };
}

export { classifyAnime, getAnimeClassificationInfo };
