export const now=Date.parse('2026-11-13T12:00:00Z');
export const source={id:'test',name:'Studio Journal',kind:'rss',topic:'Music',essays:true};
export function story(i=0,overrides={}) {
  return {url:`https://example.org/music/${i}`,link:`https://example.org/music/${i}`,canonical_url:`https://example.org/music/${i}`,
    title:'A musician records songs at home',author:'Leah',original_lang:'en',content_type:'article',original_published_at:now-1000,
    discovered_at:now,source:'Studio '+i,source_id:'source-'+i,lane:'human',subject:'music',
    excerpt:'Leah recorded the songs at home. She slowed the guitar part and listened to the spaces between the notes. In her account, she explains how slowing the part helped her hear the shape of the melody. She describes using the home recording to try different timings before deciding how to perform the song.',
    content_hash:String(i).padStart(64,'0'),...overrides};
}
export function note(s) {
  return {url:s.url,content_hash:s.content_hash,en:{title:'A musician records songs at home'},zh:{title:'一位音乐人在家录制歌曲'},entities:[{source:'Leah',en:'Leah',zh:'莉娅'}],claims:[
    {en:'Leah recorded the songs at home, slowing the guitar part and listening to the spaces between the notes.',zh:'莉娅在家录制歌曲，放慢吉他声部的节奏，留意音符之间的空隙。',evidence:'Leah recorded the songs at home. She slowed the guitar part and listened to the spaces between the notes.'},
    {en:'In her account, the slower part helped her hear the shape of the melody, while home recording let her try different timings before deciding how to perform it.',zh:'按照她的讲述，放慢之后，她更能听清旋律的轮廓；在家录音也让她得以尝试不同的节奏，再决定怎样演奏。',evidence:'In her account, she explains how slowing the part helped her hear the shape of the melody. She describes using the home recording to try different timings before deciding how to perform the song.'}
  ]};
}
export const review={approved:true,factual:true,names:true,numbers:true,dates:true,equivalent:true,language:true,attribution:true,reason:'Supported by the supplied excerpt.'};
