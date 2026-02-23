# Ad Spend CLI Tools — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build CLI tools to view Meta Ads and Google Ads campaign performance (spend, impressions, clicks, CTR, CPC) from the terminal, with CSV export, cross-platform comparison, scheduled file output, and MCP integration for conversational analysis.

**Architecture:** Three layers — (1) GAQL CLI (Python, installed via pip) for Google Ads, (2) custom TypeScript CLI for Meta Ads using the official Node.js SDK, (3) MCP server configs for both platforms. A shell wrapper combines outputs for cross-platform reporting with optional file-based scheduling.

**Tech Stack:** TypeScript (tsx), `facebook-nodejs-business-sdk`, `commander`, `cli-table3`, `csv-stringify`, Python `gaql-cli`, bash scripting, MCP config.

**Design doc:** `docs/plans/2026-02-22-ads-cli-design.md`

---

### Task 1: Install GAQL CLI and Verify

**Files:**
- Create: `docs/setup/ads-api-setup.md` (partial — Google section)

**Step 1: Install gaql-cli via pipx**

```bash
pipx install gaql
```

If `pipx` is not installed: `brew install pipx && pipx ensurepath`

**Step 2: Verify installation**

Run: `gaql --version`
Expected: Version number printed without errors.

**Step 3: Write the Google Ads setup instructions**

Create `docs/setup/ads-api-setup.md` with the Google section:

```markdown
# Ad Platform API Setup Guide

## Google Ads API

### Prerequisites
- A Google Ads account with active campaigns
- A Google Cloud project

### Step 1: Get a Developer Token
1. Sign in to your Google Ads account
2. Go to Tools & Settings > Setup > API Center
3. Apply for a developer token (test account token works for read-only)

### Step 2: Create OAuth Credentials
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a project (or use existing)
3. Enable the "Google Ads API"
4. Go to Credentials > Create Credentials > OAuth 2.0 Client ID
5. Application type: "Desktop app"
6. Download the client ID and client secret

### Step 3: Generate Refresh Token
Run the GAQL CLI setup:
```bash
gaql setup
```
Follow the OAuth flow in your browser. Credentials are stored in `~/.config/gaql/`.

### Step 4: Set Your Customer ID
```bash
export GOOGLE_ADS_CUSTOMER_ID=1234567890
```
Find this in your Google Ads account top-right corner (10-digit number, no dashes).

### Step 5: Test the Connection
```bash
gaql "SELECT campaign.name, metrics.cost_micros FROM campaign WHERE segments.date DURING LAST_7_DAYS LIMIT 5"
```

### Saved Queries
Create `~/.config/gaql/queries/` for frequently used queries:

**`campaigns-overview.sql`:**
```sql
SELECT campaign.name, campaign.status,
       metrics.cost_micros, metrics.impressions, metrics.clicks,
       metrics.ctr, metrics.average_cpc
FROM campaign
WHERE segments.date DURING LAST_30_DAYS
ORDER BY metrics.cost_micros DESC
```

**`adgroups-overview.sql`:**
```sql
SELECT ad_group.name, campaign.name,
       metrics.cost_micros, metrics.impressions, metrics.clicks,
       metrics.conversions, metrics.cost_per_conversion
FROM ad_group
WHERE segments.date DURING LAST_30_DAYS
ORDER BY metrics.cost_micros DESC
```
```

**Step 4: Commit**

```bash
git add docs/setup/ads-api-setup.md
git commit -m "docs: add Google Ads API setup guide with GAQL CLI"
```

---

### Task 2: Install Meta Ads CLI Dependencies

**Files:**
- Modify: `package.json` (add dependencies)

**Step 1: Install npm packages**

```bash
npm install facebook-nodejs-business-sdk commander cli-table3 csv-stringify
```

**Step 2: Install type declarations for cli-table3**

```bash
npm install -D @types/cli-table3
```

Note: `facebook-nodejs-business-sdk` ships its own types. `commander` and `csv-stringify` ship their own types.

**Step 3: Verify installation**

Run: `node -e "require('facebook-nodejs-business-sdk'); console.log('OK')"`
Expected: `OK`

**Step 4: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add Meta Ads CLI dependencies"
```

---

### Task 3: Create Table Formatting Utility

**Files:**
- Create: `src/cli/utils/table.ts`

**Step 1: Write the table utility**

Create `src/cli/utils/table.ts`:

```typescript
import Table from 'cli-table3';
import { stringify } from 'csv-stringify/sync';

export interface AdMetricsRow {
  name: string;
  status?: string;
  spend: string;
  impressions: string;
  clicks: string;
  ctr: string;
  cpc: string;
  cpm?: string;
}

export function printTable(rows: AdMetricsRow[], options?: { title?: string }): void {
  const table = new Table({
    head: ['Name', 'Status', 'Spend', 'Impressions', 'Clicks', 'CTR', 'CPC', 'CPM'],
    style: { head: ['cyan'] },
  });

  for (const row of rows) {
    table.push([
      row.name,
      row.status ?? '',
      row.spend,
      row.impressions,
      row.clicks,
      row.ctr,
      row.cpc,
      row.cpm ?? '',
    ]);
  }

  if (options?.title) {
    console.log(`\n${options.title}`);
  }
  console.log(table.toString());
}

export function toCsv(rows: AdMetricsRow[]): string {
  const records = rows.map((r) => ({
    Name: r.name,
    Status: r.status ?? '',
    Spend: r.spend,
    Impressions: r.impressions,
    Clicks: r.clicks,
    CTR: r.ctr,
    CPC: r.cpc,
    CPM: r.cpm ?? '',
  }));
  return stringify(records, { header: true });
}

export function formatCurrency(micros: number | string): string {
  const value = typeof micros === 'string' ? parseFloat(micros) : micros;
  return `$${(value / 1_000_000).toFixed(2)}`;
}

export function formatPercent(value: number | string): string {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  return `${(num * 100).toFixed(2)}%`;
}
```

**Step 2: Verify it compiles**

Run: `npx tsx --eval "import './src/cli/utils/table.ts'; console.log('compiles')"`
Expected: `compiles`

**Step 3: Commit**

```bash
git add src/cli/utils/table.ts
git commit -m "feat(cli): add table formatting and CSV export utility"
```

---

### Task 4: Build the Meta Ads CLI — Core Client

**Files:**
- Create: `src/cli/meta-ads.ts`

**Step 1: Write the Meta Ads CLI**

Create `src/cli/meta-ads.ts`:

```typescript
import 'dotenv/config';
import { program } from 'commander';
import bizSdk from 'facebook-nodejs-business-sdk';
import { printTable, toCsv } from './utils/table.ts';
import type { AdMetricsRow } from './utils/table.ts';

const { FacebookAdsApi, AdAccount } = bizSdk;

function getConfig() {
  const accessToken = process.env.META_ADS_ACCESS_TOKEN;
  const accountId = process.env.META_ADS_ACCOUNT_ID;
  if (!accessToken || !accountId) {
    console.error(
      'Error: META_ADS_ACCESS_TOKEN and META_ADS_ACCOUNT_ID must be set in .env'
    );
    console.error('See docs/setup/ads-api-setup.md for instructions.');
    process.exit(1);
  }
  return { accessToken, accountId };
}

function getDateRange(days: number): { since: string; until: string } {
  const until = new Date();
  const since = new Date();
  since.setDate(since.getDate() - days);
  return {
    since: since.toISOString().split('T')[0],
    until: until.toISOString().split('T')[0],
  };
}

const FIELDS = ['campaign_name', 'impressions', 'clicks', 'spend', 'ctr', 'cpc', 'cpm'];

async function fetchCampaignInsights(days: number): Promise<AdMetricsRow[]> {
  const { accessToken, accountId } = getConfig();
  FacebookAdsApi.init(accessToken);
  const account = new AdAccount(accountId);
  const { since, until } = getDateRange(days);

  const campaigns = await account.getCampaigns(
    ['name', 'status'],
    { limit: 100 }
  );

  const rows: AdMetricsRow[] = [];
  for (const campaign of campaigns) {
    const insights = await campaign.getInsights(FIELDS, {
      time_range: { since, until },
      limit: 1,
    });

    if (insights.length > 0) {
      const i = insights[0];
      rows.push({
        name: i.campaign_name,
        status: campaign.status,
        spend: `$${parseFloat(i.spend).toFixed(2)}`,
        impressions: parseInt(i.impressions).toLocaleString(),
        clicks: parseInt(i.clicks).toLocaleString(),
        ctr: `${parseFloat(i.ctr).toFixed(2)}%`,
        cpc: `$${parseFloat(i.cpc || '0').toFixed(2)}`,
        cpm: `$${parseFloat(i.cpm || '0').toFixed(2)}`,
      });
    }
  }

  return rows.sort(
    (a, b) => parseFloat(b.spend.slice(1)) - parseFloat(a.spend.slice(1))
  );
}

async function fetchAdSetInsights(
  days: number,
  campaignId?: string
): Promise<AdMetricsRow[]> {
  const { accessToken, accountId } = getConfig();
  FacebookAdsApi.init(accessToken);
  const account = new AdAccount(accountId);
  const { since, until } = getDateRange(days);

  const params: Record<string, unknown> = {
    time_range: { since, until },
    level: 'adset',
    limit: 100,
  };
  if (campaignId) {
    params.filtering = [
      { field: 'campaign.id', operator: 'EQUAL', value: campaignId },
    ];
  }

  const insights = await account.getInsights(
    ['adset_name', ...FIELDS],
    params
  );

  return insights.map((i: Record<string, string>) => ({
    name: i.adset_name,
    spend: `$${parseFloat(i.spend).toFixed(2)}`,
    impressions: parseInt(i.impressions).toLocaleString(),
    clicks: parseInt(i.clicks).toLocaleString(),
    ctr: `${parseFloat(i.ctr).toFixed(2)}%`,
    cpc: `$${parseFloat(i.cpc || '0').toFixed(2)}`,
    cpm: `$${parseFloat(i.cpm || '0').toFixed(2)}`,
  }));
}

async function fetchSummary(days: number): Promise<AdMetricsRow[]> {
  const { accessToken, accountId } = getConfig();
  FacebookAdsApi.init(accessToken);
  const account = new AdAccount(accountId);
  const { since, until } = getDateRange(days);

  const insights = await account.getInsights(FIELDS, {
    time_range: { since, until },
    limit: 1,
  });

  if (insights.length === 0) {
    return [];
  }

  const i = insights[0] as Record<string, string>;
  return [
    {
      name: 'Meta Ads (Total)',
      spend: `$${parseFloat(i.spend).toFixed(2)}`,
      impressions: parseInt(i.impressions).toLocaleString(),
      clicks: parseInt(i.clicks).toLocaleString(),
      ctr: `${parseFloat(i.ctr).toFixed(2)}%`,
      cpc: `$${parseFloat(i.cpc || '0').toFixed(2)}`,
      cpm: `$${parseFloat(i.cpm || '0').toFixed(2)}`,
    },
  ];
}

// --- CLI Commands ---

program
  .name('meta-ads')
  .description('Meta Ads campaign performance CLI for BuildMate')
  .version('1.0.0');

program
  .command('campaigns')
  .description('Show campaign-level performance metrics')
  .option('-d, --days <number>', 'Number of days to look back', '30')
  .option('--csv', 'Output as CSV instead of table')
  .action(async (opts) => {
    const rows = await fetchCampaignInsights(parseInt(opts.days));
    if (rows.length === 0) {
      console.log('No campaign data found for the specified period.');
      return;
    }
    if (opts.csv) {
      process.stdout.write(toCsv(rows));
    } else {
      printTable(rows, { title: `Meta Campaigns (last ${opts.days} days)` });
    }
  });

program
  .command('adsets')
  .description('Show ad set-level performance metrics')
  .option('-d, --days <number>', 'Number of days to look back', '30')
  .option('-c, --campaign <id>', 'Filter by campaign ID')
  .option('--csv', 'Output as CSV instead of table')
  .action(async (opts) => {
    const rows = await fetchAdSetInsights(parseInt(opts.days), opts.campaign);
    if (rows.length === 0) {
      console.log('No ad set data found for the specified period.');
      return;
    }
    if (opts.csv) {
      process.stdout.write(toCsv(rows));
    } else {
      printTable(rows, { title: `Meta Ad Sets (last ${opts.days} days)` });
    }
  });

program
  .command('summary')
  .description('Show account-level summary metrics')
  .option('-d, --days <number>', 'Number of days to look back', '30')
  .option('--csv', 'Output as CSV instead of table')
  .action(async (opts) => {
    const rows = await fetchSummary(parseInt(opts.days));
    if (rows.length === 0) {
      console.log('No data found for the specified period.');
      return;
    }
    if (opts.csv) {
      process.stdout.write(toCsv(rows));
    } else {
      printTable(rows, { title: `Meta Ads Summary (last ${opts.days} days)` });
    }
  });

program.parse();
```

**Step 2: Verify it compiles and shows help**

Run: `npx tsx src/cli/meta-ads.ts --help`
Expected: Help output showing `campaigns`, `adsets`, `summary` commands.

**Step 3: Commit**

```bash
git add src/cli/meta-ads.ts
git commit -m "feat(cli): add Meta Ads performance CLI with campaigns, adsets, summary"
```

---

### Task 5: Add Meta Ads Setup Docs and Update .env.example

**Files:**
- Modify: `docs/setup/ads-api-setup.md` (append Meta section)
- Modify: `.env.example` (add META_ADS_* vars)

**Step 1: Append Meta section to setup guide**

Add to the end of `docs/setup/ads-api-setup.md`:

```markdown

## Meta (Facebook) Ads API

### Prerequisites
- A Meta Business account with active ad campaigns
- Admin access to the Business Manager

### Step 1: Create a Meta App
1. Go to [developers.facebook.com](https://developers.facebook.com)
2. Click "My Apps" > "Create App"
3. Select "Other" > "Business" type
4. Name it (e.g., "BuildMate Ads Reporter")

### Step 2: Add Marketing API
1. In your app dashboard, click "Add Product"
2. Find "Marketing API" and click "Set Up"

### Step 3: Generate Access Token
1. Go to "Marketing API" > "Tools" in the app dashboard
2. Select the `ads_read` permission
3. Click "Get Token"
4. For long-lived tokens: create a System User in Business Manager
   - Business Settings > Users > System Users > Add
   - Generate token with `ads_read` scope

### Step 4: Find Your Ad Account ID
1. Go to [Business Manager](https://business.facebook.com/)
2. Business Settings > Accounts > Ad Accounts
3. Copy the Account ID (prefix with `act_`, e.g., `act_1234567890`)

### Step 5: Configure Environment
Add to your `.env` file:
```bash
META_ADS_ACCESS_TOKEN=your_token_here
META_ADS_ACCOUNT_ID=act_1234567890
```

### Step 6: Test the Connection
```bash
npx tsx src/cli/meta-ads.ts summary --days 7
```
```

**Step 2: Update `.env.example`**

Add to the end of `.env.example`:

```env

# Meta Ads API (for CLI ad spend analysis)
# See docs/setup/ads-api-setup.md for setup instructions
META_ADS_ACCESS_TOKEN=
META_ADS_ACCOUNT_ID=
```

**Step 3: Commit**

```bash
git add docs/setup/ads-api-setup.md .env.example
git commit -m "docs: add Meta Ads API setup guide, update .env.example"
```

---

### Task 6: Add NPM Scripts for Meta CLI

**Files:**
- Modify: `package.json` (add scripts)

**Step 1: Add the ads:meta script**

Add to the `"scripts"` section of `package.json`:

```json
"ads:meta": "tsx src/cli/meta-ads.ts"
```

**Step 2: Verify the script works**

Run: `npm run ads:meta -- --help`
Expected: Same help output as direct tsx invocation.

**Step 3: Commit**

```bash
git add package.json
git commit -m "chore: add ads:meta npm script"
```

---

### Task 7: Build the Cross-Platform Report Script

**Files:**
- Create: `scripts/ads-report.sh`

**Step 1: Write the report script**

Create `scripts/ads-report.sh`:

```bash
#!/usr/bin/env bash
set -euo pipefail

# Cross-platform ad spend report
# Usage: ./scripts/ads-report.sh [--days N] [--output-dir DIR]

DAYS=30
OUTPUT_DIR=""
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

while [[ $# -gt 0 ]]; do
  case $1 in
    --days) DAYS="$2"; shift 2 ;;
    --output-dir) OUTPUT_DIR="$2"; shift 2 ;;
    -h|--help)
      echo "Usage: $0 [--days N] [--output-dir DIR]"
      echo ""
      echo "Options:"
      echo "  --days N         Number of days to look back (default: 30)"
      echo "  --output-dir DIR Write CSV reports to this directory (timestamped)"
      echo "  -h, --help       Show this help"
      exit 0
      ;;
    *) echo "Unknown option: $1"; exit 1 ;;
  esac
done

DATE_STAMP=$(date +%Y-%m-%d)
TEMP_DIR=$(mktemp -d)
trap 'rm -rf "$TEMP_DIR"' EXIT

echo "=== Ad Spend Report (last $DAYS days) ==="
echo ""

# --- Google Ads (via gaql-cli) ---
GOOGLE_OK=false
if command -v gaql &>/dev/null; then
  echo "Fetching Google Ads data..."
  GOOGLE_QUERY="SELECT campaign.name, campaign.status, metrics.cost_micros, metrics.impressions, metrics.clicks, metrics.ctr, metrics.average_cpc FROM campaign WHERE segments.date DURING LAST_${DAYS}_DAYS ORDER BY metrics.cost_micros DESC"

  if gaql "$GOOGLE_QUERY" --csv > "$TEMP_DIR/google.csv" 2>/dev/null; then
    GOOGLE_OK=true
    echo "Google Ads: OK"
  else
    echo "Google Ads: Failed to fetch (check credentials)"
  fi
else
  echo "Google Ads: gaql not installed (pip install gaql)"
fi

# --- Meta Ads (via TypeScript CLI) ---
META_OK=false
if [[ -n "${META_ADS_ACCESS_TOKEN:-}" && -n "${META_ADS_ACCOUNT_ID:-}" ]]; then
  echo "Fetching Meta Ads data..."
  if npx tsx "$PROJECT_DIR/src/cli/meta-ads.ts" summary --days "$DAYS" --csv > "$TEMP_DIR/meta.csv" 2>/dev/null; then
    META_OK=true
    echo "Meta Ads: OK"
  else
    echo "Meta Ads: Failed to fetch (check credentials)"
  fi
else
  echo "Meta Ads: META_ADS_ACCESS_TOKEN / META_ADS_ACCOUNT_ID not set"
fi

echo ""

# --- Display results ---
if [[ "$GOOGLE_OK" == true ]]; then
  echo "--- Google Ads Campaigns ---"
  column -t -s',' "$TEMP_DIR/google.csv" 2>/dev/null || cat "$TEMP_DIR/google.csv"
  echo ""
fi

if [[ "$META_OK" == true ]]; then
  echo "--- Meta Ads Summary ---"
  column -t -s',' "$TEMP_DIR/meta.csv" 2>/dev/null || cat "$TEMP_DIR/meta.csv"
  echo ""
fi

# --- Save to output dir if specified ---
if [[ -n "$OUTPUT_DIR" ]]; then
  mkdir -p "$OUTPUT_DIR"

  if [[ "$GOOGLE_OK" == true ]]; then
    cp "$TEMP_DIR/google.csv" "$OUTPUT_DIR/${DATE_STAMP}-google.csv"
    echo "Saved: $OUTPUT_DIR/${DATE_STAMP}-google.csv"
  fi

  if [[ "$META_OK" == true ]]; then
    cp "$TEMP_DIR/meta.csv" "$OUTPUT_DIR/${DATE_STAMP}-meta.csv"
    echo "Saved: $OUTPUT_DIR/${DATE_STAMP}-meta.csv"
  fi

  echo ""
fi

if [[ "$GOOGLE_OK" == false && "$META_OK" == false ]]; then
  echo "No data retrieved. Check your API credentials."
  echo "See docs/setup/ads-api-setup.md for setup instructions."
  exit 1
fi
```

**Step 2: Make executable**

```bash
chmod +x scripts/ads-report.sh
```

**Step 3: Verify help output**

Run: `./scripts/ads-report.sh --help`
Expected: Usage message with options listed.

**Step 4: Add npm script**

Add to `package.json` scripts:

```json
"ads:report": "bash scripts/ads-report.sh"
```

**Step 5: Commit**

```bash
git add scripts/ads-report.sh package.json
git commit -m "feat(cli): add cross-platform ad spend report script"
```

---

### Task 8: Add reports/ads/ to .gitignore

**Files:**
- Modify: `.gitignore`

**Step 1: Append reports directory to .gitignore**

Add to the end of `.gitignore`:

```
# Ad spend reports (generated by scripts/ads-report.sh)
reports/
```

**Step 2: Commit**

```bash
git add .gitignore
git commit -m "chore: gitignore generated ad spend reports"
```

---

### Task 9: Configure MCP Servers

**Files:**
- Create: `.mcp.json`

**Step 1: Write MCP configuration**

Create `.mcp.json` in the project root:

```json
{
  "mcpServers": {
    "meta-ads": {
      "url": "https://mcp.pipeboard.co/meta-ads-mcp"
    }
  }
}
```

Note: The Meta Ads MCP server uses remote OAuth — on first use in Claude Code, it will prompt you to authenticate via browser. The Google Ads MCP landscape is still emerging; add a server config here when a stable one is available, or use `gaql` directly.

**Step 2: Commit**

```bash
git add .mcp.json
git commit -m "feat: add MCP server config for Meta Ads"
```

---

### Task 10: Manual Integration Testing

This task is not code — it's a verification checklist to run once API credentials are configured.

**Step 1: Test Google Ads (requires credentials)**

```bash
# Interactive REPL
gaql

# Single query
gaql "SELECT campaign.name, metrics.cost_micros FROM campaign WHERE segments.date DURING LAST_7_DAYS LIMIT 3"

# CSV export
gaql "SELECT campaign.name, metrics.cost_micros FROM campaign WHERE segments.date DURING LAST_7_DAYS" --csv > test-google.csv
```

**Step 2: Test Meta Ads CLI (requires credentials in .env)**

```bash
# Show help
npm run ads:meta -- --help

# Campaign overview
npm run ads:meta -- campaigns --days 7

# CSV export
npm run ads:meta -- summary --days 7 --csv

# Ad sets for a specific campaign
npm run ads:meta -- adsets --days 7 --campaign <CAMPAIGN_ID>
```

**Step 3: Test cross-platform report**

```bash
# Terminal output
npm run ads:report -- --days 7

# File output
npm run ads:report -- --days 7 --output-dir reports/ads
ls reports/ads/
```

**Step 4: Test MCP in Claude Code**

Open a Claude Code session in the BuildMate project and try:
- "What's my Meta ad spend this week?"
- "Which campaign has the highest CTR?"

**Step 5: Verify scheduled report (dry run)**

```bash
# Simulate a cron-style invocation
./scripts/ads-report.sh --days 1 --output-dir reports/ads
ls -la reports/ads/
```

---

## Summary of All Files

| Action | Path | Task |
|--------|------|------|
| Install | `gaql` via pipx | 1 |
| Create | `docs/setup/ads-api-setup.md` | 1, 5 |
| Install | npm deps (facebook-nodejs-business-sdk, commander, cli-table3, csv-stringify) | 2 |
| Create | `src/cli/utils/table.ts` | 3 |
| Create | `src/cli/meta-ads.ts` | 4 |
| Modify | `.env.example` | 5 |
| Modify | `package.json` (scripts) | 6, 7 |
| Create | `scripts/ads-report.sh` | 7 |
| Modify | `.gitignore` | 8 |
| Create | `.mcp.json` | 9 |
| Manual | Integration testing | 10 |

## Cron Setup (Post-Verification)

Once Task 10 passes, add to crontab:

```bash
crontab -e
```

```cron
# Daily ad spend report at 8am
0 8 * * * cd /Users/deepak/AI/BuildMate && ./scripts/ads-report.sh --days 1 --output-dir reports/ads >> /tmp/ads-report.log 2>&1

# Weekly summary on Monday at 8am
0 8 * * 1 cd /Users/deepak/AI/BuildMate && ./scripts/ads-report.sh --days 7 --output-dir reports/ads >> /tmp/ads-report.log 2>&1
```
