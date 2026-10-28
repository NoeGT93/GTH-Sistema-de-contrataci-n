import { redirect } from "next/navigation";
import { getActor } from "@/server/auth";
import { getFileDownloadUrl } from "@/server/modules/applications/service";

// Descarga de CV: verifica permiso, audita y redirige a una URL firmada de 5 minutos.
export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const actor = await getActor();
  redirect(await getFileDownloadUrl(actor, (await params).id));
}
