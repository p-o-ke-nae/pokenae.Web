import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const headers: Record<string, string> = {}
  for (const [key, value] of request.headers) {
    headers[key] = value
  }

  return NextResponse.json({
    success: true,
    headers,
    receivedAt: new Date().toISOString(),
  })
}
