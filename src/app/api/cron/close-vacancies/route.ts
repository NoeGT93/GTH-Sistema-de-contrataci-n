import { closeExpiredVacancies } from "@/server/modules/vacancies/service";

// Vercel Cron: diario 00:30 hora de Guatemala (06:30 UTC). Vercel firma con CRON_SECRET.
export async function GET(req: Request) {
  if (!process.env.CRON_SECRET || req.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`)
    return new Response("Unauthorized", { status: 401 });
  return Response.json({ closed: await closeExpiredVacancies() });
}
