import { useSyncExternalStore } from 'react'

import { fetchLikes, getClient, subscribe as subscribirSesion, toggleLike } from './portal'

/**
 * Los inmuebles que alguien ha marcado con el corazon.
 *
 * ────────────────────────────────────────────────────────────────────────────
 * EL CORAZON PIDE CUENTA, Y LA PIDE EN EL MOMENTO DE PULSARLO
 *
 * Una lista de favoritos que solo vive en el navegador no es una lista: se
 * pierde al cambiar de telefono, no la ve el asesor que atiende a esa persona y
 * no se puede retomar desde el ordenador del trabajo. Guardar algo significa
 * poder volver a buscarlo, y para eso tiene que haber un sitio donde esperarlo.
 *
 * Asi que sin sesion el corazon no marca: abre la entrada. Y no manda a otra
 * pagina —es el mismo dialogo de "publicar inmueble", por el mismo motivo—,
 * porque quien esta comparando doce fichas no quiere perder la lista que tiene
 * delante.
 *
 * Lo que SI se guarda es el gesto: el codigo que se iba a marcar queda en
 * `pendiente`, y en cuanto hay sesion se marca solo. Pedir la cuenta y despues
 * obligar a buscar otra vez la ficha para repetir el clic es cobrar dos veces
 * por lo mismo.
 *
 * ────────────────────────────────────────────────────────────────────────────
 * POR QUE UN MODULO CON ESTADO Y NO UN CONTEXTO
 *
 * El corazon se pinta en cada tarjeta: en una rejilla de doce, doce veces, y en
 * el buscador se vuelve a pintar al mover el mapa. Con un contexto, marcar uno
 * repinta el arbol entero por debajo del proveedor. Con un `Set` en el modulo y
 * `useSyncExternalStore`, solo se repintan los corazones. Es el mismo patron que
 * `portal.ts`, y por el mismo motivo.
 *
 * El `Set` se reemplaza entero en cada cambio, nunca se muta: `useSyncExternalStore`
 * compara por identidad y una mutacion in situ no se notaria.
 */

let codigos: ReadonlySet<string> = new Set()

/**
 * Si la lista de la cuenta ya llego.
 *
 * Hace falta porque "todavia no se" y "no hay ninguno" se ven igual —un `Set`
 * vacio— y no significan lo mismo. La pantalla de favoritos cruza la lista de
 * fichas del servidor con estos codigos, y sin esto, cuando las fichas llegaban
 * primero, enseñaba "no has guardado nada" durante un instante a alguien que
 * tiene ocho guardados.
 */
let cargado = false

/**
 * Si hay que enseñar la entrada, y que se iba a marcar al terminar.
 *
 * Vive aqui y no en el boton porque en una pagina hay quince corazones: con el
 * dialogo dentro de cada uno se montarian quince, y el que se abriera seria el
 * de la tarjeta pulsada en lugar de "el" de la pagina. Uno solo, en la raiz,
 * mandado desde aqui.
 */
let pendiente: string | null = null

const oyentes = new Set<() => void>()
const avisar = () => oyentes.forEach((oyente) => oyente())

function suscribir(oyente: () => void): () => void {
  oyentes.add(oyente)
  return () => oyentes.delete(oyente)
}

// --- lectura ---------------------------------------------------------------

const leerCodigos = () => codigos

/** Los codigos marcados. Vacio mientras no haya sesion. */
export function useMeGusta(): ReadonlySet<string> {
  return useSyncExternalStore(suscribir, leerCodigos, leerCodigos)
}

const leerCargado = () => cargado
const sinCargar = () => false

/** Si la lista de la cuenta ya llego. Ver `cargado`. */
export function useMeGustaCargado(): boolean {
  return useSyncExternalStore(suscribir, leerCargado, sinCargar)
}

const leerPuerta = () => pendiente !== null
const puertaCerrada = () => false

/** Si ahora mismo hay que enseñar la entrada por culpa de un corazon. */
export function usePuertaMeGusta(): boolean {
  // En el servidor nunca: el dialogo es consecuencia de un clic.
  return useSyncExternalStore(suscribir, leerPuerta, puertaCerrada)
}

/** Cierra la entrada sin marcar nada: se pulso "cerrar", no "entrar". */
export function cerrarPuertaMeGusta(): void {
  pendiente = null
  avisar()
}

// --- escritura -------------------------------------------------------------

function fijar(valor: ReadonlySet<string>): void {
  codigos = valor
  avisar()
}

/** La lista que acaba de llegar de la cuenta. */
function fijarCargado(valor: ReadonlySet<string>): void {
  cargado = true
  fijar(valor)
}

/**
 * Marca o desmarca.
 *
 * Sin sesion abre la entrada y deja el codigo apuntado; devuelve `false` para
 * que quien llama sepa que no hay nada que celebrar todavia.
 *
 * Con sesion cambia el estado ANTES de llamar a la API: el corazon tiene que
 * responder al dedo, no a la red. Si el servidor falla se deshace.
 */
export async function alternarMeGusta(code: string): Promise<boolean> {
  if (!getClient()) {
    pendiente = code
    avisar()
    return false
  }

  const antes = codigos
  const despues = new Set(antes)
  if (despues.has(code)) despues.delete(code)
  else despues.add(code)
  fijar(despues)

  try {
    await toggleLike(code)
    return true
  } catch {
    fijar(antes)
    throw new Error('no se pudo guardar')
  }
}

// --- sincronizacion con la cuenta -----------------------------------------

/** Para no volver a pedir la lista en cada renovacion de token de la misma sesion. */
let cuentaCargada: string | null = null

/**
 * Engancha el corazon a la sesion del portal.
 *
 * Se llama una vez desde la raiz. Al aparecer una cuenta trae su lista y, si se
 * habia quedado un corazon a medias, lo marca. Al desaparecer vacia la lista:
 * los favoritos son de quien entro, y dejarlos pintados despues de salir seria
 * enseñar lo que guardo el anterior en un ordenador compartido.
 */
export function vigilarSesionMeGusta(): () => void {
  const alCambiar = () => {
    const cliente = getClient()

    if (!cliente) {
      cuentaCargada = null
      cargado = false
      if (codigos.size) fijar(new Set())
      return
    }
    if (cuentaCargada === cliente.id) return
    cuentaCargada = cliente.id

    const aMarcar = pendiente
    pendiente = null

    fetchLikes()
      .then(async (desdeElServidor) => {
        const lista = new Set(desdeElServidor)
        /* El corazon que quedo a medias, ahora que ya hay donde guardarlo. */
        if (aMarcar && !lista.has(aMarcar)) {
          lista.add(aMarcar)
          fijarCargado(lista)
          await toggleLike(aMarcar).catch(() => {
            const sinEl = new Set(lista)
            sinEl.delete(aMarcar)
            fijar(sinEl)
          })
          return
        }
        fijarCargado(lista)
      })
      .catch(() => {
        /* Se reintenta en el siguiente cambio de sesion. */
        cuentaCargada = null
        avisar()
      })
  }

  alCambiar()
  return subscribirSesion(alCambiar)
}
