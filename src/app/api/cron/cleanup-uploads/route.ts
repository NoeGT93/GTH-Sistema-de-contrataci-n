import { cleanupOrphanUploads } from "@/server/modules/applications/service";

// Diario: CV sin aplicación después de 24 h.
export async function GET(req: Request) {
  if (!process.env.CRON_SECRET || req.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`)
    return new Response("Unauthorized", { status: 401 });
  return Response.json({ removed: await cleanupOrphanUploads() });
}
