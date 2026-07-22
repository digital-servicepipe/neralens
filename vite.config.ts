import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const apiKey = env.VITE_OPENROUTER_API_KEY || env.VITE_OPENROUTER_KEY || '';

  return {
    plugins: [
      react(),
      {
        name: 'neralens-openrouter-dev-api',
        configureServer(server) {
          server.middlewares.use('/api/openrouter', async (req, res) => {
            if (!apiKey) {
              res.statusCode = 500;
              res.setHeader('Content-Type', 'application/json; charset=utf-8');
              res.end(JSON.stringify({ error: { message: 'OpenRouter API key is not configured' } }));
              return;
            }

            try {
              const chunks: Buffer[] = [];
              for await (const chunk of req) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
              const body = chunks.length ? Buffer.concat(chunks) : undefined;
              const upstreamPath = req.url?.startsWith('/') ? req.url : `/${req.url ?? ''}`;
              const upstream = await fetch(`https://openrouter.ai/api/v1${upstreamPath}`, {
                method: req.method,
                headers: {
                  Authorization: `Bearer ${apiKey}`,
                  'Content-Type': req.headers['content-type'] || 'application/json',
                  'HTTP-Referer': 'http://127.0.0.1:9522',
                  'X-Title': 'NeraLens',
                },
                body: req.method === 'GET' || req.method === 'HEAD' ? undefined : body,
              });
              const responseBody = Buffer.from(await upstream.arrayBuffer());
              res.statusCode = upstream.status;
              upstream.headers.forEach((value, key) => {
                if (!['content-encoding', 'content-length', 'transfer-encoding'].includes(key.toLowerCase())) {
                  res.setHeader(key, value);
                }
              });
              res.end(responseBody);
            } catch (error) {
              res.statusCode = 502;
              res.setHeader('Content-Type', 'application/json; charset=utf-8');
              res.end(JSON.stringify({ error: { message: error instanceof Error ? error.message : 'OpenRouter request failed' } }));
            }
          });
        },
      },
    ],
  };
});
