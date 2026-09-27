import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export function GET() {
  return NextResponse.json(
    {
      status: 'ok',
      revision: process.env.DEPLOY_SHA || 'unknown',
    },
    {
      headers: {
        'Cache-Control': 'no-store',
      },
    },
  );
}
