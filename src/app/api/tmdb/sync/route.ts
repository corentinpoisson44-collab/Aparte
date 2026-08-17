import { getDefaultHousehold } from "@/lib/household";
import { TmdbNotConfiguredError, syncTmdbCatalog } from "@/lib/tmdb/sync";

// Une synchro touche plusieurs plateformes et fait un appel réseau par
// film : peut dépasser le timeout par défaut des fonctions Vercel.
export const maxDuration = 60;

function ndjson(obj: unknown): Uint8Array {
  return new TextEncoder().encode(JSON.stringify(obj) + "\n");
}

/**
 * Répond en flux NDJSON (un événement JSON par ligne), comme
 * `/api/plex/sync`, pour afficher une progression pendant la synchro.
 */
export async function POST() {
  const household = await getDefaultHousehold();

  const stream = new ReadableStream({
    async start(controller) {
      try {
        const result = await syncTmdbCatalog(household, (imported, total) => {
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
