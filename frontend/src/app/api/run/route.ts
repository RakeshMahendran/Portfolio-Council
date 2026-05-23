import { query } from "gitclaw";
import path from "path";

// The agent repo is the parent of the frontend dir.
const AGENT_DIR = path.resolve(process.cwd(), "..");

/**
 * POST /api/run
 * Body: { prompt: string }
 *
 * Streams gitclaw's response back to the client as newline-delimited JSON.
 * Each line is a GCMessage from gitclaw (delta, tool_use, tool_result, etc.).
 *
 * This is the single API route that proves gitclaw is the engine — we import
 * its SDK directly and stream every event back to the dashboard UI.
 */
export async function POST(req: Request) {
  let prompt: string;
  try {
    const body = await req.json();
    prompt = body.prompt;
    if (!prompt || typeof prompt !== "string") {
      return new Response(
        JSON.stringify({ error: "Missing or invalid 'prompt' in body" }),
        { status: 400, headers: { "content-type": "application/json" } },
      );
    }
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
      status: 400,
      headers: { "content-type": "application/json" },
    });
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (obj: unknown) => {
        controller.enqueue(encoder.encode(JSON.stringify(obj) + "\n"));
      };

      send({ type: "session_start", dir: AGENT_DIR, ts: Date.now() });

      try {
        for await (const msg of query({
          prompt,
          dir: AGENT_DIR,
        })) {
          send(msg);
        }
        send({ type: "session_end", ts: Date.now() });
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        send({ type: "error", message });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "content-type": "application/x-ndjson",
      "cache-control": "no-cache, no-transform",
      "x-accel-buffering": "no",
    },
  });
}
