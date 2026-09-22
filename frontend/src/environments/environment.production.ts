/**
 * Production : le bundle et l'API sont servis par le meme nginx, sous le meme
 * sous-domaine. L'URL relative supprime toute requete d'origine croisee.
 */
export const environment = {
  production: true,
  apiBaseUrl: '/api',
  appName: 'JobStore',
};
