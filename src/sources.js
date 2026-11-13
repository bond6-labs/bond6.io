export const sources = [
  { id: 'aquarium-drunkard', name: 'Aquarium Drunkard', kind: 'rss', url: 'https://aquariumdrunkard.com/feed/', site: 'https://aquariumdrunkard.com/', topic: 'Music', essays: true },
  { id: 'literary-hub', name: 'Literary Hub', kind: 'rss', url: 'https://lithub.com/feed/', site: 'https://lithub.com/', topic: 'Literature', essays: true },
  { id: 'colossal', name: 'Colossal', kind: 'rss', url: 'https://www.thisiscolossal.com/feed/', site: 'https://www.thisiscolossal.com/', topic: 'Visual arts', essays: true },
  { id: 'kleon', name: 'Austin Kleon', kind: 'rss', url: 'https://austinkleon.com/feed/', site: 'https://austinkleon.com/', topic: 'Writing & publishing', essays: true },
  { id: 'appleton', name: 'Maggie Appleton', kind: 'rss', url: 'https://maggieappleton.com/rss.xml', site: 'https://maggieappleton.com/', topic: 'Writing & publishing', essays: true },
  { id: 'dash', name: 'Anil Dash', kind: 'rss', url: 'https://www.anildash.com/feed.xml', site: 'https://www.anildash.com/', topic: 'First-person accounts', essays: true },
  { id: 'zitron-newsletter', name: 'Ed Zitron', kind: 'rss', url: 'https://www.wheresyoured.at/rss/', site: 'https://www.wheresyoured.at/', topic: 'First-person accounts', allPosts: true },
  { id: 'rest-of-world', name: 'Rest of World', kind: 'rss', url: 'https://restofworld.org/feed/latest/', site: 'https://restofworld.org/', topic: 'Life online' },
  { id: 'creative-commons', name: 'Creative Commons', kind: 'rss', url: 'https://creativecommons.org/feed/', site: 'https://creativecommons.org/', topic: 'Writing & publishing' },
  { id: 'platformer', name: 'Platformer', kind: 'rss', url: 'https://www.platformer.news/rss/', site: 'https://www.platformer.news/', topic: 'Life online' },
  { id: 'markup-social', name: 'The Markup', kind: 'bluesky', handle: 'themarkup.org', site: 'https://bsky.app/profile/themarkup.org', topic: 'Life online' },
  { id: '404', name: '404 Media', kind: 'rss', url: 'https://www.404media.co/rss/', site: 'https://www.404media.co/', topic: 'Life online' },
  { id: 'techdirt', name: 'Techdirt', kind: 'rss', url: 'https://www.techdirt.com/feed/', site: 'https://www.techdirt.com/', topic: 'Life online' },
  { id: 'eff-social', name: 'Electronic Frontier Foundation', kind: 'bluesky', handle: 'eff.org', site: 'https://bsky.app/profile/eff.org', topic: 'Life online' },
  { id: 'doctorow-social', name: 'Cory Doctorow', kind: 'bluesky', handle: 'doctorow.pluralistic.net', site: 'https://bsky.app/profile/doctorow.pluralistic.net', topic: 'Writing & publishing' },
  { id: 'nieman-social', name: 'Nieman Lab', kind: 'bluesky', handle: 'niemanlab.org', site: 'https://bsky.app/profile/niemanlab.org', topic: 'Writing & publishing' },
  { id: '404-social', name: '404 Media', kind: 'bluesky', handle: '404media.co', site: 'https://bsky.app/profile/404media.co', topic: 'Life online' },
  { id: 'ed-social', name: 'Ed Zitron', kind: 'bluesky', handle: 'edzitron.com', site: 'https://bsky.app/profile/edzitron.com', topic: 'First-person accounts' }
];

export const essaySources = sources.filter(source => source.essays).map(source => source.name);
export const essaySourceParams = essaySources.map(() => '?').join(', ');
export const ESSAY_DAYS = 30;
