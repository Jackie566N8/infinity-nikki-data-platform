(function(root){'use strict';
const styles=['典雅','清新','甜美','性感','帅气'];
const pct=(n,d)=>d?100*n/d:null;
function effectiveOwned(data,notes){const clothing=new Set(data.clothing.map(c=>c.id)),explicit=new Set((notes.owned||[]).filter(id=>clothing.has(id))),effective=new Set(explicit),marked=new Set(notes.owned||[]);for(const o of data.outfits)if(marked.has(o.id))for(const id of o.part_ids)if(clothing.has(id))effective.add(id);return {explicit,effective};}
function personal(data,notes={},options={}){
 const f={scope:'base',rarity:'',style:'',...options},sets=new Set(notes.owned||[]),saved=new Set(notes.saved||[]),{explicit,effective}=effectiveOwned(data,notes);
 const outfitScope=o=>f.scope==='all'||(f.scope==='base'?o.is_base===1:o.is_base===0),clothingScope=c=>f.scope==='all'||(f.scope==='base'?c.is_variant===0:c.is_variant===1);
 const matches=o=>(!f.rarity||String(o.rarity)===String(f.rarity))&&(!f.style||o.style===f.style);
 const outfits=data.outfits.filter(o=>outfitScope(o)&&matches(o)).map(o=>{const ids=[...new Set(o.part_ids)],missing=ids.filter(id=>!effective.has(id));return {...o,total:ids.length,owned:ids.length-missing.length,missing,complete:ids.length>0&&!missing.length&&(o.member_count_status!=='mismatch'||sets.has(o.id)),completion_basis:sets.has(o.id)?'explicit_user_whole_outfit':o.member_count_status==='mismatch'?'source_member_count_unresolved':'known_members',ratio:ids.length?(ids.length-missing.length)/ids.length:null,explicit_set:sets.has(o.id)};});
 const clothing=data.clothing.filter(c=>clothingScope(c)&&matches(c));
 const progress=(rows,keys,field,isOwned)=>keys.map(key=>{const all=rows.filter(r=>r[field]===key),got=all.filter(isOwned);return {key,total:all.length,owned:got.length,percent:pct(got.length,all.length),ids:all.map(r=>r.id),owned_ids:got.map(r=>r.id)};});
 const completion={styles:progress(outfits,styles,'style',r=>r.complete),rarities:progress(outfits,[5,4,3,2],'rarity',r=>r.complete)};
 const coverage={styles:progress(clothing,styles,'style',r=>effective.has(r.id)),categories:progress(clothing,[...new Set(data.clothing.map(r=>r.category))],'category',r=>effective.has(r.id))};
 const byId=new Map(data.outfits.map(o=>[o.id,o])),favoriteFamilies=[...new Set([...saved].map(id=>byId.get(id)?.base_id).filter(Boolean))],favorites=favoriteFamilies.map(id=>byId.get(id));
 return {filters:f,outfits,clothing,completion,coverage,effective_ids:[...effective],explicit_ids:[...explicit],favorite_ids:favoriteFamilies,favorite_styles:progress(favorites,styles,'style',()=>true).map(r=>({...r,percent:pct(r.total,favorites.length)})),near:outfits.filter(o=>o.member_count_status!=='mismatch'&&o.missing.length>=1&&o.missing.length<=2&&o.owned>0).sort((a,b)=>a.missing.length-b.missing.length||b.ratio-a.ratio||a.id.localeCompare(b.id)),totals:{complete:outfits.filter(o=>o.complete).length,outfits:outfits.length,unknown_parts:outfits.filter(o=>!o.total||o.member_count_status==='mismatch').length,owned:clothing.filter(c=>effective.has(c.id)).length,clothing:clothing.length,explicit:clothing.filter(c=>explicit.has(c.id)).length,inferred:clothing.filter(c=>effective.has(c.id)&&!explicit.has(c.id)).length,favorites:favorites.length}};
}
function studyRows(data,study){
 if(!study||study.status!=='ready')return [];
 const byId=new Map(data.outfits.map(o=>[o.id,o]));
 return study.candidate_ids.map(id=>{const o=byId.get(id);if(!o)return null;let value;
  if(['preference','pull_intent','approval'].includes(study.metric))value=study.options.filter(v=>v.outfit_ids.includes(id)).reduce((s,v)=>s+v.percent,0);
  else value=study.observations?.find(v=>v.outfit_id===id)?.value??null;
  return {...o,value,sample_size:study.sample_size,study_id:study.study_id,source_id:study.source_id,metric:study.metric,unit:study.unit};
 }).filter(Boolean);
}
function community(data,pub,notes={},options={}){
 const f={study_id:pub.studies.find(s=>s.status==='ready')?.study_id||'',rarity:'',style:'',...options},study=pub.studies.find(s=>s.study_id===f.study_id),source=pub.sources.find(s=>s.source_id===study?.source_id),full=studyRows(data,study),rows=full.filter(o=>(!f.rarity||String(o.rarity)===String(f.rarity))&&(!f.style||o.style===f.style)).sort((a,b)=>(b.value??-1)-(a.value??-1)||a.id.localeCompare(b.id));
 const p=personal(data,notes,{scope:'all'}),formSpecific=study?.form_scope!=='family',savedIds=formSpecific?[...new Set((notes.saved||[]).filter(id=>data.outfits.some(o=>o.id===id&&(study?.form_scope!=='base'||o.is_base))))]:p.favorite_ids,matchId=o=>formSpecific?o.id:o.base_id,favoriteIds=new Set(savedIds),candidateIds=new Set(full.map(matchId)),comparable=savedIds.filter(id=>candidateIds.has(id)),selectedFavorites=rows.filter(o=>favoriteIds.has(matchId(o)));
 const comparableRows=full.filter(o=>comparable.includes(matchId(o))),weight=full.reduce((s,r)=>s+(r.value??0),0),preference=['preference','pull_intent','approval'].includes(study?.metric);
 const distribution=styles.map(style=>({style,personal_all:savedIds.length?100*data.outfits.filter(o=>savedIds.includes(o.id)&&o.style===style).length/savedIds.length:null,personal:comparable.length?100*comparableRows.filter(o=>o.style===style).length/comparable.length:null,community:preference&&weight?100*full.filter(o=>o.style===style).reduce((s,o)=>s+o.value,0)/weight:null,tested:full.some(o=>o.style===style)}));
 const baseline=full.length?full.reduce((s,r)=>s+(r.value??0),0)/full.length:null;
 const comparison=selectedFavorites.map(o=>({...o,delta:baseline===null?null:o.value-baseline}));
 const likedStyles=new Set(p.favorite_styles.filter(s=>s.total>0).map(s=>s.key)),recommendations=preference&&full.length>=2&&likedStyles.size?rows.filter(o=>o.value>=baseline&&likedStyles.has(o.style)&&!favoriteIds.has(matchId(o))&&!p.outfits.find(x=>x.id===(formSpecific?o.id:o.base_id))?.complete).slice(0,6):[];
 const channels=['gacha','shop','event','craft','quest','explore','challenge','home','other'].map(method=>{const selected=rows.filter(o=>o.methods.includes(method));return {method,count:selected.length,ids:selected.map(o=>o.id),mean:selected.length?selected.reduce((s,o)=>s+(o.value??0),0)/selected.length:null};});
 return {filters:f,study,source,rows,full,distribution,comparison,recommendations,channels,baseline,comparable_favorites:comparable.length,all_favorites:savedIds.length,unmeasured_favorites:savedIds.filter(id=>!candidateIds.has(id)),preference};
}
function trend(data,pub,seriesId){
 const rows=pub.studies.filter(s=>s.status==='ready'&&s.comparison_series===seriesId&&seriesId&&s.period_start&&s.period_end&&s.period_version_id).sort((a,b)=>a.period_start.localeCompare(b.period_start));
 if(rows.length<2)return {ready:false,reason:'insufficient_periods',points:[]};
 const signature=s=>JSON.stringify([s.metric,s.unit,s.platform||pub.sources.find(x=>x.source_id===s.source_id)?.platform,s.population,s.question,s.form_scope,[...s.candidate_ids].sort()]);
 if(rows.some(s=>signature(s)!==signature(rows[0]))||rows.some(s=>!s.comparability_note))return {ready:false,reason:'incomparable',points:[]};
 if(new Set(rows.map(s=>s.period_version_id)).size!==rows.length||rows.some((s,i)=>i&&s.period_start<=rows[i-1].period_end))return {ready:false,reason:'overlapping_periods',points:[]};
 return {ready:true,points:rows.map(s=>({study_id:s.study_id,version_id:s.period_version_id,start:s.period_start,end:s.period_end,sample_size:s.sample_size,source_id:s.source_id,styles:styles.map(style=>{const values=studyRows(data,s).filter(o=>o.style===style&&o.value!==null);return {style,value:values.length?values.reduce((n,v)=>n+v.value,0)/values.length:null};})}))};
}
const api={styles,effectiveOwned,personal,studyRows,community,trend};root.NikkiWardrobeModel=api;if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(globalThis);
