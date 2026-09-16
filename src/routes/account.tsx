import {
  Building2,
  CalendarClock,
  FileText,
  LogOut,
  Plus,
  UserRound,
  ExternalLink,
  Pencil,
  EyeOff,
  Archive,
  Loader2,
} from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'

import { SectionHeading } from '@/components/common/section-heading'
import { ConsignmentDialog } from '@/components/consignment/consignment-dialog'
import { AccountGate } from '@/components/account/account-gate'
import { ChangePasswordForm } from '@/components/account/change-password-form'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/misc'
import { area, fechaFormat, money } from '@/lib/format'
import { useIdioma, useT } from '@/lib/i18n'
import { logout, portal, type PortalProfile, type PortalProperty, type PortalRequest } from '@/lib/portal'
import { usePortalData, usePortalSession } from '@/lib/use-portal'
import { cn } from '@/lib/utils'
import { Link } from '@/lib/nav'
import { slugify } from '@/lib/slug'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

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
  const t = useT()

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
        <SectionHeading
          as="h1"
          light={t('account.password.title.light')}
          strong={t('account.password.title.strong')}
        />
        <p className="mb-6 text-sm text-muted-foreground">
          {t('account.password.intro')}
        </p>
        <ChangePasswordForm />
      </div>
    )
  }

  return <Portal />
}

/* Las etiquetas guardan la clave: la pestaña se traduce al pintarla. */
const TABS = [
  { id: 'properties', label: 'account.tab.properties', icon: Building2 },
  { id: 'requests', label: 'account.tab.requests', icon: FileText },
  { id: 'visits', label: 'account.tab.visits', icon: CalendarClock },
  { id: 'account', label: 'account.tab.account', icon: UserRound },
] as const

function Portal() {
  const [tab, setTab] = useState<(typeof TABS)[number]['id']>('properties')
  const profile = usePortalData(portal.profile)
  const t = useT()

  return (
    <div className="container-site py-10">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <SectionHeading
            as="h1"
            light={t('account.greeting')}
            strong={profile.data?.firstName ?? ''}
            className="mb-1"
          />
          <p className="text-sm text-muted-foreground">
            {t('account.subtitle')}
          </p>
        </div>

        <div className="flex shrink-0 gap-2">
          <ConsignmentDialog>
            <Button>
              <Plus />
              {t('account.action.publish')}
            </Button>
          </ConsignmentDialog>
          <Button
            variant="outline"
            onClick={() => void logout()}
            aria-label={t('account.action.logout')}
          >
            <LogOut />
          </Button>
        </div>
      </div>

      <nav
        className="mb-8 flex gap-1 overflow-x-auto border-b"
        aria-label={t('account.tabs.aria')}
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
            {t(item.label)}
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
  const { data, loading, reload } = usePortalData(portal.properties)
  const changes = usePortalData(portal.propertyChanges)
  const [selected, setSelected] = useState<PortalProperty | null>(null)
  const t = useT()
  const { idioma } = useIdioma()

  if (loading) return <ListSkeleton />
  if (!data?.length) {
    return (
      <EmptyBlock
        title={t('account.properties.empty.title')}
        detail={t('account.properties.empty.detail')}
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
                property.area ? area(property.area, idioma) : null,
                property.bedrooms
                  ? t('property.spec.bedrooms.count', {
                      count: property.bedrooms,
                    })
                  : null,
                property.bathrooms
                  ? t('property.spec.bathrooms.count', {
                      count: property.bathrooms,
                    })
                  : null,
              ]
                .filter(Boolean)
                .join(' · ')}
            </p>
            <Button
              type="button"
              variant="outline"
              className="mt-4 w-full"
              onClick={() => setSelected(property)}
            >
              {t('account.property.manage')}
            </Button>
          </div>
        </article>
      ))}
      <PropertyManager
        property={selected}
        open={Boolean(selected)}
        onOpenChange={(open) => !open && setSelected(null)}
        pending={changes.data?.find(
          (change) =>
            change.propertyId === selected?.id &&
            (change.status === 'PENDING' || change.status === 'APPROVED'),
        )}
        onChanged={() => {
          reload()
          changes.reload()
        }}
      />
    </div>
  )
}

function PropertyManager({ property, open, onOpenChange, pending, onChanged }: {
  property: PortalProperty | null
  open: boolean
  onOpenChange: (open: boolean) => void
  pending?: { status: string; action: string; applyAfter: string | null }
  onChanged: () => void
}) {
  const t = useT()
  const [editing, setEditing] = useState(false)
  const [busy, setBusy] = useState(false)
  const [draft, setDraft] = useState<Record<string, string>>({})
  if (!property) return null
  const path = `/${slugify(property.title) || 'inmueble'}/${property.code}`
  const fields = [
    ['address', t('account.property.field.address'), property.address ?? ''],
    ['salePrice', t('account.property.field.salePrice'), property.salePrice?.toString() ?? ''],
    ['rentPrice', t('account.property.field.rentPrice'), property.rentPrice?.toString() ?? ''],
    ['area', t('account.property.field.area'), property.area?.toString() ?? ''],
    ['bedrooms', t('account.property.field.bedrooms'), property.bedrooms?.toString() ?? ''],
    ['bathrooms', t('account.property.field.bathrooms'), property.bathrooms?.toString() ?? ''],
    ['garages', t('account.property.field.garages'), property.garages?.toString() ?? ''],
  ] as const
  const beginEdit = () => {
    setDraft(Object.fromEntries(fields.map(([key, , value]) => [key, value])))
    setEditing(true)
  }
  const changed = fields.filter(([key, , value]) => draft[key] !== value)
  const submit = async () => {
    setBusy(true)
    try {
      const body = Object.fromEntries(changed.map(([key]) => [
        key,
        key === 'address' ? draft[key].trim() : Number(draft[key]),
      ]))
      await portal.proposePropertyChange(property.id, body)
      toast.success(t('account.property.change.sent'))
      setEditing(false)
      onChanged()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t('errors.load'))
    } finally { setBusy(false) }
  }
  const deactivate = async () => {
    if (!window.confirm(t('account.property.deactivate.confirm'))) return
    setBusy(true)
    try {
      await portal.deactivateProperty(property.id)
      toast.success(t('account.property.deactivate.done'))
      onChanged(); onOpenChange(false)
    } finally { setBusy(false) }
  }
  const archive = async () => {
    if (!window.confirm(t('account.property.archive.confirm'))) return
    setBusy(true)
    try {
      await portal.archiveProperty(property.id)
      toast.success(t('account.property.archive.sent'))
      onChanged()
    } finally { setBusy(false) }
  }
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{property.title}</DialogTitle>
          <DialogDescription>{property.code} · {property.address}</DialogDescription>
        </DialogHeader>
        {pending && (
          <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950">
            {t('account.property.pending', { action: pending.action, status: pending.status })}
          </div>
        )}
        {editing ? (
          <div className="grid gap-4 sm:grid-cols-2">
            {fields.map(([key, label]) => (
              <div key={key} className={cn('grid gap-1.5', key === 'address' && 'sm:col-span-2')}>
                <Label htmlFor={`owner-${key}`}>{label}</Label>
                <Input id={`owner-${key}`} type={key === 'address' ? 'text' : 'number'} value={draft[key] ?? ''} onChange={(e) => setDraft((v) => ({ ...v, [key]: e.target.value }))} />
              </div>
            ))}
            {changed.length > 0 && (
              <div className="rounded-lg bg-secondary p-3 text-xs sm:col-span-2">
                <p className="mb-2 font-semibold">{t('account.property.change.preview')}</p>
                {changed.map(([key, label, before]) => (
                  <p key={key}><span className="text-muted-foreground">{label}:</span> <s>{before || '—'}</s> → <strong>{draft[key] || '—'}</strong></p>
                ))}
              </div>
            )}
            <div className="flex justify-end gap-2 sm:col-span-2">
              <Button variant="outline" onClick={() => setEditing(false)}>{t('form.back')}</Button>
              <Button onClick={() => void submit()} disabled={!changed.length || busy}>{busy && <Loader2 className="animate-spin" />}{t('account.property.change.submit')}</Button>
            </div>
          </div>
        ) : (
          <>
            <dl className="grid gap-2 rounded-lg bg-secondary/50 p-4 text-sm sm:grid-cols-2">
              <Row label={t('account.property.field.salePrice')} value={money(property.salePrice)} />
              <Row label={t('account.property.field.rentPrice')} value={money(property.rentPrice)} />
              <Row label={t('account.property.field.area')} value={property.area ? `${property.area} m²` : '—'} />
              <Row label={t('account.property.status.label')} value={property.publicationStatus} />
            </dl>
            <div className="grid gap-2 sm:grid-cols-2">
              <Button asChild variant="outline"><Link to={path} target="_blank"><ExternalLink />{t('account.property.publicUrl')}</Link></Button>
              <Button variant="outline" onClick={beginEdit} disabled={Boolean(pending)}><Pencil />{t('account.property.edit')}</Button>
              <Button variant="outline" onClick={() => void deactivate()} disabled={busy || property.publicationStatus === 'INACTIVE'}><EyeOff />{t('account.property.deactivate')}</Button>
              <Button variant="outline" onClick={() => void archive()} disabled={busy || Boolean(pending)}><Archive />{t('account.property.archive')}</Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}

/* La etiqueta guarda la clave: se traduce al pintar la solicitud. */
const REQUEST_STATUS: Record<string, { label: string; tone: string }> = {
  NEW: { label: 'account.request.status.NEW', tone: 'bg-amber-100 text-amber-900' },
  REVIEWING: {
    label: 'account.request.status.REVIEWING',
    tone: 'bg-blue-100 text-blue-900',
  },
  VISIT_SCHEDULED: {
    label: 'account.request.status.VISIT_SCHEDULED',
    tone: 'bg-blue-100 text-blue-900',
  },
  ACCEPTED: {
    label: 'account.request.status.ACCEPTED',
    tone: 'bg-green-100 text-green-900',
  },
  REJECTED: {
    label: 'account.request.status.REJECTED',
    tone: 'bg-red-100 text-red-900',
  },
}

function RequestsTab() {
  const { data, loading } = usePortalData(portal.requests)
  const t = useT()
  const [selected, setSelected] = useState<PortalRequest | null>(null)

  if (loading) return <ListSkeleton />
  if (!data?.length) {
    return (
      <EmptyBlock
        title={t('account.requests.empty.title')}
        detail={t('account.requests.empty.detail')}
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
          <button
            key={request.id}
            type="button"
            onClick={() => setSelected(request)}
            className="rounded-lg border bg-card p-4 text-left shadow-sm transition hover:border-primary/50"
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
                {t(status.label)}
              </span>
            </div>
            <h3 className="text-sm font-semibold">
              {t('account.request.title', {
                type: request.propertyTypeName,
                complex: request.complexName,
              })}
            </h3>
            <p className="text-xs text-muted-foreground">
              {request.address} {request.unitNumber} · {request.neighborhood},{' '}
              {request.cityName}
            </p>
            <p className="tabular mt-2 text-sm font-semibold">
              {money(request.salePrice)}
            </p>
            <p className="mt-2 text-xs text-muted-foreground">
              {t(
                request.photos === 1
                  ? 'account.request.files.one'
                  : 'account.request.files.other',
                {
                  photos: request.photos,
                  documents: request.documents.length,
                },
              )}
            </p>
          </button>
        )
      })}
      <RequestDetail request={selected} onClose={() => setSelected(null)} />
    </div>
  )
}

function RequestDetail({ request, onClose }: { request: PortalRequest | null; onClose: () => void }) {
  const t = useT()
  if (!request) return null
  const photos = request.files.filter((file) => file.kind === 'PHOTO' && file.url)
  const documents = request.files.filter((file) => file.kind === 'DOCUMENT')
  return <Dialog open={Boolean(request)} onOpenChange={(open) => !open && onClose()}>
    <DialogContent className="sm:max-w-2xl">
      <DialogHeader><DialogTitle>{request.reference}</DialogTitle><DialogDescription>{request.propertyTypeName} · {request.address} {request.unitNumber}</DialogDescription></DialogHeader>
      <dl className="grid gap-2 rounded-lg bg-secondary/50 p-4 text-sm sm:grid-cols-2">
        <Row label={t('account.property.field.salePrice')} value={money(request.salePrice)} />
        <Row label={t('account.property.field.area')} value={`${request.builtArea} m²`} />
        <Row label={t('account.property.field.bedrooms')} value={String(request.bedrooms)} />
        <Row label={t('account.property.field.bathrooms')} value={String(request.bathrooms)} />
      </dl>
      <div><p className="mb-2 text-sm font-semibold">Fotografías enviadas</p>{photos.length ? <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">{photos.map((file) => <img key={file.index} src={file.url!} alt={file.originalName} className="aspect-square rounded-md border object-cover" />)}</div> : <p className="text-sm text-muted-foreground">No hay fotografías adjuntas.</p>}</div>
      <div><p className="mb-2 text-sm font-semibold">Documentos enviados</p><ul className="grid gap-1 text-sm">{documents.map((file) => <li key={file.index} className="rounded border px-3 py-2">{file.originalName}</li>)}</ul></div>
    </DialogContent>
  </Dialog>
}

/* Guarda la clave: la etiqueta se traduce al pintar la visita. */
const VISIT_STATUS: Record<string, string> = {
  SCHEDULED: 'account.visit.status.SCHEDULED',
  CONFIRMED: 'account.visit.status.CONFIRMED',
  DONE: 'account.visit.status.DONE',
  CANCELLED: 'account.visit.status.CANCELLED',
  NO_SHOW: 'account.visit.status.NO_SHOW',
}

/*
  La cita, entera: "lunes, 10 de agosto de 2026, 8:00 a. m.". La hora es la de
  la oficina de Bucaramanga —`fechaFormat` fija la zona—, asi que dice lo mismo
  se mire desde donde se mire.
*/
const CITA: Intl.DateTimeFormatOptions = {
  dateStyle: 'full',
  timeStyle: 'short',
}

function VisitsTab() {
  const { data, loading } = usePortalData(portal.visits)
  const t = useT()
  const { idioma } = useIdioma()

  if (loading) return <ListSkeleton />
  if (!data?.length) {
    return (
      <EmptyBlock
        title={t('account.visits.empty.title')}
        detail={t('account.visits.empty.detail')}
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
              {fechaFormat(idioma, CITA).format(new Date(visit.startsAt))}
            </p>
            <p className="truncate text-xs text-muted-foreground">
              {visit.property?.title ?? t('account.visit.removed')}
            </p>
          </div>
          <span className="rounded-full bg-secondary px-2.5 py-0.5 text-xs">
            {t(VISIT_STATUS[visit.status] ?? visit.status)}
          </span>
        </article>
      ))}
    </div>
  )
}

function AccountTab({ profile }: { profile: PortalProfile | null }) {
  const t = useT()

  if (!profile) return <ListSkeleton />

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <section className="rounded-lg border bg-card p-6 shadow-sm">
        <h2 className="mb-4 text-xs font-bold tracking-widest uppercase">
          {t('account.profile.title')}
        </h2>
        <dl className="grid gap-2 text-sm">
          <Row label={t('account.profile.name')} value={profile.fullName} />
          <Row label={t('account.profile.email')} value={profile.email ?? '—'} />
          <Row
            label={t('account.profile.phone')}
            value={profile.cellPhone ?? '—'}
          />
          <Row
            label={t('account.profile.document')}
            value={profile.identification ?? '—'}
          />
          <Row
            label={t('account.profile.city')}
            value={profile.city?.name ?? '—'}
          />
        </dl>
        <p className="mt-4 text-xs text-muted-foreground">
          {t('account.profile.help')}
        </p>
      </section>

      <section className="rounded-lg border bg-card p-6 shadow-sm">
        <h2 className="mb-4 text-xs font-bold tracking-widest uppercase">
          {t('account.agent.title')}
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
            {t('account.agent.empty')}
          </p>
        )}
      </section>

      <section className="rounded-lg border bg-card p-6 shadow-sm lg:col-span-2">
        <h2 className="mb-4 text-xs font-bold tracking-widest uppercase">
          {t('account.password.section')}
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
  const t = useT()
  const map: Record<string, { label: string; tone: string }> = {
    DRAFT: {
      label: t('account.property.status.DRAFT'),
      tone: 'bg-amber-100 text-amber-900',
    },
    ACTIVE: {
      label: t('account.property.status.ACTIVE'),
      tone: 'bg-green-100 text-green-900',
    },
    OUTSTANDING: {
      label: t('account.property.status.OUTSTANDING'),
      tone: 'bg-green-100 text-green-900',
    },
    INACTIVE: {
      label: t('account.property.status.INACTIVE'),
      tone: 'bg-secondary',
    },
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
