// Duración de una sesión «recordada» (casilla «Recordarme» marcada). Se usa en
// dos sitios que deben coincidir: la configuración de Better Auth (vigencia de
// la sesión en base de datos) y el Max-Age de la cookie que fija la API.
//
// Sin «Recordarme», Better Auth crea la sesión con vigencia de 1 día y la API
// emite una cookie de sesión (sin Max-Age), que el navegador borra al cerrarse.
export const REMEMBERED_SESSION_SECONDS = 7 * 24 * 60 * 60;
