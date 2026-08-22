import { CalendarCheck, PiggyBank } from 'lucide-react'
import { useMemo, useState } from 'react'

import { Button } from '@/components/ui/button'
import { useCurrency } from '@/lib/currency'
import { useT } from '@/lib/i18n'
import {
  calcularPlan,
  INICIAL_POR_DEFECTO,
  MESES_POR_DEFECTO,
  planComoNota,
} from '@/lib/plan-pagos'
import { useNotaVisita } from '@/lib/nota-visita'
import type { Property } from '@/lib/types'
import { cn } from '@/lib/utils'

const PORCENTAJES = [0.1, 0.2, 0.3, 0.4, 0.5]
const PLAZOS = [6, 12, 18, 24, 36]

/**
 * Cuánto de entrada, cuánto al mes y cuánto queda.
 *
 * La pregunta que sigue siempre al precio es "¿y eso cómo se paga?", y hasta
 * ahora había que llamar para saberlo. Aquí se mueve con dos botones y se ve
 * al instante, que es lo que hace que alguien se atreva a pedir la visita.
 *
 * Dos botoneras y no dos campos libres: los tramos son los que la agencia
 * maneja de verdad, y un campo abierto invita a escribir un 3 % que luego
 * nadie va a aceptar. Se elige entre lo posible, no entre lo imaginable.
 */
export function PaymentPlan({ property }: { property: Property }) {
  const t = useT()
  const { precio: dinero, moneda } = useCurrency()
  const { proponer } = useNotaVisita()
  const [porcentaje, setPorcentaje] = useState(INICIAL_POR_DEFECTO)
  const [meses, setMeses] = useState(MESES_POR_DEFECTO)

  const valor = property.salePrice ?? property.rentPrice
  const plan = useMemo(
    () =>
      calcularPlan({
        precio: Number(valor ?? 0),
        porcentajeInicial: porcentaje,
        meses,
      }),
    [valor, porcentaje, meses],
  )

  if (!valor) return null

  const nota = planComoNota(plan, t, (n) => dinero(n))

  return (
    <section className="rounded-lg border bg-card p-5 shadow-sm">
      <h2 className="flex items-center gap-2 text-xs font-bold tracking-widest uppercase">
        <PiggyBank className="size-4" aria-hidden="true" />
        {t('plan.title')}
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">{t('plan.intro')}</p>

      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <div className="space-y-4">
          <Tramos
            etiqueta={t('plan.field.initial')}
            valores={PORCENTAJES}
            actual={porcentaje}
            onElegir={setPorcentaje}
            texto={(v) => `${Math.round(v * 100)} %`}
          />
          <Tramos
            etiqueta={t('plan.field.months')}
            valores={PLAZOS}
            actual={meses}
            onElegir={setMeses}
            texto={(v) => t('plan.months.value', { meses: v })}
          />
        </div>

        {/*
          El desglose va en una columna aparte y no debajo de los botones: se
          mira mientras se mueven, y con los números debajo hay que bajar la
          vista en cada toque para ver qué cambió.
        */}
        <dl className="space-y-2.5 rounded-lg bg-secondary/50 p-4 text-sm">
          <Linea
            titulo={t('plan.row.separation')}
            valor={dinero(plan.separacion)}
            ayuda={t('plan.row.separation.hint')}
          />
          <Linea
            titulo={t('plan.row.initial', {
              porcentaje: Math.round(plan.porcentajeInicial * 100),
            })}
            valor={dinero(plan.cuotaInicial)}
          />
          <Linea
            titulo={t('plan.row.monthly', { meses: plan.meses })}
            valor={dinero(plan.mensual)}
            fuerte
          />

          <div className="border-t pt-2.5">
            <Linea
              titulo={t('plan.row.balance', { mes: plan.meses + 1 })}
              valor={dinero(plan.saldoFinal)}
              ayuda={t('plan.row.balance.hint')}
            />
            <Linea
              titulo={t('plan.row.total')}
              valor={`${dinero(plan.precio)} ${moneda}`}
              fuerte
            />
          </div>
        </dl>
      </div>

      <div className="mt-5 flex flex-col gap-3 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-muted-foreground">
          {t('plan.disclaimer')}
        </p>
        <Button className="shrink-0" onClick={() => proponer(nota)}>
          <CalendarCheck className="size-4" aria-hidden="true" />
          {t('plan.action')}
        </Button>
      </div>
    </section>
  )
}

function Tramos<T extends number>({
  etiqueta,
  valores,
  actual,
  onElegir,
  texto,
}: {
  etiqueta: string
  valores: readonly T[]
  actual: T
  onElegir: (valor: T) => void
  texto: (valor: T) => string
}) {
  return (
    <div>
      <p className="mb-2 text-xs tracking-widest text-muted-foreground uppercase">
        {etiqueta}
      </p>
      <div className="flex flex-wrap gap-2">
        {valores.map((valor) => (
          <button
            key={valor}
            type="button"
            onClick={() => onElegir(valor)}
            aria-pressed={valor === actual}
            className={cn(
              'rounded-full border px-3.5 py-1.5 text-sm transition-colors',
              valor === actual
                ? 'border-primary bg-primary text-primary-foreground'
                : 'hover:bg-secondary',
            )}
          >
            {texto(valor)}
          </button>
        ))}
      </div>
    </div>
  )
}

function Linea({
  titulo,
  valor,
  ayuda,
  fuerte,
}: {
  titulo: string
  valor: string
  ayuda?: string
  fuerte?: boolean
}) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-x-3">
      <dt className="min-w-0">
        <span className={cn(fuerte && 'font-medium')}>{titulo}</span>
        {ayuda && (
          <span className="block text-xs text-muted-foreground">{ayuda}</span>
        )}
      </dt>
      <dd
        className={cn(
          'tabular whitespace-nowrap',
          fuerte ? 'text-base font-semibold' : 'font-medium',
        )}
      >
        {valor}
      </dd>
    </div>
  )
}
