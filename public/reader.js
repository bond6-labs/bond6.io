(() => {
  const zh=document.documentElement.lang.startsWith('zh'),say=(en,cn)=>zh?cn:en;
  const key='bond6-saved-v1',status=document.querySelector('.reader-message');
  const notify=text=>{if(status)status.textContent=text;};
  const safeUrl=value=>{try{const u=new URL(value);return ['http:','https:'].includes(u.protocol)?u.href:null;}catch{return null;}};
  let saved=[],storage=true,undo=null;
  try { const raw=JSON.parse(localStorage.getItem(key)??'[]');saved=Array.isArray(raw)?raw.filter(s=>safeUrl(s.url)&&typeof s.source==='string').slice(0,100):[];
    localStorage.setItem('bond6-storage-check','1');localStorage.removeItem('bond6-storage-check');
  }catch{storage=false;}
  const countEvents=!navigator.globalPrivacyControl&&navigator.doNotTrack!=='1';
  function metric(event){if(countEvents)fetch('/events',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({event}),keepalive:true}).catch(()=>{});}
  function persist(){try{localStorage.setItem(key,JSON.stringify(saved));return true;}catch{notify(say('Browser storage is unavailable; your change could not be saved.','浏览器存储不可用，无法保存这次更改。'));return false;}}
  function refreshButtons(){document.querySelectorAll('.save-story').forEach(b=>{let s;try{s=JSON.parse(b.dataset.story);}catch{return;}const active=saved.some(x=>x.url===s.url);b.textContent=active?say('Saved','已收藏'):say('Save','收藏');b.setAttribute('aria-pressed',String(active));});}
  function showUndo(message){notify(message+' ');const button=document.createElement('button');button.type='button';button.textContent=say('Undo','撤销');button.addEventListener('click',()=>{if(undo){saved=undo;undo=null;persist();renderSaved();refreshButtons();notify(say('Restored.','已恢复。'));}});status?.append(button);}
  function bindSave(button){
    if(button.dataset.readerBound)return;button.dataset.readerBound='true';
    button.hidden=false;
    if(!storage){button.disabled=true;button.title=say('Browser storage is unavailable','浏览器存储不可用');return;}
    button.addEventListener('click',()=>{
      let story;try{story=JSON.parse(button.dataset.story);}catch{return;}
      if(!safeUrl(story.url))return;
      const before=[...saved],active=saved.some(s=>s.url===story.url);
      if(active){undo=before;saved=saved.filter(s=>s.url!==story.url);}
      else if(saved.length>=100){notify(say('You have 100 saved stories. Remove one before saving another.','已收藏 100 条，请先删除一条再添加。'));return;}
      else saved.unshift(story);
      if(!persist()){saved=before;return;}refreshButtons();
      if(active)showUndo(say('Removed from saved stories.','已从收藏中移除。'));
      else {metric('save');notify(say('Saved on this browser.','已保存在这个浏览器。'));}
    });
  }
  async function share(button) {
    const url=safeUrl(button.dataset.url);if(!url)return;
    try{
      if(navigator.share){await navigator.share({title:button.dataset.title,url});metric('share');}
      else if(navigator.clipboard?.writeText){await navigator.clipboard.writeText(url);metric('share');notify(say('Link copied.','链接已复制。'));}
      else {notify(say('Copy this link: ','复制这个链接：')+url);}
    }catch(error){if(error.name!=='AbortError')notify(say('Copy this link: ','复制这个链接：')+url);}
  }
  function bindShare(button){if(button.dataset.readerBound)return;button.dataset.readerBound='true';button.hidden=false;button.addEventListener('click',()=>share(button));}
  function bindStoryControls(root=document){root.querySelectorAll('.save-story').forEach(bindSave);root.querySelectorAll('.share-story').forEach(bindShare);refreshButtons();}
  bindStoryControls();
  document.addEventListener('click',event=>{if(event.target.closest('a[data-event="original"]'))metric('original');});
  function element(tag,text,className){const e=document.createElement(tag);if(text)e.textContent=text;if(className)e.className=className;return e;}
  function renderSaved(){
    const list=document.querySelector('#saved-list'),clear=document.querySelector('#clear-saved');if(!list)return;
    list.replaceChildren();clear.hidden=!storage||!saved.length;
    if(!storage||!saved.length){list.append(element('p',!storage?say('Browser storage is unavailable. Saved stories cannot be read here.','浏览器存储不可用，无法读取收藏。'):say('Nothing saved yet. Use Save beside a story to keep it here.','还没有收藏。在文章旁点击「收藏」，就能保存在这里。'),'notice'));return;}
    for(const s of saved){
      const article=element('article',null,'story'),h=element('h2'),link=element('a',s.title??s.url);
      link.href=safeUrl(s.url);link.dataset.event='original';h.append(link);article.append(h);
      const note=(zh?s.zh?.note:s.en?.note);if(note)article.append(element('p',note));
      article.append(element('p',[s.author,s.source].filter(Boolean).join(' · '),'byline'));
      const remove=element('button',say('Remove','移除'));remove.type='button';remove.addEventListener('click',()=>{undo=[...saved];saved=saved.filter(x=>x.url!==s.url);if(!persist()){saved=undo;return;}renderSaved();showUndo(say('Story removed.','已移除。'));});article.append(remove);list.append(article);
    }
  }
  document.querySelector('#clear-saved')?.addEventListener('click',()=>{undo=[...saved];saved=[];if(!persist()){saved=undo;return;}renderSaved();showUndo(say('Saved stories cleared.','已清空收藏。'));});renderSaved();
  try {
    const now=Date.now(),session=JSON.parse(sessionStorage.getItem('bond6-visit')??'null');
    const visit=session&&now-session.started<30*60_000?session:{started:now,previous:Number(localStorage.getItem('bond6-last-visit'))||0};
    if(visit!==session){sessionStorage.setItem('bond6-visit',JSON.stringify(visit));localStorage.setItem('bond6-last-visit',String(now));metric('visit');if(visit.previous)metric('return');}
    for(const column of document.querySelectorAll('.feed-column')){
      let fresh=0;column.querySelectorAll('.story').forEach(s=>{if(visit.previous&&Number(s.dataset.discovered)>visit.previous){s.querySelector('.new-mark').hidden=false;fresh++;}});
      const label=column.querySelector('.new-count');if(label&&fresh){label.hidden=false;label.textContent=say(fresh+' new since your last visit','比上次访问新增 '+fresh+' 条');}
    }
  }catch{/* Reading does not depend on storage. */}
  function enableInfiniteFeed(){
    const trigger=document.querySelector('[data-infinite-trigger]'),feed=document.querySelector('[data-infinite-feed]'),list=document.querySelector('[data-infinite-stories]'),statusLine=document.querySelector('[data-infinite-status]');
    if(!trigger||!feed||!list||!('IntersectionObserver' in window))return;
    let loading=false,finished=false;
    const message=text=>{if(statusLine)statusLine.textContent=text;};
    const finish=()=>{finished=true;trigger.hidden=true;message(say('You’ve reached the oldest retained arrivals.','已到达当前保留的最早内容。'));observer.disconnect();};
    const load=async()=>{
      if(loading||finished)return;
      loading=true;trigger.setAttribute('aria-busy','true');message(say('Loading earlier arrivals…','正在加载更早内容…'));
      try{
        const response=await fetch(trigger.href,{headers:{Accept:'text/html'}});if(!response.ok)throw new Error('Request failed');
        const documentPage=new DOMParser().parseFromString(await response.text(),'text/html');
        const incoming=documentPage.querySelector('.archive-stories');
        const cards=incoming?[...incoming.querySelectorAll(':scope > .story')]:[];
        if(!cards.length){finish();return;}
        list.append(...cards);feed.hidden=false;bindStoryControls(feed);
        const next=documentPage.querySelector('[data-next-page]');
        if(next?.href){trigger.href=next.href;message(say('More earlier arrivals load as you scroll.','继续向下滚动即可加载更早内容。'));}
        else finish();
      }catch{message(say('Couldn’t load earlier arrivals. Use Browse all stories instead.','无法加载更早内容。请使用「浏览全部文章」。'));}
      finally{loading=false;trigger.removeAttribute('aria-busy');}
    };
    const observer=new IntersectionObserver(entries=>{if(entries.some(entry=>entry.isIntersecting))load();},{rootMargin:'700px 0px'});
    observer.observe(trigger);
  }
  enableInfiniteFeed();
  if(document.body.dataset.edition==='true')metric('edition');
})();
