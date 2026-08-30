export interface Env {
  VIEWS_KV: KVNamespace;
}

export async function onRequest(context: { env: Env }): Promise<Response> {
  const kv = context.env.VIEWS_KV;
  const key = 'site_views';

  try {
    const current = parseInt((await kv.get(key)) || '0', 10) || 0;
    const next = current + 1;
    await kv.put(key, String(next));
    return new Response(JSON.stringify({ views: next }), {
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ views: null, error: 'kv unavailable' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
    });
  }
}
