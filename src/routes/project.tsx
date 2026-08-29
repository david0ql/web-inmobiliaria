import { Check, MapPin } from 'lucide-react'
import { useMemo, useState } from 'react'
import type { LoaderFunctionArgs } from 'react-router-dom'
import { useLocation } from 'react-router-dom'
import { useLoaderData } from 'react-router-dom'
import { Link } from '@/lib/nav'

import { Lightbox } from '@/components/common/lightbox'
import { PaymentPlan } from '@/components/property/payment-plan'
import { UnitPhotos } from '@/components/project/unit-photos'
import { AgentPanel } from '@/components/property/agent-panel'
import { PropertyMap } from '@/components/property/property-map'
import { SpecTable } from '@/components/property/spec-table'
import { VisitForm } from '@/components/property/visit-form'
import { Badge } from '@/components/ui/misc'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useCatalogo } from '@/lib/catalog-i18n'
import { useCurrency } from '@/lib/currency'
import { area as fmtArea, number as fmtNumber } from '@/lib/format'
import {
  agruparPorTipologia,
  areaDe,
  esSuelo,
  FAMILY_STATUS_COLOR,
  FAMILY_STATUS_LABEL,
  getProject,
  PROJECTS_PATH,
  type ProjectDetail,
  type UnitTypeGroup,
  type UnitTypeSummary,
} from '@/lib/projects'
import { useIdioma, useT, type Idioma } from '@/lib/i18n'
import { useSeo } from '@/lib/use-seo'
import { ROUTES, SITE } from '@/lib/site'
import type { Property, PropertyType } from '@/lib/types'

export async function loader({
  params,
}: LoaderFunctionArgs): Promise<ProjectDetail> {
  return getProject(params.slug as string)
}

/**
 * El proyecto, contado como se cuenta un inmueble.
 *
 * Antes era otra cosa: tablas, cifras sueltas y ninguna accion. Pero quien
 * entra aqui viene de ver fichas y ya sabe leerlas —fotos arriba, precio
 * debajo, detalles, mapa y el asesor a un lado—, asi que la pagina usa esas
 * mismas piezas y no unas propias que hay que aprender.
 *
 * Lo unico que cambia es el desplegable: un proyecto no tiene UN precio ni UNAS
 * alcobas, tiene tantos como tipologias. Al elegir una se recalcula la ficha
 * entera —precio, detalles, mapa, asesor y formulario de visita— sin salir de
 * la pagina.
 *
 * Se elige en dos pasos y no en uno porque son dos preguntas distintas: primero
 * QUE se compra —el "Tipo A", con su rango de area y su precio desde— y solo
 * despues CUAL de las que quedan, que es lo que decide el precio exacto y sobre
 * lo que se agenda la visita. Antes el unico desplegable listaba las unidades
 * sueltas, asi que un proyecto de once apartamentos casi iguales pedia elegir
 * entre once lineas parecidas sin decir en ningun sitio cuantas formas
 * distintas habia.
 */
export function ProjectPage() {
  const { family, unitTypes, properties, amenities } =
    useLoaderData() as ProjectDetail
  const [tipologiaId, setTipologiaId] = useState('0')
  const [selectedId, setSelectedId] = useState('')
  const [portadaAbierta, setPortadaAbierta] = useState(false)
  const { precio, moneda } = useCurrency()
  const { pathname } = useLocation()
  const t = useT()
  const { idioma } = useIdioma()
  const { tipo } = useCatalogo()

  const grupos = useMemo(
    () => agruparPorTipologia(unitTypes, properties),
    [unitTypes, properties],
  )

  const grupo = grupos[Number(tipologiaId)] ?? grupos[0]

  /*
    La unidad elegida, o la que abre la tipologia.

    Al cambiar de tipologia la anterior deja de existir en la nueva, y en vez de
    resetear el estado con un efecto se cae sola a la destacada: la mas barata
    de las libres, que es la que sostiene el "desde" que se acaba de leer.
  */
  const selected = useMemo(
    () =>
      grupo?.unidades.find((p) => p.id === selectedId) ?? destacada(grupo),
    [grupo, selectedId],
  )

  /*
    Lo que de verdad se esta mirando de la tipologia: cuantas quedan y desde
    cuanto. El "desde" solo aparece si hay mas de una unidad; con una sola, el
    precio de abajo YA es ese numero y repetirlo hace dudar de si son dos cifras
    distintas. Si no queda ninguna libre y no hay precio, no se pinta el hueco.
  */
  const oferta = grupo
    ? [
        grupo.tipologia.available > 0
          ? t(
              grupo.tipologia.available === 1
                ? 'project.unitType.available.one'
                : 'project.unitType.available.other',
              { count: fmtNumber(grupo.tipologia.available, idioma) },
            )
          : null,
        grupo.unidades.length > 1 && grupo.tipologia.minPrice
          ? `${t('project.price.from')} ${precio(grupo.tipologia.minPrice)}`
          : null,
      ]
        .filter(Boolean)
        .join(' · ')
    : ''

  /*
    Arriba, una sola foto: la del proyecto.

    Es la que dice donde estas, y no tiene por que cambiar al cambiar de unidad
    —el edificio es el mismo—. Las fotos del interior van abajo, pegadas al
    desplegable que las decide. Si el proyecto no tiene portada cargada se usa
    la de la unidad con mas fotos, que en la practica es una aerea del conjunto.
  */
  const portada = useMemo(() => {
    if (family.coverUrl) return family.coverUrl
    const mejor = properties.reduce(
      (mejor, property) =>
        (property.images?.length ?? 0) > (mejor?.images?.length ?? 0)
          ? property
          : mejor,
      properties[0],
    )
    const imagen = mejor?.images?.[0]
    return imagen?.urlLarge ?? imagen?.url ?? null
  }, [family.coverUrl, properties])

  const place = [family.zone?.name, family.city?.name, family.city?.region?.name]
    .filter(Boolean)
    .join(' · ')

  /*
    El proyecto tambien necesita su cabecera: sin ella heredaba la generica del
    armazon —en español y hablando de la portada— y las dos versiones no se
    declaraban hermanas.
  */
  useSeo({
    title: t('page.project.seo.title', {
      name: family.name,
      place: family.city?.name ?? '',
      site: SITE.name,
    }),
    description: t('page.project.seo.description', {
      name: family.name,
      place: place || SITE.name,
    }),
    canonical: SITE.url + pathname,
    image: portada ?? undefined,
  })

  return (
    <div className="container-site py-8">
      <header className="mb-6">
        <p className="mb-2 flex flex-wrap items-center gap-2 text-xs tracking-widest text-muted-foreground uppercase">
          <Link to={PROJECTS_PATH} className="hover:underline">
            {t('nav.projects')}
          </Link>
          <span aria-hidden="true">·</span>
          <Badge
            variant="tag"
            style={{ backgroundColor: FAMILY_STATUS_COLOR[family.status] }}
          >
            {t(FAMILY_STATUS_LABEL[family.status] ?? family.status)}
          </Badge>
        </p>

        <h1 className="tt-square text-xl leading-tight font-semibold uppercase sm:text-2xl">
          {family.name}
        </h1>

        {(place || family.address) && (
          <p className="mt-3 flex items-start gap-1.5 text-sm text-muted-foreground">
            <MapPin className="mt-0.5 size-4 shrink-0" />
            <span className="min-w-0">
              {[family.address, place].filter(Boolean).join(' · ')}
            </span>
          </p>
        )}

        {family.developer && (
          <p className="mt-1 text-sm text-muted-foreground">
            {t('project.developer')}{' '}
            <span className="font-medium">{family.developer}</span>
          </p>
        )}
      </header>

      <div className="grid gap-8 lg:grid-cols-12">
        <div className="flex min-w-0 flex-col gap-8 lg:col-span-8 xl:col-span-9">
          {portada && (
            <>
              {/* La portada tambien se amplia: esta recortada a 420 px de alto
                  y es la unica foto del conjunto entero. */}
              <button
                type="button"
                onClick={() => setPortadaAbierta(true)}
                aria-label={t('project.cover.zoom', { name: family.name })}
                className="block cursor-zoom-in overflow-hidden rounded-lg border bg-secondary"
              >
                <img
                  src={portada}
                  alt={family.name}
                  className="h-[240px] w-full object-cover sm:h-[340px] lg:h-[420px]"
                />
              </button>
              <Lightbox
                images={[
                  {
                    id: 'portada',
                    url: portada,
                    urlMedium: portada,
                    urlLarge: portada,
                    urlOriginal: portada,
                    description: family.name,
                    position: 1,
                    isMain: true,
                    width: null,
                    height: null,
                  },
                ]}
                index={portadaAbierta ? 0 : null}
                onIndex={(i) => setPortadaAbierta(i !== null)}
                title={family.name}
              />
            </>
          )}

          {selected ? (
            <>
              {/*
                Elegir y ver, uno al lado del otro.

                Antes iban apilados —desplegable, fotos, precio— y para
                comparar dos tipologias habia que elegir arriba, bajar a mirar
                las fotos y seguir bajando hasta el precio: tres pantallas para
                una sola decision. En rejilla, cambiar de tipologia cambia a la
                vez lo que se lee y lo que se ve.
              */}
              <div className="grid gap-5 lg:h-[420px] lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)]">
                <div className="flex flex-col gap-4 lg:h-full">
                  <div className="rounded-lg border bg-card p-5 shadow-sm">
                    <label
                      htmlFor="tipologia"
                      className="mb-1.5 block text-xs tracking-widest text-muted-foreground uppercase"
                    >
                      {t('project.units.label')}
                    </label>
                    <Select
                      value={String(grupos.indexOf(grupo))}
                      onValueChange={setTipologiaId}
                      disabled={grupos.length === 1}
                    >
                      <SelectTrigger
                        id="tipologia"
                        aria-label={t('project.unitType.aria')}
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {grupos.map((g, i) => (
                          <SelectItem key={i} value={String(i)}>
                            {etiquetaTipologia(g, t, idioma, tipo)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    {/*
                      Lo que de verdad se esta mirando: cuantas quedan y desde
                      cuanto. El "desde" solo aparece si hay mas de una unidad;
                      con una sola, el precio de abajo YA es ese numero y
                      repetirlo hace dudar de si son dos cifras distintas.
                    */}
                    {oferta && (
                      <p className="mt-2.5 text-xs text-muted-foreground">
                        {oferta}
                      </p>
                    )}

                    {/*
                      El segundo paso solo existe si hay algo que elegir. La
                      visita se agenda sobre una unidad concreta —la agenda y el
                      cupo son de ese inmueble—, asi que la tipologia sola no
                      basta.
                    */}
                    {grupo.unidades.length > 1 && (
                      <>
                        <label
                          htmlFor="unidad"
                          className="mt-4 mb-1.5 block text-xs tracking-widest text-muted-foreground uppercase"
                        >
                          {t('project.unit.label')}
                        </label>
                        <Select
                          value={selected.id}
                          onValueChange={setSelectedId}
                        >
                          <SelectTrigger
                            id="unidad"
                            aria-label={t('project.units.aria')}
                          >
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {grupo.unidades.map((property) => (
                              <SelectItem key={property.id} value={property.id}>
                                {etiqueta(property, precio, idioma)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </>
                    )}
                  </div>

                  {/*
                    La caja del precio ocupa lo que sobra y centra su contenido:
                    asi las dos columnas acaban a la misma altura sin que el
                    texto quede colgando arriba de una caja vacia.
                  */}
                  <div className="flex flex-1 flex-col justify-center rounded-lg border bg-secondary/40 px-5 py-4">
                    {/*
                      La unidad concreta, sin rotulo: "3 alcobas · 2 baños · 71
                      m²" se explica solo. Aqui va el area EXACTA y no el rango
                      —el rango ya se lee en el desplegable de arriba, y repetir
                      la misma linea dos veces a tres centimetros de distancia
                      hace dudar de si son dos cosas distintas—. En suelo se
                      queda en el area: un lote no tiene alcobas ni baños, y
                      pintarle "0 alcobas" es describirlo por lo que le falta a
                      un apartamento.
                    */}
                    {detallesUnidad(selected, t, idioma) && (
                      <p className="mb-3 text-sm font-medium">
                        {detallesUnidad(selected, t, idioma)}
                      </p>
                    )}

                    <p className="text-xs tracking-widest text-muted-foreground uppercase">
                      {t('property.spec.code')}
                    </p>
                    <p className="tabular text-lg font-semibold">
                      {selected.code}
                    </p>

                    <p className="mt-4 text-xs tracking-widest text-muted-foreground uppercase">
                      {t('property.price.sale')}
                    </p>
                    <p className="tabular text-2xl leading-tight font-normal tracking-tight">
                      {precio(selected.salePrice)}{' '}
                      <small className="text-xs text-muted-foreground">
                        {moneda}
                      </small>
                    </p>
                  </div>
                </div>

                {/*
                  Si la unidad elegida no tiene fotos cargadas se usan las de
                  otra de su MISMA tipologia: son el mismo apartamento en otro
                  piso, y un hueco en blanco no ayuda a nadie a decidir.
                */}
                <UnitPhotos
                  images={fotosDe(grupo, selected)}
                  title={`${family.name} · ${selected.code}`}
                />
              </div>

              {/*
                Lo que costaria de verdad, antes de hablar con nadie.

                Es la pregunta que sigue al precio —"¿y eso como se paga?"— y
                hasta ahora habia que llamar para saberlo. Lo que salga aqui
                viaja con la solicitud de visita, asi que el asesor llega a la
                cita sabiendo con que numeros venia pensando.
              */}
              {selected.salePrice ? (
                <PaymentPlan property={selected} />
              ) : null}

              {family.description && (
                <section>
                  <h2 className="mb-3 text-xs font-bold tracking-widest uppercase">
                    {t('property.section.description')}
                  </h2>
                  <p className="text-sm leading-relaxed whitespace-pre-line text-muted-foreground">
                    {family.description}
                  </p>
                </section>
              )}

              <section>
                <h2 className="mb-3 text-xs font-bold tracking-widest uppercase">
                  {t('project.section.unitDetails')}
                </h2>
                <SpecTable property={selected} />
              </section>
            </>
          ) : (
            <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed px-5 py-16 text-center">
              <p className="text-sm text-muted-foreground">
                {t('project.units.empty')}
              </p>
              <Button asChild variant="outline" size="sm">
                <Link to={ROUTES.sales}>{t('project.units.empty.action')}</Link>
              </Button>
            </div>
          )}

          {/*
            Las zonas comunes no salen de un campo del proyecto: son las
            caracteristicas EXTERNAS que comparten sus unidades, que es lo mismo
            dicho de otra manera. Ver `amenidades()` en la API.
          */}
          {amenities.length > 0 && (
            <section>
              <h2 className="mb-3 text-xs font-bold tracking-widest uppercase">
                {t('project.section.amenities')}
              </h2>
              <ul className="grid grid-cols-2 gap-x-4 gap-y-2.5 text-sm sm:grid-cols-3">
                {amenities.map((amenity) => (
                  <li
                    key={amenity.id}
                    className="flex min-w-0 items-center gap-2"
                  >
                    <Check
                      className="size-4 shrink-0 text-muted-foreground"
                      aria-hidden="true"
                    />
                    <span className="truncate">{amenity.name}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {selected && <PropertyMap property={selected} />}
        </div>

        {selected && (
          <aside className="flex min-w-0 flex-col gap-6 lg:col-span-4 xl:col-span-3">
            {/*
            Pegajoso mientras acompaña; suelto cuando estorba. Un `sticky` mas
            alto que la pantalla se clava arriba y su final no se alcanza, que
            es lo que pasaba al desplegarse el formulario de visita: en cuanto
            aparece, la columna se suelta y la pagina se desplaza como siempre.
          */}
          <div className="lg:sticky lg:top-24 lg:flex lg:flex-col lg:gap-6 lg:has-[#visit-firstName]:static">
              <AgentPanel property={selected} />
              <div className="rounded-lg border bg-card p-5 shadow-sm">
                {/*
                  La visita se agenda sobre la unidad elegida y no sobre el
                  proyecto: la agenda es del asesor que la tiene asignada y el
                  cupo depende de ese inmueble concreto. La `key` fuerza a
                  empezar de cero al cambiar: las horas libres de una unidad no
                  valen para otra.
                */}
                <VisitForm key={selected.id} property={selected} />
              </div>
            </div>
          </aside>
        )}
      </div>
    </div>
  )
}

type Traducir = (key: string, vars?: Record<string, string | number>) => string

/**
 * Lo que se lee en el desplegable de unidades: por lo que se elige UNA dentro
 * de la tipologia ya elegida.
 *
 * Ni el tipo de inmueble ni las alcobas: dentro de una tipologia son iguales en
 * todas y repetirlos en once lineas seguidas no distingue ninguna. Lo que
 * cambia de una a otra es el codigo, el area exacta y el precio.
 */
function etiqueta(
  property: Property,
  precio: (v: number | string | null | undefined) => string,
  idioma: Idioma,
): string {
  const area = areaDe(property)
  return [
    property.code,
    area ? fmtArea(area, idioma) : null,
    property.salePrice ? precio(property.salePrice) : null,
  ]
    .filter(Boolean)
    .join(' · ')
}

/**
 * Como se nombra una tipologia: "Tipo A · 3 alcobas · 73 – 75 m²".
 *
 * El rotulo se COMPONE aqui y no se coge de `tipologia.name`, aunque la base ya
 * guarde uno hecho con estas mismas piezas: ese viene siempre en español, y
 * pintarlo tal cual dejaba "Tipo A · 3 alcobas · 73 – 75 m²" en mitad del sitio
 * en ingles. Las piezas sueltas si se traducen — las alcobas por su clave, el
 * area por el formato del idioma, y el tipo de inmueble por identificador
 * (`catalog.propertyType.11`) para que corregir una tilde en el panel no rompa
 * la traduccion. `name` queda de ultimo recurso, para una tipologia tan vacia
 * que no haya con que componer nada.
 *
 * En suelo manda el area y no el codigo. "Tipo L1" no le dice nada a quien
 * compra un lote y ademas esconde lo unico que distingue un tramo de otro: para
 * una tipologia AUTO el rango ES la tipologia, asi que la cabecera es el tipo de
 * inmueble y el rango va detras.
 */
function etiquetaTipologia(
  grupo: UnitTypeGroup,
  t: Traducir,
  idioma: Idioma,
  tipo: (type?: PropertyType | null) => string | null,
): string {
  const { tipologia } = grupo
  const suelo = esSuelo(tipologia)

  const cabecera =
    tipologia.code && !suelo
      ? t('project.unitType.code', { code: tipologia.code })
      : (tipo(grupo.unidades[0]?.propertyType) ?? tipologia.propertyType)

  /*
    Sin los baños: van en la linea de la unidad, justo debajo, y aqui solo
    servian para empujar el rango de area fuera del desplegable. El area es lo
    que distingue una tipologia de otra —dos "3 alcobas" de 58 y de 89 m² no son
    lo mismo—, asi que es lo ultimo que puede caerse por truncado.
  */
  const compuesto = [
    cabecera,
    habitable(
      suelo ? null : tipologia.bedrooms,
      null,
      rangoArea(tipologia, idioma),
      t,
    ),
  ]
    .filter(Boolean)
    .join(' · ')

  return compuesto || tipologia.name || t('property.fallback.type')
}

/**
 * Lo que ES la unidad elegida: alcobas, baños y su area exacta. Nada mas.
 *
 * En suelo se queda sola el area. Un lote no tiene alcobas ni baños, y las
 * columnas de la base traen `null`, no cero: pintarlas como "0 alcobas" seria
 * describir un terreno por lo que le falta a un apartamento.
 */
function detallesUnidad(
  property: Property,
  t: Traducir,
  idioma: Idioma,
): string {
  const area = areaDe(property)
  return habitable(
    property.bedrooms,
    property.bathrooms,
    area ? fmtArea(area, idioma) : null,
    t,
  )
}

function habitable(
  bedrooms: number | null,
  bathrooms: number | null,
  area: string | null,
  t: Traducir,
): string {
  return [
    bedrooms ? t('property.spec.bedrooms.count', { count: bedrooms }) : null,
    bathrooms ? t('property.spec.bathrooms.count', { count: bathrooms }) : null,
    area,
  ]
    .filter(Boolean)
    .join(' · ')
}

/**
 * El area de una tipologia es un rango y no una cifra: el "Tipo A" mide 73 m²
 * en el segundo piso y 75 en el octavo. Cuando los dos extremos coinciden se
 * escribe una sola vez — "73 – 73 m²" se lee como un error.
 */
function rangoArea(tipologia: UnitTypeSummary, idioma: Idioma): string | null {
  const { minArea, maxArea } = tipologia
  if (minArea === null && maxArea === null) return null
  if (minArea === null || maxArea === null || minArea === maxArea)
    return fmtArea(minArea ?? maxArea, idioma)
  return `${fmtNumber(minArea, idioma)} – ${fmtArea(maxArea, idioma)}`
}

/**
 * La unidad con la que se abre una tipologia: la mas barata de las libres.
 *
 * Es la que sostiene el "desde" que se acaba de leer arriba; abrir por otra
 * hace que el precio grande no cuadre con el rotulo del desplegable. La API
 * manda su propia representante en `propertyId` y aun asi se calcula aqui, por
 * dos razones que no caducan:
 *
 *  - `minPrice` y `propertyId` no siempre son la misma unidad. Medido contra
 *    produccion: en 3 de 13 tipologias no lo eran, y en una el "desde" decia
 *    210 M mientras su representante costaba 320 M. Se esta corrigiendo aguas
 *    arriba, pero el precio de fiarse es enseñar dos cifras que se contradicen
 *    en la misma caja.
 *  - `propertyId` es la mas barata a secas; esta es la mas barata de las
 *    LIBRES. Cuando la mas barata esta vendida, abrir por ella es enseñar de
 *    entrada lo unico que no se puede comprar.
 *
 * Con la representante ya corregida las dos coinciden salvo en ese segundo
 * caso, que es justo donde esta debe ganar.
 */
function destacada(grupo: UnitTypeGroup | undefined): Property | undefined {
  const libres = grupo?.unidades.filter((p) => p.availability === 'AVAILABLE')
  const candidatas = libres?.length ? libres : (grupo?.unidades ?? [])
  return candidatas.reduce(
    (mejor, p) =>
      (p.salePrice ?? Infinity) < (mejor.salePrice ?? Infinity) ? p : mejor,
    candidatas[0],
  )
}

/** Las fotos de la unidad, o las de otra igual si esta no tiene ninguna. */
function fotosDe(grupo: UnitTypeGroup, selected: Property) {
  if (selected.images?.length) return selected.images
  return grupo.unidades.find((p) => p.images?.length)?.images ?? []
}
