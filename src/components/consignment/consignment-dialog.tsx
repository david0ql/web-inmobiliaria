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
import { getZones } from '@/lib/api'
import { mensajeDeError } from '@/lib/api-error'
import { useIdioma, useT } from '@/lib/i18n'
import { portal } from '@/lib/portal'
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

/*
 * Las listas guardan la CLAVE de cada rotulo, no el rotulo: viven en el modulo
 * y ahi no hay contexto que traducir. Cada paso las resuelve con `traducir`
 * justo antes de pintarlas.
 */

const VIEWS = [
  { value: '', label: 'form.consignment.view.none' },
  { value: 'NORTH', label: 'form.consignment.view.north' },
  { value: 'SOUTH', label: 'form.consignment.view.south' },
  { value: 'EAST', label: 'form.consignment.view.east' },
  { value: 'WEST', label: 'form.consignment.view.west' },
] as const

const CONDITIONS = [
  { value: 'ORIGINAL', label: 'form.consignment.condition.original' },
  { value: 'TO_REMODEL', label: 'form.consignment.condition.to_remodel' },
  { value: 'REMODELED', label: 'form.consignment.condition.remodeled' },
  { value: 'BRAND_NEW', label: 'form.consignment.condition.brand_new' },
  { value: 'SHELL', label: 'form.consignment.condition.shell' },
  { value: 'BLUEPRINT', label: 'form.consignment.condition.blueprint' },
] as const

const CREDIT_TYPES = [
  { value: 'DEBT_FREE', label: 'form.consignment.credit.debtfree' },
  { value: 'MORTGAGE', label: 'form.consignment.credit.mortgage' },
  { value: 'LEASING', label: 'form.consignment.credit.leasing' },
] as const

const OCCUPANCIES = [
  { value: 'VACANT', label: 'form.consignment.occupancy.vacant' },
  { value: 'OWNER_OCCUPIED', label: 'form.consignment.occupancy.owner' },
  { value: 'RENTED', label: 'form.consignment.occupancy.rented' },
] as const

type Traducir = ReturnType<typeof useT>

/** Resuelve los rotulos de una lista de opciones con claves. */
function traducir<V extends string | boolean>(
  t: Traducir,
  options: readonly { value: V; label: string; hint?: string }[],
) {
  return options.map((option) => ({
    value: option.value,
    label: t(option.label),
    hint: option.hint ? t(option.hint) : undefined,
  }))
}

/**
 * La zona social del formulario, resuelta por nombre contra el catalogo de
 * caracteristicas. Por nombre y no por id fijo: los ids son los que trajo el
 * volcado y no tienen por que ser los mismos en otro entorno.
 */
const AMENITIES: { label: string; feature: string }[] = [
  { label: 'form.amenity.pool', feature: 'Piscina' },
  { label: 'form.amenity.jacuzzi', feature: 'Jacuzzi' },
  { label: 'form.amenity.sauna', feature: 'Sauna' },
  { label: 'form.amenity.steamroom', feature: 'Turco' },
  { label: 'form.amenity.bbq', feature: 'Barbacoa / parrilla / quincho' },
  { label: 'form.amenity.gym', feature: 'Gimnasio' },
  { label: 'form.amenity.court', feature: 'Zonas deportivas' },
  { label: 'form.amenity.eventroom', feature: 'Salón comunal' },
  { label: 'form.amenity.playground', feature: 'Zona infantil' },
  { label: 'form.amenity.security', feature: 'Vigilancia' },
  { label: 'form.amenity.visitorparking', feature: 'Parqueadero visitantes' },
  { label: 'form.amenity.greenareas', feature: 'Zonas verdes' },
]

/** Los cinco documentos, cada uno en su propio campo del multipart. */
const DOCUMENTS = [
  {
    field: 'docTradition',
    label: 'form.consignment.doc.tradition',
    hint: 'form.consignment.doc.tradition.hint',
  },
  { field: 'docDeed', label: 'form.consignment.doc.deed' },
  { field: 'docId', label: 'form.consignment.doc.id' },
  { field: 'docTax', label: 'form.consignment.doc.tax' },
  { field: 'docMaintenance', label: 'form.consignment.doc.maintenance' },
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

/*
 * Los mensajes son CLAVES: el esquema se construye al cargar el modulo, donde
 * no hay hook que valga. `ErrorText` las traduce al pintarlas.
 */

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
    cityId: z.string().min(1, 'form.consignment.error.city'),
    commune: z.string().trim().optional(),
    neighborhood: z.string().trim().min(2, 'form.consignment.error.neighborhood'),
    complexName: z.string().trim().min(2, 'form.consignment.error.complex'),
    address: z.string().trim().min(4, 'form.consignment.error.address'),
    unitNumber: z.string().trim().min(1, 'form.consignment.error.unit'),
    stratum: z.string().min(1, 'form.consignment.error.stratum'),

    // caracteristicas
    propertyTypeId: z.string().min(1, 'form.consignment.error.type'),
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
    builtArea: count('form.consignment.error.builtarea'),
    lotArea: z.string().trim().optional(),
    bedrooms: count('form.consignment.error.bedrooms'),
    bathrooms: count('form.consignment.error.bathrooms'),
    parkingSpaces: count('form.consignment.error.parking'),
    hasStorageRoom: z.boolean(),
    buildingYear: z
      .string()
      .trim()
      .refine(
        (value) =>
          Number(value) >= 1800 && Number(value) <= new Date().getFullYear() + 5,
        'form.consignment.error.year',
      ),

    // zona social
    amenityIds: z.array(z.number()),
    amenitiesOther: z.string().trim().optional(),

    // dinero
    maintenanceFee: z.string().trim().optional(),
    salePrice: amount('form.consignment.error.price'),
    creditType: z.enum(['MORTGAGE', 'LEASING', 'DEBT_FREE']),
    creditInstitution: z.string().trim().optional(),
    debtAmount: z.string().trim().optional(),

    // ocupacion
    occupancy: z.enum(['RENTED', 'VACANT', 'OWNER_OCCUPIED']),
    rentAmount: z.string().trim().optional(),
    leaseEndsOn: z.string().optional(),

    // propietario
    ownerFirstName: z.string().trim().min(2, 'form.consignment.error.ownerfirstname'),
    ownerLastName: z.string().trim().min(2, 'form.consignment.error.ownerlastname'),
    ownerEmail: z.email('form.error.email'),
    ownerPhone: z.string().trim().min(7, 'form.error.phone'),
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
          message: 'form.consignment.error.institution',
        })
      }
      if (!Number(digits(values.debtAmount ?? ''))) {
        ctx.addIssue({
          code: 'custom',
          path: ['debtAmount'],
          message: 'form.consignment.error.debt',
        })
      }
    }

    if (values.occupancy === 'RENTED' && !Number(digits(values.rentAmount ?? ''))) {
      ctx.addIssue({
        code: 'custom',
        path: ['rentAmount'],
        message: 'form.consignment.error.rent',
      })
    }

    // Media fecha no sirve para agendar nada.
    if (Boolean(values.visitDate) !== Boolean(values.visitTime)) {
      ctx.addIssue({
        code: 'custom',
        path: [values.visitDate ? 'visitTime' : 'visitDate'],
        message: 'form.consignment.error.visit',
      })
    }
  })

type Values = z.infer<typeof schema>
type Form = UseFormReturn<Values>

const STEPS: Step<Values>[] = [
  {
    id: 'location',
    title: 'form.consignment.step.location',
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
    title: 'form.step.property',
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
  {
    id: 'amenities',
    title: 'form.consignment.step.amenities',
    fields: ['amenitiesOther'],
  },
  {
    id: 'money',
    title: 'form.consignment.step.money',
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
    title: 'form.step.owner',
    fields: [
      'ownerFirstName',
      'ownerLastName',
      'ownerEmail',
      'ownerPhone',
      'notes',
    ],
  },
  {
    id: 'files',
    title: 'form.consignment.step.files',
    fields: ['visitDate', 'visitTime'],
  },
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
  const t = useT()
  const { idioma } = useIdioma()

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

  /*
   * Con sesion, los datos del propietario se traen del perfil en vez de
   * pedirlos. No es cosmetica: el esquema los exige para enviar, y la API los
   * sobrescribe con los de la sesion de todas formas — asi lo que se valida
   * aqui es lo mismo que se va a guardar.
   */
  useEffect(() => {
    if (!open) return
    let alive = true
    void portal
      .profile()
      .then((profile) => {
        if (!alive) return
        form.setValue('ownerFirstName', profile.firstName)
        form.setValue('ownerLastName', profile.lastName ?? '')
        form.setValue('ownerEmail', profile.email ?? '')
        form.setValue('ownerPhone', profile.cellPhone ?? '')
      })
      .catch(() => undefined)
    return () => {
      alive = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  // Sin el paso "Tus datos": siempre hay sesion, y la API los toma de ella.
  const steps = STEPS.filter((entry) => entry.id !== 'owner')
  const step = steps[index]
  const last = index === steps.length - 1


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
      // La clave, no la frase: `FilesStep` la traduce al pintarla.
      setFilesError('form.consignment.error.photos')
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

    const body = toFormData(values, names, documents, photos)

    try {
      const result = await portal.createConsignment(body)
      toast.success(
        t('form.consignment.toast.success', { reference: result.reference }),
        {
          description: result.message,
        },
      )
      form.reset()
      setDocuments({})
      setPhotos([])
      change(false)
    } catch (error) {
      toast.error(
        mensajeDeError(error, idioma, t('form.consignment.toast.error')),
      )
    }
  })

  return (
    <Dialog open={open} onOpenChange={change}>
      <DialogTrigger asChild>
        {children ?? <Button>{t('form.consignment.trigger')}</Button>}
      </DialogTrigger>

      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{t('form.consignment.title')}</DialogTitle>
          <DialogDescription>
            {t('form.consignment.description')}
          </DialogDescription>
        </DialogHeader>

        <Progress steps={steps} current={index} />

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
              {t('form.back')}
            </Button>

            <div className="flex items-center gap-3">
              <span className="tabular text-xs text-muted-foreground">
                {t('form.step.of', { current: index + 1, total: steps.length })}
              </span>
              {last ? (
                <Button type="submit" disabled={form.formState.isSubmitting}>
                  {form.formState.isSubmitting ? (
                    <Loader2 className="animate-spin" />
                  ) : (
                    <Check />
                  )}
                  {t('form.consignment.submit')}
                </Button>
              ) : (
                <Button type="button" onClick={() => void next()}>
                  {t('form.continue')}
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

  // Los datos del propietario NO viajan: el endpoint del portal ni siquiera
  // los admite —los toma de la sesion— y mandarlos seria un 400.
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
  const t = useT()
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
    <Fieldset legend={t('form.consignment.legend.location')}>
      <SelectField
        form={form}
        name="cityId"
        label={t('form.consignment.field.city')}
        placeholder={t('form.consignment.city.placeholder')}
        options={catalogs.cities.map((city) => ({
          value: String(city.id),
          label: city.name,
        }))}
      />
      <Field
        form={form}
        name="commune"
        label={t('form.consignment.field.commune')}
      />

      <div className="grid content-start gap-1.5">
        <Field
          form={form}
          name="neighborhood"
          label={t('form.consignment.field.neighborhood')}
          list="consignment-zones"
        />
        <datalist id="consignment-zones">
          {zones.map((zone) => (
            <option key={zone.id} value={zone.name} />
          ))}
        </datalist>
      </div>

      <Field
        form={form}
        name="complexName"
        label={t('form.consignment.field.complex')}
      />
      <Field
        form={form}
        name="address"
        label={t('form.consignment.field.address')}
        className="sm:col-span-2"
      />
      <Field
        form={form}
        name="unitNumber"
        label={t('form.consignment.field.unit')}
        placeholder={t('form.consignment.unit.placeholder')}
      />
      <SelectField
        form={form}
        name="stratum"
        label={t('form.consignment.field.stratum')}
        placeholder={t('form.consignment.stratum.placeholder')}
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
  const t = useT()

  return (
    <Fieldset legend={t('form.consignment.legend.property')}>
      <SelectField
        form={form}
        name="propertyTypeId"
        label={t('form.consignment.field.type')}
        placeholder={t('form.consignment.type.placeholder')}
        options={[...catalogs.propertyTypes]
          .sort((a, b) => a.name.localeCompare(b.name, 'es'))
          .map((type) => ({
            value: String(type.id),
            label: t(`catalog.propertyType.${type.id}`, undefined, type.name),
          }))}
      />
      <Field
        form={form}
        name="floor"
        label={t('form.consignment.field.floor')}
        inputMode="numeric"
      />

      <SelectField
        form={form}
        name="view"
        label={t('form.consignment.field.view')}
        options={traducir(t, VIEWS)}
      />
      <SelectField
        form={form}
        name="condition"
        label={t('form.consignment.field.condition')}
        options={traducir(t, CONDITIONS)}
      />

      <Field
        form={form}
        name="builtArea"
        label={t('form.consignment.field.builtarea')}
        type="number"
        min={1}
        hint={t('form.consignment.builtarea.hint')}
      />
      <Field
        form={form}
        name="privateArea"
        label={t('form.consignment.field.privatearea')}
        type="number"
        min={0}
      />
      <Field
        form={form}
        name="lotArea"
        label={t('form.consignment.field.lotarea')}
        type="number"
        min={0}
      />
      <Field
        form={form}
        name="buildingYear"
        label={t('form.consignment.field.year')}
        inputMode="numeric"
        placeholder="2015"
      />

      <Field
        form={form}
        name="bedrooms"
        label={t('form.consignment.field.bedrooms')}
        type="number"
        min={0}
        max={99}
      />
      <Field
        form={form}
        name="bathrooms"
        label={t('form.consignment.field.bathrooms')}
        type="number"
        min={0}
        max={99}
      />
      <Field
        form={form}
        name="parkingSpaces"
        label={t('form.consignment.field.parking')}
        type="number"
        min={0}
        max={99}
      />

      <div className="grid content-start gap-3">
        <Toggle
          form={form}
          name="hasElevator"
          label={t('form.consignment.field.elevator')}
        />
        <Toggle
          form={form}
          name="hasStorageRoom"
          label={t('form.consignment.field.storage')}
        />
      </div>
    </Fieldset>
  )
}

function AmenitiesStep({ form }: { form: Form }) {
  const { catalogs } = useSiteData()
  const t = useT()
  // `useWatch` y no `form.watch`: esto es un hijo, y `form.watch` solo re-pinta
  // al componente que creo el formulario.
  const selected = useWatch({ control: form.control, name: 'amenityIds' }) ?? []

  // Del nombre del formulario al id del catalogo. Lo que no exista en el
  // catalogo simplemente no se ofrece, en vez de mandar un id inventado.
  const options = AMENITIES.map((amenity) => ({
    label: t(amenity.label),
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
    <Fieldset legend={t('form.consignment.step.amenities')} columns={1}>
      <p className="text-sm text-muted-foreground">
        {t('form.consignment.amenities.intro')}
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
        label={t('form.consignment.field.amenitiesother')}
        placeholder={t('form.consignment.amenitiesother.placeholder')}
      />
    </Fieldset>
  )
}

function MoneyStep({ form }: { form: Form }) {
  const creditType = useWatch({ control: form.control, name: 'creditType' })
  const occupancy = useWatch({ control: form.control, name: 'occupancy' })
  const t = useT()

  return (
    <Fieldset legend={t('form.consignment.legend.money')}>
      <MoneyField
        form={form}
        name="salePrice"
        label={t('form.consignment.field.saleprice')}
      />
      <MoneyField
        form={form}
        name="maintenanceFee"
        label={t('form.consignment.field.maintenancefee')}
        hint={t('form.consignment.maintenancefee.hint')}
      />

      <div className="sm:col-span-2">
        <Choice
          form={form}
          name="creditType"
          label={t('form.consignment.field.credittype')}
          options={traducir(t, CREDIT_TYPES)}
        />
      </div>

      {creditType !== 'DEBT_FREE' && (
        <>
          <Field
            form={form}
            name="creditInstitution"
            label={t('form.consignment.field.institution')}
            placeholder={t('form.consignment.institution.placeholder')}
          />
          <MoneyField
            form={form}
            name="debtAmount"
            label={t('form.consignment.field.debtamount')}
          />
        </>
      )}

      <div className="sm:col-span-2">
        <Choice
          form={form}
          name="occupancy"
          label={t('form.consignment.field.occupancy')}
          options={traducir(t, OCCUPANCIES)}
        />
      </div>

      {occupancy === 'RENTED' && (
        <>
          <MoneyField
            form={form}
            name="rentAmount"
            label={t('form.consignment.field.rentamount')}
          />
          <Field
            form={form}
            name="leaseEndsOn"
            label={t('form.consignment.field.leaseends')}
            type="date"
          />
        </>
      )}
    </Fieldset>
  )
}

function OwnerStep({ form }: { form: Form }) {
  const t = useT()

  return (
    <Fieldset legend={t('form.consignment.legend.owner')}>
      <Field
        form={form}
        name="ownerFirstName"
        label={t('form.consignment.field.ownerfirstname')}
        autoComplete="given-name"
      />
      <Field
        form={form}
        name="ownerLastName"
        label={t('form.consignment.field.ownerlastname')}
        autoComplete="family-name"
      />
      <Field
        form={form}
        name="ownerEmail"
        label={t('form.field.email')}
        type="email"
        autoComplete="email"
      />
      <Field
        form={form}
        name="ownerPhone"
        label={t('form.field.phone')}
        type="tel"
        inputMode="tel"
        autoComplete="tel"
      />

      <div className="grid gap-1.5 sm:col-span-2">
        <Label htmlFor="consignment-notes">{t('form.field.notes')}</Label>
        <Textarea
          id="consignment-notes"
          rows={3}
          placeholder={t('form.consignment.notes.placeholder')}
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
  // El nombre del fichero que no cabe, no la frase: la frase se arma al pintar.
  const [tooBig, setTooBig] = useState<string | null>(null)
  const t = useT()

  function pickDocument(field: string, file: File | undefined) {
    if (!file) {
      const next = { ...documents }
      delete next[field]
      onDocuments(next)
      return
    }
    if (file.size > MAX_DOCUMENT_BYTES) {
      setTooBig(file.name)
      return
    }
    setTooBig(null)
    onDocuments({ ...documents, [field]: file })
  }

  return (
    <Fieldset legend={t('form.consignment.legend.files')} columns={1}>
      <div>
        <p className="mb-3 text-sm text-muted-foreground">
          {t('form.consignment.files.intro')}
        </p>

        <div className="grid gap-2">
          {DOCUMENTS.map((document) => (
            <DocumentRow
              key={document.field}
              label={t(document.label)}
              hint={'hint' in document ? t(document.hint) : undefined}
              file={documents[document.field]}
              onPick={(file) => pickDocument(document.field, file)}
            />
          ))}
        </div>
        {tooBig && (
          <p className="mt-2 text-xs text-destructive">
            {t('form.consignment.error.filesize', { name: tooBig })}
          </p>
        )}
      </div>

      <div>
        <Label htmlFor="consignment-photos">
          {t('form.consignment.photos.label')}
        </Label>
        <p className="mt-1 mb-2 text-xs text-muted-foreground">
          {t('form.consignment.photos.hint', { max: MAX_PHOTOS })}
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
            {photos.length === 1
              ? t('form.consignment.photos.count.one', { count: photos.length })
              : t('form.consignment.photos.count.other', {
                  count: photos.length,
                })}
          </p>
        )}
        {error && <p className="mt-2 text-xs text-destructive">{t(error)}</p>}
      </div>

      <div>
        <p className="mb-2 text-sm font-medium">
          {t('form.consignment.visit.title')}{' '}
          <span className="font-normal">{t('form.optional')}</span>
        </p>
        <p className="mb-3 text-xs text-muted-foreground">
          {t('form.consignment.visit.hint')}
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            form={form}
            name="visitDate"
            label={t('form.consignment.field.visitdate')}
            type="date"
            min={tomorrow()}
          />
          <Field
            form={form}
            name="visitTime"
            label={t('form.consignment.field.visittime')}
            type="time"
          />
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
  const t = useT()
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
          {file ? file.name : (hint ?? t('form.consignment.doc.default'))}
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
          aria-label={t('form.consignment.doc.remove', { label })}
        >
          <X className="size-4" />
        </button>
      ) : (
        <Button asChild variant="outline" size="sm">
          <label htmlFor={id} className="cursor-pointer">
            <Upload />
            {t('form.consignment.doc.upload')}
          </label>
        </Button>
      )}
    </div>
  )
}
