import { Mail, MessageCircle, Phone } from 'lucide-react'

import { initials } from '@/lib/format'
import { SITE } from '@/lib/site'
import type { Property } from '@/lib/types'

/**
 * La caja del asesor de la ficha.
 *
 * `GET /public/properties/:code` devuelve el asesor a cargo recortado a nombre,
 * correo, movil y foto. Si el inmueble no tiene asesor asignado —o si el que
 * tenia ya no esta activo— la API manda `null` y la caja cae en el contacto de
 * la agencia, que es lo que un visitante necesita de todas formas.
 */
export function AgentPanel({ property }: { property: Property }) {
  const agent = property.agent
  const name = agent?.fullName ?? SITE.name
  const phone = agent?.cellPhone ?? SITE.phone
  const email = agent?.email ?? SITE.email
  const whatsapp = phone.replace(/\D/g, '')

  return (
    <div className="rounded-lg border bg-card p-5 shadow-sm">
      <div className="flex items-center gap-3">
        <div className="grid size-12 shrink-0 place-items-center overflow-hidden rounded-full bg-secondary text-sm font-semibold text-muted-foreground">
          {agent?.photoUrl ? (
            <img
              src={agent.photoUrl}
              alt=""
              width={48}
              height={48}
              loading="lazy"
              decoding="async"
              className="size-full object-cover"
            />
          ) : (
            initials(name)
          )}
        </div>
        <div className="min-w-0">
          <p className="truncate font-semibold">{name}</p>
          <p className="text-xs text-muted-foreground">
            {agent ? 'Asesor a cargo' : 'Atención al cliente'}
          </p>
        </div>
      </div>

      <hr className="my-4" />

      {/*
        Correo, telefono y WhatsApp, en ese orden. Lo pidio la agencia y tiene
        sentido: el correo deja constancia y llega aunque el asesor este en una
        visita; la llamada interrumpe. WhatsApp cierra porque es el que mas se
        pulsa y conviene que quede el ultimo en la vista.
      */}
      <div className="flex min-w-0 flex-col gap-2.5 text-sm">
        {/* `truncate` y no `break-all`: partir "serrano-inmobiliaria.com" a mitad
            de palabra se lee peor que cortarlo con puntos suspensivos. */}
        <a
          href={`mailto:${email}?subject=${encodeURIComponent(`Inmueble ${property.code}`)}`}
          title={email}
          className="flex min-w-0 items-center gap-2 hover:underline"
        >
          <Mail className="size-4 shrink-0 text-muted-foreground" />
          <span className="truncate">{email}</span>
        </a>
        <a href={`tel:${phone}`} className="flex items-center gap-2 hover:underline">
          <Phone className="size-4 shrink-0 text-muted-foreground" />
          <span className="tabular">{phone}</span>
        </a>
        {/* Con asesor asignado se respeta su `hasWhatsapp`: no todos lo usan.
            Sin asesor, el numero de la agencia si atiende por ahi. */}
        {(!agent || agent.hasWhatsapp) && (
          <a
            href={`https://wa.me/${whatsapp}?text=${encodeURIComponent(
              `Hola, me interesa el inmueble ${property.code}: ${property.title}`,
            )}`}
            target="_blank"
            rel="noreferrer noopener"
            className="flex items-center gap-2 hover:underline"
          >
            <MessageCircle className="size-4 shrink-0 text-muted-foreground" />
            Escribir por WhatsApp
          </a>
        )}
      </div>
    </div>
  )
}
