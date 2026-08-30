export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname !== '/api/views') {
      return new Response('Not Found', { status: 404 });
    }

    const kv = env.VIEWS_KV;
    if (!kv) {
      return new Response(JSON.stringify({ views: null, error: 'VIEWS_KV not bound' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
      });
    }

    try {
      const key = 'site_views';
      const current = parseInt((await kv.get(key)) || '0', 10) || 0;
      const next = current + 1;
      await kv.put(key, String(next));

      return new Response(JSON.stringify({ views: next }), {
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
      });
    } catch (e) {
      return new Response(JSON.stringify({ views: null, error: String(e && e.message ? e.message : e) }), {
        status: 500,
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
      });
    }
  },
};
