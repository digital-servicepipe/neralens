import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'neurly-local-proxy',
      configureServer(server) {
        server.middlewares.use('/api/neurly/chat/completions', async (req, res) => {
          if (req.method !== 'POST') {
            res.statusCode = 405;
            res.setHeader('Content-Type', 'application/json; charset=utf-8');
            res.end(JSON.stringify({ error: 'Method not allowed' }));
            return;
          }

          try {
            const chunks: Buffer[] = [];
            for await (const chunk of req) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
            const body = Buffer.concat(chunks).toString('utf-8');
            const authorization = req.headers.authorization;

            const upstream = await fetch('https://neurly.ru/v1/chat/completions', {
              method: 'POST',
              headers: {
                ...(authorization ? { Authorization: authorization } : {}),
                'Content-Type': 'application/json',
              },
              body,
            });

            const text = await upstream.text();
            res.statusCode = upstream.status;
            res.setHeader('Content-Type', upstream.headers.get('content-type') || 'application/json; charset=utf-8');
            res.end(text);
          } catch (cause) {
            res.statusCode = 502;
            res.setHeader('Content-Type', 'application/json; charset=utf-8');
            res.end(JSON.stringify({ error: cause instanceof Error ? cause.message : 'Neurly proxy request failed' }));
          }
        });
      },
    },
  ],
});
