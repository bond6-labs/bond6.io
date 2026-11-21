/** Bond6 Rhythm v3: deterministic, inspectable selection for two narrow lanes. */
import { selectionGate } from './content.js';

export const RHYTHM_VERSION = 3;

const signals = [
  {key:'firsthand',lane:'human',score:28,label:'Personal reflection',pattern:/\b(?:i|my|me|we|our)\b.{0,90}\b(?:think|feel|believe|wonder|remember|learn(?:ed|t)?|realize(?:d)?|grieve|love|hope|fear|dream|imagine|experience)\b|我(?:想|觉得|相信|记得|学到|意识到|害怕|希望|热爱|经历)|我们(?:想|觉得|相信|记得|学到|经历)/i},
  {key:'making',lane:'human',score:30,label:'Creative practice',pattern:/\b(?:record(?:ing)?|rehears(?:e|es|al|ing)?|draft(?:ing)?|edit(?:ing)?|paint(?:ing)?|draw(?:ing)?|compose|perform(?:ing)?|practic(?:e|ing)|build(?:ing)?|studio|workshop)\b|创作|制作|录制|排练|草稿|编辑|绘画|作曲|演出|练习|工作室|工坊/i},
  {key:'care',lane:'human',score:25,label:'Care & mutual support',pattern:/\b(?:mutual aid|care(?:giving)?|support(?:ing)?|solidarity|neighbou?r(?:hood)?|community(?:-led)?|co-?op|volunteer(?:ing)?|friendship|family|grief|empathy|sympathy)\b|互助|关怀|照料|支持|团结|邻里|社区|合作社|志愿|友谊|家人|共情|同情/i},
  {key:'embodied',lane:'human',score:22,label:'Embodied life',pattern:/\b(?:climb(?:ing)?|mountain(?:eer(?:ing)?)?|trail|marathon|ultra(?:run)?|surf(?:ing)?|skate(?:boarding)?|dance|body|endurance|injury|recovery|farm(?:ing)?|garden(?:ing)?|outdoor)\b|登山|攀岩|越野|马拉松|冲浪|滑板|舞蹈|身体|耐力|受伤|康复|农场|园艺|户外/i},
  {key:'aiSystem',lane:'ai',score:35,label:'AI capability or system',pattern:/\b(?:ai|artificial intelligence|llms?|large language model|chatgpt|openai|anthropic|generative ai|machine learning|deepfake|model training|data cent(?:er|re)|ai agent|algorithmic (?:feed|ranking|recommendation)|recommender system|automated decision(?:-making)?|facial recognition|biometric (?:system|surveillance))\b|人工智能|大模型|生成式|机器学习|深度伪造|训练模型|数据中心|智能体|算法推荐|自动化决策|人脸识别|生物识别/i},
  {key:'aiImpact',lane:'ai',score:30,label:'Impact on people',pattern:/\b(?:replace(?:s|d|ment|ing)?|automate(?:s|d|ion|ing)?|job(?:s)?|work(?:er|place|load)?|labou?r|wage|union|artist|writer|teacher|student|privacy|surveillance|copyright|authorship|rights|trust|education|creative work)\b|替代|自动化|工作|劳动|工资|工会|艺术家|作者|教师|学生|隐私|监控|版权|署名|权利|信任|教育|创作/i},
  {key:'aiMovement',lane:'ai',score:25,label:'AI development',pattern:/\b(?:release(?:d|s)?|launch(?:ed|es)?|deploy(?:ed|ment|s)?|train(?:ed|ing)?|benchmark|capabilit(?:y|ies)|reasoning|agent(?:ic)?|infrastructure|compute|research(?:ers|ed)?|model(?:s)? (?:can|now|will))\b|发布|推出|部署|训练|基准测试|能力|推理|智能体|基础设施|算力|研究/i},
  {key:'aiScience',lane:'ai',score:25,label:'Scientific or formal advance',pattern:/\b(?:mathematics?|mathematician|theorem|conjecture|hypothesis|proof|formal (?:verification|proof)|lean|scientific discovery|scientific breakthrough|physics|biology|chemistry)\b|数学|数学家|定理|猜想|假设|证明|形式化验证|科学发现|科学突破|物理|生物|化学/i},
  {key:'aiElite',lane:'ai',score:15,label:'Consequential perspective',pattern:/\b(?:ceo|founder|executive|researcher|scientist|lab|engineer|investor|critic)\b.{0,70}\b(?:said|says|argued|warned|called|announced)\b|首席执行官|创始人|高管|研究员|科学家|实验室|工程师|投资人|评论者.{0,50}(?:表示|认为|警告|宣布)/i},
  {key:'specificity',lane:'both',score:8,label:'Reported specificity',pattern:/\b(?:report|research|data|study|investigation|documents?|interview|diary|letter)\b|报告|研究|数据|调查|文件|访谈|日记|书信/i}
];

const sentenceFor = (text, index) => {
  const start=Math.max(0,text.lastIndexOf('.',index-1)+1), end=text.slice(index).search(/[.!?。！？]/);
  return text.slice(start,end<0?Math.min(text.length,index+220):index+end+1).replace(/\s+/g,' ').trim().slice(0,280);
};

/** Return transparent scores and source excerpts. This function never calls an AI model. */
export function scoreRhythm(story, now = Date.now()) {
  const text=`${story.title??''}. ${story.excerpt??''}`.replace(/\s+/g,' ').trim();
  const gate=selectionGate(story.title,story.excerpt,story);
  if (gate.exclusion_reason) return {rhythm_version:RHYTHM_VERSION,human_score:0,ai_score:0,lane_recommendation:null,confidence:0,labels:[],evidence:[],exclusion_reason:gate.exclusion_reason};
  const matched=[];
  for (const signal of signals) {
    const match=signal.pattern.exec(text);
    if (match) matched.push({...signal,evidence:sentenceFor(text,match.index)});
  }
  const byLane=lane=>matched.filter(signal=>signal.lane===lane||signal.lane==='both');
  const human=byLane('human'), ai=byLane('ai');
  const quality=Math.min(10,Math.floor((story.excerpt?.length??0)/180)*3)+(story.author?3:0);
  const humanScore=gate.human_core?Math.min(100,human.reduce((total,signal)=>total+signal.score,0)+quality):0;
  const aiScore=gate.ai_core?Math.min(100,ai.reduce((total,signal)=>total+signal.score,0)+quality):0;
  const laneRecommendation=gate.ai_core?'ai':gate.human_core?'human':null;
  const selected=laneRecommendation==='ai'?ai:human, primary=laneRecommendation==='ai'?aiScore:humanScore;
  const age=Math.max(0,now-Number(story.discovered_at??now));
  const freshness=age<=86_400_000?.08:age<=3*86_400_000?.04:0;
  const confidence=laneRecommendation?Number(Math.min(.98,.62+primary/240+Math.min(2,selected.length)*.05+freshness).toFixed(2)):0;
  return {
    rhythm_version:RHYTHM_VERSION, human_score:humanScore, ai_score:aiScore, lane_recommendation:laneRecommendation,
    confidence, labels:selected.map(({label})=>label), evidence:selected.map(({label,evidence})=>({label,evidence})),
    exclusion_reason:!laneRecommendation?'Relevant for the live flow; below core-selection evidence threshold':null
  };
}

export async function saveRhythmSignals(db, stories, now) {
  const statements=[];
  const records=stories.map(story=>({story,rhythm:scoreRhythm(story,now)}));
  // Ten rows × ten parameters stays within D1's 100-value limit.
  for (let start=0;start<records.length;start+=10) {
    const chunk=records.slice(start,start+10);
    statements.push(db.prepare(`INSERT INTO story_signals(story_url,rhythm_version,human_score,ai_score,lane_recommendation,confidence,labels,evidence,exclusion_reason,scored_at)
      VALUES ${chunk.map(()=>'(?,?,?,?,?,?,?,?,?,?)').join(',')} ON CONFLICT(story_url) DO UPDATE SET rhythm_version=excluded.rhythm_version,human_score=excluded.human_score,
      ai_score=excluded.ai_score,lane_recommendation=excluded.lane_recommendation,confidence=excluded.confidence,labels=excluded.labels,
      evidence=excluded.evidence,exclusion_reason=excluded.exclusion_reason,scored_at=excluded.scored_at
      WHERE story_signals.rhythm_version IS NOT excluded.rhythm_version OR story_signals.human_score IS NOT excluded.human_score
        OR story_signals.ai_score IS NOT excluded.ai_score OR story_signals.lane_recommendation IS NOT excluded.lane_recommendation
        OR story_signals.confidence IS NOT excluded.confidence OR story_signals.labels IS NOT excluded.labels
        OR story_signals.evidence IS NOT excluded.evidence OR story_signals.exclusion_reason IS NOT excluded.exclusion_reason`)
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
