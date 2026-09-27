/**
 * `?worker&url` devuelve la direccion del fichero emitido, no el modulo.
 * TypeScript no conoce ese sufijo por su cuenta.
 */
declare module '*?worker&url' {
  const url: string
  export default url
}
