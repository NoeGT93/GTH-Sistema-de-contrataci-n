import { getActor } from "@/server/auth";
import { authorize } from "@/server/auth/permissions";
import { db } from "@/server/db";
import { PartnerForm } from "@/components/admin/forms";
import { Card, EmptyState } from "@/components/ui";
import { createPartnerAction } from "../actions";

export const metadata = { title: "Aliados" };

export default async function PartnersPage() {
  authorize(await getActor(), "partner.write");
  const partners = await db.partner.findMany({
    where: { active: true },
    orderBy: { name: "asc" },
    include: { contacts: true, _count: { select: { promotions: { where: { removedAt: null } } } } },
  });
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Aliados de promoción</h1>
      <Card><PartnerForm action={createPartnerAction} /></Card>
      {partners.length === 0 ? (
        <EmptyState title="Aún no hay aliados" />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {partners.map((p) => (
            <Card key={p.id}>
              <p className="font-semibold">{p.name}</p>
              <p className="text-sm text-muted">{p.kind ?? "Aliado"} · {p._count.promotions} promociones</p>
              {p.contacts.map((c) => (
                <p key={c.id} className="mt-2 text-sm">
                  {c.name}{c.phone && ` · ${c.phone}`}{c.email && ` · ${c.email}`}
                </p>
              ))}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
