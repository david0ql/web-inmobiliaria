import * as NavigationMenuPrimitive from '@radix-ui/react-navigation-menu'
import { ChevronDownIcon } from 'lucide-react'
import type * as React from 'react'

import { cn } from '@/lib/utils'

function NavigationMenu({
  className,
  children,
  viewport = true,
  ...props
}: React.ComponentProps<typeof NavigationMenuPrimitive.Root> & {
  viewport?: boolean
}) {
  return (
    <NavigationMenuPrimitive.Root
      data-slot="navigation-menu"
      data-viewport={viewport}
      className={cn('group/navigation-menu relative flex max-w-max', className)}
      {...props}
    >
      {children}
      {viewport && <NavigationMenuViewport />}
    </NavigationMenuPrimitive.Root>
  )
}

function NavigationMenuList({
  className,
  ...props
}: React.ComponentProps<typeof NavigationMenuPrimitive.List>) {
  return (
    <NavigationMenuPrimitive.List
      data-slot="navigation-menu-list"
      className={cn('flex flex-1 list-none items-center gap-1', className)}
      {...props}
    />
  )
}

function NavigationMenuItem({
  className,
  ...props
}: React.ComponentProps<typeof NavigationMenuPrimitive.Item>) {
  return (
    <NavigationMenuPrimitive.Item
      data-slot="navigation-menu-item"
      className={cn('relative', className)}
      {...props}
    />
  )
}

/**
 * El menu del tema anterior no es una barra de botones: son enlaces sueltos en
 * versalitas, con el activo subrayado. Se conserva ese trato.
 */
const navigationMenuTriggerStyle = () =>
  cn(
    'inline-flex h-10 w-max items-center justify-center gap-1 rounded-md px-3 text-[0.8125rem] font-medium tracking-wide uppercase transition-colors outline-none',
    'hover:bg-secondary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
    'data-[state=open]:bg-secondary',
  )

function NavigationMenuTrigger({
  className,
  children,
  ...props
}: React.ComponentProps<typeof NavigationMenuPrimitive.Trigger>) {
  return (
    <NavigationMenuPrimitive.Trigger
      data-slot="navigation-menu-trigger"
      className={cn(navigationMenuTriggerStyle(), 'group', className)}
      {...props}
    >
      {children}
      <ChevronDownIcon
        className="relative top-px ml-0.5 size-3 transition-transform duration-200 group-data-[state=open]:rotate-180"
        aria-hidden="true"
      />
    </NavigationMenuPrimitive.Trigger>
  )
}

/**
 * Sin `viewport`, Radix deja el panel dentro del propio `NavigationMenuItem`, que
 * es `relative`. Hay que colgarlo de `top-full` — con `top-0` se pinta ENCIMA del
 * enlace que lo abre y lo tapa — y darle fondo, borde, sombra y `z-50`: en el
 * item no hereda ninguno, asi que sin esto sale transparente y por debajo de lo
 * que venga despues en la cabecera.
 */
function NavigationMenuContent({
  className,
  ...props
}: React.ComponentProps<typeof NavigationMenuPrimitive.Content>) {
  return (
    <NavigationMenuPrimitive.Content
      data-slot="navigation-menu-content"
      className={cn(
        'absolute top-full left-0 z-50 mt-1.5 overflow-hidden rounded-md border bg-popover text-popover-foreground shadow-lg',
        'data-[motion^=from-]:animate-in data-[motion^=from-]:fade-in-0 data-[motion^=from-]:zoom-in-95',
        'data-[motion^=to-]:animate-out data-[motion^=to-]:fade-out-0 data-[motion^=to-]:zoom-out-95',
        className,
      )}
      {...props}
    />
  )
}

function NavigationMenuViewport({
  className,
  ...props
}: React.ComponentProps<typeof NavigationMenuPrimitive.Viewport>) {
  return (
    <div className="absolute top-full left-0 isolate z-50 flex justify-center">
      <NavigationMenuPrimitive.Viewport
        data-slot="navigation-menu-viewport"
        className={cn(
          'relative mt-1.5 h-(--radix-navigation-menu-viewport-height) w-full origin-top-center overflow-hidden rounded-md border bg-popover text-popover-foreground shadow-lg md:w-(--radix-navigation-menu-viewport-width)',
          'data-[state=open]:animate-in data-[state=open]:zoom-in-95',
          'data-[state=closed]:animate-out data-[state=closed]:zoom-out-95',
          className,
        )}
        {...props}
      />
    </div>
  )
}

function NavigationMenuLink({
  className,
  ...props
}: React.ComponentProps<typeof NavigationMenuPrimitive.Link>) {
  return (
    <NavigationMenuPrimitive.Link
      data-slot="navigation-menu-link"
      className={cn(
        'flex flex-col gap-1 rounded-sm p-2 text-sm transition-colors outline-none',
        'hover:bg-secondary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
        className,
      )}
      {...props}
    />
  )
}

export {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
  navigationMenuTriggerStyle,
  NavigationMenuViewport,
}
