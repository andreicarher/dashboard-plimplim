import { JWT } from 'google-auth-library';

/**
 * Lee la pestaña "CONCATENADO ETIQUETAS" del Sheet de Andrei DIRECTO por la
 * API de Google Sheets (no por el link de "Publicar en la Web"), y construye
 * un mapa NOMBRE DE ADSET (exacto) -> {código país, país, ciudad}.
 *
 * POR QUÉ SE CAMBIÓ DE "PUBLICAR EN LA WEB" A LA API:
 * El link público de "Publicar en la Web" pasa por una capa de caché de
 * Google (CDN) que no controlamos — distintos servidores de Google pueden
 * tener versiones distintas del archivo por un buen rato (a veces mucho más
 * de lo esperable) después de una edición. La API de Sheets, en cambio, lee
 * el valor real de la celda en cada request, sin esa capa de caché — el
 * cambio se ve reflejado apenas se guarda en la hoja.
 *
 * Usa la MISMA cuenta de servicio que ya está configurada para GA4
 * (GA4_CLIENT_EMAIL / GA4_PRIVATE_KEY) — solo hace falta:
 *   1) Habilitar la Google Sheets API en el mismo proyecto de Google Cloud
 *   2) Compartir ESTA planilla con el email de la cuenta de servicio
 *      (Viewer alcanza)
 *   3) Agregar GOOGLE_SHEETS_SPREADSHEET_ID como variable de entorno
 *
 * Por qué un mapeo manual y no algo derivado de Meta:
 * Meta no expone "ciudad" como breakdown de métricas de entrega — lo más
 * granular que ofrece es "region" (provincia/estado). La ciudad real de cada
 * ad set vive únicamente en esta planilla curada a mano por el equipo.
 *
 * Manejo de conflictos: si el mismo nombre de adset aparece más de una vez
 * con país/ciudad distintos, NO se elige uno al azar. Se guarda como
 * conflicto y se expone para que se revise a mano.
 */

const TAB_NAME = 'CONCATENADO ETIQUETAS';

export interface AdsetLocation {
  countryCode: string;
  country: string;
  city: string;
}

export interface AdsetLocationConflict {
  adsetName: string;
  entries: AdsetLocation[];
}

export interface AdsetLocationsResult {
  map: Map<string, AdsetLocation>;
  conflicts: AdsetLocationConflict[];
  debug: {
    rawRowCount: number;
    headerPreview: string;
    sampleDataRow: string;
    detectedAdsetColumnIndex: number;
    source: 'google-sheets-api';
  };
}

/**
 * Detecta dinámicamente en qué columna está el header exacto "ADSET" y
 * asume que código país / PAIS / CIUDAD son las 3 columnas siguientes — la
 * hoja tiene otras tablas antes de esta, así que la posición absoluta no es
 * fija, pero el orden relativo (ADSET, código país, PAIS, CIUDAD) sí.
 */
function findAdsetColumnIndex(headerRow: string[]): number {
  const normalize = (s: string) => s.trim().normalize('NFC').toUpperCase();
  const idx = headerRow.findIndex((cell) => normalize(cell) === 'ADSET');
  return idx === -1 ? 0 : idx;
}

/**
 * Normaliza un nombre de adset antes de comparar. Aplica, en orden:
 *   1) recortar espacios al inicio/final
 *   2) colapsar espacios múltiples internos a uno solo
 *   3) forma Unicode NFC
 *   4) mayúsculas (comparación case-insensitive)
 *
 * Por qué cada paso:
 * - NFC: la respuesta de Google Sheets y la de la API de Meta pueden
 *   representar el mismo carácter acentuado (ej. "ó") con secuencias de
 *   bytes Unicode distintas (NFC vs NFD) — visualmente idénticas, pero un
 *   "===" exacto falla en silencio.
 * - Mayúsculas + espacios: para tolerar pequeñas inconsistencias de tipeo
 *   entre la planilla (mantenida a mano) y el nombre real en Meta, sin
 *   inventar ningún dato.
 */
export function normalizeAdsetName(name: string): string {
  return name.trim().replace(/\s+/g, ' ').normalize('NFC').toUpperCase();
}

/**
 * Normaliza un valor de país/ciudad SOLO para decidir si dos filas son "la
 * misma" a efectos de detectar conflictos — saca tildes además de mayúsculas
 * y espacios. Ej: "Córdoba" y "Cordoba" se consideran el mismo valor acá,
 * aunque el que se guarda y se muestra en pantalla mantiene su tilde
 * original tal cual está en la planilla (esto NO cambia el dato, solo evita
 * que una diferencia de tilde entre dos filas duplicadas se marque como un
 * conflicto real que no lo es).
 */
function normalizeForComparison(value: string): string {
  return value
    .trim()
    .replace(/\s+/g, ' ')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // saca los diacríticos (tildes, diéresis)
    .toUpperCase();
}

function getJwtClient(): JWT {
  const clientEmail = process.env.GA4_CLIENT_EMAIL;
  const privateKey = process.env.GA4_PRIVATE_KEY?.replace(/\\n/g, '\n');

  if (!clientEmail || !privateKey) {
    throw new Error('Faltan GA4_CLIENT_EMAIL o GA4_PRIVATE_KEY en las variables de entorno.');
  }

  return new JWT({
    email: clientEmail,
    key: privateKey,
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
  });
}

async function fetchSheetValues(): Promise<string[][]> {
  const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;
  if (!spreadsheetId) {
    throw new Error('Falta GOOGLE_SHEETS_SPREADSHEET_ID en las variables de entorno.');
  }

  const client = getJwtClient();
  const tokenResponse = await client.getAccessToken();
  const accessToken = tokenResponse?.token;

  if (!accessToken) {
    throw new Error('No se pudo obtener un access token de Google para leer el Sheet.');
  }

  const range = encodeURIComponent(TAB_NAME);
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}?valueRenderOption=FORMATTED_VALUE`;

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: 'no-store',
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(
      `Google Sheets API error (${res.status}): ${errText}. Revisá que la planilla esté compartida con ${process.env.GA4_CLIENT_EMAIL} y que la Google Sheets API esté habilitada en el proyecto.`
    );
  }

  const json = (await res.json()) as { values?: string[][] };
  return json.values || [];
}

// Caché en memoria de muy corta duración — solo para no pegarle a la API de
// Sheets dos veces en la misma carga de página (adsets-by-country + ads-by-country).
// A diferencia del link público de antes, esto SÍ refleja cambios recientes:
// como máximo hay 60 segundos de demora, nunca la propagación impredecible
// de la caché de "Publicar en la Web".
let cachedResult: { result: AdsetLocationsResult; fetchedAt: number } | null = null;
const CACHE_TTL_MS = 60_000;

export async function fetchAdsetLocations(): Promise<AdsetLocationsResult> {
  if (cachedResult && Date.now() - cachedResult.fetchedAt < CACHE_TTL_MS) {
    return cachedResult.result;
  }

  const rows = await fetchSheetValues();

  const headerRow = rows[0] || [];
  const colAdset = findAdsetColumnIndex(headerRow);
  const colCountryCode = colAdset + 1;
  const colCountry = colAdset + 2;
  const colCity = colAdset + 3;

  const dataRows = rows.slice(1);

  const raw = new Map<string, AdsetLocation[]>();

  for (const cols of dataRows) {
    const adsetName = normalizeAdsetName(cols[colAdset] || '');
    const countryCode = (cols[colCountryCode] || '').trim();
    const country = (cols[colCountry] || '').trim();
    const city = (cols[colCity] || '').trim();

    // Saltar filas vacías o filas que no son adsets reales (ej. "#N/A" / "NA").
    if (!adsetName || countryCode === '#N/A' || country === 'NA') continue;

    const existing = raw.get(adsetName) || [];
    existing.push({ countryCode, country, city });
    raw.set(adsetName, existing);
  }

  const map = new Map<string, AdsetLocation>();
  const conflicts: AdsetLocationConflict[] = [];

  for (const [adsetName, entries] of raw.entries()) {
    const unique = entries.filter(
      (e, i) =>
        entries.findIndex(
          (e2) =>
            normalizeForComparison(e2.country) === normalizeForComparison(e.country) &&
            normalizeForComparison(e2.city) === normalizeForComparison(e.city)
        ) === i
    );

    if (unique.length > 1) {
      conflicts.push({ adsetName, entries: unique });
      // En caso de conflicto, usamos la última entrada como mejor esfuerzo,
      // pero el conflicto queda expuesto para revisión — no se oculta.
      map.set(adsetName, entries[entries.length - 1]);
    } else {
      map.set(adsetName, unique[0]);
    }
  }

  const result: AdsetLocationsResult = {
    map,
    conflicts,
    debug: {
      rawRowCount: dataRows.length,
      headerPreview: headerRow.slice(0, 12).join(' | '),
      sampleDataRow: (dataRows[0] || []).slice(0, 12).join(' | '),
      detectedAdsetColumnIndex: colAdset,
      source: 'google-sheets-api',
    },
  };

  cachedResult = { result, fetchedAt: Date.now() };
  return result;
}
