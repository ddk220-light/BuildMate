# Ad Spend CLI Tools — Design Document

**Date:** 2026-02-22
**Status:** Approved
**Goal:** Campaign performance overview (spend, impressions, clicks, CTR, CPC) for Meta Ads and Google Ads, viewable from the command line with CSV export and scheduled report generation.

## Architecture

Three layers working together:

1. **GAQL CLI** (Python) — Google Ads querying via Google Ads Query Language
2. **Custom TypeScript CLI** — Meta Ads reporting using the official Node.js SDK
3. **MCP Servers** — Conversational ad analysis through Claude Code for both platforms

## Layer 1: Google Ads — GAQL CLI

**Tool:** [gaql-cli](https://github.com/getyourguide/gaql-cli) (`pip install gaql`)

### API Setup

1. Create a Google Ads developer account, apply for a **developer token** at [Google Ads API Center](https://developers.google.com/google-ads/api)
2. Create an **OAuth 2.0 client** in Google Cloud Console (Desktop app type)
3. Generate a **refresh token** using the OAuth flow
4. Store credentials in `~/.config/gaql/` or via environment variables:
   - `GOOGLE_ADS_DEVELOPER_TOKEN`
   - `GOOGLE_ADS_CLIENT_ID`
   - `GOOGLE_ADS_CLIENT_SECRET`
   - `GOOGLE_ADS_REFRESH_TOKEN`
   - `GOOGLE_ADS_CUSTOMER_ID`

### Key Queries

```sql
-- Campaign spend overview (last 30 days)
SELECT campaign.name, campaign.status,
       metrics.cost_micros, metrics.impressions, metrics.clicks,
       metrics.ctr, metrics.average_cpc
FROM campaign
WHERE segments.date DURING LAST_30_DAYS
ORDER BY metrics.cost_micros DESC

-- Ad group level breakdown
SELECT ad_group.name, campaign.name,
       metrics.cost_micros, metrics.impressions, metrics.clicks,
       metrics.conversions, metrics.cost_per_conversion
FROM ad_group
WHERE segments.date DURING LAST_30_DAYS
ORDER BY metrics.cost_micros DESC
```

### Output

GAQL CLI supports `--csv`, `--json`, `--jsonl` output formats natively, with terminal tables as default.

## Layer 2: Meta Ads — Custom TypeScript CLI

### Dependencies

- `facebook-nodejs-business-sdk` — Official Meta Marketing API SDK
- `cli-table3` — Terminal table formatting
- `csv-stringify` — CSV export
- `commander` — CLI argument parsing

### API Setup

1. Create a **Meta Business App** at [developers.facebook.com](https://developers.facebook.com)
2. Add the **Marketing API** product to the app
3. Generate a **System User Access Token** with `ads_read` permission
4. Note the **Ad Account ID** (format: `act_XXXXXXXXX`)
5. Store in `.env`:
   - `META_ADS_ACCESS_TOKEN`
   - `META_ADS_ACCOUNT_ID`

### CLI Commands

```bash
# Campaign overview (last 30 days)
npx tsx src/cli/meta-ads.ts campaigns --days 30

# Ad set level breakdown
npx tsx src/cli/meta-ads.ts adsets --days 30 --campaign <id>

# Summary with CSV export
npx tsx src/cli/meta-ads.ts summary --days 30 --csv > meta-report.csv
```

### Output Columns

Campaign Name, Status, Spend, Impressions, Clicks, CTR, CPC, CPM

### Implementation

Uses the Insights API edge on AdAccount, Campaign, and AdSet objects to pull `spend`, `impressions`, `clicks`, `ctr`, `cpc`, `cpm` metrics with date range filtering.

## Layer 3: MCP Integration

### Meta Ads MCP

- Server: [meta-ads-mcp](https://github.com/pipeboard-co/meta-ads-mcp)
- Remote hosted at `https://mcp.pipeboard.co/meta-ads-mcp`
- Authenticates via OAuth through Pipeboard
- Example queries: "What's my Meta ad spend this week?", "Which ad set has the lowest CPC?"

### Google Ads MCP

- Use the [Google Ads API Developer Assistant](https://developers.google.com/google-ads/api/docs/developer-toolkit/ai-assistant) or a community Google Ads MCP server
- Example queries: "Show me my top 5 Google campaigns by spend this month"

### Configuration

Both servers configured in `.mcp.json` at project root for Claude Code integration.

## Cross-Platform Comparison

**Script:** `scripts/ads-report.sh`

Runs both GAQL and Meta CLI, produces a combined terminal summary:

```
┌──────────┬─────────┬─────────────┬────────┬────────┬───────┐
│ Platform │ Spend   │ Impressions │ Clicks │ CTR    │ CPC   │
├──────────┼─────────┼─────────────┼────────┼────────┼───────┤
│ Google   │ $1,234  │ 45,230      │ 1,890  │ 4.18%  │ $0.65 │
│ Meta     │ $890    │ 62,100      │ 2,340  │ 3.77%  │ $0.38 │
│ Total    │ $2,124  │ 107,330     │ 4,230  │ 3.94%  │ $0.50 │
└──────────┴─────────┴─────────────┴────────┴────────┴───────┘
```

## Scheduled Reports

### Implementation

- `scripts/ads-report.sh` supports `--output-dir` flag for file-based output
- Writes timestamped CSV files per platform plus a combined summary
- Output pattern: `reports/ads/YYYY-MM-DD-google.csv`, `reports/ads/YYYY-MM-DD-meta.csv`, `reports/ads/YYYY-MM-DD-summary.csv`

### Cron Examples

```bash
# Daily at 8am — last 1 day of data
0 8 * * * cd /path/to/BuildMate && ./scripts/ads-report.sh --days 1 --output-dir reports/ads

# Weekly on Monday — last 7 days
0 8 * * 1 cd /path/to/BuildMate && ./scripts/ads-report.sh --days 7 --output-dir reports/ads
```

## File Structure

```
BuildMate/
├── src/cli/
│   ├── meta-ads.ts          # Meta Ads CLI tool
│   └── utils/
│       └── table.ts         # Shared table formatting
├── scripts/
│   └── ads-report.sh        # Cross-platform wrapper + scheduler
├── reports/ads/              # .gitignored, auto-created by script
├── .mcp.json                # MCP server configuration
├── docs/setup/
│   └── ads-api-setup.md     # Step-by-step API credential setup guide
└── .env.example             # Updated with META_ADS_* env vars
```

### NPM Scripts

```json
{
  "ads:meta": "tsx src/cli/meta-ads.ts",
  "ads:report": "bash scripts/ads-report.sh"
}
```

## Sources

- [GAQL CLI](https://github.com/getyourguide/gaql-cli) — Google Ads Query Language CLI
- [facebook-nodejs-business-sdk](https://github.com/facebook/facebook-nodejs-business-sdk) — Meta Marketing API SDK
- [google-ads-api](https://github.com/Opteo/google-ads-api) — Opteo's Google Ads Node.js client
- [meta-ads-mcp](https://github.com/pipeboard-co/meta-ads-mcp) — MCP server for Meta Ads
- [Google Ads API Reporting](https://developers.google.com/google-ads/api/docs/reporting/overview) — Official reporting docs
- [Meta Ads API Guide](https://admanage.ai/blog/meta-ads-api) — Meta Ads API overview
- [Claude Code + Ads MCP](https://stormy.ai/blog/scaling-paid-media-claude-code-ads-mcp) — Blog on CLI ad management
