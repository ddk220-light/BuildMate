import app from '../src/server/app.js';

// Vercel Node.js Function using the Web Request/Response API.
export default { fetch: app.fetch };
