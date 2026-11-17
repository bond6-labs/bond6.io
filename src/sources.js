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
  { id: '404', name: '404 Media', kind: 'rss', url: 'https://www.404media.co/rss/', site: 'https://www.404media.co/', topic: 'Life online', poll_minutes: 10 },
  { id: 'techdirt', name: 'Techdirt', kind: 'rss', url: 'https://www.techdirt.com/feed/', site: 'https://www.techdirt.com/', topic: 'Life online', poll_minutes: 10 },
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
