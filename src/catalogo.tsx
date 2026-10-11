/*
  Catalogo de componentes — entrada SOLO de desarrollo.

  No entra en el router del sitio: es una pagina aparte de Vite, para que
  enseñar la biblioteca no suponga añadir una ruta publica al sitio real.
  Importa los componentes DE VERDAD, no copias: lo que se ve aqui es
  exactamente lo que se ve en produccion, con los mismos tokens de color y las
  mismas medidas.
*/
import { createRoot } from 'react-dom/client'
import { MemoryRouter } from 'react-router-dom'
import { Search, Heart, MapPin, Phone } from 'lucide-react'

import './index.css'
import { I18nProvider } from '@/lib/i18n'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Badge, Card, CardContent, CardHeader, CardTitle, Separator, Skeleton } from '@/components/ui/misc'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from '@/components/ui/accordion'
import { SectionHeading } from '@/components/common/section-heading'
import { PuntosCarrusel } from '@/components/common/puntos-carrusel'
import { UnaLinea } from '@/components/common/una-linea'
import { SpecRow } from '@/components/common/spec-row'

const TOKENS = [
  ['--background', 'Fondo de la página'],
  ['--foreground', 'Texto principal'],
  ['--primary', 'Acción principal: botones, enlaces activos'],
  ['--primary-foreground', 'Texto sobre el color principal'],
  ['--secondary', 'Fondos suaves: tarjetas, franjas, hover'],
  ['--muted-foreground', 'Texto secundario'],
  ['--destructive', 'Error y acciones destructivas'],
  ['--border', 'Bordes y separadores'],
  ['--input', 'Borde de los campos'],
  ['--ring', 'Anillo de foco'],
]

function Bloque({ titulo, nota, children }: { titulo: string; nota: string; children: React.ReactNode }) {
  return (
    <section className="border-t py-8">
      <h2 className="text-xs font-bold tracking-[0.2em] text-muted-foreground uppercase">{titulo}</h2>
      <p className="mt-1 mb-5 max-w-2xl text-sm text-muted-foreground">{nota}</p>
      {children}
    </section>
  )
}

function Pieza({ nombre, children }: { nombre: string; children: React.ReactNode }) {
  return (
    <div className="mb-6">
      <p className="mb-2 font-mono text-[11px] text-muted-foreground">{nombre}</p>
      <div className="flex flex-wrap items-center gap-3">{children}</div>
    </div>
  )
}

function Catalogo() {
  return (
    <div className="container-site max-w-5xl py-10">
      <SectionHeading as="h1" light="Catálogo de" strong="componentes" className="mb-2" />
      <p className="mb-8 max-w-2xl text-sm text-muted-foreground">
        Las piezas con las que está construido el sitio público. Lo que se ve aquí
        son los componentes reales importados de <code>src/components</code>, no
        una reproducción: cualquier cambio en ellos se refleja en esta página.
      </p>

      <Bloque titulo="Color" nota="Los colores se declaran una vez como variables CSS en index.css y todo el sitio los usa por nombre. Cambiar el acento es cambiar una línea.">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {TOKENS.map(([token, uso]) => (
            <div key={token} className="overflow-hidden rounded-md border">
              <div className="h-14 border-b" style={{ background: `var(${token})` }} />
              <div className="p-2">
                <p className="font-mono text-[10px]">{token}</p>
                <p className="mt-0.5 text-[10px] leading-tight text-muted-foreground">{uso}</p>
              </div>
            </div>
          ))}
        </div>
      </Bloque>

      <Bloque titulo="Tipografía" nota="Una sola familia. La jerarquía se hace con tamaño, grosor y versalitas; los rótulos de sección van en mayúsculas con mucho espaciado.">
        <div className="space-y-2">
          <SectionHeading as="h2" light="Rótulo de" strong="sección" />
          <h3 className="text-sm leading-snug font-semibold uppercase">Título de ficha, en versalitas</h3>
          <p className="text-sm">Texto corrido, 14 px. Es el cuerpo de las descripciones y de las fichas.</p>
          <p className="text-xs text-muted-foreground">Texto secundario, 12 px: código, ubicación, notas al pie.</p>
          <p className="tabular text-xl font-normal tracking-tight">$ 550.000.000 <small className="text-[0.625rem] tracking-widest text-muted-foreground uppercase">COP</small></p>
        </div>
      </Bloque>

      <Bloque titulo="Botones" nota="Seis variantes y cuatro tamaños. El principal es negro macizo; «outline» es la acción secundaria y «ghost» la que no debe competir con nada.">
        <Pieza nombre="variant">
          <Button>Principal</Button>
          <Button variant="outline">Outline</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="link">Link</Button>
          <Button variant="destructive">Destructive</Button>
        </Pieza>
        <Pieza nombre="size">
          <Button size="sm">Pequeño</Button>
          <Button>Normal</Button>
          <Button size="lg">Grande</Button>
          <Button size="icon" aria-label="Buscar"><Search /></Button>
        </Pieza>
        <Pieza nombre="con icono · deshabilitado">
          <Button><Search /> Buscar</Button>
          <Button disabled>Deshabilitado</Button>
          <Button variant="outline" disabled>Deshabilitado</Button>
        </Pieza>
      </Bloque>

      <Bloque titulo="Campos de formulario" nota="Alto de 36 px, etiqueta pequeña encima y borde que se marca al enfocar. El anillo de foco nunca se quita: es lo único que guía a quien navega con el teclado.">
        <div className="grid max-w-3xl gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="c1">Campo de texto</Label>
            <Input id="c1" placeholder="Código, conjunto o barrio" />
          </div>
          <div>
            <Label htmlFor="c2">Campo con valor</Label>
            <Input id="c2" defaultValue="Cabecera del Llano" />
          </div>
          <div>
            <Label htmlFor="c3">Desplegable</Label>
            <Select>
              <SelectTrigger id="c3"><SelectValue placeholder="Todas" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="a">Bucaramanga</SelectItem>
                <SelectItem value="b">Floridablanca</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="c4">Deshabilitado</Label>
            <Input id="c4" placeholder="Elige ciudad" disabled />
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="c5">Área de texto</Label>
            <Textarea id="c5" placeholder="Lo que quieras contarnos de tu caso." />
          </div>
        </div>
      </Bloque>

      <Bloque titulo="Etiquetas y estados" nota="Las etiquetas de disponibilidad llevan color de dato —viene de la API—, no una clase fija.">
        <Pieza nombre="Badge">
          <Badge>Por defecto</Badge>
          <Badge variant="tag" style={{ backgroundColor: '#16a34a' }}>DISPONIBLE</Badge>
          <Badge variant="tag" style={{ backgroundColor: '#ca8a04' }}>EN CONSTRUCCIÓN</Badge>
          <Badge variant="tag" style={{ backgroundColor: '#767676' }}>ENTREGADO</Badge>
        </Pieza>
        <Pieza nombre="Skeleton · carga">
          <div className="w-64 space-y-2">
            <Skeleton className="h-28 w-full" />
            <Skeleton className="h-3.5 w-3/4" />
            <Skeleton className="h-3.5 w-1/2" />
          </div>
        </Pieza>
      </Bloque>

      <Bloque titulo="Contenedores" nota="La tarjeta es la unidad de composición del sitio: inventario, proyectos y resultados son todos la misma caja con distinto contenido.">
        <div className="grid max-w-3xl gap-4 sm:grid-cols-2">
          <Card>
            <CardHeader><CardTitle>Título de tarjeta</CardTitle></CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">Contenido de la tarjeta.</p>
              <Separator className="my-3" />
              <SpecRow specs={[
                { icon: MapPin, value: 90, unit: 'm²' },
                { icon: Phone, value: 3, unit: 'alcobas' },
              ]} />
            </CardContent>
          </Card>
          <div className="rounded-lg border">
            <Accordion type="single" collapsible>
              <AccordionItem value="a">
                <AccordionTrigger className="px-4">Tipo A · 68 m²</AccordionTrigger>
                <AccordionContent className="px-4">3 alcobas, 2 baños. Desde $320 millones.</AccordionContent>
              </AccordionItem>
              <AccordionItem value="b">
                <AccordionTrigger className="px-4">Tipo B · 82 m²</AccordionTrigger>
                <AccordionContent className="px-4">3 alcobas, 3 baños. Desde $410 millones.</AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>
        </div>
      </Bloque>

      <Bloque titulo="Piezas propias del sitio" nota="Componentes que no vienen de ninguna biblioteca: se escribieron para resolver un problema concreto de este inventario.">
        <Pieza nombre="PuntosCarrusel · tope de cinco, ventana deslizante">
          <div className="flex items-center gap-8">
            <div className="rounded bg-foreground px-4 py-2"><PuntosCarrusel total={3} activo={1} onIr={() => {}} etiqueta={(i) => `Foto ${i}`} /></div>
            <div className="rounded bg-foreground px-4 py-2"><PuntosCarrusel total={12} activo={6} onIr={() => {}} etiqueta={(i) => `Foto ${i}`} /></div>
            <PuntosCarrusel total={12} activo={0} onIr={() => {}} tono="oscuro" etiqueta={(i) => `Grupo ${i}`} />
          </div>
        </Pieza>
        <Pieza nombre="UnaLinea · recorta y enseña el texto completo al pasar el ratón">
          <div className="w-72 rounded border p-3">
            <UnaLinea as="p" texto="PENTHOUSE EN VENTA EN CABECERA DEL LLANO BUCARAMANGA SANTANDER"
              className="text-sm font-semibold uppercase" />
          </div>
        </Pieza>
        <Pieza nombre="BotonMeGusta · sobre la foto, en la esquina libre">
          <div className="relative size-24 overflow-hidden rounded-lg bg-secondary">
            <div className="absolute top-2 right-2">
              <button type="button" className="flex size-8 items-center justify-center rounded-full">
                <Heart className="size-[22px] fill-red-500 stroke-white" strokeWidth={2} />
              </button>
            </div>
          </div>
          <div className="relative size-24 overflow-hidden rounded-lg bg-secondary">
            <div className="absolute top-2 right-2">
              <button type="button" className="flex size-8 items-center justify-center rounded-full">
                <Heart className="size-[22px] fill-black/25 stroke-white" strokeWidth={2} />
              </button>
            </div>
          </div>
        </Pieza>
      </Bloque>
    </div>
  )
}

createRoot(document.getElementById('root')!).render(
  <MemoryRouter>
    <I18nProvider>
      <Catalogo />
    </I18nProvider>
  </MemoryRouter>,
)
