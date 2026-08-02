import { useId } from 'react'
import { useFormState, useWatch } from 'react-hook-form'
import type { FieldValues, Path, UseFormReturn } from 'react-hook-form'

import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { price } from '@/lib/format'
import { digits } from '@/lib/search-params'
import { cn } from '@/lib/utils'

/**
 * Las piezas de los dos formularios largos del sitio —consignar un inmueble y
 * consultar un credito—, que son el mismo problema: treinta campos que hay que
 * pedir sin que nadie abandone a la mitad.
 *
 * Viven aparte de los modales porque duplicarlas significaba que un arreglo de
 * accesibilidad o de formato de moneda habia que hacerlo dos veces, y a la
 * segunda se olvida.
 */

type Form<T extends FieldValues> = UseFormReturn<T>

/*
 * `form.watch(...)` y `form.formState` solo suscriben al componente que llamo a
 * `useForm`. Leerlos desde un campo hijo devuelve el valor correcto la primera
 * vez y nunca se entera de los cambios: la casilla no se marca, el boton no se
 * ilumina y el error no aparece.
 *
 * `useWatch` y `useFormState` suscriben al hijo, que es lo que hace falta para
 * que estas piezas funcionen colgadas de cualquier formulario.
 */

/** El mensaje de error del campo. `errors` esta tipado por rama; esto es plano. */
function useMessage<T extends FieldValues>(
  form: Form<T>,
  name: Path<T>,
): string | undefined {
  const { errors } = useFormState({ control: form.control, name })
  const flat = errors as Record<string, { message?: string } | undefined>
  return flat[name]?.message
}

/** El valor actual del campo, con re-render cuando cambia. */
function useValue<T extends FieldValues>(form: Form<T>, name: Path<T>) {
  return useWatch({ control: form.control, name })
}

export function ErrorText<T extends FieldValues>({
  form,
  name,
}: {
  form: Form<T>
  name: Path<T>
}) {
  const message = useMessage(form, name)
  if (!message) return null
  return (
    <p role="alert" className="text-xs text-destructive">
      {message}
    </p>
  )
}

export function Fieldset({
  legend,
  children,
  columns = 2,
}: {
  legend: string
  children: React.ReactNode
  columns?: 1 | 2
}) {
  return (
    <fieldset className="mt-2">
      <legend className="mb-4 text-xs font-bold tracking-widest text-primary uppercase">
        {legend}
      </legend>
      <div className={cn('grid gap-4', columns === 2 && 'sm:grid-cols-2')}>
        {children}
      </div>
    </fieldset>
  )
}

export function Field<T extends FieldValues>({
  form,
  name,
  label,
  hint,
  className,
  ...props
}: {
  form: Form<T>
  name: Path<T>
  label: string
  hint?: string
  className?: string
} & Omit<React.ComponentProps<'input'>, 'form' | 'name'>) {
  const id = useId()
  const message = useMessage(form, name)

  return (
    <div className={cn('grid content-start gap-1.5', className)}>
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        aria-invalid={message ? true : undefined}
        {...props}
        {...form.register(name)}
      />
      {hint && !message && (
        <p className="text-xs text-muted-foreground">{hint}</p>
      )}
      <ErrorText form={form} name={name} />
    </div>
  )
}

/**
 * Miles con punto mientras se escribe. Un precio de nueve cifras sin separar es
 * ilegible, y es justo el campo donde equivocarse en un cero cambia el envio
 * entero.
 */
export function MoneyField<T extends FieldValues>({
  form,
  name,
  label,
  hint,
  className,
}: {
  form: Form<T>
  name: Path<T>
  label: string
  hint?: string
  className?: string
}) {
  const id = useId()
  const message = useMessage(form, name)
  const raw = digits(String(useValue(form, name) ?? ''))

  return (
    <div className={cn('grid content-start gap-1.5', className)}>
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        inputMode="numeric"
        placeholder="$"
        aria-invalid={message ? true : undefined}
        value={raw ? price(Number(raw)) : ''}
        onChange={(event) =>
          form.setValue(name, digits(event.target.value) as never, {
            shouldValidate: true,
            shouldDirty: true,
          })
        }
      />
      {hint && !message && (
        <p className="text-xs text-muted-foreground">{hint}</p>
      )}
      <ErrorText form={form} name={name} />
    </div>
  )
}

export function SelectField<T extends FieldValues>({
  form,
  name,
  label,
  options,
  placeholder,
  hint,
  className,
}: {
  form: Form<T>
  name: Path<T>
  label: string
  options: readonly { value: string; label: string }[]
  placeholder?: string
  hint?: string
  className?: string
}) {
  const id = useId()
  const message = useMessage(form, name)

  return (
    <div className={cn('grid content-start gap-1.5', className)}>
      <Label htmlFor={id}>{label}</Label>
      {/*
        Un `select` nativo y no el de Radix: dentro de un modal con scroll el
        desplegable nativo es el que mejor se porta en movil, que es donde se
        van a llenar estos formularios.
      */}
      <select
        id={id}
        aria-invalid={message ? true : undefined}
        className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/15 aria-invalid:border-destructive"
        {...form.register(name)}
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {hint && !message && (
        <p className="text-xs text-muted-foreground">{hint}</p>
      )}
      <ErrorText form={form} name={name} />
    </div>
  )
}

/** Botonera de una sola eleccion: mas rapida de tocar que un desplegable. */
export function Choice<T extends FieldValues, V extends string | boolean>({
  form,
  name,
  label,
  options,
  className,
}: {
  form: Form<T>
  name: Path<T>
  label: string
  options: readonly { value: V; label: string; hint?: string }[]
  className?: string
}) {
  const value = useValue(form, name)

  return (
    <div className={cn('grid content-start gap-1.5', className)}>
      <span className="text-sm font-medium">{label}</span>
      <div
        role="radiogroup"
        aria-label={label}
        className="grid gap-2"
        style={{
          gridTemplateColumns: `repeat(${Math.min(options.length, 3)}, minmax(0, 1fr))`,
        }}
      >
        {options.map((option) => {
          const active = value === option.value
          return (
            <button
              key={String(option.value)}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() =>
                form.setValue(name, option.value as never, {
                  shouldValidate: true,
                  shouldDirty: true,
                })
              }
              className={cn(
                'rounded-md border px-3 py-2 text-left text-sm transition-colors',
                active
                  ? 'border-primary bg-primary/10 font-semibold'
                  : 'bg-background hover:bg-secondary',
              )}
            >
              {option.label}
              {option.hint && (
                <span className="block text-[11px] font-normal text-muted-foreground">
                  {option.hint}
                </span>
              )}
            </button>
          )
        })}
      </div>
      <ErrorText form={form} name={name} />
    </div>
  )
}

export function Toggle<T extends FieldValues>({
  form,
  name,
  label,
  hint,
}: {
  form: Form<T>
  name: Path<T>
  label: string
  hint?: string
}) {
  return (
    <div className="grid gap-1.5">
      <label className="flex items-start gap-2.5 text-sm">
        <input
          type="checkbox"
          className="mt-0.5 size-4 accent-primary"
          {...form.register(name)}
        />
        <span>
          {label}
          {hint && (
            <span className="block text-xs text-muted-foreground">{hint}</span>
          )}
        </span>
      </label>
      <ErrorText form={form} name={name} />
    </div>
  )
}

// --- pasos -----------------------------------------------------------------

export interface Step<T extends FieldValues> {
  id: string
  title: string
  fields: Path<T>[]
}

export function Progress<T extends FieldValues>({
  steps,
  current,
}: {
  steps: Step<T>[]
  current: number
}) {
  return (
    <ol className="flex gap-2" aria-label="Progreso del formulario">
      {steps.map((step, i) => (
        <li key={step.id} className="flex-1">
          <div
            className={cn(
              'h-1 rounded-full transition-colors',
              i <= current ? 'bg-primary' : 'bg-secondary',
            )}
          />
          <span
            className={cn(
              'mt-1.5 block text-[11px] leading-tight',
              i === current
                ? 'font-semibold text-foreground'
                : 'text-muted-foreground',
            )}
            aria-current={i === current ? 'step' : undefined}
          >
            {step.title}
          </span>
        </li>
      ))}
    </ol>
  )
}
