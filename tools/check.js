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
if (!client.includes("x.teacherNames.join(', ')") || !fs.readFileSync(path.join(src, '46_PortalService.gs'), 'utf8').includes('teacherNames:')) { failed = true; console.error('Subject teacher names are not wired end to end'); }
const runtimeSource = ['Index.html', 'Styles.html', 'Scripts.html', ...files].map((name) => fs.readFileSync(path.join(src, name), 'utf8')).join('\n');
if (/raw\.githubusercontent\.com|https?:\/\/github\.com\/[^\s"']+\/(?:raw|blob)\//.test(runtimeSource)) { failed = true; console.error('Runtime static assets must not load from GitHub; use a pinned jsDelivr URL'); }
if (/\.getValue\s*\(/.test(runtimeSource) || !runtimeSource.includes('getDataRange().getValues()')) { failed = true; console.error('Spreadsheet reads must use one bulk getDataRange().getValues() call'); }
if (!client.includes('localStorage.setItem(clientCacheKey(key)') || /localStorage\.(?:setItem|getItem)\(['"]lmsToken/.test(client)) { failed = true; console.error('Reference cache is missing or authentication token is stored in localStorage'); }
if (!client.includes("navigationPending=page") || !client.includes("while(navigationPending)")) { failed = true; console.error('Navigation requests must be coalesced to prevent stale page rendering'); }
if (!client.includes('renderStudentListPage') || !client.includes('renderStudentImportPage') || !client.includes('หน้า ${page} จาก ${pages}')) { failed = true; console.error('Student lists must support pagination'); }
if (!runtimeSource.includes('CacheService.getScriptCache()') || !runtimeSource.includes('invalidateCachesForAction_')) { failed = true; console.error('Apps Script cache or write invalidation is missing'); }
const portal = fs.readFileSync(path.join(src, '46_PortalService.gs'), 'utf8');
if (!portal.includes("indexBy_(UserRepository.all(),'userId')") || /map\([^\n]*UserRepository\.findById/.test(portal)) { failed = true; console.error('Portal list endpoints must use bulk lookup maps instead of per-row sheet reads'); }
const gateway = fs.readFileSync(path.join(src, '36_ApiGateway.gs'), 'utf8');
const clientApi = fs.readFileSync(path.join(src, '38_ClientApi.gs'), 'utf8');
if (!clientApi.includes('JSON.parse(JSON.stringify(ApiGateway.handle(') || !client.includes('if(!r||!r.success)')) { failed = true; console.error('API responses must be transport-safe and null-guarded'); }
try {
  const transportContext = vm.createContext({ ApiGateway: { handle: () => ({ success: true, data: { updatedAt: new Date('2026-01-01T00:00:00.000Z') } }) } });
  new vm.Script(clientApi, { filename: '38_ClientApi.gs' }).runInContext(transportContext);
  const transported = transportContext.apiCall('test', {}, '');
  if (transported.data.updatedAt !== '2026-01-01T00:00:00.000Z') throw new Error('Date was not normalized');
} catch (error) { failed = true; console.error(`API transport test failed: ${error.message}`); }
if (!client.includes("onclick=\"deleteQuiz('") || !client.includes("server('quiz.delete'") || !gateway.includes("'quiz.delete':")) { failed = true; console.error('Quiz soft-delete must be wired through UI and API'); }
if (!client.includes("server('quiz.upload-image'") || !client.includes("richCommand(this,'bold')") || !client.includes("richCommand(this,'italic')") || !client.includes("richCommand(this,'underline')") || !gateway.includes("'quiz.upload-image':")) { failed = true; console.error('Secure rich-text question editor is not wired end to end'); }
const portalSource = fs.readFileSync(path.join(src, '46_PortalService.gs'), 'utf8');
const storageSource = fs.readFileSync(path.join(src, '27_StorageService.gs'), 'utf8');
if (!portalSource.includes('sanitizeRichText_(') || !storageSource.includes('questionImage(c,p)') || !storageSource.includes('2*1024*1024')) { failed = true; console.error('Rich-text sanitization or image validation is missing'); }
if (!portalSource.includes('role===APP_ROLES.STUDENT?4:12') || !portalSource.includes('if(password.length<4)') || !fs.readFileSync(path.join(src, '15_AuthService.gs'), 'utf8').includes('if (next.length < 12)')) { failed = true; console.error('Student initial passwords must allow 4 characters while changed passwords remain at 12'); }
const manifest = JSON.parse(fs.readFileSync(path.join(src, 'appsscript.json'), 'utf8'));
if (manifest.webapp?.access !== 'ANYONE_ANONYMOUS' || manifest.webapp?.executeAs !== 'USER_DEPLOYING') { failed = true; console.error('Web app manifest must allow anonymous LMS login and execute as deployer'); }
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
