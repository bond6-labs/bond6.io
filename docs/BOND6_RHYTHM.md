# Bond6 Rhythm

**Status:** implemented baseline (Rhythm v3)

**Implementation:** `src/content.js`, `src/rhythm.js`, `src/publishing.js`

**Last reviewed:** 2026-11-18

## Purpose

Bond6 Rhythm is the recorded, deterministic selection method behind Bond6. It is not a popularity score, a claim that a work is AI-free, or an attempt to rank the whole web. It answers two narrower questions:

1. Does this item belong in **Human Pulse** or **AI Wave**?
2. If so, is there enough specific evidence for it to be considered for a Daily pick?

The public Flow may include a broader set of relevant reporting. Daily picks and generated Bonding notes require the stronger, recorded Rhythm evidence.

## Editorial boundaries

### Human Pulse

Human Pulse looks for culture and lived human energy: creative practice, first-person thought, care, mutual support, community, embodied life, nature, sport, farming, and the making of art, music, writing, craft, or ideas.

Core Human Pulse evidence requires at least one of:

- creative work **and** a making/process signal;
- a genuine first-person voice or reflection;
- care, mutual support, friendship, family, grief, empathy, or community;
- embodied life combined with voice, culture, or reported specificity.

### AI Wave

AI Wave follows AI and digital systems where they have an intelligible human or cultural consequence. It covers model capability, infrastructure, releases, public arguments by consequential actors, and effects on work, authorship, education, privacy, rights, creative life, and power.

Core AI Wave evidence requires:

```text
AI or platform system signal
AND
(human/cultural impact OR meaningful development OR consequential perspective)
```

An ordinary political story, consumer offer, game promotion, or general technology item does not become AI Wave merely because it is published by a technology outlet.

## Exclusions

Bond6 deliberately excludes content centred on:

- elections, party politics, war, military activity, weapons, and campaigns;
- promotions, ticket sales, giveaways, discounts, routine roundups, award lists, excerpts, sponsored material, and generic podcast listings;
- funding rounds, valuations, acquisitions, IPOs, property marketing, showrooms, and brand partnerships;
- generic nutrition, training-plan, gear-guide, or product-review coverage.

These are editorial scope boundaries, not judgements about a story's broader importance.

## Inputs and provenance

The system accepts public RSS, Atom, and approved public-social inputs. It preserves:

- original title, source, author, language, publication date when known, discovery date, canonical URL, excerpt, and content type;
- source-provided image, audio, or video references when safely available;
- a content hash, so unchanged stories are not treated as new;
- original-language separation: English pages show English originals; Simplified Chinese pages show Chinese originals. Bond6 does not translate live article titles or content.

Source material is untrusted data. The deterministic classifier does not execute instructions contained in an article or social post.

## Signals and evidence

Each accepted item is scored from the title and source excerpt. The current signals include:

| Lane | Signal family | Typical evidence |
| --- | --- | --- |
| Human Pulse | Personal reflection | first-person thought, memory, feeling, learning, hope, grief |
| Human Pulse | Creative practice | recording, rehearsal, drafting, editing, painting, studio, workshop |
| Human Pulse | Care & support | mutual aid, caregiving, solidarity, neighbourhood, friendship, family |
| Human Pulse | Embodied life | climbing, dance, endurance, recovery, farming, gardening, outdoor life |
| AI Wave | AI capability or system | models, agents, training, data centres, algorithms, biometric systems |
| AI Wave | Human impact | work, labour, rights, privacy, education, authorship, culture |
| AI Wave | Development | release, launch, deployment, benchmark, capability, infrastructure |
| AI Wave | Consequential perspective | a relevant researcher, builder, critic, executive, or investigator making a substantive claim |
| Both | Reported specificity | research, data, documents, interviews, investigations, letters, diaries |

For every matched signal, Rhythm stores a short nearby source passage. This means a later reviewer can see the evidence rather than trusting an unexplained label.

## Scoring and confidence

The current implementation uses transparent additive scores, capped at 100 per lane. Strong human and AI signals carry most of the score; usable excerpt length and a byline add a small quality bonus.

```text
confidence = min(0.98,
  0.62
  + lane_score / 240
  + up to 0.10 for multiple distinct signals
  + 0.08 if discovered in the last 24 hours
  + 0.04 if discovered in the last 3 days)
```

An item receives a core-lane recommendation only after it passes the lane gate. An otherwise relevant Flow item with insufficient core evidence remains eligible for the live feed but is not promoted as a Daily-pick candidate.

## Daily picks

The Daily-pick candidate window begins at 72 hours and may widen to seven days when necessary. The selection aims for at most three stories per lane, with:

- confidence of at least `0.72`;
- usable source text;
- a spread of subjects;
- no repeated publisher or author within a daily edition;
- no repeated selection in the preceding seven days;
- preference for original Chinese items when qualifying Chinese candidates are present.

The current release keeps generated publishing off while real-world Rhythm audits are reviewed. The shadow mode creates an auditable no-AI candidate-pool report without publishing a Daily edition.

## Human review and change control

Rhythm is designed to be calibrated, not treated as permanent truth. Before changing a signal, exclusion, threshold, or score:

1. Review a bilingual sample of accepted and rejected items.
2. State the failure mode being corrected.
3. Update this document and the implementation together.
4. Record the Rhythm version.
5. Compare source diversity, lane accuracy, and daily-pick shortfalls before and after rollout.

No score alone proves factual accuracy. Original links, authorship, dates, and correction routes remain part of every published reading object.
