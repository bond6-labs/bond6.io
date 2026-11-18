export const sources = [
  // Human Pulse — original reporting, criticism, and first-person practice.
  { id: 'bandcamp', name: 'Bandcamp Daily', kind: 'rss', url: 'https://daily.bandcamp.com/feed/', site: 'https://daily.bandcamp.com/', topic: 'Music', essays: true },
  { id: 'sspai', name: '少数派', kind: 'rss', url: 'https://sspai.com/feed', site: 'https://sspai.com/', topic: 'Life online', essays: true },
  { id: 'harvard-arts', name: 'Harvard Gazette — Arts & Humanities', kind: 'rss', url: 'https://news.harvard.edu/gazette/section/arts-humanities/feed/', site: 'https://news.harvard.edu/gazette/section/arts-humanities/', topic: 'Arts & humanities', essays: true, poll_minutes: 180 },
  { id: 'public-domain-review', name: 'The Public Domain Review', kind: 'rss', url: 'https://publicdomainreview.org/feed/', site: 'https://publicdomainreview.org/', topic: 'History & culture', essays: true, poll_minutes: 180 },
  { id: 'jstor-daily', name: 'JSTOR Daily', kind: 'rss', url: 'https://daily.jstor.org/feed/', site: 'https://daily.jstor.org/', topic: 'Culture & ideas', essays: true, poll_minutes: 180 },
  { id: 'aeon', name: 'Aeon', kind: 'rss', url: 'https://aeon.co/essays/feed.rss', site: 'https://aeon.co/', topic: 'Ideas & first-person essays', essays: true, poll_minutes: 180 },
  { id: 'aquarium-drunkard', name: 'Aquarium Drunkard', kind: 'rss', url: 'https://aquariumdrunkard.com/feed/', site: 'https://aquariumdrunkard.com/', topic: 'Music', essays: true },
  { id: 'literary-hub', name: 'Literary Hub', kind: 'rss', url: 'https://lithub.com/feed/', site: 'https://lithub.com/', topic: 'Literature', essays: true },
  { id: 'colossal', name: 'Colossal', kind: 'rss', url: 'https://www.thisiscolossal.com/feed/', site: 'https://www.thisiscolossal.com/', topic: 'Visual arts', essays: true },
  { id: 'hyperallergic', name: 'Hyperallergic', kind: 'rss', url: 'https://hyperallergic.com/feed/', site: 'https://hyperallergic.com/', topic: 'Visual arts', essays: true },
  { id: 'creative-boom', name: 'Creative Boom', kind: 'rss', url: 'https://www.creativeboom.com/feed/', site: 'https://www.creativeboom.com/', topic: 'Visual arts', essays: true },
  { id: 'creative-independent', name: 'The Creative Independent', kind: 'rss', url: 'https://thecreativeindependent.com/feed.xml', site: 'https://thecreativeindependent.com/', topic: 'Creative Practice', essays: true, poll_minutes: 180 },
  { id: 'quietus', name: 'The Quietus', kind: 'rss', url: 'https://thequietus.com/feed/', site: 'https://thequietus.com/', topic: 'Music', essays: true },
  { id: 'kleon', name: 'Austin Kleon', kind: 'rss', url: 'https://austinkleon.com/feed/', site: 'https://austinkleon.com/', topic: 'Writing & publishing', essays: true },
  { id: 'appleton', name: 'Maggie Appleton', kind: 'rss', url: 'https://maggieappleton.com/rss.xml', site: 'https://maggieappleton.com/', topic: 'Writing & publishing', essays: true },
  { id: 'dash', name: 'Anil Dash', kind: 'rss', url: 'https://www.anildash.com/feed.xml', site: 'https://www.anildash.com/', topic: 'First-person accounts', essays: true },
  { id: 'kaix', name: 'KAIX.IN', kind: 'rss', url: 'https://kaix.in/feed/', site: 'https://kaix.in/', topic: 'Reading & personal essays', essays: true, poll_minutes: 180 },
  { id: 'maohang', name: 'Maohang Gao', kind: 'rss', url: 'https://kangaroogao.com/atom.xml', site: 'https://kangaroogao.com/', topic: 'Travel, reading & essays', essays: true, poll_minutes: 180 },
  { id: 'conge', name: 'Conge', kind: 'rss', url: 'https://conge.github.io/feed.xml', site: 'https://conge.github.io/', topic: 'Life, running & reading', essays: true, poll_minutes: 180 },
  { id: 'hehew', name: '赫赫文王', kind: 'rss', url: 'https://kqh.me/index.xml', site: 'https://kqh.me/', topic: 'Humanities & daily life', essays: true, poll_minutes: 180 },
  { id: 'electric-literature', name: 'Electric Literature', kind: 'rss', url: 'https://electricliterature.com/feed/', site: 'https://electricliterature.com/', topic: 'Literature & writers', essays: true, poll_minutes: 90 },
  { id: 'paris-review', name: 'The Paris Review', kind: 'rss', url: 'https://www.theparisreview.org/blog/feed/', site: 'https://www.theparisreview.org/', topic: 'Writers & literature', essays: true, poll_minutes: 90 },
  { id: 'longreads', name: 'Longreads', kind: 'rss', url: 'https://longreads.com/feed/', site: 'https://longreads.com/', topic: 'Long-form writing', essays: true, poll_minutes: 90 },
  { id: 'marginalian', name: 'The Marginalian', kind: 'rss', url: 'https://www.themarginalian.org/feed/', site: 'https://www.themarginalian.org/', topic: 'Culture & ideas', essays: true, poll_minutes: 180 },
  { id: 'dezeen', name: 'Dezeen', kind: 'rss', url: 'https://www.dezeen.com/feed/', site: 'https://www.dezeen.com/', topic: 'Design & architecture', tier: 'flow', poll_minutes: 20 },
  { id: 'outside', name: 'Outside', kind: 'rss', url: 'https://www.outsideonline.com/feed/', site: 'https://www.outsideonline.com/', topic: 'Outdoor life & endurance', tier: 'flow', poll_minutes: 45 },
  { id: 'climbing', name: 'Climbing', kind: 'rss', url: 'https://www.climbing.com/feed/', site: 'https://www.climbing.com/', topic: 'Climbing & embodied life', tier: 'flow', poll_minutes: 45 },
  { id: 'open-culture', name: 'Open Culture', kind: 'rss', url: 'https://www.openculture.com/feed', site: 'https://www.openculture.com/', topic: 'Culture & learning', tier: 'flow', poll_minutes: 90 },
  { id: 'kottke', name: 'Kottke.org', kind: 'rss', url: 'https://feeds.kottke.org/main', site: 'https://kottke.org/', topic: 'Culture, design & curiosities', tier: 'flow', poll_minutes: 45 },
  { id: 'mooool', name: 'mooool 木藕设计网', kind: 'rss', url: 'https://mooool.com/feed', site: 'https://mooool.com/', topic: 'Design & architecture', language: 'zh', tier: 'flow', poll_minutes: 90 },
  { id: 'qingshu', name: '轻书散文小站', kind: 'rss', url: 'https://www.qingshu.art/feed.xml', site: 'https://www.qingshu.art/', topic: 'Essays & literary life', language: 'zh', essays: true, poll_minutes: 180 },
  // Named programmes only: each has a public, first-party RSS feed and is
  // deliberately bounded to Human Pulse rather than a whole podcast directory.
  { id: 'random-waves', name: '随机波动', kind: 'rss', url: 'https://feeds.fireside.fm/stovol/rss', site: 'https://www.stovol.com/', topic: 'Culture, books & lived ideas', language: 'zh', lane: 'human', essays: true, poll_minutes: 180 },
  { id: 'kanlixiang-roundtable', name: '看理想·圆桌', kind: 'rss', url: 'https://api.vistopia.com.cn/rss/program/13.xml', site: 'https://www.vistopia.com.cn/', topic: 'Humanities & cultural conversation', language: 'zh', lane: 'human', tier: 'flow', poll_minutes: 180 },
  { id: 'yixi-extratalk', name: '一席·席外话', kind: 'rss', url: 'https://feed.xyzfm.space/cp6bdgmn8wf6', site: 'https://yixi.tv/', topic: 'Creative life & conversation', language: 'zh', lane: 'human', tier: 'flow', poll_minutes: 180 },
  { id: 'jiemian-culture-podcast', name: '界面文化·编辑部聊天室', kind: 'rss', url: 'https://feed.xyzfm.space/yngbfgflw4qk', site: 'https://www.jiemian.com/', topic: 'Culture & public life', language: 'zh', lane: 'human', tier: 'flow', poll_minutes: 180 },

  // AI & Its Impact — primary labs plus reporting and critical analysis.
  { id: 'zitron-newsletter', name: 'Ed Zitron', kind: 'rss', url: 'https://www.wheresyoured.at/rss/', site: 'https://www.wheresyoured.at/', topic: 'First-person accounts', allPosts: true },
  { id: 'rest-of-world', name: 'Rest of World', kind: 'rss', url: 'https://restofworld.org/feed/latest/', site: 'https://restofworld.org/', topic: 'Life online' },
  { id: 'creative-commons', name: 'Creative Commons', kind: 'rss', url: 'https://creativecommons.org/feed/', site: 'https://creativecommons.org/', topic: 'Writing & publishing' },
  { id: 'platformer', name: 'Platformer', kind: 'rss', url: 'https://www.platformer.news/rss/', site: 'https://www.platformer.news/', topic: 'Life online', poll_minutes: 10 },
  { id: 'mit-tech-review', name: 'MIT Technology Review', kind: 'rss', url: 'https://www.technologyreview.com/feed/', site: 'https://www.technologyreview.com/', topic: 'Life online' },
  { id: 'ai-now', name: 'AI Now Institute', kind: 'rss', url: 'https://ainowinstitute.org/feed/', site: 'https://ainowinstitute.org/', topic: 'AI & society', poll_minutes: 90, title_prefixes: ['Lawfare Daily'] },
  { id: 'deepmind', name: 'Google DeepMind', kind: 'rss', url: 'https://deepmind.com/blog/feed/basic/', site: 'https://deepmind.google/blog/', topic: 'AI research & capability', poll_minutes: 45 },
  { id: 'huggingface', name: 'Hugging Face', kind: 'rss', url: 'https://huggingface.co/blog/feed.xml', site: 'https://huggingface.co/blog', topic: 'Open AI tools & models', poll_minutes: 45 },
  { id: 'qbitai', name: '量子位', kind: 'rss', url: 'https://www.qbitai.com/feed', site: 'https://www.qbitai.com/', topic: 'AI research & industry', poll_minutes: 45 },
  { id: 'ifanr', name: '爱范儿', kind: 'rss', url: 'https://www.ifanr.com/feed', site: 'https://www.ifanr.com/', topic: 'AI, products & digital life', language: 'zh', tier: 'flow', poll_minutes: 30 },
  { id: '404', name: '404 Media', kind: 'rss', url: 'https://www.404media.co/rss/', site: 'https://www.404media.co/', topic: 'Life online', poll_minutes: 10 },
  { id: 'techdirt', name: 'Techdirt', kind: 'rss', url: 'https://www.techdirt.com/feed/', site: 'https://www.techdirt.com/', topic: 'Life online', poll_minutes: 10 },
  { id: 'openai-news', name: 'OpenAI News', kind: 'rss', url: 'https://openai.com/news/rss.xml', site: 'https://openai.com/news/', topic: 'AI systems & releases', poll_minutes: 30 },
  { id: 'google-ai', name: 'Google AI', kind: 'rss', url: 'https://blog.google/technology/ai/rss/', site: 'https://blog.google/technology/ai/', topic: 'AI systems & research', poll_minutes: 30 },
  { id: 'ieee-ai', name: 'IEEE Spectrum — AI', kind: 'rss', url: 'https://spectrum.ieee.org/feeds/topic/artificial-intelligence.rss', site: 'https://spectrum.ieee.org/artificial-intelligence/', topic: 'AI research & society', poll_minutes: 45 },
  { id: 'noema', name: 'Noema', kind: 'rss', url: 'https://www.noemamag.com/feed/', site: 'https://www.noemamag.com/', topic: 'Technology & society', essays: true, poll_minutes: 90 },
  { id: 'techcrunch-ai', name: 'TechCrunch — AI', kind: 'rss', url: 'https://techcrunch.com/category/artificial-intelligence/feed/', site: 'https://techcrunch.com/category/artificial-intelligence/', topic: 'AI industry & impact', tier: 'flow', poll_minutes: 20 },
  { id: 'verge-ai', name: 'The Verge — AI', kind: 'rss', url: 'https://www.theverge.com/rss/ai-artificial-intelligence/index.xml', site: 'https://www.theverge.com/ai-artificial-intelligence/', topic: 'AI & public life', tier: 'flow', poll_minutes: 20 },
  { id: 'the-decoder', name: 'The Decoder', kind: 'rss', url: 'https://the-decoder.com/feed/', site: 'https://the-decoder.com/', topic: 'AI development & impact', tier: 'flow', poll_minutes: 30 },
  { id: 'ai-snake-oil', name: 'AI Snake Oil', kind: 'rss', url: 'https://www.aisnakeoil.com/feed', site: 'https://www.aisnakeoil.com/', topic: 'AI evidence & impact', poll_minutes: 90 },
];

export const essaySources = sources.filter(source => source.essays).map(source => source.name);
export const essaySourceParams = essaySources.map(() => '?').join(', ');
export const ESSAY_DAYS = 30;

// Retired sources are kept only to suppress their still-retained D1 records.
// This lets a source review take effect immediately without erasing edition
// attribution or requiring a destructive database migration.
export const retiredSourceIds = new Set([
  'gcores', 'chuapp',
  'appleton-social', 'dash-social', 'markup-social', 'eff-social',
  'doctorow-social', 'nieman-social', '404-social', 'ed-social'
]);
