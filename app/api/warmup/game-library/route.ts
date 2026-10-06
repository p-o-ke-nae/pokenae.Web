import { getApiClient } from '@/lib/api/client-factory';

export async function GET() {
  try {
    const client = getApiClient('game-library-api');
    await client.get('/health', { timeout: 5000, retry: false });
  } catch {
    // Warmup is best-effort and must not expose backend details.
  }
  return new Response(null, { status: 204, headers: { 'Cache-Control': 'no-store' } });
}
