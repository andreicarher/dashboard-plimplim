/**
 * Tipo de cambio en vivo ARS -> USD, usando open.er-api.com (gratuita, sin API key,
 * cubre 160+ monedas incluyendo ARS). Frankfurter (la opción anterior) no incluye
 * el peso argentino en su set de monedas soportadas, por eso se cambió de proveedor.
 */
export async function fetchArsToUsdRate(): Promise<number> {
  const res = await fetch('https://open.er-api.com/v6/latest/USD', {
    cache: 'no-store',
  });

  if (!res.ok) {
    throw new Error('No se pudo obtener el tipo de cambio USD/ARS');
  }

  const json = await res.json();
  const usdToArs = json.rates?.ARS;

  if (!usdToArs || typeof usdToArs !== 'number') {
    throw new Error('La respuesta del servicio de tipo de cambio no incluyó ARS');
  }

  // Queremos ARS -> USD, que es el inverso de USD -> ARS.
  return 1 / usdToArs;
}

