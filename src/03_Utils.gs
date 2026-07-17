const Utils=Object.freeze({
 isObject:v=>v&&typeof v==='object'&&!Array.isArray(v), arr:v=>Array.isArray(v)?v:(v==null?[]:[v]),
 text:(v,d='')=>v==null?d:String(v).trim(), num:(v,d=0)=>Number.isFinite(Number(v))?Number(v):d,
 int:(v,d=0)=>Math.trunc(Number.isFinite(Number(v))?Number(v):d),
 bool:(v,d=false)=>v===true||v===false?v:(v==null||v===''?d:['true','1','yes','on'].includes(String(v).toLowerCase())),
 now:()=>new Date().toISOString(), id:p=>(p||'ID')+'-'+Utilities.getUuid(),
 json:v=>JSON.stringify(v??null), parse:(v,d={})=>{try{return typeof v==='string'?JSON.parse(v):v}catch(e){return d}},
 sha:v=>Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256,String(v)).map(b=>(b<0?b+256:b).toString(16).padStart(2,'0')).join(''),
 email:v=>{const s=String(v||'').trim().toLowerCase();return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s)?s:''},
 escape:v=>String(v??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;')
});
function requireObject_(v,n){if(!Utils.isObject(v))throw AppError.validation((n||'payload')+' ต้องเป็น Object');return v}
function requireNonBlank_(v,n){const s=Utils.text(v);if(!s)throw AppError.validation('กรุณาระบุ '+n);return s}
