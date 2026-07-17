const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const src = path.join(root, 'src');
const files = fs.readdirSync(src).filter((name) => name.endsWith('.gs')).sort();
let failed = false;

for (const name of files) {
  const code = fs.readFileSync(path.join(src, name), 'utf8');
  try { new vm.Script(code, { filename: name }); }
  catch (error) { failed = true; console.error(error.message); }
}
for (const name of ['Index.html', 'Styles.html', 'Scripts.html']) {
  const file = path.join(src, name);
  if (!fs.existsSync(file) || !fs.readFileSync(file, 'utf8').trim()) {
    failed = true; console.error(`${name} is missing or empty`);
  }
}
const client = fs.readFileSync(path.join(src, 'Scripts.html'), 'utf8').replace(/^\s*<script>/, '').replace(/<\/script>\s*$/, '');
try { new vm.Script(client, { filename: 'Scripts.html' }); }
catch (error) { failed = true; console.error(error.message); }
const gateway = fs.readFileSync(path.join(src, '36_ApiGateway.gs'), 'utf8');
const routes = new Set([...gateway.matchAll(/'([a-z][a-z0-9.-]+)'\s*:/g)].map((m) => m[1]));
const calls = new Set([...client.matchAll(/server\('([a-z][a-z0-9.-]+)'/g)].map((m) => m[1]));
for (const call of calls) if (!routes.has(call)) { failed = true; console.error(`Client API route is missing: ${call}`); }
for (const route of routes) if (!['public.health', 'auth.login'].includes(route) && new RegExp(`'${route.replace('.', '\\.')}'\\s*:\\s*\\{[^}]*public\\s*:\\s*true`).test(gateway)) { failed = true; console.error(`Authenticated route marked public: ${route}`); }
if (failed) process.exit(1);
console.log(`Validated ${files.length} Apps Script files and 3 HTML assets.`);
