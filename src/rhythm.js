/** Bond6 Rhythm v2: deterministic, inspectable selection signals. */
export const RHYTHM_VERSION = 2;

const signals = {
  firsthand: { lane: 'human', score: 3, label: 'First-person process', pattern: /\b(i|my|we|our|me)\b|我|我们|我的|亲身|经历/i },
  making: { lane: 'human', score: 2, label: 'Creative practice', pattern: /\b(make|making|record(?:ing)?|rehears|draft(?:ing)?|edit(?:ing)?|paint(?:ing)?|draw(?:ing)?|craft|compose|perform|write|writing|studio|workshop)\b|创作|制作|录制|排练|写作|绘画|手工|工作室/i },
  community: { lane: 'human', score: 2, label: 'Community & care', pattern: /\b(community|collective|co-?op|neighbou?rhood|friend|family|care|love|together|local|farm|garden)\b|社区|社群|合作社|朋友|家人|关怀|爱|一起|本地|农场|花园/i },
  embodied: { lane: 'human', score: 1, label: 'Place & lived time', pattern: /\b(body|health|weather|season|home|land|rural|walk|sleep|birth|death|memory)\b|身体|健康|天气|季节|家|土地|乡村|散步|睡眠|记忆/i },
  aiSystem: { lane: 'ai', score: 3, label: 'AI system', pattern: /\b(ai|artificial intelligence|llms?|large language model|chatgpt|openai|anthropic|generative ai|machine learning|deepfake|model training|data cent(?:er|re))\b|人工智能|大模型|生成式|机器学习|深度伪造|训练模型|数据中心/i },
  automatedSystem: { lane: 'ai', score: 2, label: 'Automated system', pattern: /\b(algorithmic (?:feed|ranking|recommendation)|recommender system|automated decision(?:-making)?|facial recognition|biometric (?:system|surveillance))\b|算法推荐|自动化决策|人脸识别|生物识别/i },
  consequence: { lane: 'ai', score: 3, label: 'Human consequence', pattern: /\b(work|worker|job|labou?r|wage|union|artist|writer|teacher|student|rights|privacy|copyright|culture|community|environment|energy)\b|工作|劳动|就业|薪酬|工会|艺术家|作者|教师|学生|权利|隐私|版权|文化|社区|环境|能源/i },
  evidence: { lane: 'ai', score: 1, label: 'Reported specificity', pattern: /\b(report|research|data|policy|law|court|study|investigation|documents?)\b|报告|研究|数据|政策|法律|法院|调查|文件/i }
};

const sentenceFor = (text, index) => {
  const start=Math.max(0,text.lastIndexOf('.',index-1)+1), end=text.slice(index).search(/[.!?。！？]/);
  return text.slice(start,end<0?Math.min(text.length,index+220):index+end+1).replace(/\s+/g,' ').trim().slice(0,280);
};

/** Return transparent signals and evidence; this function never calls an AI model. */
export function scoreRhythm(story) {
  const text=`${story.title??''}. ${story.excerpt??''}`.replace(/\s+/g,' ').trim();
  const matched=[];
  for (const [key, signal] of Object.entries(signals)) {
    const match=signal.pattern.exec(text);
    if (match) matched.push({key,...signal,evidence:sentenceFor(text,match.index)});
  }
  const human=matched.filter(match=>match.lane==='human'), ai=matched.filter(match=>match.lane==='ai');
  const humanScore=Math.min(12,human.reduce((total,match)=>total+match.score,0));
  const hasSystem=matched.some(match=>match.key==='aiSystem'||match.key==='automatedSystem');
  const hasConsequence=matched.some(match=>match.key==='consequence');
  const aiScore=Math.min(12,ai.reduce((total,match)=>total+match.score,0));
  const laneRecommendation=hasSystem&&hasConsequence&&aiScore>=5?'ai':humanScore>=2?'human':null;
  const primary=laneRecommendation==='ai'?aiScore:humanScore;
  const confidence=laneRecommendation?Math.min(.98,Number((.45+primary/20+(hasSystem&&hasConsequence ? .12 : 0)).toFixed(2))):0;
  return {
    rhythm_version:RHYTHM_VERSION, human_score:humanScore, ai_score:aiScore, lane_recommendation:laneRecommendation,
    confidence, labels:matched.map(({label})=>label), evidence:matched.map(({label,evidence})=>({label,evidence})),
    exclusion_reason:!laneRecommendation?'Insufficient supported Rhythm signals':null
  };
}

export async function saveRhythmSignals(db, stories, now) {
  const statements=[];
  const records=stories.map(story=>({story,rhythm:scoreRhythm(story)}));
  // Ten rows × ten parameters stays within D1's 100-value limit.
  for (let start=0;start<records.length;start+=10) {
    const chunk=records.slice(start,start+10);
    statements.push(db.prepare(`INSERT INTO story_signals(story_url,rhythm_version,human_score,ai_score,lane_recommendation,confidence,labels,evidence,exclusion_reason,scored_at)
      VALUES ${chunk.map(()=>'(?,?,?,?,?,?,?,?,?,?)').join(',')} ON CONFLICT(story_url) DO UPDATE SET rhythm_version=excluded.rhythm_version,human_score=excluded.human_score,
      ai_score=excluded.ai_score,lane_recommendation=excluded.lane_recommendation,confidence=excluded.confidence,labels=excluded.labels,
      evidence=excluded.evidence,exclusion_reason=excluded.exclusion_reason,scored_at=excluded.scored_at`)
      .bind(...chunk.flatMap(({story,rhythm})=>[story.url,rhythm.rhythm_version,rhythm.human_score,rhythm.ai_score,rhythm.lane_recommendation,rhythm.confidence,JSON.stringify(rhythm.labels),JSON.stringify(rhythm.evidence),rhythm.exclusion_reason,now])));
  }
  if (statements.length) await db.batch(statements);
}

/** Gradually score retained items after a Rhythm version change without exceeding D1 limits. */
export async function scoreRhythmBacklog(db, now) {
  const {results}=await db.prepare(`SELECT s.* FROM stories s LEFT JOIN story_signals r ON r.story_url=s.url
    WHERE s.lane IS NOT NULL AND (r.story_url IS NULL OR r.rhythm_version<?) ORDER BY s.discovered_at DESC LIMIT 16`).bind(RHYTHM_VERSION).all();
  await saveRhythmSignals(db,results,now); return results.length;
}
