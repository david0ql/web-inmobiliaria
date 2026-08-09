import { Building2, CalendarClock, Layers, KeyRound } from 'lucide-react'
import { Link } from 'react-router-dom'

import { Badge } from '@/components/ui/misc'
import { price } from '@/lib/format'
import {
  FAMILY_KIND_LABEL,
  FAMILY_STATUS_COLOR,
  FAMILY_STATUS_LABEL,
  projectPath,
  type ProjectSummary,
} from '@/lib/projects'

/**
 * La tarjeta del listado de proyectos, con la misma anatomia que la de inmueble
 * —portada de 280px, etiqueta de estado encima, franja de cifras, rotulo, y
 * barra de accion abajo— para que las dos rejillas del sitio se lean igual.
 *
 * Lo que cambia es el contenido: un proyecto no tiene precio, tiene un "desde";
 * y no tiene area, tiene tipologias y unidades libres.
 */
export function ProjectCard({ project }: { project: ProjectSummary }) {
  const to = projectPath(project)
  const place = [project.zone?.name, project.city?.name]
    .filter(Boolean)
    .join(' · ')

  return (
    <article className="group flex flex-col overflow-hidden rounded-lg border bg-card shadow-sm transition-shadow hover:shadow-md">
      <figure className="relative m-0">
        <Link to={to} className="block">
          <div className="relative h-[280px] overflow-hidden bg-secondary">
            {project.coverUrl ? (
              /*
                Las tres variantes, no solo la que venga guardada.

                La portada se guarda apuntando a una foto concreta del proyecto,
                y si esa es la de 1600 px el navegador se la baja entera para
                una tarjeta de 400: cinco proyectos eran 1,2 MB de portada. Con
                el `srcset` derivado del propio nombre, el navegador coge la que
                le sirve — la de 560 en escritorio.
              */
              <img
                src={coverVariant(project.coverUrl, 'm')}
                srcSet={[
                  `${coverVariant(project.coverUrl, 't')} 560w`,
                  `${coverVariant(project.coverUrl, 'm')} 800w`,
                  `${coverVariant(project.coverUrl, 'l')} 1600w`,
                ].join(', ')}
                sizes="(min-width: 1024px) 400px, (min-width: 640px) 50vw, 100vw"
                alt={project.name}
                loading="lazy"
                decoding="async"
                className="size-full object-cover transition-transform duration-500 group-hover:scale-105"
              />
            ) : (
              <div className="flex size-full flex-col items-center justify-center gap-2 text-muted-foreground">
                <Building2 className="size-8" />
                <span className="text-xs">Sin fotografía</span>
              </div>
            )}

            {/* La cortina con el boton centrado solo aparece donde hay raton. */}
            <div className="absolute inset-0 hidden items-center justify-center bg-black/70 opacity-0 transition-opacity duration-300 group-hover:opacity-100 lg:flex">
              <span className="rounded-sm border-2 border-white px-3 py-2 text-xs font-bold tracking-wide text-white uppercase">
                Ver proyecto
              </span>
            </div>
          </div>
        </Link>

        <div className="absolute top-2.5 left-2.5">
          <Badge
            variant="tag"
            style={{ backgroundColor: FAMILY_STATUS_COLOR[project.status] }}
          >
            {FAMILY_STATUS_LABEL[project.status] ?? project.status}
          </Badge>
        </div>
      </figure>

      <Specs project={project} />

      <div className="flex flex-1 flex-col gap-2 p-4">
        <p className="truncate text-xs tracking-wide text-muted-foreground uppercase">
          {FAMILY_KIND_LABEL[project.kind] ?? 'Proyecto'}
          {project.developer ? ` · ${project.developer}` : ''}
        </p>
        <h2 className="line-clamp-2-title text-sm leading-snug font-semibold uppercase">
          <Link to={to} className="hover:underline">
            {project.name}
          </Link>
        </h2>
        {place && (
          <p className="line-clamp-2-title text-xs text-muted-foreground">
            {place}
          </p>
        )}
      </div>

      <div className="border-t px-4 py-3">
        {project.fromPrice ? (
          <p className="tabular text-xl leading-none font-normal tracking-tight">
            <small className="mr-1 text-[0.625rem] tracking-widest text-muted-foreground uppercase">
              Desde
            </small>
            {price(project.fromPrice)}
          </p>
        ) : (
          <p className="text-sm leading-none text-muted-foreground">
            Precio a consultar
          </p>
        )}
      </div>

      <Link
        to={to}
        className="border-t bg-primary py-3 text-center text-xs font-bold tracking-widest text-primary-foreground uppercase transition-opacity hover:opacity-90"
      >
        Ver proyecto
      </Link>
    </article>
  )
}

/**
 * Las cifras del proyecto, en una sola fila.
 *
 * Estaban en dos por dos y cada casilla decia la cifra y la palabra seguidas
 * —"1 tipología", "10 en total"—, que en una tarjeta de 340 px obligaba a
 * partir el texto. Aqui el numero va grande y la palabra debajo, pequena: se
 * lee de un vistazo, cabe entero y las columnas quedan repartidas a partes
 * iguales.
 *
 * Las columnas se cuentan en tiempo de ejecucion porque no todos los proyectos
 * traen las cuatro cifras —la fecha de entrega falta a menudo— y tres columnas
 * repartidas se ven bien; tres columnas y un hueco, no. Va en `style` y no en
 * una clase porque Tailwind no puede generar una clase que se decide al vuelo.
 */
function Specs({ project }: { project: ProjectSummary }) {
  const cifras = [
    project.unitTypeCount && {
      icon: Layers,
      valor: project.unitTypeCount,
      etiqueta: project.unitTypeCount === 1 ? 'tipología' : 'tipologías',
    },
    project.availableUnits && {
      icon: KeyRound,
      valor: project.availableUnits,
      etiqueta: project.availableUnits === 1 ? 'disponible' : 'disponibles',
    },
    project.totalUnits && {
      icon: Building2,
      valor: project.totalUnits,
      etiqueta: 'en total',
    },
    project.deliveryYear && {
      icon: CalendarClock,
      valor: project.deliveryYear,
      etiqueta: 'entrega',
    },
  ].filter(Boolean) as {
    icon: typeof Layers
    valor: number
    etiqueta: string
  }[]

  if (!cifras.length) return null

  return (
    <div
      className="grid divide-x border-b bg-secondary/50"
      style={{ gridTemplateColumns: `repeat(${cifras.length}, minmax(0, 1fr))` }}
    >
      {cifras.map((cifra) => (
        <div
          key={cifra.etiqueta}
          className="flex min-w-0 flex-col items-center gap-0.5 px-1 py-2.5"
        >
          <cifra.icon className="size-3.5 shrink-0 text-muted-foreground" />
          <span className="tabular text-sm leading-none font-semibold">
            {cifra.valor}
          </span>
          <span className="w-full truncate text-center text-[10px] leading-none text-muted-foreground">
            {cifra.etiqueta}
          </span>
        </div>
      ))}
    </div>
  )
}

/**
 * La misma foto en otro tamaño.
 *
 * Las variantes solo se distinguen por el sufijo del fichero —`-t`, `-m`, `-l`,
 * `-o`— así que se derivan del nombre en lugar de guardar cuatro columnas. Si
 * la portada no sigue ese patrón se devuelve tal cual y no pasa nada.
 */
function coverVariant(url: string, size: 't' | 'm' | 'l'): string {
  return url.replace(/-[tmlo]\.webp$/, `-${size}.webp`)
}
