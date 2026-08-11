import { Check } from 'lucide-react'

import { useT } from '@/lib/i18n'
import type { Feature } from '@/lib/types'

/**
 * Caracteristicas internas y externas. En la base es una sola tabla con un
 * `scope`, y la ficha las separa en dos bloques igual que el sitio actual.
 */
export function FeatureList({ features }: { features: Feature[] }) {
  const t = useT()
  const internal = features.filter((feature) => feature.scope === 'INTERNAL')
  const external = features.filter((feature) => feature.scope === 'EXTERNAL')

  if (!internal.length && !external.length) return null

  return (
    <div className="grid gap-8 sm:grid-cols-2">
      <Block title={t('property.features.internal')} features={internal} />
      <Block title={t('property.features.external')} features={external} />
    </div>
  )
}

function Block({ title, features }: { title: string; features: Feature[] }) {
  if (!features.length) return null
  return (
    <section>
      <h3 className="mb-3 text-xs font-bold tracking-widest uppercase">
        {title}
      </h3>
      <ul className="grid grid-cols-1 gap-x-6 gap-y-2 sm:grid-cols-1 lg:grid-cols-2">
        {features.map((feature) => (
          <li key={feature.id} className="flex items-start gap-2 text-sm">
            <Check className="mt-0.5 size-3.5 shrink-0 text-[#6aa84f]" />
            {feature.name}
          </li>
        ))}
      </ul>
    </section>
  )
}
