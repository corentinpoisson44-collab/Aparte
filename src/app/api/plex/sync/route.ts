import { getDefaultHousehold } from "@/lib/household";
import {
  PlexNotConnectedError,
  PlexServerUnreachableError,
  syncPlexLibrary,
} from "@/lib/plex/sync";

// Une grosse bibliothèque peut prendre plus que le timeout par défaut des
// fonctions serverless Vercel.
export const maxDuration = 60;

function ndjson(obj: unknown): Uint8Array {
  return new TextEncoder().encode(JSON.stringify(obj) + "\n");
}

/**
 * Répond en flux NDJSON (un événement JSON par ligne) plutôt qu'en une
 * seule requête bloquante, pour que le client affiche une progression
 * pendant tout le temps de la synchro.
 */
export async function POST() {
  const household = await getDefaultHousehold();

  const stream = new ReadableStream({
    async start(controller) {
      try {
        const result = await syncPlexLibrary(household, (imported, total) => {
          controller.enqueue(ndjson({ type: "progress", imported, total }));
        });
        controller.enqueue(ndjson({ type: "done", ...result }));
      } catch (err) {
        if (err instanceof PlexNotConnectedError || err instanceof PlexServerUnreachableError) {
          controller.enqueue(ndjson({ type: "error", error: err.message }));
        } else {
          console.error("Échec de la synchronisation Plex :", err);
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
