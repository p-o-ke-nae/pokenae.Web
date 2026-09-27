import { redirect } from "next/navigation";

export default async function HomeContentAdminPage() {
  redirect("/admin/content");
}
