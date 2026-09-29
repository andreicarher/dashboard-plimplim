import { normalizeAdsetName } from './adsetLocations';

/**
 * Overrides MANUALES de "Campaña" por nombre exacto de ad set.
 *
 * Por qué existe esto: a veces el nombre real de la campaña en Meta no
 * refleja una etiqueta de negocio que sí importa mostrar en el dashboard
 * (ej. una colaboración de marca puntual, como Bandai, corriendo dentro de
 * una campaña con nombre genérico). Esto NO cambia nada en Meta — solo
 * reemplaza la etiqueta "Campaña" que se muestra en el dashboard para esos
 * ad sets puntuales. El resto de la lógica (clasificación por país, por
 * línea de negocio, el campaignId real para filtros, etc.) sigue usando el
 * nombre REAL de la campaña sin tocar.
 *
 * Cómo agregar una nueva: sumá una línea acá con el nombre EXACTO del ad set
 * tal como aparece en Meta (no hace falta preocuparse por mayúsculas, tildes
 * o espacios dobles — se normaliza igual que el resto del sistema).
 */
const CAMPAIGN_LABEL_OVERRIDES: Record<string, string> = {
  'MX_MF_28-45_FBIG_INT_AMPLIA_SQUISHYS': 'BANDAI',
  'MX_MF_28-45_FBIG_BRO_AMPLIA_ BUMP AND GO': 'BANDAI',
  'MX_MF_28-45_FBIG_INT_AMPLIA_JUGUETRON': 'BANDAI',
  'MX_MF_28-45_FBIG_INT_AMPLIA_SEARS': 'BANDAI',
  'MX_MF_28-45_FBIG_BRO_AMPLIA_FIGURAS': 'BANDAI',
};

const NORMALIZED_OVERRIDES = new Map<string, string>(
  Object.entries(CAMPAIGN_LABEL_OVERRIDES).map(([adsetName, label]) => [
    normalizeAdsetName(adsetName),
    label,
  ])
);

/**
 * Devuelve la etiqueta de campaña a MOSTRAR para un ad set — el override si
 * existe uno para ese ad set puntual, o si no, el nombre real de la campaña
 * tal como viene de Meta.
 */
export function getCampaignLabel(adsetName: string, realCampaignName: string): string {
  const override = NORMALIZED_OVERRIDES.get(normalizeAdsetName(adsetName));
  return override || realCampaignName;
}
