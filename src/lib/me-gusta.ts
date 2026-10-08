import { useSyncExternalStore } from 'react'

import {
  fetchLikes,
  getClient,
  mergeLikes,
  subscribe as subscribirSesion,
  toggleLike,
} from './portal'

/**
 * Los inmuebles que alguien ha marcado con el corazon.
 *
 * ────────────────────────────────────────────────────────────────────────────
 * POR QUE EL CORAZON FUNCIONA SIN CUENTA
 *
 * Lo evidente seria exigir sesion: el corazon vive en la cuenta, asi que sin
 * cuenta no hay corazon. Pero el corazon se pulsa en el minuto dos de la
 * primera visita, mirando la cuarta ficha, y ahi nadie se registra. Un boton que
 * contesta "crea una cuenta" es un boton que no se vuelve a pulsar, y entonces
 * la agencia no tiene ni la lista ni el ranking.
 *
 * Asi que el corazon marca siempre y el navegador es el primer sitio donde se
 * guarda. Cuando aparece una sesion —sea porque la persona entra o porque al
 * recargar se renueva sola— lo guardado sube a la cuenta y se une con lo que ya
 * hubiera. A partir de ahi manda el servidor, que es lo que se ve desde el
 * movil, desde el ordenador y desde el panel.
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

const CLAVE = 'serrano.me-gusta'

let codigos: ReadonlySet<string> = leerDelNavegador()

const oyentes = new Set<() => void>()
const avisar = () => oyentes.forEach((oyente) => oyente())

/**
 * Lo guardado en este navegador.
 *
 * Entre `try` porque `localStorage` lanza —no devuelve vacio— en modo privado de
 * Safari y con las cookies de terceros bloqueadas. Un corazon no es motivo para
 * dejar la pagina en blanco.
 */
function leerDelNavegador(): ReadonlySet<string> {
  if (typeof window === 'undefined') return new Set()
  try {
    const crudo = window.localStorage.getItem(CLAVE)
    const lista: unknown = crudo ? JSON.parse(crudo) : []
    return new Set(
      Array.isArray(lista) ? lista.filter((x): x is string => typeof x === 'string') : [],
    )
  } catch {
    return new Set()
  }
}

function escribirEnNavegador(valor: ReadonlySet<string>): void {
  try {
    window.localStorage.setItem(CLAVE, JSON.stringify([...valor]))
  } catch {
    /* Sin sitio o sin permiso: el corazon sigue funcionando en esta pestaña. */
  }
}

function fijar(valor: ReadonlySet<string>): void {
  codigos = valor
  escribirEnNavegador(valor)
  avisar()
}

// --- lectura ---------------------------------------------------------------

function suscribir(oyente: () => void): () => void {
  oyentes.add(oyente)
  return () => oyentes.delete(oyente)
}

const leer = () => codigos

/** Los codigos marcados, para la pantalla de favoritos y para el contador. */
export function useMeGusta(): ReadonlySet<string> {
  return useSyncExternalStore(suscribir, leer, leer)
}

// --- escritura -------------------------------------------------------------

/**
 * Marca o desmarca, al instante.
 *
 * El estado cambia antes de llamar a la API a proposito: el corazon tiene que
 * responder al dedo, no a la red. Si el servidor falla se deshace y se devuelve
 * `false`, para que quien llama pueda avisar.
 *
 * Sin sesion no hay a quien llamar y se queda en el navegador: no es un fallo,
 * es el caso normal de la primera visita.
 */
export async function alternarMeGusta(code: string): Promise<boolean> {
  const antes = codigos
  const despues = new Set(antes)
  if (despues.has(code)) despues.delete(code)
  else despues.add(code)
  fijar(despues)

  if (!getClient()) return true

  try {
    await toggleLike(code)
    return true
  } catch {
    fijar(antes)
    return false
  }
}

/** Si un inmueble esta marcado, sin suscribirse. Para el render del servidor. */
export function estaMarcado(code: string): boolean {
  return codigos.has(code)
}

// --- sincronizacion con la cuenta -----------------------------------------

/** Para no volver a unir en cada renovacion de token de la misma sesion. */
let cuentaUnida: string | null = null

/**
 * Engancha el corazon a la sesion del portal.
 *
 * Se llama una vez desde la raiz. Al aparecer una cuenta, sube lo que hubiera en
 * el navegador y se queda con lo que devuelve el servidor —la union—. Al
 * desaparecer, NO borra nada: lo marcado desde este navegador sigue siendo de
 * quien lo marco, y vaciarselo al salir seria castigarle por salir.
 */
export function vigilarSesionMeGusta(): () => void {
  const alCambiar = () => {
    const cliente = getClient()

    if (!cliente) {
      cuentaUnida = null
      return
    }
    if (cuentaUnida === cliente.id) return
    cuentaUnida = cliente.id

    const locales = [...codigos]
    /*
      Si no hay nada que subir se pregunta en lugar de unir: un `PUT` con lista
      vacia hace lo mismo que el `GET`, pero escribe donde no hace falta.
    */
    const peticion = locales.length ? mergeLikes(locales) : fetchLikes()
    peticion
      .then((desdeElServidor) => fijar(new Set(desdeElServidor)))
      .catch(() => {
        /* Se reintenta en el siguiente cambio de sesion; lo local sigue ahi. */
        cuentaUnida = null
      })
  }

  alCambiar()
  return subscribirSesion(alCambiar)
}
