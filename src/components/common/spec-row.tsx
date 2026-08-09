import type { LucideIcon } from 'lucide-react'

export interface Spec {
  icon: LucideIcon
  /** La cifra. Si es nula o cero, la columna no se pinta. */
  value: string | number | null | undefined
  /** La palabra que la acompaña: "alcobas", "en total". Se corta si no cabe. */
  unit?: string
}

/**
 * La franja de cifras de una tarjeta: una fila, columnas iguales, sin saltos.
 *
 * Es lo que se mira antes que el titulo y despues de la foto, asi que tiene que
 * leerse de un vistazo y ocupar lo minimo. De ahi las cuatro decisiones:
 *
 *  - Una sola fila. En dos por dos la franja medía sesenta y pico pixeles y
 *    empujaba el precio fuera de la tarjeta; en una linea son treinta.
 *  - Sin fondo gris ni lineas entre columnas. El recuadro le daba a cuatro
 *    cifras el peso de una tabla, y compite con la foto y con el precio, que es
 *    lo que de verdad decide. Separan el aire y las dos lineas de la tarjeta,
 *    que ya estaban. El alto se iguala al del pie del precio para que los dos
 *    extremos de la tarjeta pesen lo mismo.
 *  - El icono y la cifra van seguidos, no apilados. Apilar el numero sobre la
 *    palabra se lee bien pero triplica el alto, que era justo el problema.
 *  - Las columnas se cuentan al vuelo: no todos los inmuebles tienen garaje ni
 *    todos los proyectos fecha de entrega, y cuatro columnas repartidas se ven
 *    bien mientras que tres y un hueco, no. Va en `style` porque Tailwind no
 *    puede generar una clase que se decide en tiempo de ejecucion.
 *
 * La palabra se pinta si cabe y se corta si no; el icono sostiene el
 * significado, y el texto completo queda en el `title` para quien lo necesite.
 */
export function SpecRow({ specs }: { specs: Spec[] }) {
  const visibles = specs.filter((spec) => spec.value)

  if (!visibles.length) return null

  return (
    <div
      className="grid border-b px-2 py-3 text-[11px]"
      style={{
        gridTemplateColumns: `repeat(${visibles.length}, minmax(0, 1fr))`,
      }}
    >
      {visibles.map((spec) => {
        const texto = spec.unit ? `${spec.value} ${spec.unit}` : `${spec.value}`
        return (
          <div
            key={texto}
            title={texto}
            className="flex min-h-5 min-w-0 items-center justify-center gap-1 px-1 text-muted-foreground"
          >
            <spec.icon className="size-3.5 shrink-0" aria-hidden="true" />
            <span className="tabular truncate text-foreground">{texto}</span>
          </div>
        )
      })}
    </div>
  )
}
