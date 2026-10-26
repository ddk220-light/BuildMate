import { serve } from '@hono/node-server';
import { serveStatic } from '@hono/node-server/serve-static';
import app from './app';

// Standalone server retained for local development and recovery.
app.use('/*', serveStatic({ root: './dist/client' }));
app.get('*', serveStatic({ path: './dist/client/index.html' }));

const port = Number(process.env.PORT || 8787);
console.log(`Server starting on port ${port}...`);
serve({ fetch: app.fetch, port });
export default app;
