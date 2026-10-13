(function(root,factory){
  if(typeof module!=='undefined'&&module.exports)module.exports=factory(require('./improved-model.cjs'),require('./vendor/pinyin-pro.cjs'));
  else root.NikkiHomophoneSearch=factory(root.NikkiImprovedSearch,root.pinyinPro);
})(typeof window!=='undefined'?window:globalThis,function(Base,PY){
  'use strict';
  const VERSION='F-v2-single-character-homophone',CONFIDENCE=.96,MAX_CANDIDATES=20;
  const sound=ch=>PY.pinyin(ch,{toneType:'none',type:'array',v:true}).join('');
  function createEngine(documents,aliases){
    const core=Base.createEngine(documents,aliases),masked=new Map();
    for(const r of documents){
      const name=r.names['zh-CN'],key=Base.compact(name);
      if(!/^[\u3400-\u9fff]{3,18}$/.test(key))continue;
      for(let i=0;i<key.length;i++){
        const mask=key.slice(0,i)+'?'+key.slice(i+1);
        if(!masked.has(mask))masked.set(mask,[]);
        masked.get(mask).push({id:r.id,name,key,index:i});
      }
    }
    function search(query,method='F',external={},config=Base.DEFAULT){
      const initial=core.search(query,method,external,config),q=Base.compact(query);
      // Exact/existing results and semantics-only E are never rewritten. Thresholds stay unchanged.
      if(initial.length||!['D','F'].includes(method)||config.disable?.pinyin||config.disable?.fuzzy||!/^[\u3400-\u9fff]{3,18}$/.test(q))return initial;
      const candidates=new Map();
      for(let i=0;i<q.length;i++)for(const r of masked.get(q.slice(0,i)+'?'+q.slice(i+1))||[]){
        if(r.key[i]!==q[i]&&sound(r.key[i])===sound(q[i]))candidates.set(r.id,r);
      }
      const found=new Map();
      for(const r of [...candidates.values()].sort((a,b)=>a.id.localeCompare(b.id,'en')).slice(0,MAX_CANDIDATES)){
        const prepared=core.signals(r.name,external,config);
        prepared.items=prepared.items.filter(x=>x.id===r.id&&x.name===1).map(x=>({...x,name:CONFIDENCE,reasons:[{field:'name',kind:'homophone',value:r.name,from:query,to:r.name,changed_from:q[r.index],changed_to:r.key[r.index],score:CONFIDENCE,source:'catalog_name_one_character_same_sound'}]}));
        for(const hit of core.rank(prepared,method,config))found.set(hit.id,hit);
      }
      return [...found.values()].sort((a,b)=>b.score-a.score||a.id.localeCompare(b.id,'en'));
    }
    return {...core,search,version:VERSION};
  }
  return {...Base,createEngine,VERSION};
});
