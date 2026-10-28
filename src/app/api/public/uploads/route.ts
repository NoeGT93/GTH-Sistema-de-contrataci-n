import { run } from "@/server/lib/result";
import { requestCvUpload } from "@/server/modules/applications/service";

// Devuelve una URL prefirmada para subir el CV directo al bucket (PDF/DOC/DOCX, 5 MB máx.).
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const r = await run(() => requestCvUpload(body));
  return Response.json(r, { status: r.ok ? 200 : r.error.code === "NOT_FOUND" ? 404 : 400 });
}
