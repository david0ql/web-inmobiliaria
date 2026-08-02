import { lazy, Suspense } from "react";

import { useCuandoOcioso } from "@/lib/cuando-ocioso";
import type { Property } from "@/lib/types";

const PropertyMapCanvas = lazy(() =>
  import("@/components/property/property-map-canvas").then((m) => ({
    default: m.PropertyMapCanvas,
  })),
);

/**
 * El bloque de ubicacion de la ficha.
 *
 * El marco y su titulo se pintan siempre; Leaflet —150 kB, mas las teselas de
 * un servidor ajeno— espera a que la pagina termine de cargar y el hilo quede
 * libre. Asi no compite con la foto principal, que es lo que el visitante esta
 * esperando ver, y aun asi el mapa sale solo: no hay que pulsar nada ni bajar
 * hasta el.
 */
export function PropertyMap({ property }: { property: Property }) {
  const { latitude, longitude, mapPublication } = property;
  const ocioso = useCuandoOcioso();

  if (latitude === null || longitude === null || mapPublication === "HIDDEN") {
    return null;
  }

  return (
    <section>
      <h2 className="mb-3 text-xs font-bold tracking-widest uppercase">
        Ubicación
      </h2>
      {/* El alto es el mismo que tendra el mapa, para que nada salte al llegar. */}
      <div className="h-[320px] w-full">
        {ocioso ? (
          <Suspense fallback={<MapPlaceholder />}>
            <PropertyMapCanvas property={property} />
          </Suspense>
        ) : (
          <MapPlaceholder />
        )}
      </div>
      {mapPublication === "APPROXIMATE" && (
        <p className="mt-2 text-xs text-muted-foreground">
          Ubicación aproximada. Tu asesor te da la dirección exacta al agendar
          la visita.
        </p>
      )}
    </section>
  );
}

function MapPlaceholder() {
  return (
    <div
      aria-hidden="true"
      className="size-full rounded-lg border bg-secondary"
    />
  );
}
