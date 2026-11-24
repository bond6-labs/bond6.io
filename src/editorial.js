// Small deterministic signals; no network calls or generated claims.
const domains=[
  ['music',/\b(?:album|musicians?|songwriters?|songs?|jazz|guitar|concert|band|music)\b|音乐|专辑|乐队|歌曲|唱片/i],
  ['writing',/\b(?:poetry|poems?|novels?|literature|books?|writers?|philosopher|philosophy)\b|文学|诗歌|诗人|小说|作家|书评|哲学/i],
  ['art',/\b(?:painting|sculpture|photography|photographer|museum|exhibition|architecture|illustration|designer|theatre|theater|comedy|documentary|cinema|film)\b|绘画|雕塑|摄影|博物馆|展览|建筑|设计师|戏剧|纪录片|电影/i],
  ['practice',/\b(?:pottery|ceramics|woodworking|craftsmanship)\b|陶艺|木工|手工/i]
];
export function editorialSubject(title,excerpt,prior){
  for(const [subject,pattern] of domains)if(pattern.test(title))return subject;
  if(prior&&prior!=='digital')return prior;
  for(const [subject,pattern] of domains)if(pattern.test(excerpt.slice(0,400)))return subject;
  return 'digital';
}
// Collapse only strongly overlapping headlines within a short time window.
// Criticism, reviews, consequences and distinct angles remain separate.
export function distinctStories(rows){
  const kept=[];
  const words=t=>new Set((t.toLowerCase().match(/[a-z0-9]+|[\u3400-\u9fff]/g)||[]).filter(x=>!['the','a','an','to','of','and','in','for','on','is','new'].includes(x)));
  for(const row of rows){
    const tokens=words(row.title??'');
    const duplicate=kept.find(other=>{
      if(row.lane!=='ai'||row.lane!==other.lane||row.original_lang!==other.original_lang)return false;
      const angle=t=>(t.toLowerCase().match(/\b(?:risk|risks|review|criticism|warns|fails|failure|not)\b|风险|评论|批评|警告|失败|并非/g)||[]).sort().join('|');
      if(angle(row.title??'')!==angle(other.title??''))return false;
      if(JSON.stringify((row.title??'').match(/\d+(?:\.\d+)?/g))!==JSON.stringify((other.title??'').match(/\d+(?:\.\d+)?/g)))return false;
      if(Math.abs((row.discovered_at??0)-(other.discovered_at??0))>2*86400000)return false;
      const otherTokens=words(other.title??'');
      const overlap=[...tokens].filter(t=>otherTokens.has(t)).length;
      return tokens.size>=5&&otherTokens.size>=5&&overlap/(tokens.size+otherTokens.size-overlap)>=.85;
    });
    if(!duplicate)kept.push(row);
  }
  return kept;
}
