import { getDefaultHousehold } from "@/lib/household";
import { syncTmdbDiscovery, TmdbNotConfiguredError } from "@/lib/tmdb/discovery";

// Jusqu'à 6 plateformes × 20 films × 1 requête de détail chacun : peut
// dépasser le timeout par défaut des fonctions serverless Vercel.
export const maxDuration = 60;

function ndjson(obj: unknown): Uint8Array {
  return new TextEncoder().encode(JSON.stringify(obj) + "\n");
}

/**
 * Répond en flux NDJSON (comme /api/plex/sync) pour afficher une
 * progression pendant toute la synchronisation TMDB.
 */
export async function POST() {
  const household = await getDefaultHousehold();

  const stream = new ReadableStream({
    async start(controller) {
      try {
        const result = await syncTmdbDiscovery(household, (imported, total) => {
          controller.enqueue(ndjson({ type: "progress", imported, total }));
        });
        controller.enqueue(ndjson({ type: "done", ...result }));
      } catch (err) {
        if (err instanceof TmdbNotConfiguredError) {
          controller.enqueue(ndjson({ type: "error", error: err.message }));
        } else {
          console.error("Échec de la synchronisation TMDB :", err);
          controller.enqueue(
            ndjson({ type: "error", error: "Erreur inattendue pendant la synchronisation." })
          );
        }
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-cache",
    },
  });
}
