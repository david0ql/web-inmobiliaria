/**
 * El plan de pagos que se enseña en la ficha.
 *
 * NO es una oferta ni una tabla de amortización: es la cuenta que cualquiera
 * hace en una servilleta antes de llamar —cuánto de entrada, cuánto al mes y
 * cuánto queda para el banco— y sirve para llegar a la cita con una cifra
 * concreta en la cabeza en vez de con "a ver qué me dicen".
 *
 * Por eso no hay intereses: meter una tasa aquí lo convertiría en una
 * simulación de crédito, y eso es un producto financiero que la agencia no
 * vende y que además cambia cada semana. El crédito se pide aparte, en su
 * formulario, donde sí lo estudia un banco.
 */
export interface PlanEntrada {
  /** El precio del inmueble, en pesos. */
  precio: number
  /** Qué parte se paga de entrada, entre 0 y 1. */
  porcentajeInicial: number
  /** En cuántas cuotas se reparte esa entrada. */
  meses: number
}

export interface Plan {
  precio: number
  /** Lo que se aparta para reservar: el 1 % de la cuota inicial, mínimo. */
  separacion: number
  /** La entrada completa, separación incluida. */
  cuotaInicial: number
  /** Lo que se paga cada mes hasta completar la entrada. */
  mensual: number
  meses: number
  /** Lo que queda al final: crédito, subsidio o recursos propios. */
  saldoFinal: number
  porcentajeInicial: number
}

/** Lo que la agencia suele pedir de entrada en obra nueva. */
export const INICIAL_POR_DEFECTO = 0.3
export const MESES_POR_DEFECTO = 12

/*
  La separación no es un porcentaje del precio sino un pellizco de la entrada:
  es lo que se firma el mismo día para apartar el inmueble, y en la práctica
  ronda el diez por ciento de la inicial.
*/
const PARTE_SEPARACION = 0.1

export function calcularPlan({
  precio,
  porcentajeInicial,
  meses,
}: PlanEntrada): Plan {
  const cuotaInicial = Math.round(precio * porcentajeInicial)
  const separacion = Math.round(cuotaInicial * PARTE_SEPARACION)

  // Las cuotas reparten lo que queda de la entrada DESPUÉS de la separación:
  // sumarla otra vez haría pagar dos veces lo mismo.
  const aCuotas = Math.max(0, cuotaInicial - separacion)
  const mensual = meses > 0 ? Math.round(aCuotas / meses) : aCuotas

  return {
    precio,
    separacion,
    cuotaInicial,
    mensual,
    meses,
    saldoFinal: Math.max(0, precio - cuotaInicial),
    porcentajeInicial,
  }
}

/**
 * El plan, escrito para que quepa en el mensaje de una solicitud de visita.
 *
 * Va en texto y no en campos aparte porque su destino es la bandeja del
 * asesor, que lo lee como leería una nota: "viene pensando en 30 % de entrada
 * a 12 meses". Guardarlo en columnas nuevas obligaría a una migración por cada
 * cosa que la agencia decida preguntar mañana.
 */
export function planComoNota(
  plan: Plan,
  t: (key: string, vars?: Record<string, string | number>) => string,
  dinero: (valor: number) => string,
): string {
  return t('plan.note', {
    porcentaje: Math.round(plan.porcentajeInicial * 100),
    inicial: dinero(plan.cuotaInicial),
    separacion: dinero(plan.separacion),
    meses: plan.meses,
    mensual: dinero(plan.mensual),
    saldo: dinero(plan.saldoFinal),
  })
}
