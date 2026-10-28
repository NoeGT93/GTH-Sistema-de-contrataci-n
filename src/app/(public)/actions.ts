"use server";

import { cookies, headers } from "next/headers";
import { z } from "zod";
import { run, type Result } from "@/server/lib/result";
import { checkApplicationStatus, submitApplication, type SubmitResult, type Touch } from "@/server/modules/applications/service";
import { FIRST_TOUCH, LAST_TOUCH } from "@/middleware";

const s = (max: number) => z.string().max(max).optional().catch(undefined);
// La cookie la escribe el middleware, pero viene del navegador: se valida y recorta.
const touchSchema = z.object({
  utmSource: s(200), utmMedium: s(200), utmCampaign: s(200), utmContent: s(200), utmTerm: s(200),
  referrer: s(500), landingPath: s(300),
  externalIds: z.record(z.string(), z.string().max(300)).optional().catch(undefined),
  at: z.iso.datetime(),
});

async function readTouch(name: string): Promise<Touch | undefined> {
  try {
    const raw = (await cookies()).get(name)?.value;
    return raw ? touchSchema.parse(JSON.parse(raw)) : undefined;
  } catch {
    return undefined;
  }
}

async function clientIp() {
  return (await headers()).get("x-forwarded-for")?.split(",")[0].trim() || "unknown";
}

export async function submitApplicationAction(input: unknown): Promise<Result<SubmitResult>> {
  const [first, last, ip] = await Promise.all([readTouch(FIRST_TOUCH), readTouch(LAST_TOUCH), clientIp()]);
  return run(() => submitApplication(input, { ip, first, last }));
}

export type StatusState = Result<Awaited<ReturnType<typeof checkApplicationStatus>>> | null;

export async function checkStatusAction(_: StatusState, fd: FormData): Promise<StatusState> {
  const ip = await clientIp();
  return run(() => checkApplicationStatus(Object.fromEntries(fd), ip));
}
