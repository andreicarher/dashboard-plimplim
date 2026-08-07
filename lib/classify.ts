/**
 * Clasificación de campañas por país y por tipo de objetivo (Show / Nueva App / Canal WA).
 *
 * IMPORTANTE — por qué esto NO se basa únicamente en el prefijo de 2-3 letras:
 * En la cuenta real de Plim Plim conviven códigos inconsistentes históricos:
 *   - Chile aparece como "CH", "CHI" y "CL" en distintas campañas.
 *   - México aparece como "MX" y "MEX".
 *   - "PA" se ha usado tanto para Paraguay como (potencialmente) Panamá.
 *   - "PER" y "PY" pueden confundirse a simple vista (Perú vs Paraguay).
 *
 * Por eso la estrategia es:
 *   1) Buscar primero el NOMBRE COMPLETO del país en el texto de la campaña
 *      (ej. "Argentina", "México", "Chile", "Paraguay") — esto es inequívoco.
 *   2) Si no hay nombre completo, usar el prefijo RO_XX_ como respaldo,
 *      pero marcando la clasificación como "low confidence".
 *   3) Si nada matchea, la campaña va a "Sin clasificar" — NUNCA se asigna
 *      un país a la fuerza. Esto protege la integridad de los datos: es
 *      preferible ver un bucket "sin clasificar" y revisarlo a mano, que
 *      mezclar el gasto de un país con otro silenciosamente.
 */

export type CountryCode =
  | 'AR'
  | 'MX'
  | 'CL'
  | 'CO'
  | 'PE'
  | 'PY'
  | 'UY'
  | 'US'
  | 'BR'
  | 'PA_PANAMA'
  | 'SIN_CLASIFICAR';

export type Confidence = 'high' | 'low';

export interface CountryMatch {
  country: CountryCode;
  countryLabel: string;
  confidence: Confidence;
}

// Paso 1: nombres completos (o variantes muy inequívocas), sin acentos, en minúsculas.
// El orden importa: los más específicos van antes que los prefijos genéricos.
const FULL_NAME_PATTERNS: Array<{ pattern: RegExp; country: CountryCode; label: string }> = [
  { pattern: /\bargentin/, country: 'AR', label: 'Argentina' },
  { pattern: /\bmexic|\bméxic/, country: 'MX', label: 'México' },
  { pattern: /\bchile\b|\bsantiago\b|\bvalparaiso\b|\bconcepcion\b/, country: 'CL', label: 'Chile' },
  { pattern: /\bcolombia\b|\bbogota\b|\bmedellin\b/, country: 'CO', label: 'Colombia' },
  { pattern: /\bperu\b|\bperú\b|\blima\b/, country: 'PE', label: 'Perú' },
  { pattern: /\bparaguay\b|\basuncion\b/, country: 'PY', label: 'Paraguay' },
  { pattern: /\buruguay\b|\bmontevideo\b/, country: 'UY', label: 'Uruguay' },
  { pattern: /\bestados unidos\b|\busa\b/, country: 'US', label: 'Estados Unidos' },
  { pattern: /\bbrasil\b|\bbrazil\b/, country: 'BR', label: 'Brasil' },
  { pattern: /\bpanama\b/, country: 'PA_PANAMA', label: 'Panamá' },
];

// Paso 2: prefijos de campaña RO_XX_ como respaldo (baja confianza).
// Cada código puede mapear a MÁS de un país real observado en la cuenta —
// por eso estos van a "low confidence" y deben revisarse.
const PREFIX_PATTERNS: Array<{ pattern: RegExp; country: CountryCode; label: string }> = [
  { pattern: /^RO_AR_/i, country: 'AR', label: 'Argentina' },
  { pattern: /^RO_(MX|MEX)_/i, country: 'MX', label: 'México' },
  { pattern: /^RO_(CH|CHI|CL)_/i, country: 'CL', label: 'Chile' },
  { pattern: /^RO_CO_/i, country: 'CO', label: 'Colombia' },
  { pattern: /^RO_(PE|PER)_/i, country: 'PE', label: 'Perú' },
  { pattern: /^RO_(PY|PA)_/i, country: 'PY', label: 'Paraguay' }, // ver advertencia abajo
  { pattern: /^RO_UY_/i, country: 'UY', label: 'Uruguay' },
  { pattern: /^RO_US_/i, country: 'US', label: 'Estados Unidos' },
  { pattern: /^RO_LATAM_/i, country: 'SIN_CLASIFICAR', label: 'LATAM (consolidado)' },
];

function stripAccents(input: string): string {
  return input.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

export function classifyCountry(campaignName: string): CountryMatch {
  const normalized = stripAccents(campaignName.toLowerCase());

  for (const { pattern, country, label } of FULL_NAME_PATTERNS) {
    if (pattern.test(normalized)) {
      return { country, countryLabel: label, confidence: 'high' };
    }
  }

  for (const { pattern, country, label } of PREFIX_PATTERNS) {
    if (pattern.test(campaignName)) {
      return { country, countryLabel: label, confidence: 'low' };
    }
  }

  return { country: 'SIN_CLASIFICAR', countryLabel: 'Sin clasificar', confidence: 'low' };
}

export type ObjectiveBucket = 'Show' | 'Nueva App' | 'Canal WA' | 'Otro / Sin clasificar';

export function classifyObjective(campaignName: string): ObjectiveBucket {
  const normalized = stripAccents(campaignName.toLowerCase());

  if (/canal\s*wa|whats\s*app|whatsapp/.test(normalized)) return 'Canal WA';
  if (/nueva\s*app|a jugar con plim plim|\bapp\b/.test(normalized)) return 'Nueva App';
  if (/\bshow\b/.test(normalized)) return 'Show';
  return 'Otro / Sin clasificar';
}

export interface ClassifiedCampaign {
  id: string;
  name: string;
  country: CountryMatch;
  objective: ObjectiveBucket;
}

export function classifyCampaign(id: string, name: string): ClassifiedCampaign {
  return {
    id,
    name,
    country: classifyCountry(name),
    objective: classifyObjective(name),
  };
}
