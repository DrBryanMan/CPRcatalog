export const ENTITY_TYPES = {
  ANIME: 'anime',
  RELEASE: 'release',
  TEAM: 'team',
}

export function buildAnimeRoute(id) {
  return `/animehub/anime/${id}`
}

export function buildReleaseRoute(id) {
  return `/animehub/release/${id}`
}

export function buildTeamRoute(id) {
  return `/animehub/team/${id}`
}

export function getEntityBaseRoute(entityType) {
  switch (entityType) {
    case ENTITY_TYPES.ANIME:
      return '/animehub/animes'
    case ENTITY_TYPES.RELEASE:
      return '/animehub/releases'
    case ENTITY_TYPES.TEAM:
      return '/animehub/teams'
    default:
      return '/animehub/'
  }
}

export function isEntityDetailHash(hash = window.location.hash) {
  return /^#\/animehub\/(anime|release|team)\/[^/]+$/.test(hash || '')
}

export function toHashRoute(route) {
  return `#${route}`
}
