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
  function refreshButtons(){document.querySelectorAll('.save-story').forEach(b=>{let s;try{s=JSON.parse(b.dataset.story);}catch{return;}const active=saved.some(x=>x.url===s.url);b.textContent=active?say('Saved','已收藏'):say('Save','收藏');b.setAttribute('aria-pressed',String(active));});const count=document.querySelector('[data-saved-count]');if(count){count.hidden=!saved.length;count.textContent=String(saved.length);}}
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
  function bindMediaQuality(image){
    if(image.dataset.mediaBound)return;image.dataset.mediaBound='true';
    const check=()=>{
      const frame=image.closest('.story-image');
      const minWidth=Number(image.dataset.minWidth??0),minHeight=Number(image.dataset.minHeight??0);
      if(!frame||image.naturalWidth<minWidth||image.naturalHeight<minHeight)frame?.setAttribute('hidden','');
    };
    image.addEventListener('error',check,{once:true});
    if(image.complete)check();else image.addEventListener('load',check,{once:true});
  }
  function bindMediaPlayer(player){
    if(player.dataset.readerBound)return;player.dataset.readerBound='true';
    player.addEventListener('error',()=>{
      player.hidden=true;
      const container=player.closest('.story-audio, .story-video');
      const link=container?.querySelector('.media-original');
      if(link)link.textContent=say('Playback unavailable · Open original','无法播放 · 前往原文');
    });
  }
  function bindStoryControls(root=document){root.querySelectorAll('.save-story').forEach(bindSave);root.querySelectorAll('.share-story').forEach(bindShare);root.querySelectorAll('img[data-media-check]').forEach(bindMediaQuality);root.querySelectorAll('[data-media-player]').forEach(bindMediaPlayer);refreshButtons();}
  bindStoryControls();
  function enableSearch(){
    const control=document.querySelector('.search-control'),input=control?.querySelector('input[type="search"]'),summary=control?.querySelector('summary');
    if(!control||!input||!summary)return;
    control.addEventListener('toggle',()=>{if(control.open)window.requestAnimationFrame(()=>input.focus());});
    document.addEventListener('keydown',event=>{
      if(event.key==='Escape'&&control.open){control.open=false;summary.focus();}
    });
  }
  enableSearch();
  function enablePwa(){
    const buttons=[...document.querySelectorAll('[data-pwa-install]')];
    if(!('serviceWorker' in navigator))return;
    window.addEventListener('load',()=>navigator.serviceWorker.register('/service-worker.js').catch(()=>{}),{once:true});
    let deferredPrompt=null;
    window.addEventListener('beforeinstallprompt',event=>{
      event.preventDefault();deferredPrompt=event;buttons.forEach(button=>button.hidden=false);
    });
    buttons.forEach(button=>button.addEventListener('click',async()=>{
      if(!deferredPrompt)return;
      deferredPrompt.prompt();await deferredPrompt.userChoice;deferredPrompt=null;buttons.forEach(control=>control.hidden=true);
    }));
    window.addEventListener('appinstalled',()=>{deferredPrompt=null;buttons.forEach(button=>button.hidden=true);});
  }
  enablePwa();
  document.addEventListener('click',event=>{
    const link=event.target.closest('a[data-event="original"]');if(!link)return;metric('original');
    const key=link.closest('.story')?.dataset.focus?.split(',').find(Boolean);if(!key||!storage||!countEvents)return;
    try{const day=new Date().toISOString().slice(0,10),interestKey='bond6-focus-interest:'+day,seen=new Set(JSON.parse(localStorage.getItem(interestKey)??'[]'));if(seen.has(key))return;seen.add(key);localStorage.setItem(interestKey,JSON.stringify([...seen].slice(-12)));metric('focus:'+key);}catch{/* Interest signals are optional. */}
  });
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
  function enableInfiniteFeeds(){
    document.querySelectorAll('[data-infinite-trigger]').forEach(trigger=>{
      const column=trigger.closest('.feed-column'),feed=column?.querySelector('[data-infinite-lane-feed]'),list=feed?.querySelector('[data-infinite-stories]'),statusLine=feed?.querySelector('[data-infinite-status]');
      if(!column||!feed||!list||!statusLine)return;
      let loading=false,finished=false;
      const message=text=>{statusLine.textContent=text;};
      const finish=()=>{finished=true;trigger.hidden=true;message(say('You’ve reached the oldest retained arrivals.','已到达当前保留的最早内容。'));};
      const load=async()=>{
        if(loading||finished||!column.getClientRects().length)return;
        loading=true;trigger.setAttribute('aria-busy','true');message(say('Loading earlier arrivals…','正在加载更早内容…'));
        try{
          const response=await fetch(trigger.href,{headers:{Accept:'text/html'}});if(!response.ok)throw new Error('Request failed');
          const documentPage=new DOMParser().parseFromString(await response.text(),'text/html');
          const incoming=documentPage.querySelector('.archive-stories');
          const cards=incoming?[...incoming.querySelectorAll(':scope > .story')]:[];
          if(!cards.length){finish();return;}
          const rendered=new Set([...document.querySelectorAll('.feed-column .story h3 a[href]')].map(link=>link.href));
          const fresh=cards.filter(card=>{const link=card.querySelector('h3 a[href]')?.href;if(!link||rendered.has(link))return false;rendered.add(link);return true;});
          if(fresh.length){list.append(...fresh);feed.hidden=false;bindStoryControls(feed);}
          const next=documentPage.querySelector('[data-next-page]');
          if(next?.href){trigger.href=next.href;message(say('Choose “Load older stories” when you want another page.','需要时，选择「加载更早内容」。'));}
          else finish();
        }catch{message(say('Couldn’t load earlier arrivals. Use Browse all stories instead.','无法加载更早内容。请使用「浏览全部文章」。'));}
        finally{loading=false;trigger.removeAttribute('aria-busy');}
      };
      trigger.addEventListener('click',event=>{
        if(event.button||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;
        event.preventDefault();load();
      });
    });
  }
  enableInfiniteFeeds();
  function enableArrivalRefresh(){
    const columns=[...document.querySelectorAll('.feed-column')];
    if(!columns.length||!window.fetch)return;
    const pending=new Map();
    // A changed top-ten selection may contain old articles that were already
    // outside this page's initial window. Only discoveries after page load
    // qualify as new, regardless of source caps or reclassification.
    const openedAt=Date.now();
    const buttonFor=lane=>document.querySelector(`[data-refresh-lane="${lane}"]`);
    const showPending=(lane,cards)=>{
      const button=buttonFor(lane);if(!button)return;
      if(!cards.length){button.hidden=true;return;}
      button.hidden=false;
      button.textContent=say(`${cards.length} new · Load`,`${cards.length} 条新内容 · 加载`);
    };
    const check=async()=>{
      if(document.hidden)return;
      try{
        const response=await fetch(location.href,{headers:{Accept:'text/html'}});if(!response.ok)return;
        const page=new DOMParser().parseFromString(await response.text(),'text/html');
        for(const column of columns){
          const lane=column.id.replace(/-feed$/,'');
          const source=page.querySelector('#'+column.id),incoming=source?.querySelector('.arrivals-label + .stories');
          if(!incoming)continue;
          const seen=new Set([...document.querySelectorAll('.feed-column .story h3 a[href]')].map(link=>link.href));
          const queued=pending.get(lane)??[];
          queued.forEach(card=>{const href=card.querySelector('h3 a[href]')?.href;if(href)seen.add(href);});
          const fresh=[...incoming.querySelectorAll(':scope > .story')].filter(card=>{
            const href=card.querySelector('h3 a[href]')?.href;
            if(!href||seen.has(href)||Number(card.dataset.discovered)<=openedAt)return false;
            seen.add(href);return true;
          });
          if(!fresh.length)continue;
          const all=[...queued,...fresh];pending.set(lane,all);showPending(lane,all);
        }
      }catch{/* Freshness checks are optional; keep the current reading view intact. */}
    };
    document.querySelectorAll('.refresh-arrivals').forEach(button=>button.addEventListener('click',()=>{
      const lane=button.dataset.refreshLane,cards=pending.get(lane)??[];
      const column=document.querySelector('#'+lane+'-feed'),arrivals=column?.querySelector('.arrivals-label + .stories');
      if(!arrivals||!cards.length)return;
      arrivals.querySelector('.notice')?.remove();
      const seen=new Set([...document.querySelectorAll('.feed-column .story h3 a[href]')].map(link=>link.href));
      const additions=cards.filter(card=>{const href=card.querySelector('h3 a[href]')?.href;if(!href||seen.has(href))return false;seen.add(href);return true;}).map(card=>document.importNode(card,true));
      additions.forEach(card=>{const mark=card.querySelector('.new-mark');if(mark)mark.hidden=false;});
      arrivals.prepend(...additions);pending.delete(lane);showPending(lane,[]);bindStoryControls(arrivals);
      notify(additions.length?say(`${additions.length} new arrivals added.`, `已加载 ${additions.length} 条新内容。`):say('These arrivals are already on the page.','这些内容已在页面中。'));
    }));
    window.setInterval(check,5*60*1000);
    document.addEventListener('visibilitychange',()=>{if(!document.hidden)check();});
  }
  enableArrivalRefresh();
  function enableBackToTop(){
    if(!document.querySelector('.feed-columns'))return;
    const link=document.createElement('a');link.className='back-to-top';link.href='#main';link.textContent=say('Back to top','返回顶部');link.hidden=true;document.body.append(link);
    const update=()=>{link.hidden=window.scrollY<700;};update();window.addEventListener('scroll',update,{passive:true});
  }
  enableBackToTop();
  if(document.body.dataset.edition==='true')metric('edition');
})();
