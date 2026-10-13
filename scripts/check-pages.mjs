import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
const checked=[];
function asset(file,reference){
  if(/^(?:https?:|data:|#)/i.test(reference))return;
  assert.ok(!/^(?:\/|[A-Z]:|file:|\\)/i.test(reference),'Absolute local resource: '+file+' '+reference);
  const target=path.resolve(path.dirname(file),decodeURIComponent(reference.split(/[?#]/)[0]));
  assert.ok(fs.existsSync(target),'Missing relative resource: '+file+' '+reference);
  checked.push({file,reference});
}
for(const file of ['index.html','src/index.html']){
  const text=fs.readFileSync(file,'utf8');
  assert.ok(!/[A-Z]:[\\/]Users[\\/]/i.test(text));
  for(const match of text.matchAll(/(?:src|href)\s*=\s*["']([^"']+)["']/gi))asset(file,match[1]);
}
for(const name of fs.readdirSync('src').filter(n=>n.endsWith('.css'))){
  const file='src/'+name;
  for(const match of fs.readFileSync(file,'utf8').matchAll(/url\(\s*["']?([^\s"')]+)["']?\s*\)/gi))asset(file,match[1]);
}
for(const file of ['search-eval-data.js','search-model.js','search-eval.js'])asset('src/module-loader.js',file);
for(const file of ['data/dataset/quality-report.json','data/dataset/json/outfits.json','data/dataset/csv/outfits.csv'])assert.ok(fs.existsSync(file),'Pages data export '+file);
assert.ok(fs.existsSync('.nojekyll'));
fs.mkdirSync('review/final',{recursive:true});
fs.writeFileSync('review/final/step10-paths.json',JSON.stringify({checked_at:new Date().toISOString(),relative_assets:checked.length,checked,absolute_local_resources:0,entry:'index.html → ./src/index.html',data_loading:'Core data are prebuilt relative JS; JSON/CSV are inspectable exports, not startup fetch dependencies.'},null,2));
console.log('PASS '+checked.length+' relative HTML/CSS/lazy resources, root entry and JSON/CSV exports.');
