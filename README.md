# Env Var Validator CLI

CLI tool to validate your `.env` files against a JSON Schema. Detects missing required vars, type mismatches, and flags potential secrets.

## Who it's for
- DevOps engineers
- Developers deploying apps
- Teams preventing prod outages from bad config

**Problem solved:** Runtime crashes from invalid/missing env vars. Saves debugging time.

## Features
- **Free:** Console table of issues
- **Pro ($29 one-time Gumroad):** JSON/CSV/PDF exports, advanced secret detection

## Quick Start
```
npm i -g env-var-validator
env-validate schema.json .env
```

### Sample schema.json
```json
{
  \"type\": \"object\",
  \"properties\": {
    \"DB_HOST\": {\"type\": \"string\"},
    \"PORT\": {\"type\": \"number\", \"minimum\": 1024},
    \"DEBUG\": {\"type\": \"boolean\"}
  },
  \"required\": [\"DB_HOST\", \"PORT\"]
}
```

### Sample .env
```
DB_HOST=localhost
PORT=3000
DEBUG=true
API_SECRET=shhhhh
```

Output: Flags missing, wrong types, lists secrets.

## Pro License
Use `--license DEMO-PRO` to test pro features.
Buy at Gumroad: [link TBD]

## How to run locally
1. `npm i`
2. `node index.js --help`
3. `chmod +x index.js`
4. `./index.js schema.json .env -l DEMO-PRO -f pdf`

## Monetization Ready
- Gumroad product: Zip/tgz download
- License key validation built-in
- Clear buyer path in README