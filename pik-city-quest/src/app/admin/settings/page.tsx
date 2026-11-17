"use client";
import { DataTable, type Row } from "@/components/admin/data-table";
import { ENTITY_FIELDS } from "@/lib/admin/fields";
type X = Row & { key: string; label: string; amount: number; description: string | null };
type P = Row & { name: string; contact: string | null; isActive: boolean; _count: { users: number; destinations: number; rewards: number } };
export default function SettingsAdmin() {
  return (
    <div className="space-y-8">
      <DataTable<X> entity="xpRules" title="XP & scoring rules" description="Centralised scoring. Mission XP lives on each mission; these rules cover bonuses (checkpoint, new destination, streaks, challenges) and the points-per-XP ratio for the reward economy." fields={ENTITY_FIELDS.xpRules}
        columns={[{ key: "key", label: "Key", render: (x) => <code className="text-xs font-bold">{x.key}</code> }, { key: "label", label: "Label" }, { key: "amount", label: "Amount", render: (x) => <b>{x.amount}</b> }, { key: "description", label: "Description" }]} canArchive={false} />
      <DataTable<P> entity="partners" title="Partners & venues" description="Partner accounts own destinations and rewards; PARTNER_ADMIN users are scoped to their partner." fields={ENTITY_FIELDS.partners}
        columns={[{ key: "name", label: "Partner", render: (p) => <span className="font-bold">{p.name}</span> }, { key: "contact", label: "Contact" }, { key: "_count", label: "Admins / venues / rewards", render: (p) => `${p._count.users} / ${p._count.destinations} / ${p._count.rewards}` }]} />
      <section className="rounded-xl bg-white border border-slate-200 p-4 text-sm space-y-2"><h2 className="font-extrabold">Integrations</h2>
        <ul className="list-disc pl-5 text-slate-600 space-y-1"><li><b>TauPIK AI</b>: set <code>ANTHROPIC_API_KEY</code> for the live Claude assistant, or point <code>src/lib/taupik.ts</code> at the official TauPIK API. Without a key the assistant runs in labelled Demo mode.</li><li><b>Google Sign-In</b>: set <code>GOOGLE_CLIENT_ID</code> / <code>GOOGLE_CLIENT_SECRET</code> and add <code>/api/auth/google/callback</code> as redirect URI.</li><li><b>Email</b>: set <code>RESEND_API_KEY</code> (or adapt <code>src/lib/mail.ts</code>) for verification and reset emails.</li><li><b>Media storage</b>: <code>UPLOAD_DIR</code> local disk by default; swap <code>src/lib/storage.ts</code> for S3 / GCS.</li><li><b>piktourism.com</b>: destinations, events, transport and Tourist Exclusive tenants were imported from the public API; re-run <code>npm run db:seed</code> after refreshing <code>prisma/seed-data</code>.</li></ul></section>
    </div>
  );
}
