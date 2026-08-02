import { Home, Loader2 } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { ApiError, submitConsignment } from '@/lib/api'
import { digits } from '@/lib/search-params'

/**
 * "Oferte su inmueble con nosotros". En el sitio anterior era un modal de
 * Bootstrap con un componente de WASI dentro; aqui va contra
 * `POST /public/consignments`, que devuelve una referencia tipo `SC-000148` con
 * la que el propietario puede consultar su solicitud.
 *
 * El endpoint acepta una treintena de campos. Se piden los que un propietario
 * puede contestar sin mirar escrituras; el resto los completa el asesor cuando
 * revisa la solicitud en el panel.
 */
const schema = z.object({
  ownerFirstName: z.string().trim().min(2, 'Escribe tu nombre.'),
  ownerLastName: z.string().trim().min(2, 'Escribe tus apellidos.'),
  ownerPhone: z
    .string()
    .trim()
    .min(7, 'Necesitamos un teléfono para llamarte.'),
  ownerEmail: z.email('Ese correo no parece válido.').or(z.literal('')),
  cityName: z.string().trim().min(2, '¿En qué ciudad está el inmueble?'),
  neighborhood: z.string().trim().min(2, '¿En qué barrio?'),
  address: z.string().trim().min(4, 'La dirección nos ayuda a ubicarlo.'),
  propertyTypeName: z.string().trim().min(2, '¿Casa, apartamento, lote…?'),
  salePrice: z.string().trim().optional(),
  message: z.string().trim().optional(),
})

type OfferValues = z.infer<typeof schema>

export function OfferDialog({
  children,
  defaultOpen = false,
  onOpenChange,
}: {
  children?: React.ReactNode
  /** Lo usa OfferButton: cuando este modulo llega, el visitante ya ha pulsado. */
  defaultOpen?: boolean
  onOpenChange?: (open: boolean) => void
}) {
  const [open, setOpen] = useState(defaultOpen)

  const change = (next: boolean) => {
    setOpen(next)
    onOpenChange?.(next)
  }
  const form = useForm<OfferValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      ownerFirstName: '',
      ownerLastName: '',
      ownerPhone: '',
      ownerEmail: '',
      cityName: '',
      neighborhood: '',
      address: '',
      propertyTypeName: '',
      salePrice: '',
      message: '',
    },
  })

  const onSubmit = form.handleSubmit(async (values) => {
    const body = new FormData()
    for (const [key, value] of Object.entries(values)) {
      if (!value) continue
      body.set(key, key === 'salePrice' ? digits(value) : value)
    }

    try {
      const result = await submitConsignment(body)
      toast.success(`Solicitud ${result.reference} recibida`, {
        description: result.message,
      })
      form.reset()
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
        {children ?? (
          <Button>
            <Home />
            OFERTAR
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Oferte su inmueble con nosotros</DialogTitle>
          <DialogDescription>
            Cuéntanos lo básico y un asesor te contacta para agendar la visita de
            valoración.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="grid gap-4 sm:grid-cols-2">
          <OfferField form={form} name="ownerFirstName" label="Nombres" />
          <OfferField form={form} name="ownerLastName" label="Apellidos" />
          <OfferField
            form={form}
            name="ownerPhone"
            label="Teléfono"
            type="tel"
            inputMode="tel"
          />
          <OfferField
            form={form}
            name="ownerEmail"
            label="Correo (opcional)"
            type="email"
          />
          <OfferField form={form} name="cityName" label="Ciudad" />
          <OfferField form={form} name="neighborhood" label="Zona / barrio" />
          <OfferField
            form={form}
            name="address"
            label="Dirección"
            className="sm:col-span-2"
          />
          <OfferField
            form={form}
            name="propertyTypeName"
            label="Tipo de inmueble"
            placeholder="Casa, apartamento, lote…"
          />
          <OfferField
            form={form}
            name="salePrice"
            label="Valor esperado (opcional)"
            inputMode="numeric"
            placeholder="$"
          />

          <div className="grid gap-1.5 sm:col-span-2">
            <Label htmlFor="offer-message">Comentarios (opcional)</Label>
            <Textarea
              id="offer-message"
              rows={3}
              placeholder="Área, alcobas, estado, lo que quieras contarnos."
              {...form.register('message')}
            />
          </div>

          <DialogFooter className="sm:col-span-2">
            <Button type="submit" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting && (
                <Loader2 className="animate-spin" />
              )}
              Enviar solicitud
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function OfferField({
  form,
  name,
  label,
  className,
  ...props
}: {
  form: ReturnType<typeof useForm<OfferValues>>
  name: keyof OfferValues
  label: string
  className?: string
  /* `form` es tambien un atributo nativo del input, asi que se descarta. */
} & Omit<React.ComponentProps<'input'>, 'form' | 'name'>) {
  const error = form.formState.errors[name]
  return (
    <div className={`grid gap-1.5 ${className ?? ''}`}>
      <Label htmlFor={`offer-${name}`}>{label}</Label>
      <Input
        id={`offer-${name}`}
        aria-invalid={error ? true : undefined}
        {...props}
        {...form.register(name)}
      />
      {error && (
        <p className="text-xs text-destructive">{error.message as string}</p>
      )}
    </div>
  )
}
