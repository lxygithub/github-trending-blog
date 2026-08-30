export async function onRequest(context: any) {
  const kv = context.env?.VIEWS_KV;
  const key = 'site_views';

  try {
    if (!kv) {
      return new Response(JSON.stringify({ views: null, error: 'VIEWS_KV not bound' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
      });
    }

    const current = parseInt((await kv.get(key)) || '0', 10) || 0;
    const next = current + 1;
    await kv.put(key, String(next));

    return new Response(JSON.stringify({ views: next }), {
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ views: null, error: String(e?.message || e) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
    });
  }
}
