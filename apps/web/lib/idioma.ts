// Utilidad compartida de idioma para toda la app ToqWow.
// Deteccion en 3 pasos: 1) preferencia guardada por el usuario, 2) idioma del
// navegador si coincide con uno soportado, 3) zona horaria del dispositivo
// como pista del pais (sin pedir permiso de ubicacion al usuario).

export const IDIOMAS_SOPORTADOS = ['es', 'en', 'pt', 'hi', 'id', 'ru', 'vi', 'zh', 'ja', 'ko'] as const;
export type IdiomaSoportado = typeof IDIOMAS_SOPORTADOS[number];

export const IDIOMAS_UI: { id: IdiomaSoportado; flag: string }[] = [
  { id: 'es', flag: '🇪🇸' },
  { id: 'en', flag: '🇺🇸' },
  { id: 'pt', flag: '🇧🇷' },
  { id: 'hi', flag: '🇮🇳' },
  { id: 'id', flag: '🇮🇩' },
  { id: 'ru', flag: '🇷🇺' },
  { id: 'vi', flag: '🇻🇳' },
  { id: 'zh', flag: '🇨🇳' },
  { id: 'ja', flag: '🇯🇵' },
  { id: 'ko', flag: '🇰🇷' },
];

export const LOCALE_VOZ: Record<IdiomaSoportado, string> = {
  es: 'es-419', en: 'en-US', pt: 'pt-BR', hi: 'hi-IN', id: 'id-ID',
  ru: 'ru-RU', vi: 'vi-VN', zh: 'zh-CN', ja: 'ja-JP', ko: 'ko-KR',
};

const PREFIJOS_TIMEZONE: { prefijo: string; idioma: IdiomaSoportado }[] = [
  { prefijo: 'Asia/Kolkata', idioma: 'hi' },
  { prefijo: 'Asia/Calcutta', idioma: 'hi' },
  { prefijo: 'Asia/Jakarta', idioma: 'id' },
  { prefijo: 'Asia/Makassar', idioma: 'id' },
  { prefijo: 'Asia/Jayapura', idioma: 'id' },
  { prefijo: 'Asia/Pontianak', idioma: 'id' },
  { prefijo: 'Europe/Moscow', idioma: 'ru' },
  { prefijo: 'Europe/Kaliningrad', idioma: 'ru' },
  { prefijo: 'Europe/Samara', idioma: 'ru' },
  { prefijo: 'Asia/Yekaterinburg', idioma: 'ru' },
  { prefijo: 'Asia/Omsk', idioma: 'ru' },
  { prefijo: 'Asia/Novosibirsk', idioma: 'ru' },
  { prefijo: 'Asia/Krasnoyarsk', idioma: 'ru' },
  { prefijo: 'Asia/Irkutsk', idioma: 'ru' },
  { prefijo: 'Asia/Yakutsk', idioma: 'ru' },
  { prefijo: 'Asia/Vladivostok', idioma: 'ru' },
  { prefijo: 'Asia/Sakhalin', idioma: 'ru' },
  { prefijo: 'Asia/Kamchatka', idioma: 'ru' },
  { prefijo: 'Asia/Ho_Chi_Minh', idioma: 'vi' },
  { prefijo: 'Asia/Shanghai', idioma: 'zh' },
  { prefijo: 'Asia/Chongqing', idioma: 'zh' },
  { prefijo: 'Asia/Harbin', idioma: 'zh' },
  { prefijo: 'Asia/Urumqi', idioma: 'zh' },
  { prefijo: 'Asia/Hong_Kong', idioma: 'zh' },
  { prefijo: 'Asia/Macau', idioma: 'zh' },
  { prefijo: 'Asia/Taipei', idioma: 'zh' },
  { prefijo: 'Asia/Tokyo', idioma: 'ja' },
  { prefijo: 'Asia/Seoul', idioma: 'ko' },
  { prefijo: 'America/Sao_Paulo', idioma: 'pt' },
  { prefijo: 'America/Bahia', idioma: 'pt' },
  { prefijo: 'America/Fortaleza', idioma: 'pt' },
  { prefijo: 'America/Manaus', idioma: 'pt' },
  { prefijo: 'America/Recife', idioma: 'pt' },
  { prefijo: 'America/Belem', idioma: 'pt' },
  { prefijo: 'America/Cuiaba', idioma: 'pt' },
  { prefijo: 'America/Campo_Grande', idioma: 'pt' },
  { prefijo: 'America/Porto_Velho', idioma: 'pt' },
  { prefijo: 'America/Rio_Branco', idioma: 'pt' },
  { prefijo: 'America/Noronha', idioma: 'pt' },
  { prefijo: 'America/Araguaina', idioma: 'pt' },
  { prefijo: 'America/Maceio', idioma: 'pt' },
  { prefijo: 'Atlantic/Azores', idioma: 'pt' },
  { prefijo: 'Europe/Lisbon', idioma: 'pt' },
  { prefijo: 'America/Asuncion', idioma: 'es' },
  { prefijo: 'America/Argentina', idioma: 'es' },
  { prefijo: 'America/Santiago', idioma: 'es' },
  { prefijo: 'America/Bogota', idioma: 'es' },
  { prefijo: 'America/Lima', idioma: 'es' },
  { prefijo: 'America/Mexico_City', idioma: 'es' },
  { prefijo: 'America/Tijuana', idioma: 'es' },
  { prefijo: 'America/Caracas', idioma: 'es' },
  { prefijo: 'America/Montevideo', idioma: 'es' },
  { prefijo: 'America/La_Paz', idioma: 'es' },
  { prefijo: 'America/Guayaquil', idioma: 'es' },
  { prefijo: 'Europe/Madrid', idioma: 'es' },
  { prefijo: 'Atlantic/Canary', idioma: 'es' },
  { prefijo: 'America/Havana', idioma: 'es' },
  { prefijo: 'America/Costa_Rica', idioma: 'es' },
  { prefijo: 'America/Panama', idioma: 'es' },
  { prefijo: 'America/Tegucigalpa', idioma: 'es' },
  { prefijo: 'America/Managua', idioma: 'es' },
  { prefijo: 'America/El_Salvador', idioma: 'es' },
  { prefijo: 'America/Guatemala', idioma: 'es' },
  { prefijo: 'America/Santo_Domingo', idioma: 'es' },
  { prefijo: 'America/Puerto_Rico', idioma: 'es' },
];

function esIdiomaSoportado(x: string): x is IdiomaSoportado {
  return (IDIOMAS_SOPORTADOS as readonly string[]).includes(x);
}

/**
 * Detecta el idioma inicial mas probable para el usuario:
 * 1) preferencia ya guardada (localStorage 'toqwow_idioma')
 * 2) idioma del navegador, si coincide con uno soportado
 * 3) zona horaria del dispositivo, como pista del pais (sin pedir permiso)
 * 4) 'en' como ultimo respaldo
 */
export function detectarIdiomaInicial(): IdiomaSoportado {
  if (typeof window === 'undefined') return 'es';

  try {
    const guardado = window.localStorage.getItem('toqwow_idioma');
    if (guardado && esIdiomaSoportado(guardado)) return guardado;
  } catch {}

  try {
    const navLang = (navigator.language || '').slice(0, 2).toLowerCase();
    if (esIdiomaSoportado(navLang)) return navLang;
  } catch {}

  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
    const match = PREFIJOS_TIMEZONE.find(p => tz.startsWith(p.prefijo));
    if (match) return match.idioma;
  } catch {}

  return 'en';
}

export function guardarIdioma(id: IdiomaSoportado) {
  try { window.localStorage.setItem('toqwow_idioma', id); } catch {}
}
