// Run with Node.js after editing assets/outfit-aliases.json. No network needed.
import fs from 'node:fs';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
const root=path.dirname(fileURLToPath(import.meta.url));
const file=path.join(root,'data.js');
const data=JSON.parse(fs.readFileSync(file,'utf8').replace(/^window\.NIKKI_DATA=/,'').replace(/;\s*$/,''));
const catalog=JSON.parse(fs.readFileSync(path.join(root,'assets/outfit-aliases.json'),'utf8'));
const ids=new Set();
for(const e of catalog.entries){
  const base=data.records.find(r=>r.id===e.outfitId);
  if(!base||base.kind!=='outfits'||base.variant||base.name!==e.name||ids.has(e.outfitId))throw Error('Invalid outfit: '+e.name);
  ids.add(e.outfitId);
  if(!Array.isArray(e.aliases)||!e.aliases.length||!e.aliases.every(a=>typeof a==='string'&&a.trim()))throw Error('Missing aliases: '+e.name);
  for(const alias of e.aliases){
    if(!e.sources.some(s=>s.aliases.includes(alias)&&s.title&&/^https:\/\//.test(s.url)))throw Error('Missing source: '+alias);
  }
}
data.outfitAliases=catalog;
fs.writeFileSync(file,'window.NIKKI_DATA='+JSON.stringify(data)+';');
console.log('Nickname catalogue updated: '+catalog.entries.length+' outfits');
