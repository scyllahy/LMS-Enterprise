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
if (!client.includes("$('academicYear').onchange=changeAcademicYear") || !client.includes("delete state.data.subjects")) { failed = true; console.error('Academic year cache invalidation is missing'); }
if (client.includes("if(manage&&!state.data.subjects)")) { failed = true; console.error('Quiz subjects must reload when academic year changes'); }
const gateway = fs.readFileSync(path.join(src, '36_ApiGateway.gs'), 'utf8');
const routes = new Set([...gateway.matchAll(/'([a-z][a-z0-9.-]+)'\s*:/g)].map((m) => m[1]));
const calls = new Set([...client.matchAll(/server\('([a-z][a-z0-9.-]+)'/g)].map((m) => m[1]));
for (const call of calls) if (!routes.has(call)) { failed = true; console.error(`Client API route is missing: ${call}`); }
for (const route of routes) if (!['public.health', 'auth.login'].includes(route) && new RegExp(`'${route.replace('.', '\\.')}'\\s*:\\s*\\{[^}]*public\\s*:\\s*true`).test(gateway)) { failed = true; console.error(`Authenticated route marked public: ${route}`); }
try {
  const webContext = vm.createContext({
    ApiGateway: { handle: (request) => ({ success: request.action === 'public.health', data: { status: 'OK' } }) },
    ContentService: { MimeType: { JSON: 'application/json' }, createTextOutput: (text) => ({ text, setMimeType(mime) { this.mime = mime; return this; } }) },
    HtmlService: { createTemplateFromFile: () => ({ evaluate: () => ({ setTitle() { return this; } }) }) },
    APP_CONFIG: { app: { name: 'Test' } }, Utils: { parse: JSON.parse }
  });
  new vm.Script(fs.readFileSync(path.join(src, '37_WebApp.gs'), 'utf8'), { filename: '37_WebApp.gs' }).runInContext(webContext);
  const response = webContext.doGet({ parameter: { action: 'health' } });
  const payload = JSON.parse(response.text);
  if (!payload.success || payload.data.status !== 'OK' || response.mime !== 'application/json') throw new Error('invalid health response');
} catch (error) { failed = true; console.error(`Health endpoint test failed: ${error.message}`); }
if (failed) process.exit(1);
console.log(`Validated ${files.length} Apps Script files and 3 HTML assets.`);
