# Candidate source review — batch 1

**Reviewed:** 2026-11-19<br>
**Decision:** 13 sources join the live catalogue; 40 enter the Source Vitality
trial pool; 16 remain a documented research queue until a usable public feed is
verified; 6 are excluded for inactivity.

The live list retains its operating ceilings: **50 English** and **25 Chinese**
sources. This batch brings the active catalogue to 50 English and 16 Chinese
sources. A candidate is not a rejection: it is fetched once every 24 hours,
observed for readability, original language, lane fit, usable excerpts and
duplication, and is not shown publicly until an editor promotes it.

## Added directly to the live catalogue

| Source | Language / lane | Why it is live now |
| --- | --- | --- |
| Granta | EN · Human Pulse | Literary fiction, memoir and reportage add a high-quality long-form voice not supplied by the current feeds. |
| The Rumpus | EN · Human Pulse | Independent essays, poetry and artist interviews; its daily cadence can be contained by existing source caps. |
| Stereogum | EN · Human Pulse | Strong artist-led music reporting fills a regular Music gap. |
| The Pudding | EN · Human Pulse | Distinctive visual essays connect cultural questions with design craft rather than duplicating conventional arts coverage. |
| Import AI | EN · AI Wave | A high-signal field briefing by an identified AI researcher; useful for research, policy and major movement. |
| 故事FM | ZH · Human Pulse | First-person accounts of ordinary work and life are an unusually direct match for Human Pulse. |
| 文化有限 | ZH · Human Pulse | A Chinese-language book and film programme with a stable first-party audio feed. |
| 虎嗅 | ZH · AI Wave | Broad but timely AI-industry coverage; the item-level AI gate and per-source caps control its wider business output. |
| 钛媒体 | ZH · AI Wave | Adds AI hardware and industrial reporting, while the same narrow AI gate filters general finance coverage. |
| 奇客 Solidot | ZH · AI Wave | Fast Chinese technology briefs improve freshness for open source, infrastructure and research developments. |
| IT之家 | ZH · AI Wave | Useful rapid signal for model and consumer-product releases; non-AI technology cannot pass the lane gate. |
| AIGC Weekly | ZH · AI Wave | Dedicated Chinese generative-AI briefing with a focused, readable feed. |
| 站长之家 | ZH · AI Wave | Covers Chinese model and product movement at a useful cadence; general internet items remain filtered out. |

## Added as candidates, not public sources

| Group | Sources | Why they need evidence first |
| --- | --- | --- |
| EN Human Pulse | Atlas Obscura; Guernica; Nautilus; 3 Quarks Daily; The Baffler; PRINT Magazine; Orion Magazine; Emergence Magazine | The editorial fit is promising, but the group includes location database entries, science/news mixing, political criticism, and link aggregation. The trial measures their true Human Pulse yield and duplicate rate. |
| EN AI Wave | Last Week in AI; TLDR AI; BAIR Blog; Microsoft Research Blog; One Useful Thing; Exponential View; Epoch AI; Interconnects; Simon Willison’s Weblog; Latent Space; Sakana AI Blog; VentureBeat AI | These are credible sources, but several are low cadence, link-led, mixed-topic, paid-summary, Japanese/English mixed, or were rate-limited during review. Their quality should earn a scarce English live slot rather than displacing a proven source on reputation alone. |
| ZH Human Pulse | 非马非牛; 换日线 Crossing; 张落远; 時報文化; 聲紡讀書部; ShineKid; 东腔西调; 游荡集; 忽左忽右; 声东击西; 别任性; 昭鸢笺; To the Lighthouse; Tripper Press | The group contains a stalled feed, very narrow serial writing, password-protected posts, low-frequency blogs, Traditional-Chinese feeds, and third-party RSS mirrors. All are worthwhile to observe; none should enter a Simplified-Chinese public edition until its script, freshness and excerpt quality are demonstrated. |
| ZH AI Wave | InfoQ 推荐; 机器之心; 新智元; 极客公园; 36氪; 蓝点网 | The first four use third-party mirrors; 36Kr was inaccessible to the review client and 蓝点网 returned 403. Candidate collection will provide bounded reliability evidence without exposing a fragile source to readers. |

## Research queue — not rejected, but not pollable yet

The following publications are editorially relevant but do not have a confirmed,
working public feed in this review. They are kept here rather than inserted into
the automated candidate table, because repeatedly polling unknown or known-404
URLs wastes the free-tier collection budget and produces no usable evidence.

| Area | Sources | Next action |
| --- | --- | --- |
| EN Human Pulse | Pitchfork, The Walrus, Magnum Photos | Confirm a first-party RSS/Atom endpoint or a publisher-permitted feed before creating a candidate. |
| EN AI Wave | The Batch, MIT News — AI, Stanford SAIL, Ars Technica — AI | Recheck their current feed routes; the supplied Batch and MIT routes returned 404 and SAIL appeared stale. |
| ZH Human Pulse | 结绳志, 端传媒, 报导者, 关键评论网, 东亚观察局, 日谈公园, 单读, Matters, 故事 StoryStudio | Seek an official feed or a stable publisher-permitted route. No scraping or access-control bypass will be used. |

## Excluded from automated collection

| Source | Reason |
| --- | --- |
| The Millions | The publication is on hiatus, so its feed cannot support a fresh daily Flow. |
| Wait But Why | Latest supplied item was November 2025, well outside an active publication cadence. |
| 打脑壳 | Feed last updated 2025-01-12; keep as a reading reference, not an automated source. |
| 好奇心通訊 | Feed last updated 2025-06-15; no current publishing signal. |
| Far & Near | Feed last updated 2024-03-21; technically usable but editorially inactive. |
| Blog of Music | Feed last updated 2022-01-26; it cannot contribute to a living news and culture flow. |

These exclusions are reversible: the six feeds are catalogued as `retired` with
their URLs and reasons, rather than removed. A source can return to the
research queue or candidate pool when it resumes and exposes a current public
feed.

## Poetry and reading addendum — 2026-11-20

This review used direct feed parsing as well as publication pages. The additions
keep the live catalogue within its language ceilings: **49 English** and **22
Simplified-Chinese** active sources at the time of review.

| Source | State | Evidence and editorial role |
| --- | --- | --- |
| Poetry Daily | EN · active | Its visible general feed was empty, but the publisher's `daily_poem` RSS endpoint is readable and supplies attributed daily poems. |
| The Adroit Journal | EN · active | A readable first-party feed; poetry, craft and literary-art items can pass the existing Human Pulse gate while unrelated posts remain out. |
| Poetry Northwest | EN · active | A readable, lower-volume feed centred on poems, poets, interviews and craft. |
| 轻书散文小站 | ZH · active | Corrected the prior broken `/feed.xml` address to its public `/feed` endpoint. It remains subject to the normal yield review because its output is broad. |
| 《读者》官方播客 | ZH · active | A fresh first-party Ximalaya RSS feed; audio enclosures can be shown on Bond6. The Human Pulse gate and per-source cap protect the Flow from generic advice. |
| 《这里有诗》 | ZH · active | A first-party Ximalaya RSS feed for modern-poetry readings and discussion, with usable audio enclosures. Its freshness will be monitored; it is not removed merely for a quiet period. |
| 中国诗歌网·每日好诗 | ZH · reference candidate | The site offers a valuable daily editor-selected poem but no verified public RSS/Atom feed. It is retained in the catalogue without polling or scraping, pending a publisher-permitted machine-readable route. |
