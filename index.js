#!/usr/bin/env node
const { Command } = require('commander');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
const Ajv = require('ajv');
const puppeteer = require('puppeteer');

const program = new Command();
program
  .name('env-validate')
  .description('Validate .env files against JSON schema.');

program
  .argument('[schema]', 'JSON schema file', 'schema.json')
  .argument('[env]', '.env file', '.env')
  .option('-l, --license <key>', 'Pro license key (DEMO-PRO)')
  .option('-f, --format <format>', 'Output: table|json|csv|pdf', 'table')
  .option('--secrets', 'Detect and mask secrets')
  .action(async (schemaPath, envPath, cmd) => {
    const isPro = cmd.license === 'DEMO-PRO';
    if (cmd.format !== 'table' && !isPro) {
      console.log('🔓 DEMO MODE: Table only. Pro ($29 Gumroad): exports/PDF.');
      process.exit(0);
    }

    let schema, envObj;
    try {
      schema = JSON.parse(fs.readFileSync(schemaPath, 'utf8'));
      const envBuf = fs.readFileSync(envPath);
      envObj = dotenv.parse(envBuf);
    } catch (err) {
      console.error('Error reading files:', err.message);
      process.exit(1);
    }

    const ajv = new Ajv({allErrors: true});
    const validate = ajv.compile(schema);
    const valid = validate(envObj);

    const results = [];
    const secretRegex = /pass|secret|key|token|pwd|api/i;

    // Add validation errors
    if (!valid && ajv.errors) {
      ajv.errors.forEach(err => {
        const field = err.instancePath.slice(1);
        results.push({
          field,
          expected: err.schema,
          received: envObj[field] || 'missing',
          masked: secretRegex.test(field) ? '***' : envObj[field],
          error: err.message,
          status: '❌'
        });
      });
    }

    // Check required missing
    if (schema.required) {
      schema.required.forEach(req => {
        if (!envObj[req]) {
          if (!results.find(r => r.field === req)) {
            results.push({
              field: req,
              expected: 'required',
              received: 'missing',
              masked: 'N/A',
              error: 'Missing required env var',
              status: '❌'
            });
          }
        }
      });
    }

    // Secrets list (pro-ish)
    if (cmd.secrets || isPro) {
      Object.keys(envObj).forEach(key => {
        if (secretRegex.test(key) && !results.find(r => r.field === key)) {
          results.push({
            field: key,
            expected: 'secret',
            received: '***',
            masked: '***',
            error: 'Potential secret detected',
            status: '🔒'
          });
        }
      });
    }

    if (results.length === 0) {
      console.log('✅ All good! No issues.');
      return;
    }

    switch (cmd.format) {
      case 'table':
        console.table(results.map(r => ({field: r.field, status: r.status, error: r.error, masked: r.masked})));
        break;
      case 'json':
      case 'csv':
        const out = cmd.format === 'json' ? JSON.stringify(results, null, 2) : 
          [Object.keys(results[0]).join(','), ...results.map(r => Object.values(r).map(v => typeof v === 'string' ? `\"${v}\"` : v).join(','))].join('\\n');
        fs.writeFileSync(`env-report-${cmd.format}`, out);
        console.log(`📄 Exported to env-report-${cmd.format}`);
        break;
      case 'pdf':
        await generatePdf(results, schemaPath);
        break;
    }

    if (!valid) console.log(`❌ ${results.length} issues found.`);
  });

async function generatePdf(results, schemaPath) {
  const browser = await puppeteer.launch({headless: 'new'});
  const page = await browser.newPage();
  const html = `
<!DOCTYPE html>
<html>
<head><title>Env Var Validation Report</title>
<style>
table {border-collapse: collapse; width:100%;} 
th,td {border:1px solid #ddd; padding:8px; text-align:left;} 
tr:nth-child(even){background:#f2f2f2;} 
.error {background: #ffebee;} 
.secret {background: #e3f2fd;}
</style>
</head>
<body>
<h1>Env Validation Report</h1>
<p>Schema: ${path.basename(schemaPath)}</p>
<table>
  <tr><th>Field</th><th>Status</th><th>Error</th><th>Value</th></tr>
  ${results.map(r => 
    `<tr class='${r.status === '❌' ? 'error' : r.status === '🔒' ? 'secret' : ''}'>
      <td>${r.field}</td><td>${r.status}</td><td>${r.error}</td><td>${r.masked}</td>
    </tr>`
  ).join('')}
</table>
</body>
</html>`;
  await page.setContent(html);
  await page.pdf({path: 'env-report.pdf', format: 'A4'});
  await browser.close();
  console.log('📄 PDF saved: env-report.pdf');
}

program.parse(process.argv);
if (program.args.length === 0) program.help();