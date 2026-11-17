import { api, ok } from "@/lib/api";
import { clearSessionCookie, getCurrentUser, revokeSession } from "@/lib/auth";

export const POST = api(async () => {
  const user = await getCurrentUser();
  if (user) await revokeSession(user.sessionId);
  await clearSessionCookie();
  return ok({ ok: true });
});
