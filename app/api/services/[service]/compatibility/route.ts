import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { getAuthOptions } from "@/lib/auth/auth-options";
import { getAvailableServices, type ApiServiceName } from "@/lib/config/api-config";
import { checkServiceCompatibility } from "@/lib/config/service-contracts";

export async function GET(_: Request, { params }: { params: Promise<{ service: string }> }) {
  if (!(await getServerSession(getAuthOptions()))) return NextResponse.json({ error: "認証が必要です。" }, { status: 401 });
  const { service } = await params;
  if (!getAvailableServices().includes(service as ApiServiceName)) return NextResponse.json({ error: "未登録のサービスです。" }, { status: 400 });
  const result = await checkServiceCompatibility(service as ApiServiceName);
  return NextResponse.json(result, { status: result.compatible ? 200 : 503 });
}
