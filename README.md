# BuildMate

AI-powered shopping assistant for complex product builds (PC components, smart home systems, etc.)

## Quick Start

### Prerequisites

- Node.js 18+
- Cloudflare account
- Wrangler CLI (`npm install -g wrangler`)

### Local Development

```bash
# Clone repository
git clone https://github.com/yourusername/buildmate.git
cd buildmate

# Install dependencies
npm install

# Login to Cloudflare
wrangler login

# Create D1 database
npm run db:create
# Copy the database_id to wrangler.toml

# Create KV namespace
npm run kv:create
# Copy the id to wrangler.toml

# Run migrations locally
npm run db:migrate:local

# Start dev server
npm run dev
```

### Deploy from GitHub

1. Fork this repository
2. Add secrets to GitHub repository settings:
   - `CLOUDFLARE_API_TOKEN` - API token with Workers permissions
   - `CLOUDFLARE_ACCOUNT_ID` - Your Cloudflare account ID
3. Push to `main` branch for production deployment
4. Push to `staging` branch for staging deployment

### Deploy via Cloudflare Dashboard

1. Go to Cloudflare Dashboard > Workers & Pages
2. Click "Create application" > "Import from Git"
3. Connect your GitHub account and select this repository
4. Configure build settings:
   - Build command: `npm run build`
   - Build output directory: `dist`
5. Add environment variables:
   - `GEMINI_API_KEY` - Your Google Gemini API key
6. Deploy!

## Architecture

- **Runtime**: Cloudflare Workers
- **Framework**: Hono (lightweight web framework)
- **Database**: Cloudflare D1 (SQLite at the edge)
- **Cache**: Cloudflare KV
- **AI**: Google Gemini API
- **Static Assets**: Workers Assets

## Project Structure

```
BuildMate/
├── src/
│   ├── index.ts              # Main Worker entry point
│   ├── api/                  # API route handlers
│   │   ├── index.ts
│   │   ├── products.ts
│   │   ├── builds.ts
│   │   ├── compatibility.ts
│   │   └── gemini.ts
│   ├── middleware/           # Middleware functions
│   │   ├── auth.ts
│   │   ├── cors.ts
│   │   ├── rateLimit.ts
│   │   └── requestId.ts
│   ├── services/             # Business logic
│   │   ├── gemini.ts
│   │   ├── compatibility.ts
│   │   └── database.ts
│   └── types/                # TypeScript definitions
│       └── index.ts
├── public/                   # Static frontend assets
│   ├── index.html
│   ├── css/
│   ├── js/
│   └── assets/
├── migrations/               # Database migrations
│   └── schema.sql
├── wrangler.toml             # Cloudflare Workers config
├── package.json
├── tsconfig.json
└── .github/
    └── workflows/
        └── deploy.yml        # GitHub Actions for CI/CD
```

## Configuration

### Environment Variables

Set these in Cloudflare Dashboard or `.dev.vars` for local development:

| Variable | Description |
|----------|-------------|
| `GEMINI_API_KEY` | Google Gemini API key |
| `ENVIRONMENT` | `development`, `staging`, or `production` |
| `GEMINI_MODEL` | Gemini model to use |
| `APP_VERSION` | Application version |

### Bindings

Configured in `wrangler.toml`:

- `DB` - D1 database
- `CACHE` - KV namespace
- `ASSETS` - Static file serving

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api` | API info |
| GET | `/api/health` | Health check |
| GET | `/api/products` | List products |
| GET | `/api/products/:id` | Get product |
| POST | `/api/products` | Create product |
| PUT | `/api/products/:id` | Update product |
| DELETE | `/api/products/:id` | Delete product |
| GET | `/api/builds` | List builds |
| GET | `/api/builds/:id` | Get build |
| POST | `/api/builds` | Create build |
| POST | `/api/builds/:id/init` | Initialize build (AI) |
| GET | `/api/builds/:id/step/:n/options` | Get step options |
| POST | `/api/builds/:id/step/:n/select` | Select option |
| POST | `/api/builds/:id/complete` | Complete build |
| GET | `/api/builds/:id/instructions` | Get instructions |
| GET | `/api/builds/:id/export` | Export build |
| POST | `/api/compatibility/check` | Check compatibility |
| GET | `/api/compatibility/rules` | Get rules |
| POST | `/api/ai/suggest` | Get AI suggestions |
| POST | `/api/ai/analyze` | AI compatibility analysis |
| GET | `/api/ai/status` | AI service status |

## Testing

```bash
npm test           # Run tests
npm run lint       # Lint code
npm run typecheck  # Type check
```

## Deployment Checklist

### Initial Setup (One-time)

1. [ ] Create Cloudflare account if needed
2. [ ] Install Wrangler: `npm install -g wrangler`
3. [ ] Login: `wrangler login`
4. [ ] Create D1 database: `wrangler d1 create buildmate-db`
5. [ ] Create KV namespace: `wrangler kv:namespace create CACHE`
6. [ ] Update `wrangler.toml` with database_id and KV id
7. [ ] Set secrets: `wrangler secret put GEMINI_API_KEY`
8. [ ] Run migrations: `wrangler d1 execute buildmate-db --file=./migrations/schema.sql`

### GitHub Integration

1. [ ] Create API token in Cloudflare Dashboard (Account > API Tokens)
   - Template: "Edit Cloudflare Workers"
   - Add D1 permissions if needed
2. [ ] Add repository secrets in GitHub:
   - `CLOUDFLARE_API_TOKEN`
   - `CLOUDFLARE_ACCOUNT_ID`
3. [ ] Push to `main` to trigger deployment

## Key Differences from Pages

| Feature | Pages | Workers |
|---------|-------|---------|
| Static Assets | Built-in | Workers Assets (`assets` in wrangler.toml) |
| API Routes | Functions directory | Single Worker with routing |
| Build Output | Automatic | Configured via `main` in wrangler.toml |
| Bindings | Limited | Full access (D1, KV, R2, DO, etc.) |
| Edge Config | Limited | Full `wrangler.toml` control |

## Troubleshooting

### Common Issues

1. **Assets not serving**: Ensure `assets = { directory = "./public" }` in wrangler.toml
2. **D1 not connecting**: Verify database_id matches in wrangler.toml
3. **Secrets not available**: Use `wrangler secret put` or Dashboard > Settings > Variables
4. **Build failing**: Check Node.js version compatibility (18+)

### Debug Commands

```bash
wrangler tail                    # Stream logs
wrangler d1 execute DB --command "SELECT * FROM products"  # Query D1
wrangler kv:key list --binding CACHE  # List KV keys
```

## License

MIT
