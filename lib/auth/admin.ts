import "server-only";
import { getServerSession } from "next-auth";
import { getAuthOptions } from "./auth-options";

function configuredAdmins() {
  return new Set((process.env.ADMIN_EMAILS ?? "").split(",").map((email) => email.trim().toLowerCase()).filter(Boolean));
}

export function isAdminEmail(email?: string | null) {
  if (!email) return false;
  const admins = configuredAdmins();
  return admins.size > 0 && admins.has(email.trim().toLowerCase());
}

export async function getAdminAuthorization() {
  const session = await getServerSession(getAuthOptions());
  if (!session?.user?.email) return { authorized: false as const, status: 401 as const, session: null };
  if (!isAdminEmail(session.user.email)) return { authorized: false as const, status: 403 as const, session };
  return { authorized: true as const, status: 200 as const, session };
}
