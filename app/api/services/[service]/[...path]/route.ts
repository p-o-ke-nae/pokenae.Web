import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { getAuthOptions } from "@/lib/auth/auth-options";
import { getApiClient } from "@/lib/api/client-factory";
import { getAvailableServices, type ApiServiceName } from "@/lib/config/api-config";
import { createSuccessResponse, createErrorResponse, createSafeErrorResponse, parseRequestBody } from "@/lib/api/route-helpers";

interface RouteParams {
  params: Promise<{ service: string; path: string[] }>;
}

export async function GET(request: NextRequest, context: RouteParams) {
  return handleRequest(request, context, "GET");
}
export async function POST(request: NextRequest, context: RouteParams) {
  return handleRequest(request, context, "POST");
}
export async function PUT(request: NextRequest, context: RouteParams) {
  return handleRequest(request, context, "PUT");
}
export async function PATCH(request: NextRequest, context: RouteParams) {
  return handleRequest(request, context, "PATCH");
}
export async function DELETE(request: NextRequest, context: RouteParams) {
  return handleRequest(request, context, "DELETE");
}

async function handleRequest(request: NextRequest, context: RouteParams, method: string) {
  try {
    const { service, path } = await context.params;
    const session = await getServerSession(getAuthOptions());
    if (!session) return createErrorResponse("UNAUTHORIZED", "認証が必要です。ログインしてください。", 401);
    if (!getAvailableServices().includes(service as ApiServiceName)) return createSafeErrorResponse("INVALID_SERVICE", 400);

    const endpoint = `/${path.join("/")}`;
    const searchParams = request.nextUrl.searchParams.toString();
    const fullEndpoint = searchParams ? `${endpoint}?${searchParams}` : endpoint;
    const body = method === "GET" ? undefined : await parseRequestBody(request);

    const sessionAccessToken = typeof session.accessToken === "string" ? session.accessToken : undefined;
    const authorizationHeader = request.headers.get("authorization");
    const requestBearerToken = authorizationHeader?.toLowerCase().startsWith("bearer ") ? authorizationHeader.slice(7).trim() : undefined;
    const requestGoogleToken = request.headers.get("x-google-access-token") ?? undefined;
    const accessToken = sessionAccessToken || requestBearerToken || requestGoogleToken;
    const headers: Record<string, string> = {};
    if (accessToken) {
      headers.Authorization = `Bearer ${accessToken}`;
      headers["X-Google-Access-Token"] = accessToken;
    }

    const client = getApiClient(service as ApiServiceName);
    const response =
      method === "GET" ? await client.get(fullEndpoint, { headers }) :
      method === "POST" ? await client.post(fullEndpoint, body, { headers }) :
      method === "PUT" ? await client.put(fullEndpoint, body, { headers }) :
      method === "PATCH" ? await client.patch(fullEndpoint, body, { headers }) :
      method === "DELETE" ? await client.delete(fullEndpoint, { headers, body }) :
      null;
    if (!response) return createSafeErrorResponse("METHOD_NOT_ALLOWED", 405);
    if (response.success) return createSuccessResponse(response.data);
    const statusCode = response.error.code.startsWith("HTTP_") ? Number.parseInt(response.error.code.replace("HTTP_", ""), 10) : 500;
    return createSafeErrorResponse(response.error.code, statusCode, response.error.details);
  } catch (error) {
    console.error("API Route Error:", error);
    return createSafeErrorResponse("INTERNAL_ERROR", 500);
  }
}
