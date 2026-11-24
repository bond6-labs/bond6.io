# Source review — 23 November 2026

A live feed response is evidence of technical availability, not proof of editorial quality, rights, or factual accuracy. Sample eligibility is measured with the current parser, not a human quality score. No existing source was removed.

## Activated (12-hour schedule)

| Source | Sample eligible/parsed | Reason |
|---|---:|---|
| The Offing | 8/10 | Poetry, fiction and personal literary work; direct feed. |
| My Modern Met | 8/10 | Artist and creative-work coverage with usable previews; commerce gates remain. |
| Understanding AI | 12/20 | Attributed explanation and AI consequences; subscriber marking remains necessary. |
| 不止读书 | 21/40 | Chinese books and lived reading; programme-specific podcast feed. The shared Ximalaya host does not make this a duplicate of 文化有限. |

## Automatic daily trials

Design Milk (9/12; filter commerce), Ploughshares (6/9; literary craft), Ars Technica AI (8/20; exclude politics), 智东西 (13/20; business noise), 雷峰网 (10/20; general technology noise), 晚点 (1/5; small sample and third-party RSSHub dependency).

## Research candidates — preserved, not polled yet

These remain research candidates rather than automatically consuming collection slots. Promote only after review and a fresh budget calculation.

| Source | Finding / next check |
|---|---|
| The Walrus | Feed works; 0/10 current items pass. Find literary section or assess excerpts before trial. |
| Magnum Photos | Feed works; 0/10 pass. Strong photographic fit but sparse text; inspect captions, do not loosen global rules. |
| Pitchfork | News feed works, 3/29 pass. Verify album-review feed first; tour announcements dominate news. |
| n+1 | 11/40 pass; political material and paid access need review. |
| The Line of Best Fit | 2/10 pass; prefer interviews/reviews over announcements. |
| Consequence | 7/15 pass; promising music coverage; commercial and celebrity volume needs trial capacity. |
| PopMatters | 6/40 pass; keep for criticism coverage. |
| The FADER | 3/20 pass; artist features promising, broad news noisy. |
| The Common | 2/10 pass; low-volume literary value should not be judged by daily volume. |
| Booooooom | 0/7 pass; investigate short image captions rather than discard visual art. |
| Words Without Borders | 1/10 pass; English published translations need an explicit original-language policy decision before activation. |
| McSweeney’s | 9/20 pass; satire must be clearly distinguished from factual reporting. |
| The American Scholar | 7/15 pass; strong future literary candidate. |
| The Point | 1/10 pass; examine reflective essay eligibility. |
| New England Review | 7/10 pass; strong future literary candidate. |
| The Hudson Review | 4/10 pass; quarterly cadence is expected, not a failure. |
| The Rundown AI | 4/40 pass; newsletters/roundups need item-level evidence. |
| The Neuron | 3/10 pass; promotional/live-stream items reduce fit. |
| Ben’s Bites | 16/20 pass; verify paid access and roundup handling before promotion. |
| Ahead of AI | Large full feed exceeded this audit's 1.5 MB limit. Retest with production bounded streaming; not evidence the production parser fails. |
| Gary Marcus | 4/20 pass; opinion attribution and political filtering required. |
| NVIDIA | 10/18 pass; first-party claims, gaming and product marketing need separation. |
| AWS ML | 15/20 pass; engineering fit, but vendor tutorials can overwhelm reader-oriented coverage. |
| METR | Oversized full feed in audit; high-value evaluation research merits bounded streaming verification. |
| Alignment Forum | 10/10 pass; technical community posts require stronger quality review than keyword eligibility. |
| AIGC.NEWS | 13/40 pass; verify authorship, original reporting and upstream duplication. |
| 端传媒 | Feed works; traditional-script current sample and general politics conflict with simplified-only edition. Retain pending suitable cultural simplified feed. |
| 报导者 | 3/10 pass; traditional-script sample, broad investigation remit. Retain pending language policy fit. |
| 大内密谈 | Feed timed out; retry before judging reliability, broad episode scope. |
| 东亚观察局 | Oversized full feed in audit; general politics weakens fit. |
| 日谈公园 | Oversized full feed in audit; cultural programme worth bounded-stream verification. |
| 不合时宜 | 11/15 pass; promising human accounts, but third-party mirror and broad policy material require observation. |
| 车东西 | 7/20 pass; vehicle-business coverage secondary to human/AI mission. |
| AI 峰哥 | 17/20 pass; traditional-script publication, hold under current simplified-only policy. |
| 36氪快讯 | 2/20 pass, mostly finance; hold this distinct route, do not replace existing 36氪 candidate with low-yield flash feed. |
| 蓝点网 | Already a candidate; keep existing record, no duplicate. |

## Quarantined supplied endpoint

The Believer supplied feed currently serves entertainment/franchise news (first sampled headline about Marvel/DC management), inconsistent with the named literary publication. Do not activate this endpoint until publisher identity and current official domain are verified. This is not a judgement against the literary magazine.

## Budget and limitations

Four slow additions cost 8 planned checks/day; six daily trials cost 6. Catalogue baseline rises from 486 to **500 planned checks/day**, leaving 72 of the 572 normal collection slots. This is scheduling headroom, not a guarantee about total Cloudflare CPU/D1 usage. No cadence increase or AI calls added.

Review runner: `scripts/audit-source-batch.mjs`. Its same-host hint is not authoritative for hosted podcasts or RSSHub; compare exact programme URLs manually. The supplied candidate list is retained alongside this report.
