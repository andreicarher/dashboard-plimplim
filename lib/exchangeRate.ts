/**
 * Tipo de cambio en vivo ARS -> USD, usando la API pública y gratuita de Frankfurter
 * (frankfurter.dev, datos del Banco Central Europeo). No requiere API key.
 */
export async function fetchArsToUsdRate(): Promise<number> {
  const res = await fetch('https://api.frankfurter.dev/v1/latest?base=USD&symbols=ARS', {
    cache: 'no-store',
  });

  if (!res.ok) {
    throw new Error('No se pudo obtener el tipo de cambio USD/ARS');
  }

  const json = await res.json();
  const usdToArs = json.rates?.ARS;

  if (!usdToArs || typeof usdToArs !== 'number') {
    throw new Error('Respuesta inesperada del servicio de tipo de cambio');
  }

  // Queremos ARS -> USD, que es el inverso de USD -> ARS.
  return 1 / usdToArs;
}
