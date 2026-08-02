import { ArrowLeft, ArrowRight, Check, Loader2, Upload, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useForm, useWatch, type UseFormReturn } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'

import {
  Choice,
  Field,
  Fieldset,
  MoneyField,
  Progress,
  SelectField,
  Toggle,
  type Step,
} from '@/components/form/fields'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { ApiError, getZones, submitConsignment } from '@/lib/api'
import { digits } from '@/lib/search-params'
import { useSiteData } from '@/lib/site-data'
import type { Zone } from '@/lib/types'
import { cn } from '@/lib/utils'

/**
 * "Consignación de inmuebles": el formulario con el que un propietario ofrece
 * su inmueble.
 *
 * Es la traduccion del Google Form que la agencia venia usando, campo a campo,
 * incluidos los cinco documentos y las fotos. La diferencia no esta en el
 * formulario sino en lo que pasa despues: esto entra en una bandeja, se revisa
 * y se convierte en inventario sin volver a teclear nada.
 *
 * Va por pasos por necesidad, no por gusto: son treinta y tantos campos y
 * cinco ficheros, y en una sola pantalla no lo termina nadie. Cada paso valida
 * lo suyo, asi el error sale donde el propietario esta mirando.
 *
 * Ciudad y tipo se eligen del catalogo y viajan con su id ademas de con su
 * nombre. Sin el id, la solicitud llega a la bandeja pero el asesor no puede
 * convertirla en inmueble hasta resolverlos a mano.
 */

// --- opciones --------------------------------------------------------------

const STRATA = [1, 2, 3, 4, 5, 6]

const VIEWS = [
  { value: '', label: 'Sin especificar' },
  { value: 'NORTH', label: 'Norte' },
  { value: 'SOUTH', label: 'Sur' },
  { value: 'EAST', label: 'Oriente' },
  { value: 'WEST', label: 'Occidente' },
] as const

const CONDITIONS = [
  { value: 'ORIGINAL', label: 'Original' },
  { value: 'TO_REMODEL', label: 'Para remodelar' },
  { value: 'REMODELED', label: 'Remodelado' },
  { value: 'BRAND_NEW', label: 'A estrenar' },
  { value: 'SHELL', label: 'Obra gris' },
  { value: 'BLUEPRINT', label: 'Sobre planos' },
] as const

const CREDIT_TYPES = [
  { value: 'DEBT_FREE', label: 'Libre de deuda' },
  { value: 'MORTGAGE', label: 'Hipoteca' },
  { value: 'LEASING', label: 'Leasing' },
] as const

const OCCUPANCIES = [
  { value: 'VACANT', label: 'Desocupado' },
  { value: 'OWNER_OCCUPIED', label: 'Habitado por el propietario' },
  { value: 'RENTED', label: 'Arrendado' },
] as const

/**
 * La zona social del formulario, resuelta por nombre contra el catalogo de
 * caracteristicas. Por nombre y no por id fijo: los ids son los que trajo el
 * volcado y no tienen por que ser los mismos en otro entorno.
 */
const AMENITIES: { label: string; feature: string }[] = [
  { label: 'Piscina', feature: 'Piscina' },
  { label: 'Jacuzzi', feature: 'Jacuzzi' },
  { label: 'Sauna', feature: 'Sauna' },
  { label: 'Turco', feature: 'Turco' },
  { label: 'BBQ', feature: 'Barbacoa / parrilla / quincho' },
  { label: 'Gimnasio', feature: 'Gimnasio' },
  { label: 'Cancha múltiple', feature: 'Zonas deportivas' },
  { label: 'Salón de eventos', feature: 'Salón comunal' },
  { label: 'Juegos infantiles', feature: 'Zona infantil' },
  { label: 'Seguridad 24 horas', feature: 'Vigilancia' },
  { label: 'Parqueadero de visitantes', feature: 'Parqueadero visitantes' },
  { label: 'Zonas verdes', feature: 'Zonas verdes' },
]

/** Los cinco documentos, cada uno en su propio campo del multipart. */
const DOCUMENTS = [
  {
    field: 'docTradition',
    label: 'Certificado de tradición y libertad',
    hint: 'No mayor a 30 días',
  },
  { field: 'docDeed', label: 'Última escritura pública de adquisición' },
  { field: 'docId', label: 'Cédula del o los propietarios' },
  { field: 'docTax', label: 'Último recibo de impuesto predial' },
  { field: 'docMaintenance', label: 'Último recibo de administración' },
] as const

const MAX_DOCUMENT_BYTES = 10 * 1024 * 1024
const MAX_PHOTOS = 20

/** La visita se pide con un día de antelación, como en el formulario. */
function tomorrow(): string {
  const date = new Date()
  date.setDate(date.getDate() + 1)
  return date.toISOString().slice(0, 10)
}

// --- esquema ---------------------------------------------------------------

/** Entero en un campo de texto; `''` cuando es opcional y no se rellena. */
const count = (message: string) =>
  z
    .string()
    .trim()
    .refine((value) => value !== '' && Number.isFinite(Number(value)), message)

const amount = (message: string) =>
  z
    .string()
    .trim()
    .refine((value) => Number(digits(value)) > 0, message)

const schema = z
  .object({
    // ubicacion
    cityId: z.string().min(1, 'Elige la ciudad.'),
    commune: z.string().trim().optional(),
    neighborhood: z.string().trim().min(2, '¿En qué barrio está?'),
    complexName: z.string().trim().min(2, 'Nombre del conjunto o edificio.'),
    address: z.string().trim().min(4, 'La dirección nos ayuda a ubicarlo.'),
    unitNumber: z.string().trim().min(1, 'Número de apartamento, casa o local.'),
    stratum: z.string().min(1, 'Elige el estrato.'),

    // caracteristicas
    propertyTypeId: z.string().min(1, 'Elige el tipo de inmueble.'),
    floor: z.string().trim().optional(),
    view: z.enum(['NORTH', 'SOUTH', 'EAST', 'WEST']).or(z.literal('')),
    hasElevator: z.boolean(),
    condition: z.enum([
      'ORIGINAL',
      'TO_REMODEL',
      'REMODELED',
      'BRAND_NEW',
      'SHELL',
      'BLUEPRINT',
    ]),
    privateArea: z.string().trim().optional(),
    builtArea: count('¿Cuántos metros construidos tiene?'),
    lotArea: z.string().trim().optional(),
    bedrooms: count('¿Cuántas habitaciones?'),
    bathrooms: count('¿Cuántos baños?'),
    parkingSpaces: count('¿Cuántos parqueaderos?'),
    hasStorageRoom: z.boolean(),
    buildingYear: z
      .string()
      .trim()
      .refine(
        (value) =>
          Number(value) >= 1800 && Number(value) <= new Date().getFullYear() + 5,
        'Revisa el año de construcción.',
      ),

    // zona social
    amenityIds: z.array(z.number()),
    amenitiesOther: z.string().trim().optional(),

    // dinero
    maintenanceFee: z.string().trim().optional(),
    salePrice: amount('¿En cuánto lo vendes?'),
    creditType: z.enum(['MORTGAGE', 'LEASING', 'DEBT_FREE']),
    creditInstitution: z.string().trim().optional(),
    debtAmount: z.string().trim().optional(),

    // ocupacion
    occupancy: z.enum(['RENTED', 'VACANT', 'OWNER_OCCUPIED']),
    rentAmount: z.string().trim().optional(),
    leaseEndsOn: z.string().optional(),

    // propietario
    ownerFirstName: z.string().trim().min(2, 'Escribe tu nombre.'),
    ownerLastName: z.string().trim().min(2, 'Escribe tus apellidos.'),
    ownerEmail: z.email('Ese correo no parece válido.'),
    ownerPhone: z.string().trim().min(7, 'Necesitamos un teléfono para llamarte.'),
    notes: z.string().trim().optional(),

    // visita
    visitDate: z.string().optional(),
    visitTime: z.string().optional(),
  })
  .superRefine((values, ctx) => {
    // Con hipoteca o leasing, saber cuanto se debe cambia la operacion: el
    // saldo sale del precio de venta en el cierre.
    if (values.creditType !== 'DEBT_FREE') {
      if (!values.creditInstitution?.trim()) {
        ctx.addIssue({
          code: 'custom',
          path: ['creditInstitution'],
          message: '¿Con qué entidad?',
        })
      }
      if (!Number(digits(values.debtAmount ?? ''))) {
        ctx.addIssue({
          code: 'custom',
          path: ['debtAmount'],
          message: '¿Cuánto se debe hoy?',
        })
      }
    }

    if (values.occupancy === 'RENTED' && !Number(digits(values.rentAmount ?? ''))) {
      ctx.addIssue({
        code: 'custom',
        path: ['rentAmount'],
        message: '¿Por cuánto está arrendado?',
      })
    }

    // Media fecha no sirve para agendar nada.
    if (Boolean(values.visitDate) !== Boolean(values.visitTime)) {
      ctx.addIssue({
        code: 'custom',
        path: [values.visitDate ? 'visitTime' : 'visitDate'],
        message: 'Necesitamos el día y la hora.',
      })
    }
  })

type Values = z.infer<typeof schema>
type Form = UseFormReturn<Values>

const STEPS: Step<Values>[] = [
  {
    id: 'location',
    title: 'Ubicación',
    fields: [
      'cityId',
      'commune',
      'neighborhood',
      'complexName',
      'address',
      'unitNumber',
      'stratum',
    ],
  },
  {
    id: 'property',
    title: 'El inmueble',
    fields: [
      'propertyTypeId',
      'floor',
      'view',
      'hasElevator',
      'condition',
      'privateArea',
      'builtArea',
      'lotArea',
      'bedrooms',
      'bathrooms',
      'parkingSpaces',
      'hasStorageRoom',
      'buildingYear',
    ],
  },
  { id: 'amenities', title: 'Zona social', fields: ['amenitiesOther'] },
  {
    id: 'money',
    title: 'Precio',
    fields: [
      'maintenanceFee',
      'salePrice',
      'creditType',
      'creditInstitution',
      'debtAmount',
      'occupancy',
      'rentAmount',
      'leaseEndsOn',
    ],
  },
  {
    id: 'owner',
    title: 'Tus datos',
    fields: [
      'ownerFirstName',
      'ownerLastName',
      'ownerEmail',
      'ownerPhone',
      'notes',
    ],
  },
  { id: 'files', title: 'Documentos', fields: ['visitDate', 'visitTime'] },
]

// --- componente ------------------------------------------------------------

export function ConsignmentDialog({
  children,
  defaultOpen = false,
  onOpenChange,
}: {
  children?: React.ReactNode
  defaultOpen?: boolean
  onOpenChange?: (open: boolean) => void
}) {
  const [open, setOpen] = useState(defaultOpen)
  const [index, setIndex] = useState(0)
  const [documents, setDocuments] = useState<Record<string, File>>({})
  const [photos, setPhotos] = useState<File[]>([])
  const [filesError, setFilesError] = useState<string | null>(null)
  const { catalogs } = useSiteData()

  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      cityId: '',
      commune: '',
      neighborhood: '',
      complexName: '',
      address: '',
      unitNumber: '',
      stratum: '',

      propertyTypeId: '',
      floor: '',
      view: '',
      hasElevator: false,
      condition: 'ORIGINAL',
      privateArea: '',
      builtArea: '',
      lotArea: '',
      bedrooms: '',
      bathrooms: '',
      parkingSpaces: '',
      hasStorageRoom: false,
      buildingYear: '',

      amenityIds: [],
      amenitiesOther: '',

      maintenanceFee: '',
      salePrice: '',
      creditType: 'DEBT_FREE',
      creditInstitution: '',
      debtAmount: '',

      occupancy: 'OWNER_OCCUPIED',
      rentAmount: '',
      leaseEndsOn: '',

      ownerFirstName: '',
      ownerLastName: '',
      ownerEmail: '',
      ownerPhone: '',
      notes: '',

      visitDate: '',
      visitTime: '',
    },
  })

  const change = (next: boolean) => {
    setOpen(next)
    onOpenChange?.(next)
    if (!next) setIndex(0)
  }

  const step = STEPS[index]
  const last = index === STEPS.length - 1


/**
 * Avanza si el paso valida. Si no, enfoca el primer campo en falta: sin esto,
 * pulsar "Continuar" con un error mas abajo no hace nada visible y parece que
 * el boton esta roto.
 */
  async function next() {
    if (!(await form.trigger(step.fields))) {
      const failed = step.fields.find(
        (field) => form.getFieldState(field).invalid,
      )
      // Los botones y los montos no registran un `<input>`, asi que no hay
      // nada que enfocar: ahi basta con que el mensaje ya este pintado.
      if (failed) {
        try {
          form.setFocus(failed, { shouldSelect: true })
        } catch {
          /* campo sin ref */
        }
      }
      return
    }
    setIndex(index + 1)
  }

  const onSubmit = form.handleSubmit(async (values) => {
    if (photos.length === 0) {
      setFilesError('Necesitamos al menos una fotografía del inmueble.')
      return
    }
    setFilesError(null)

    // La API guarda el nombre ademas del id: el id sirve para convertir la
    // solicitud en inventario, y el nombre para que se lea sin resolver nada.
    const names = {
      cityName:
        catalogs.cities.find((city) => String(city.id) === values.cityId)?.name ??
        '',
      propertyTypeName:
        catalogs.propertyTypes.find(
          (type) => String(type.id) === values.propertyTypeId,
        )?.name ?? '',
    }

    try {
      const result = await submitConsignment(
        toFormData(values, names, documents, photos),
      )
      toast.success(`Solicitud ${result.reference} recibida`, {
        description: result.message,
      })
      form.reset()
      setDocuments({})
      setPhotos([])
      change(false)
    } catch (error) {
      toast.error(
        error instanceof ApiError
          ? error.message
          : 'No pudimos enviar la solicitud. Revisa tu conexión e inténtalo otra vez.',
      )
    }
  })

  return (
    <Dialog open={open} onOpenChange={change}>
      <DialogTrigger asChild>
        {children ?? <Button>Publica tu inmueble</Button>}
      </DialogTrigger>

      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Consignación de inmuebles</DialogTitle>
          <DialogDescription>
            Cuéntanos del inmueble y un asesor te contacta para coordinar la
            visita de valoración.
          </DialogDescription>
        </DialogHeader>

        <Progress steps={STEPS} current={index} />

        <form
          onSubmit={(event) => {
            // Enter en cualquier campo enviaria desde el primer paso: solo el
            // ultimo envia de verdad.
            if (!last) {
              event.preventDefault()
              void next()
              return
            }
            void onSubmit(event)
          }}
        >
          {step.id === 'location' && <LocationStep form={form} />}
          {step.id === 'property' && <PropertyStep form={form} />}
          {step.id === 'amenities' && <AmenitiesStep form={form} />}
          {step.id === 'money' && <MoneyStep form={form} />}
          {step.id === 'owner' && <OwnerStep form={form} />}
          {step.id === 'files' && (
            <FilesStep
              form={form}
              documents={documents}
              onDocuments={setDocuments}
              photos={photos}
              onPhotos={setPhotos}
              error={filesError}
            />
          )}

          <div className="mt-6 flex items-center justify-between gap-3 border-t pt-4">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setIndex(index - 1)}
              className={cn(index === 0 && 'invisible')}
            >
              <ArrowLeft />
              Atrás
            </Button>

            <div className="flex items-center gap-3">
              <span className="tabular text-xs text-muted-foreground">
                Paso {index + 1} de {STEPS.length}
              </span>
              {last ? (
                <Button type="submit" disabled={form.formState.isSubmitting}>
                  {form.formState.isSubmitting ? (
                    <Loader2 className="animate-spin" />
                  ) : (
                    <Check />
                  )}
                  Enviar solicitud
                </Button>
              ) : (
                <Button type="button" onClick={() => void next()}>
                  Continuar
                  <ArrowRight />
                </Button>
              )}
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

/**
 * El cuerpo `multipart`. Los numeros van sin puntos y los booleanos como
 * `true`/`false`, que es lo que el DTO sabe leer; los vacios no se envian, para
 * que los opcionales lleguen como ausentes y no como cadena vacia.
 */
function toFormData(
  values: Values,
  names: { cityName: string; propertyTypeName: string },
  documents: Record<string, File>,
  photos: File[],
): FormData {
  const body = new FormData()
  const set = (key: string, value: string | undefined) => {
    if (value) body.set(key, value)
  }

  set('cityId', values.cityId)
  set('cityName', names.cityName)
  set('commune', values.commune)
  set('neighborhood', values.neighborhood)
  set('complexName', values.complexName)
  set('address', values.address)
  set('unitNumber', values.unitNumber)
  set('stratum', values.stratum)

  set('propertyTypeId', values.propertyTypeId)
  set('propertyTypeName', names.propertyTypeName)
  set('floor', values.floor)
  set('view', values.view)
  body.set('hasElevator', String(values.hasElevator))
  set('condition', values.condition)
  set('privateArea', digits(values.privateArea ?? ''))
  set('builtArea', digits(values.builtArea))
  set('lotArea', digits(values.lotArea ?? ''))
  set('bedrooms', values.bedrooms)
  set('bathrooms', values.bathrooms)
  set('parkingSpaces', values.parkingSpaces)
  body.set('hasStorageRoom', String(values.hasStorageRoom))
  set('buildingYear', values.buildingYear)

  for (const id of values.amenityIds) body.append('amenityIds', String(id))
  set('amenitiesOther', values.amenitiesOther)

  body.set('maintenanceFee', digits(values.maintenanceFee ?? '') || '0')
  set('salePrice', digits(values.salePrice))
  set('creditType', values.creditType)
  set('creditInstitution', values.creditInstitution)
  set('debtAmount', digits(values.debtAmount ?? ''))

  set('occupancy', values.occupancy)
  set('rentAmount', digits(values.rentAmount ?? ''))
  set('leaseEndsOn', values.leaseEndsOn)

  set('ownerFirstName', values.ownerFirstName)
  set('ownerLastName', values.ownerLastName)
  set('ownerEmail', values.ownerEmail)
  set('ownerPhone', values.ownerPhone)
  set('notes', values.notes)

  if (values.visitDate && values.visitTime) {
    // El navegador da hora local; la API la quiere en ISO con zona.
    body.set(
      'requestedVisitAt',
      new Date(`${values.visitDate}T${values.visitTime}`).toISOString(),
    )
  }

  for (const [field, file] of Object.entries(documents)) body.set(field, file)
  for (const photo of photos) body.append('photos', photo)

  return body
}

// --- pasos -----------------------------------------------------------------

function LocationStep({ form }: { form: Form }) {
  const { catalogs } = useSiteData()
  const cityId = useWatch({ control: form.control, name: 'cityId' })
  const [zones, setZones] = useState<Zone[]>([])

  // Los barrios de la ciudad elegida, como sugerencias. No se obliga a elegir
  // uno: el catalogo tiene varios miles y el propietario sabe el suyo.
  useEffect(() => {
    if (!cityId) {
      setZones([])
      return
    }
    const controller = new AbortController()
    getZones(Number(cityId), controller.signal)
      .then(setZones)
      .catch(() => setZones([]))
    return () => controller.abort()
  }, [cityId])

  return (
    <Fieldset legend="Dónde está el inmueble">
      <SelectField
        form={form}
        name="cityId"
        label="Ciudad"
        placeholder="Elige una ciudad"
        options={catalogs.cities.map((city) => ({
          value: String(city.id),
          label: city.name,
        }))}
      />
      <Field form={form} name="commune" label="Comuna (opcional)" />

      <div className="grid content-start gap-1.5">
        <Field
          form={form}
          name="neighborhood"
          label="Barrio"
          list="consignment-zones"
        />
        <datalist id="consignment-zones">
          {zones.map((zone) => (
            <option key={zone.id} value={zone.name} />
          ))}
        </datalist>
      </div>

      <Field form={form} name="complexName" label="Nombre del conjunto" />
      <Field
        form={form}
        name="address"
        label="Dirección"
        className="sm:col-span-2"
      />
      <Field
        form={form}
        name="unitNumber"
        label="Número de inmueble"
        placeholder="Apartamento, casa o local"
      />
      <SelectField
        form={form}
        name="stratum"
        label="Estrato"
        placeholder="Elige el estrato"
        options={STRATA.map((value) => ({
          value: String(value),
          label: String(value),
        }))}
      />
    </Fieldset>
  )
}

function PropertyStep({ form }: { form: Form }) {
  const { catalogs } = useSiteData()

  return (
    <Fieldset legend="Cómo es">
      <SelectField
        form={form}
        name="propertyTypeId"
        label="Tipo de inmueble"
        placeholder="Elige el tipo"
        options={[...catalogs.propertyTypes]
          .sort((a, b) => a.name.localeCompare(b.name, 'es'))
          .map((type) => ({ value: String(type.id), label: type.name }))}
      />
      <Field form={form} name="floor" label="Piso (opcional)" inputMode="numeric" />

      <SelectField form={form} name="view" label="Vista" options={VIEWS} />
      <SelectField
        form={form}
        name="condition"
        label="Estado"
        options={CONDITIONS}
      />

      <Field
        form={form}
        name="builtArea"
        label="Área construida (m²)"
        type="number"
        min={1}
        hint="La que figura en la escritura."
      />
      <Field
        form={form}
        name="privateArea"
        label="Área privada (opcional)"
        type="number"
        min={0}
      />
      <Field
        form={form}
        name="lotArea"
        label="Área del lote (opcional)"
        type="number"
        min={0}
      />
      <Field
        form={form}
        name="buildingYear"
        label="Año de construcción"
        inputMode="numeric"
        placeholder="2015"
      />

      <Field
        form={form}
        name="bedrooms"
        label="Habitaciones"
        type="number"
        min={0}
        max={99}
      />
      <Field
        form={form}
        name="bathrooms"
        label="Baños"
        type="number"
        min={0}
        max={99}
      />
      <Field
        form={form}
        name="parkingSpaces"
        label="Parqueaderos"
        type="number"
        min={0}
        max={99}
      />

      <div className="grid content-start gap-3">
        <Toggle form={form} name="hasElevator" label="Tiene ascensor" />
        <Toggle form={form} name="hasStorageRoom" label="Tiene depósito" />
      </div>
    </Fieldset>
  )
}

function AmenitiesStep({ form }: { form: Form }) {
  const { catalogs } = useSiteData()
  // `useWatch` y no `form.watch`: esto es un hijo, y `form.watch` solo re-pinta
  // al componente que creo el formulario.
  const selected = useWatch({ control: form.control, name: 'amenityIds' }) ?? []

  // Del nombre del formulario al id del catalogo. Lo que no exista en el
  // catalogo simplemente no se ofrece, en vez de mandar un id inventado.
  const options = AMENITIES.map((amenity) => ({
    label: amenity.label,
    id: catalogs.features.find((feature) => feature.name === amenity.feature)?.id,
  })).filter((option): option is { label: string; id: number } =>
    Boolean(option.id),
  )

  const toggle = (id: number) =>
    form.setValue(
      'amenityIds',
      selected.includes(id)
        ? selected.filter((value) => value !== id)
        : [...selected, id],
      { shouldDirty: true },
    )

  return (
    <Fieldset legend="Zona social" columns={1}>
      <p className="text-sm text-muted-foreground">
        Marca lo que tenga el conjunto. Si no tiene zona social, sigue adelante.
      </p>

      <div className="grid gap-2 sm:grid-cols-2">
        {options.map((option) => (
          <label
            key={option.id}
            className={cn(
              'flex cursor-pointer items-center gap-2.5 rounded-md border px-3 py-2 text-sm transition-colors',
              selected.includes(option.id)
                ? 'border-primary bg-primary/10 font-medium'
                : 'hover:bg-secondary',
            )}
          >
            <input
              type="checkbox"
              className="size-4 accent-primary"
              checked={selected.includes(option.id)}
              onChange={() => toggle(option.id)}
            />
            {option.label}
          </label>
        ))}
      </div>

      <Field
        form={form}
        name="amenitiesOther"
        label="Otro (opcional)"
        placeholder="Lo que no esté en la lista"
      />
    </Fieldset>
  )
}

function MoneyStep({ form }: { form: Form }) {
  const creditType = useWatch({ control: form.control, name: 'creditType' })
  const occupancy = useWatch({ control: form.control, name: 'occupancy' })

  return (
    <Fieldset legend="Precio y situación">
      <MoneyField form={form} name="salePrice" label="Precio de venta" />
      <MoneyField
        form={form}
        name="maintenanceFee"
        label="Valor de administración"
        hint="Deja en blanco si no paga."
      />

      <div className="sm:col-span-2">
        <Choice
          form={form}
          name="creditType"
          label="¿El inmueble tiene deuda?"
          options={CREDIT_TYPES}
        />
      </div>

      {creditType !== 'DEBT_FREE' && (
        <>
          <Field
            form={form}
            name="creditInstitution"
            label="Entidad"
            placeholder="Banco o entidad"
          />
          <MoneyField form={form} name="debtAmount" label="Valor de la deuda" />
        </>
      )}

      <div className="sm:col-span-2">
        <Choice
          form={form}
          name="occupancy"
          label="Disponibilidad"
          options={OCCUPANCIES}
        />
      </div>

      {occupancy === 'RENTED' && (
        <>
          <MoneyField form={form} name="rentAmount" label="Valor del arriendo" />
          <Field
            form={form}
            name="leaseEndsOn"
            label="Terminación del contrato"
            type="date"
          />
        </>
      )}
    </Fieldset>
  )
}

function OwnerStep({ form }: { form: Form }) {
  return (
    <Fieldset legend="Cómo te contactamos">
      <Field
        form={form}
        name="ownerFirstName"
        label="Nombre"
        autoComplete="given-name"
      />
      <Field
        form={form}
        name="ownerLastName"
        label="Apellido"
        autoComplete="family-name"
      />
      <Field
        form={form}
        name="ownerEmail"
        label="Correo electrónico"
        type="email"
        autoComplete="email"
      />
      <Field
        form={form}
        name="ownerPhone"
        label="Teléfono"
        type="tel"
        inputMode="tel"
        autoComplete="tel"
      />

      <div className="grid gap-1.5 sm:col-span-2">
        <Label htmlFor="consignment-notes">Observaciones (opcional)</Label>
        <Textarea
          id="consignment-notes"
          rows={3}
          placeholder="Lo que quieras contarnos del inmueble."
          {...form.register('notes')}
        />
      </div>
    </Fieldset>
  )
}

function FilesStep({
  form,
  documents,
  onDocuments,
  photos,
  onPhotos,
  error,
}: {
  form: Form
  documents: Record<string, File>
  onDocuments: (next: Record<string, File>) => void
  photos: File[]
  onPhotos: (next: File[]) => void
  error: string | null
}) {
  const [tooBig, setTooBig] = useState<string | null>(null)

  function pickDocument(field: string, file: File | undefined) {
    if (!file) {
      const next = { ...documents }
      delete next[field]
      onDocuments(next)
      return
    }
    if (file.size > MAX_DOCUMENT_BYTES) {
      setTooBig(`"${file.name}" pesa más de 10 MB.`)
      return
    }
    setTooBig(null)
    onDocuments({ ...documents, [field]: file })
  }

  return (
    <Fieldset legend="Documentos, fotos y visita" columns={1}>
      <div>
        <p className="mb-3 text-sm text-muted-foreground">
          Un PDF por documento, hasta 10 MB cada uno. Si te falta alguno puedes
          enviarlo después: el asesor te lo pedirá.
        </p>

        <div className="grid gap-2">
          {DOCUMENTS.map((document) => (
            <DocumentRow
              key={document.field}
              label={document.label}
              hint={'hint' in document ? document.hint : undefined}
              file={documents[document.field]}
              onPick={(file) => pickDocument(document.field, file)}
            />
          ))}
        </div>
        {tooBig && <p className="mt-2 text-xs text-destructive">{tooBig}</p>}
      </div>

      <div>
        <Label htmlFor="consignment-photos">Fotografías</Label>
        <p className="mt-1 mb-2 text-xs text-muted-foreground">
          Hasta {MAX_PHOTOS}. La primera será la portada del anuncio.
        </p>
        <input
          id="consignment-photos"
          type="file"
          accept="image/*"
          multiple
          className="block w-full text-sm file:mr-3 file:rounded-md file:border file:bg-secondary file:px-3 file:py-1.5 file:text-sm"
          onChange={(event) =>
            onPhotos(Array.from(event.target.files ?? []).slice(0, MAX_PHOTOS))
          }
        />
        {photos.length > 0 && (
          <p className="mt-2 text-xs text-muted-foreground">
            {photos.length}{' '}
            {photos.length === 1 ? 'fotografía' : 'fotografías'} seleccionadas.
          </p>
        )}
        {error && <p className="mt-2 text-xs text-destructive">{error}</p>}
      </div>

      <div>
        <p className="mb-2 text-sm font-medium">
          Agendar visita <span className="font-normal">(opcional)</span>
        </p>
        <p className="mb-3 text-xs text-muted-foreground">
          Con un día de anticipación. Si prefieres, lo cuadramos por teléfono.
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field form={form} name="visitDate" label="Fecha" type="date" min={tomorrow()} />
          <Field form={form} name="visitTime" label="Hora" type="time" />
        </div>
      </div>
    </Fieldset>
  )
}

function DocumentRow({
  label,
  hint,
  file,
  onPick,
}: {
  label: string
  hint?: string
  file: File | undefined
  onPick: (file: File | undefined) => void
}) {
  const id = `doc-${label.replace(/\W+/g, '-').toLowerCase()}`

  return (
    <div
      className={cn(
        'flex items-center gap-3 rounded-md border px-3 py-2',
        file && 'border-primary bg-primary/5',
      )}
    >
      <div className="min-w-0 flex-1">
        <label htmlFor={id} className="cursor-pointer text-sm">
          {label}
        </label>
        <p className="truncate text-xs text-muted-foreground">
          {file ? file.name : (hint ?? 'PDF, hasta 10 MB')}
        </p>
      </div>

      <input
        id={id}
        type="file"
        accept="application/pdf,image/*"
        className="sr-only"
        onChange={(event) => onPick(event.target.files?.[0])}
      />

      {file ? (
        <button
          type="button"
          onClick={() => onPick(undefined)}
          className="rounded-md p-1.5 hover:bg-secondary"
          aria-label={`Quitar ${label}`}
        >
          <X className="size-4" />
        </button>
      ) : (
        <Button asChild variant="outline" size="sm">
          <label htmlFor={id} className="cursor-pointer">
            <Upload />
            Subir
          </label>
        </Button>
      )}
    </div>
  )
}
