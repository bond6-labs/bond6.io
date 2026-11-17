export const sources = [
  { id: 'bandcamp', name: 'Bandcamp Daily', kind: 'rss', url: 'https://daily.bandcamp.com/feed/', site: 'https://daily.bandcamp.com/', topic: 'Music', essays: true },
  { id: 'sspai', name: '少数派', kind: 'rss', url: 'https://sspai.com/feed', site: 'https://sspai.com/', topic: 'Life online', essays: true },
  { id: 'gcores', name: '机核', kind: 'rss', url: 'https://www.gcores.com/rss', site: 'https://www.gcores.com/', topic: 'Creative Practice', essays: true },
  { id: 'chuapp', name: '触乐', kind: 'rss', url: 'https://www.chuapp.com/feed', site: 'https://www.chuapp.com/', topic: 'Creative Practice', essays: true },
  { id: 'appleton-social', name: 'Maggie Appleton', kind: 'bluesky', handle: 'maggieappleton.com', site: 'https://bsky.app/profile/maggieappleton.com', topic: 'Creative Practice', essays: true },
  { id: 'dash-social', name: 'Anil Dash', kind: 'bluesky', handle: 'anildash.com', site: 'https://bsky.app/profile/anildash.com', topic: 'Life online', essays: true },
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
  { id: 'zitron-newsletter', name: 'Ed Zitron', kind: 'rss', url: 'https://www.wheresyoured.at/rss/', site: 'https://www.wheresyoured.at/', topic: 'First-person accounts', allPosts: true },
  { id: 'rest-of-world', name: 'Rest of World', kind: 'rss', url: 'https://restofworld.org/feed/latest/', site: 'https://restofworld.org/', topic: 'Life online' },
  { id: 'creative-commons', name: 'Creative Commons', kind: 'rss', url: 'https://creativecommons.org/feed/', site: 'https://creativecommons.org/', topic: 'Writing & publishing' },
  { id: 'platformer', name: 'Platformer', kind: 'rss', url: 'https://www.platformer.news/rss/', site: 'https://www.platformer.news/', topic: 'Life online', poll_minutes: 10 },
  { id: 'mit-tech-review', name: 'MIT Technology Review', kind: 'rss', url: 'https://www.technologyreview.com/feed/', site: 'https://www.technologyreview.com/', topic: 'Life online' },
  { id: 'ai-now', name: 'AI Now Institute', kind: 'rss', url: 'https://ainowinstitute.org/feed/', site: 'https://ainowinstitute.org/', topic: 'AI & society', poll_minutes: 90 },
  { id: 'markup-social', name: 'The Markup', kind: 'bluesky', handle: 'themarkup.org', site: 'https://bsky.app/profile/themarkup.org', topic: 'Life online' },
  { id: '404', name: '404 Media', kind: 'rss', url: 'https://www.404media.co/rss/', site: 'https://www.404media.co/', topic: 'Life online', poll_minutes: 10 },
  { id: 'techdirt', name: 'Techdirt', kind: 'rss', url: 'https://www.techdirt.com/feed/', site: 'https://www.techdirt.com/', topic: 'Life online', poll_minutes: 10 },
  { id: 'eff-social', name: 'Electronic Frontier Foundation', kind: 'bluesky', handle: 'eff.org', site: 'https://bsky.app/profile/eff.org', topic: 'Life online' },
  { id: 'doctorow-social', name: 'Cory Doctorow', kind: 'bluesky', handle: 'doctorow.pluralistic.net', site: 'https://bsky.app/profile/doctorow.pluralistic.net', topic: 'Writing & publishing' },
  { id: 'nieman-social', name: 'Nieman Lab', kind: 'bluesky', handle: 'niemanlab.org', site: 'https://bsky.app/profile/niemanlab.org', topic: 'Writing & publishing' },
  { id: '404-social', name: '404 Media', kind: 'bluesky', handle: '404media.co', site: 'https://bsky.app/profile/404media.co', topic: 'Life online', poll_minutes: 10 },
  { id: 'ed-social', name: 'Ed Zitron', kind: 'bluesky', handle: 'edzitron.com', site: 'https://bsky.app/profile/edzitron.com', topic: 'First-person accounts' }
];

export const essaySources = sources.filter(source => source.essays).map(source => source.name);
export const essaySourceParams = essaySources.map(() => '?').join(', ');
export const ESSAY_DAYS = 30;
