import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, normalize } from "node:path";
import { DEV_DIR, devVerify } from "@/server/integrations/storage";
import { CV_MAX_BYTES } from "@/server/modules/applications/rules";

// Solo desarrollo: imita un bucket con URLs firmadas. En producción responde 404.
async function resolve(req: Request, params: Promise<{ key: string[] }>) {
  if (process.env.NODE_ENV === "production" || process.env.S3_BUCKET) return null;
  const key = (await params).key.join("/");
  const u = new URL(req.url);
  if (!devVerify(key, Number(u.searchParams.get("exp")), u.searchParams.get("sig") ?? "")) return null;
  const root = join(process.cwd(), DEV_DIR);
  const path = normalize(join(root, key));
  return path.startsWith(root + "/") ? path : null;
}

export async function PUT(req: Request, { params }: { params: Promise<{ key: string[] }> }) {
  const path = await resolve(req, params);
  if (!path) return new Response("Not found", { status: 404 });
  const body = Buffer.from(await req.arrayBuffer());
  // S3 no limita el tamaño en un PUT prefirmado; aquí tampoco se impone más allá de un tope de seguridad.
  if (body.length > CV_MAX_BYTES * 2) return new Response("Too large", { status: 413 });
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, body);
  return new Response(null, { status: 200 });
}

export async function GET(req: Request, { params }: { params: Promise<{ key: string[] }> }) {
  const path = await resolve(req, params);
  if (!path) return new Response("Not found", { status: 404 });
  return new Response(await readFile(path), { headers: { "Content-Disposition": "attachment" } });
}
