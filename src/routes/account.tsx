import {
  Building2,
  CalendarClock,
  FileText,
  LogOut,
  Plus,
  UserRound,
} from 'lucide-react'
import { useState } from 'react'

import { SectionHeading } from '@/components/common/section-heading'
import { ConsignmentDialog } from '@/components/consignment/consignment-dialog'
import { AccountGate } from '@/components/account/account-gate'
import { ChangePasswordForm } from '@/components/account/change-password-form'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/misc'
import { area, money } from '@/lib/format'
import { logout, portal, type PortalProfile } from '@/lib/portal'
import { usePortalData, usePortalSession } from '@/lib/use-portal'
import { cn } from '@/lib/utils'

/**
 * `/mi-cuenta`: el portal del propietario.
 *
 * Vive en la web pública y no en el panel a propósito. El panel es la
 * herramienta del equipo —cartera, embudo, informes— y meter ahí a terceros
 * significaría que un fallo de un guard expone el negocio entero. Aquí lo peor
 * que puede pasar es que alguien vea sus propios inmuebles.
 */
export function Account() {
  const { client, ready } = usePortalSession()

  if (!ready) {
    return (
      <div className="container-site py-12">
        <Skeleton className="mb-4 h-8 w-64" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  if (!client) return <AccountGate />

  // Con la clave que le dictó un asesor, la API no deja hacer nada más.
  if (client.mustChangePassword) {
    return (
      <div className="container-site max-w-md py-12">
        <SectionHeading as="h1" light="Cambia tu" strong="contraseña" />
        <p className="mb-6 text-sm text-muted-foreground">
          Entraste con la clave que te dio tu asesor. Elige una que solo sepas
          tú antes de continuar.
        </p>
        <ChangePasswordForm />
      </div>
    )
  }

  return <Portal />
}

const TABS = [
  { id: 'properties', label: 'Mis inmuebles', icon: Building2 },
  { id: 'requests', label: 'Mis solicitudes', icon: FileText },
  { id: 'visits', label: 'Visitas', icon: CalendarClock },
  { id: 'account', label: 'Mi cuenta', icon: UserRound },
] as const

function Portal() {
  const [tab, setTab] = useState<(typeof TABS)[number]['id']>('properties')
  const profile = usePortalData(portal.profile)

  return (
    <div className="container-site py-10">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <SectionHeading
            as="h1"
            light="Hola,"
            strong={profile.data?.firstName ?? ''}
            className="mb-1"
          />
          <p className="text-sm text-muted-foreground">
            Aquí ves tus inmuebles, sus visitas y en qué van tus solicitudes.
          </p>
        </div>

        <div className="flex shrink-0 gap-2">
          <ConsignmentDialog>
            <Button>
              <Plus />
              Publicar inmueble
            </Button>
          </ConsignmentDialog>
          <Button
            variant="outline"
            onClick={() => void logout()}
            aria-label="Cerrar sesión"
          >
            <LogOut />
          </Button>
        </div>
      </div>

      <nav
        className="mb-8 flex gap-1 overflow-x-auto border-b"
        aria-label="Secciones de mi cuenta"
      >
        {TABS.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setTab(item.id)}
            aria-current={tab === item.id ? 'page' : undefined}
            className={cn(
              'flex shrink-0 items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition-colors',
              tab === item.id
                ? 'border-primary text-foreground'
                : 'border-transparent text-muted-foreground hover:text-foreground',
            )}
          >
            <item.icon className="size-4" />
            {item.label}
          </button>
        ))}
      </nav>

      {tab === 'properties' && <PropertiesTab />}
      {tab === 'requests' && <RequestsTab />}
      {tab === 'visits' && <VisitsTab />}
      {tab === 'account' && <AccountTab profile={profile.data} />}
    </div>
  )
}

// --- pestañas ---------------------------------------------------------------

function PropertiesTab() {
  const { data, loading } = usePortalData(portal.properties)

  if (loading) return <ListSkeleton />
  if (!data?.length) {
    return (
      <EmptyBlock
        title="Todavía no tienes inmuebles publicados"
        detail="Cuando aceptemos una de tus solicitudes, el inmueble aparecerá aquí con sus fotos y su ficha."
      />
    )
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {data.map((property) => (
        <article
          key={property.id}
          className="overflow-hidden rounded-lg border bg-card shadow-sm"
        >
          {property.cover ? (
            <img
              src={property.cover}
              alt={property.title}
              loading="lazy"
              className="h-40 w-full object-cover"
            />
          ) : (
            <div className="flex h-40 items-center justify-center bg-secondary">
              <Building2 className="size-8 text-muted-foreground" />
            </div>
          )}
          <div className="p-4">
            <div className="mb-2 flex items-center justify-between gap-2">
              <span className="tabular text-xs text-muted-foreground">
                {property.code}
              </span>
              <StatusPill status={property.publicationStatus} />
            </div>
            <h3 className="line-clamp-2 text-sm font-semibold">
              {property.title}
            </h3>
            <p className="tabular mt-2 font-semibold">
              {money(property.salePrice ?? property.rentPrice)}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {[
                property.area ? area(property.area) : null,
                property.bedrooms ? `${property.bedrooms} alcobas` : null,
                property.bathrooms ? `${property.bathrooms} baños` : null,
              ]
                .filter(Boolean)
                .join(' · ')}
            </p>
          </div>
        </article>
      ))}
    </div>
  )
}

const REQUEST_STATUS: Record<string, { label: string; tone: string }> = {
  NEW: { label: 'Recibida', tone: 'bg-amber-100 text-amber-900' },
  REVIEWING: { label: 'En revisión', tone: 'bg-blue-100 text-blue-900' },
  VISIT_SCHEDULED: { label: 'Visita agendada', tone: 'bg-blue-100 text-blue-900' },
  ACCEPTED: { label: 'Publicado', tone: 'bg-green-100 text-green-900' },
  REJECTED: { label: 'No continuamos', tone: 'bg-red-100 text-red-900' },
}

function RequestsTab() {
  const { data, loading } = usePortalData(portal.requests)

  if (loading) return <ListSkeleton />
  if (!data?.length) {
    return (
      <EmptyBlock
        title="Aún no has enviado solicitudes"
        detail="Pulsa «Publicar inmueble» y cuéntanos del tuyo. Un asesor lo revisa y te contacta."
      />
    )
  }

  return (
    <div className="grid gap-3">
      {data.map((request) => {
        const status = REQUEST_STATUS[request.status] ?? {
          label: request.status,
          tone: 'bg-secondary',
        }
        return (
          <article
            key={request.id}
            className="rounded-lg border bg-card p-4 shadow-sm"
          >
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <span className="tabular text-xs font-semibold">
                {request.reference}
              </span>
              <span
                className={cn(
                  'rounded-full px-2 py-0.5 text-[11px] font-medium',
                  status.tone,
                )}
              >
                {status.label}
              </span>
            </div>
            <h3 className="text-sm font-semibold">
              {request.propertyTypeName} en {request.complexName}
            </h3>
            <p className="text-xs text-muted-foreground">
              {request.address} {request.unitNumber} · {request.neighborhood},{' '}
              {request.cityName}
            </p>
            <p className="tabular mt-2 text-sm font-semibold">
              {money(request.salePrice)}
            </p>
            <p className="mt-2 text-xs text-muted-foreground">
              {request.photos} {request.photos === 1 ? 'foto' : 'fotos'} ·{' '}
              {request.documents.length} de 5 documentos
            </p>
          </article>
        )
      })}
    </div>
  )
}

const VISIT_STATUS: Record<string, string> = {
  SCHEDULED: 'Agendada',
  CONFIRMED: 'Confirmada',
  DONE: 'Realizada',
  CANCELLED: 'Cancelada',
  NO_SHOW: 'No asistió',
}

function VisitsTab() {
  const { data, loading } = usePortalData(portal.visits)

  if (loading) return <ListSkeleton />
  if (!data?.length) {
    return (
      <EmptyBlock
        title="Todavía no hay visitas"
        detail="Cuando alguien agende una visita a uno de tus inmuebles, la verás aquí."
      />
    )
  }

  return (
    <div className="grid gap-3">
      {data.map((visit) => (
        <article
          key={visit.id}
          className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-card p-4 shadow-sm"
        >
          <div className="min-w-0">
            <p className="text-sm font-semibold">
              {new Date(visit.startsAt).toLocaleString('es-CO', {
                dateStyle: 'full',
                timeStyle: 'short',
              })}
            </p>
            <p className="truncate text-xs text-muted-foreground">
              {visit.property?.title ?? 'Inmueble retirado'}
            </p>
          </div>
          <span className="rounded-full bg-secondary px-2.5 py-0.5 text-xs">
            {VISIT_STATUS[visit.status] ?? visit.status}
          </span>
        </article>
      ))}
    </div>
  )
}

function AccountTab({ profile }: { profile: PortalProfile | null }) {
  if (!profile) return <ListSkeleton />

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <section className="rounded-lg border bg-card p-6 shadow-sm">
        <h2 className="mb-4 text-xs font-bold tracking-widest uppercase">
          Tus datos
        </h2>
        <dl className="grid gap-2 text-sm">
          <Row label="Nombre" value={profile.fullName} />
          <Row label="Correo" value={profile.email ?? '—'} />
          <Row label="Teléfono" value={profile.cellPhone ?? '—'} />
          <Row label="Documento" value={profile.identification ?? '—'} />
          <Row label="Ciudad" value={profile.city?.name ?? '—'} />
        </dl>
        <p className="mt-4 text-xs text-muted-foreground">
          ¿Algo mal? Escríbele a tu asesor y lo corrige.
        </p>
      </section>

      <section className="rounded-lg border bg-card p-6 shadow-sm">
        <h2 className="mb-4 text-xs font-bold tracking-widest uppercase">
          Tu asesor
        </h2>
        {profile.agent ? (
          <div className="flex items-center gap-4">
            {profile.agent.photoUrl && (
              <img
                src={profile.agent.photoUrl}
                alt={profile.agent.fullName}
                className="size-14 rounded-full object-cover"
              />
            )}
            <div className="min-w-0">
              <p className="font-semibold">{profile.agent.fullName}</p>
              <p className="truncate text-sm text-muted-foreground">
                {profile.agent.email}
              </p>
              {profile.agent.cellPhone && (
                <a
                  href={`tel:${profile.agent.cellPhone}`}
                  className="text-sm text-primary hover:underline"
                >
                  {profile.agent.cellPhone}
                </a>
              )}
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            Todavía no tienes asesor asignado. En cuanto revisemos tu primera
            solicitud, alguien se hará cargo y aparecerá aquí.
          </p>
        )}
      </section>

      <section className="rounded-lg border bg-card p-6 shadow-sm lg:col-span-2">
        <h2 className="mb-4 text-xs font-bold tracking-widest uppercase">
          Cambiar contraseña
        </h2>
        <ChangePasswordForm />
      </section>
    </div>
  )
}

// --- piezas -----------------------------------------------------------------

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 border-b py-1.5 last:border-0">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-right font-medium">{value}</dd>
    </div>
  )
}

function StatusPill({ status }: { status: string }) {
  const map: Record<string, { label: string; tone: string }> = {
    DRAFT: { label: 'En revisión', tone: 'bg-amber-100 text-amber-900' },
    ACTIVE: { label: 'Publicado', tone: 'bg-green-100 text-green-900' },
    OUTSTANDING: { label: 'Destacado', tone: 'bg-green-100 text-green-900' },
    INACTIVE: { label: 'Retirado', tone: 'bg-secondary' },
  }
  const value = map[status] ?? { label: status, tone: 'bg-secondary' }
  return (
    <span
      className={cn('rounded-full px-2 py-0.5 text-[11px] font-medium', value.tone)}
    >
      {value.label}
    </span>
  )
}

function ListSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 3 }, (_, i) => (
        <Skeleton key={i} className="h-56 w-full" />
      ))}
    </div>
  )
}

function EmptyBlock({ title, detail }: { title: string; detail: string }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed py-16 text-center">
      <p className="font-medium">{title}</p>
      <p className="max-w-sm text-sm text-muted-foreground">{detail}</p>
    </div>
  )
}
