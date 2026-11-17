import { getCurrentUser } from "@/lib/auth";
import { TopBar } from "@/components/app/top-bar";
import { SettingsForm } from "./settings-form";
import { parseJson } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const me = (await getCurrentUser())!;
  return (
    <div>
      <TopBar back="/profile" title="Settings" />
      <div className="mx-auto max-w-lg lg:max-w-3xl px-4"><SettingsForm user={{ name: me.name, username: me.username, email: me.email, instagram: me.instagram, dateOfBirth: me.dateOfBirth?.toISOString().slice(0, 10) ?? "", publicProfile: me.publicProfile, language: me.language, hasPassword: true, notifPrefs: parseJson<Record<string, boolean>>(me.notifPrefs, {}), sharePrefs: parseJson<Record<string, boolean>>(me.sharePrefs, {}), avatarUrl: me.avatarUrl }} /></div>
    </div>
  );
}
