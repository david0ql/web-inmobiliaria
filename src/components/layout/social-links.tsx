import type { ComponentProps } from 'react'

import { SOCIAL } from '@/lib/site'
import { cn } from '@/lib/utils'

/**
 * Los glifos de las cuatro redes van a mano: lucide dejo de publicar iconos de
 * marca, y traerse una libreria entera —o Font Awesome Pro, que es lo que usaba
 * el tema anterior y es de pago— por cuatro dibujos no compensa.
 */
type IconProps = ComponentProps<'svg'>

function Facebook(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>
      <path d="M22 12a10 10 0 1 0-11.56 9.88v-6.99H7.9V12h2.54V9.8c0-2.5 1.49-3.89 3.77-3.89 1.1 0 2.24.2 2.24.2v2.46h-1.26c-1.24 0-1.63.77-1.63 1.56V12h2.78l-.45 2.89h-2.33v6.99A10 10 0 0 0 22 12Z" />
    </svg>
  )
}

function Instagram(props: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <rect x="2" y="2" width="20" height="20" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="1.2" fill="currentColor" stroke="none" />
    </svg>
  )
}

function YouTube(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>
      <path d="M21.6 7.2a2.5 2.5 0 0 0-1.77-1.77C18.25 5 12 5 12 5s-6.25 0-7.83.43A2.5 2.5 0 0 0 2.4 7.2 26 26 0 0 0 2 12a26 26 0 0 0 .4 4.8 2.5 2.5 0 0 0 1.77 1.77C5.75 19 12 19 12 19s6.25 0 7.83-.43a2.5 2.5 0 0 0 1.77-1.77A26 26 0 0 0 22 12a26 26 0 0 0-.4-4.8ZM10 15.2V8.8l5.2 3.2-5.2 3.2Z" />
    </svg>
  )
}

function TikTok(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>
      <path d="M16.5 3c.4 2.2 1.9 3.9 4 4.2v2.9c-1.5.1-3-.3-4.3-1.1v5.9c0 3.6-2.6 6.1-5.9 6.1-3.1 0-5.6-2.4-5.6-5.6 0-3.3 2.7-5.9 6.4-5.5v3c-.3-.1-.7-.2-1.1-.2-1.5 0-2.6 1.1-2.6 2.6 0 1.5 1.1 2.7 2.6 2.7 1.6 0 2.7-1.1 2.7-3V3h3.8Z" />
    </svg>
  )
}

const ICONS = { Facebook, Instagram, YouTube, TikTok } as const

export function SocialLinks({
  className,
  iconClassName,
}: {
  className?: string
  iconClassName?: string
}) {
  return (
    <ul className={cn('flex items-center gap-1', className)}>
      {SOCIAL.map((network) => {
        const Icon = ICONS[network.name]
        return (
          <li key={network.name}>
            <a
              href={network.href}
              target="_blank"
              rel="noreferrer noopener"
              title={network.name}
              className="flex size-8 items-center justify-center rounded-md transition-colors hover:bg-current/15"
            >
              <Icon className={cn('size-4', iconClassName)} />
              <span className="sr-only">{network.name}</span>
            </a>
          </li>
        )
      })}
    </ul>
  )
}
