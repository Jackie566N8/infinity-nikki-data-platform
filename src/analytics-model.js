(function(root){'use strict';
const styles=['典雅','清新','甜美','性感','帅气'];
const methods=['gacha','shop','event','craft','quest','explore','challenge','home','other'];
const defaults={scope:'base',rarity:'',style:'',method:'',clothingScope:'catalog'};
function analyze(data,options={}){
 const f={...defaults,...options},outfits=data.outfits.filter(r=>(f.scope==='all'||r.is_base===1)&&(!f.rarity||String(r.rarity)===String(f.rarity))&&(!f.style||r.style===f.style)&&(!f.method||r.methods.includes(f.method)));
 const parts=new Set(outfits.flatMap(r=>r.part_ids)),associated=f.clothingScope==='linked'||Boolean(f.method);
 const clothing=data.clothing.filter(r=>(f.scope==='all'||r.is_variant===0)&&(!f.rarity||String(r.rarity)===String(f.rarity))&&(!f.style||r.style===f.style)&&(!associated||parts.has(r.id)));
 const categories=[...new Set(data.clothing.map(r=>r.category||'未收录'))].sort((a,b)=>a.localeCompare(b,'zh'));
 const percent=(n,d)=>d?Math.round(n/d*10000)/100:null;
 const group=(rows,keys,field)=>keys.map(key=>{const matches=rows.filter(r=>(r[field]??'未收录')===key);return {key,count:matches.length,denominator:rows.length,percent:percent(matches.length,rows.length),ids:matches.map(r=>r.id)};});
 const rarity=group(outfits,[...new Set(data.outfits.map(r=>r.rarity??'未收录'))].sort((a,b)=>Number(b)-Number(a)),'rarity');
 const style=group(outfits,[...styles,...(data.outfits.some(r=>!r.style)?['未收录']:[])],'style');
 const category=group(clothing,categories,'category').sort((a,b)=>b.count-a.count||a.key.localeCompare(b.key));
 const heat=categories.flatMap(category=>styles.map(style=>{const matching=clothing.filter(r=>r.category===category&&r.style===style);return {category,style,count:matching.length,denominator:clothing.length,ids:matching.map(r=>r.id)};}));
 const combos=new Map();for(const r of outfits){if(!r.style||!r.tags.length)continue;const key=[r.style,...[...r.tags].sort()].join(' × ');if(!combos.has(key))combos.set(key,{key,style:r.style,tags:[...r.tags].sort(),count:0,ids:[]});const c=combos.get(key);c.count++;c.ids.push(r.id);}
 const combinations=[...combos.values()].map(c=>({...c,denominator:outfits.length,percent:percent(c.count,outfits.length)})).sort((a,b)=>a.count-b.count||a.key.localeCompare(b.key,'zh'));
 const acquisition=methods.map(method=>{const matches=outfits.filter(r=>r.methods.includes(method));return {method,count:matches.length,denominator:outfits.length,percent:percent(matches.length,outfits.length),base_count:matches.filter(r=>r.is_base).length,additional_count:matches.filter(r=>!r.is_base).length,rarities:group(matches,rarity.map(r=>r.key),'rarity'),ids:matches.map(r=>r.id)};});
 const validVersions=data.versions.filter(v=>!['无图鉴','未知','待补充'].includes(v.label)&&data.outfits.some(r=>r.version_id===v.version_id));
 const versionIds=new Set(validVersions.map(v=>v.version_id));
 const dated=r=>Boolean(r.release_date&&r.release_context==='public_release'&&versionIds.has(r.version_id));
 const versionRows=validVersions.map(v=>{
  const global=data.outfits.filter(r=>r.version_id===v.version_id&&dated(r)),selected=outfits.filter(r=>r.version_id===v.version_id),known=selected.filter(dated),pending=selected.filter(r=>!dated(r));
  const dates=global.map(r=>r.release_date).sort();return {version_id:v.version_id,label:v.label,anchor_date:dates[0]||null,last_recorded_date:dates.at(-1)||null,count:known.length,base_count:known.filter(r=>r.is_base).length,additional_count:known.filter(r=>!r.is_base).length,pending:pending.length,selected_count:selected.length,status:pending.length?'partial':dates.length?'recorded_subset':'pending',ids:known.map(r=>r.id),pending_ids:pending.map(r=>r.id),anchor_source_urls:[...new Set(global.filter(r=>r.release_date===dates[0]).map(r=>r.date_source_url).filter(Boolean))],source_urls:[...new Set(known.map(r=>r.date_source_url).filter(Boolean))]};
 }).sort((a,b)=>(a.anchor_date||'9999').localeCompare(b.anchor_date||'9999')||a.label.localeCompare(b.label));
 const unassigned=outfits.filter(r=>!versionIds.has(r.version_id));
 if(unassigned.length)versionRows.push({version_id:null,label:'版本待补充',anchor_date:null,last_recorded_date:null,count:0,base_count:0,additional_count:0,pending:unassigned.length,selected_count:unassigned.length,status:'pending',ids:[],pending_ids:unassigned.map(r=>r.id),anchor_source_urls:[],source_urls:[]});
 const pending=outfits.filter(r=>!dated(r));
 return {filters:f,outfits,clothing,associated,rarity,style,category,heat,combinations,acquisition,versions:versionRows,pending,totals:{outfits:outfits.length,families:new Set(outfits.map(r=>r.family_id)).size,clothing:clothing.length,dated:outfits.length-pending.length,pending:pending.length}};
}
function exportRows(data,result,chart){
 const meta={snapshot_id:data.snapshot_id,source_date:data.source_date,scope:result.filters.scope,rarity_filter:result.filters.rarity,style_filter:result.filters.style,method_filter:result.filters.method,clothing_scope:result.associated?'linked':'catalog'};
 const provenance={rarity:'objects + outfits + outfit_families',style:'objects + outfits + outfit_families',category:'objects + clothing (+ outfit_clothing when linked)',heat:'objects + clothing (+ outfit_clothing when linked)',combinations:'objects + outfits + object_tags',acquisition:'outfits + source_assertions (base family) + recipes + outfit_clothing',versions:'outfits + object_releases + versions + releases + sources',pending:'outfits + object_releases + releases + sources',outfits:'objects + outfits + object_releases + sources + source_assertions + recipes',clothing:'objects + clothing + outfit_clothing'};
 const keys=chart==='all'?Object.keys(provenance):[chart],rows=[];
 for(const k of keys){const values=result[k]||[];if(!values.length)rows.push({...meta,chart:k,source_tables:provenance[k],status:'no_matching_records'});for(const row of values)rows.push({...meta,chart:k,source_tables:provenance[k],...row});}return rows;
}
function toCSV(rows){if(!rows.length)return '\uFEFFchart,count\r\n';const keys=[...new Set(rows.flatMap(Object.keys))],cell=v=>{let s=v==null?'':typeof v==='object'?JSON.stringify(v):String(v);if(typeof v==='string'&&/^[=+\-@\t\r]/.test(s))s="'"+s;return '"'+s.replace(/"/g,'""')+'"';};return '\uFEFF'+keys.map(cell).join(',')+'\r\n'+rows.map(r=>keys.map(k=>cell(r[k])).join(',')).join('\r\n')+'\r\n';}
const api={analyze,exportRows,toCSV,styles,methods,defaults};root.NikkiAnalyticsModel=api;if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(globalThis);
