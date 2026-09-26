import { redirect } from "next/navigation";
import { getAdminAuthorization } from "@/lib/auth/admin";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const auth = await getAdminAuthorization();
  if (auth.status === 401) redirect("/api/auth/signin?callbackUrl=/admin/posts");
  if (!auth.authorized) redirect("/forbidden");
  return children;
}
