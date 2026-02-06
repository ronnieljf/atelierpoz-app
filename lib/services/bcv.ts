/**
 * Servicio para obtener información del Banco Central de Venezuela (BCV)
 */

export interface BcvRates {
  dolar: number;
  euro: number;
}

/**
 * Obtiene las tasas BCV (dólar y euro)
 * @returns {Promise<BcvRates>} Tasas dólar y euro, o { dolar: 0, euro: 0 } si hay error
 */
export async function getBcvRates(): Promise<BcvRates> {
  try {
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || '';
    const response = await fetch(`${backendUrl}/api/bcv/dolar`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      console.error('Error obteniendo tasas BCV:', response.status, response.statusText);
      return { dolar: 0, euro: 0 };
    }

    const result = await response.json();

    if (result.success) {
      return {
        dolar: typeof result.dolar === 'number' ? result.dolar : 0,
        euro: typeof result.euro === 'number' ? result.euro : 0,
      };
    }

    return { dolar: 0, euro: 0 };
  } catch (error) {
    console.error('Error en getBcvRates:', error);
    return { dolar: 0, euro: 0 };
  }
}

/**
 * Obtiene el valor del dólar del BCV (compatibilidad)
 * @returns {Promise<number>} El valor del dólar como número, o 0 si hay error
 */
export async function getDolarValue(): Promise<number> {
  const rates = await getBcvRates();
  return rates.dolar;
}
