// Функція для класифікації аніме на основі кількості епізодів та тривалості
function classifyAnime(episodes, episodeDuration = 24, existingClassification = '') {
    // Якщо вже є вказана класифікація в даних, повертаємо її
    if (existingClassification) {
        return { 
            code: existingClassification, 
            name: existingClassification, 
            description: 'Вручну вказана класифікація' 
        };
    }
    
    // Якщо немає даних про епізоди, повертаємо невизначений формат
    if (!episodes || episodes === 0) {
        return { code: 'FN', name: 'None Format', description: 'Безформатні' };
    }

    const totalMinutes = episodes * episodeDuration;

    // F0 - Zero (1-3 епізоди, ~24 хв)
    if (episodes >= 1 && episodes <= 3) {
        if (episodeDuration <= 15) {
            return { code: 'F1', name: 'Chibi', description: 'Міні-формат' };
        }
        return { code: 'F0', name: 'Zero', description: 'Спешли, прологи' };
    }

    // F1 - Chibi/Nano (1-3 епізоди, 1-10 хв)
    if (episodes >= 1 && episodes <= 3 && episodeDuration >= 1 && episodeDuration <= 10) {
        return { code: 'F1', name: 'Chibi', description: 'Міні-формат' };
    }

    // F2 - Short (4-12 епізодів, 3-15 хв)
    if (episodes >= 4 && episodes <= 12 && episodeDuration >= 3 && episodeDuration <= 15) {
        return { code: 'F2', name: 'Short', description: 'Короткі історії' };
    }

    // F1/2 A - Anthology (2-10 епізодів, 10-15 хв)
    if (episodes >= 2 && episodes <= 10 && episodeDuration >= 10 && episodeDuration <= 15) {
        return { code: 'F1/2A', name: 'Anthology', description: 'Антології, збірники' };
    }

    // F3 - Mini (2-10 епізодів, 20-40 хв)
    if (episodes >= 2 && episodes <= 10 && episodeDuration >= 20 && episodeDuration <= 40) {
        return { code: 'F3', name: 'Mini', description: 'Стислі історії' };
    }

    // F6 - Movie (1 епізод, 40+ хв)
    if (episodes === 1 && episodeDuration >= 40) {
        return { code: 'F6', name: 'Movie', description: 'Повноцінне аніме-кіно' };
    }

    // F7 - Repack (1-2 епізоди, 40+ хв)
    if (episodes >= 1 && episodes <= 2 && episodeDuration >= 40) {
        return { code: 'F7', name: 'Repack', description: 'Рекапи, компіляції' };
    }

    // F4 - Season (10+ епізодів, ~24 хв)
    if (episodes >= 10 && episodes <= 30 && episodeDuration >= 20 && episodeDuration <= 30) {
        if (episodes <= 13) {
            return { code: 'F4', name: 'Season', description: 'Класичний сезон (1 кур)' };
        } else if (episodes <= 26) {
            return { code: 'F4+', name: 'Season+', description: 'Класичний сезон (2 кури)' };
        } else {
            return { code: 'F4++', name: 'Season++', description: 'Класичний сезон (3+ кури)' };
        }
    }

    // F5 - Maxi/Mega/Ultra (50+, 100+, 500+)
    if (episodes >= 50) {
        if (episodes >= 500) {
            return { code: 'F5', name: 'Ultra', description: 'Довгі арки (500+)' };
        } else if (episodes >= 100) {
            return { code: 'F5', name: 'Mega', description: 'Довгі арки (100+)' };
        } else {
            return { code: 'F5', name: 'Maxi', description: 'Довгі арки (50+)' };
        }
    }

    // F9 - Special (1-12 епізодів, варіативна тривалість)
    if (episodes >= 1 && episodes <= 12) {
        return { code: 'F9', name: 'Special', description: 'Спецвипуски' };
    }

    // F10 - Music/Promo Video (1 епізод, 1-5 хв)
    if (episodes === 1 && episodeDuration >= 1 && episodeDuration <= 5) {
        return { code: 'F10', name: 'Music Video', description: 'Музичні відео/промо' };
    }

    // За замовчуванням - невизначений формат
    return { code: 'FN', name: 'None Format', description: 'Безформатні' };
}

// Функція для отримання повного опису класифікації
function getAnimeClassificationInfo(episodes, episodeDuration = 24, originalFormat = '', existingClassification = '') {
    const classification = classifyAnime(episodes, episodeDuration, existingClassification);
    
    return {
        ...classification,
        originalFormat: originalFormat,
        episodes: episodes,
        episodeDuration: episodeDuration,
        totalMinutes: episodes * episodeDuration,
        // Показуємо формат і класифікацію незалежно
        displayText: [originalFormat, classification.name].filter(Boolean).join(' • ')
    };
}

// Експорт функцій
export { classifyAnime, getAnimeClassificationInfo };