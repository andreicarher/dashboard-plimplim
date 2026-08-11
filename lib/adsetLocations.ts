/**
 * Lee la pestaña "CONCATENADO ETIQUETAS" del Sheet de Andrei, publicada como CSV,
 * y construye un mapa NOMBRE DE ADSET (exacto) -> {código país, país, ciudad}.
 *
 * Por qué un mapeo manual y no algo derivado de Meta:
 * Meta no expone "ciudad" como breakdown de métricas de entrega — lo más granular
 * que ofrece es "region" (provincia/estado). La ciudad real de cada ad set vive
 * únicamente en esta planilla curada a mano por el equipo.
 *
 * Manejo de conflictos: si el mismo nombre de adset aparece más de una vez con
 * país/ciudad distintos (esto pasa en los datos reales, ej. un adset de
 * "Monticello" aparece una vez como Argentina y otra como Chile), NO elegimos
 * uno al azar. Se guarda como conflicto y se expone para que se revise a mano.
 */

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
  };
}

/** Parser CSV simple pero robusto a comillas, comas y saltos de línea embebidos. */
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];

    if (inQuotes) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += char;
      }
      continue;
    }

    if (char === '"') {
      inQuotes = true;
    } else if (char === ',') {
      row.push(field);
      field = '';
    } else if (char === '\n') {
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else if (char === '\r') {
      // ignorar
    } else {
      field += char;
    }
  }

  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  return rows;
}

/**
 * IMPORTANTE sobre las columnas: confirmado con datos reales de producción
 * (fila de headers "ADSET | código país | PAIS | CIUDAD" recibida tal cual),
 * la pestaña publicada como CSV tiene EXACTAMENTE 4 columnas, en orden:
 * A=ADSET, B=código país, C=PAIS, D=CIUDAD — es decir, índices 0, 1, 2, 3.
 * (Una versión anterior de este archivo asumía que la tabla vivía en las
 * columnas G-J porque la hoja completa tenía varias tablas lado a lado;
 * la publicación actual solo expone estas 4 columnas limpias.)
 */
const COL_ADSET = 0;
const COL_COUNTRY_CODE = 1;
const COL_COUNTRY = 2;
const COL_CITY = 3;

/**
 * Normaliza un nombre de adset antes de comparar. Aplica, en orden:
 *   1) recortar espacios al inicio/final
 *   2) colapsar espacios múltiples internos a uno solo
 *   3) forma Unicode NFC (ver nota abajo)
 *   4) mayúsculas (comparación case-insensitive)
 *
 * Por qué cada paso:
 * - NFC: el CSV exportado por Google Sheets y la respuesta de la API de Meta
 *   pueden representar el mismo carácter acentuado (ej. "ó") con secuencias de
 *   bytes Unicode distintas (NFC vs NFD) — visualmente idénticas, pero un
 *   "===" exacto falla en silencio.
 * - Mayúsculas + espacios: para tolerar pequeñas inconsistencias de tipeo
 *   entre la planilla (mantenida a mano) y el nombre real en Meta, sin
 *   inventar ningún dato — solo evita que un espacio doble o una diferencia
 *   de mayúscula/minúscula bloqueen un match que a simple vista es el mismo
 *   ad set.
 */
export function normalizeAdsetName(name: string): string {
  return name.trim().replace(/\s+/g, ' ').normalize('NFC').toUpperCase();
}

export async function fetchAdsetLocations(): Promise<AdsetLocationsResult> {
  const url = process.env.ADSET_LOCATIONS_CSV_URL;
  if (!url) {
    throw new Error(
      'Falta ADSET_LOCATIONS_CSV_URL en las variables de entorno (URL publicada como CSV de la pestaña CONCATENADO ETIQUETAS).'
    );
  }

  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) {
    throw new Error('No se pudo descargar la tabla de país/ciudad por adset.');
  }

  const text = await res.text();
  const rows = parseCsv(text);

  // Primera fila = headers (ADSET, código país, PAIS, CIUDAD). Se ignora por posición,
  // no por nombre, para no depender de que el usuario no reordene columnas.
  const dataRows = rows.slice(1);

  const raw = new Map<string, AdsetLocation[]>();

  for (const cols of dataRows) {
    const adsetName = normalizeAdsetName(cols[COL_ADSET] || '');
    const countryCode = (cols[COL_COUNTRY_CODE] || '').trim();
    const country = (cols[COL_COUNTRY] || '').trim();
    const city = (cols[COL_CITY] || '').trim();

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
        entries.findIndex((e2) => e2.country === e.country && e2.city === e.city) === i
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

  return {
    map,
    conflicts,
    debug: {
      rawRowCount: dataRows.length,
      headerPreview: (rows[0] || []).slice(0, 12).join(' | '),
      sampleDataRow: (dataRows[0] || []).slice(0, 12).join(' | '),
    },
  };
}
