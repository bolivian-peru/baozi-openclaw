/**
 * Chinese Proverb Library for Night Kitchen
 *
 * Each proverb is tagged by context type so the bilingual generator
 * can select the most appropriate one for the market conditions.
 *
 * Contexts:
 *   patience     — for long-dated markets far from resolution
 *   risk         — for high-stakes positions or extreme odds
 *   timing       — for markets closing soon
 *   community    — for milestone or celebration moments
 *   perseverance — for volatile or contested markets
 *   wisdom       — general insight, default fallback
 */

import type { Proverb, ProverbContext } from '../types/index.js';

export const PROVERBS: Proverb[] = [
  // --- patience ---
  {
    chinese: '慢慢来，比较快',
    pinyin: 'màn màn lái, bǐjiào kuài',
    english: 'go slowly to go fast',
    context: 'patience',
  },
  {
    chinese: '好饭不怕晚',
    pinyin: 'hǎo fàn bù pà wǎn',
    english: 'a good meal is worth waiting for — good resolution doesn\'t fear being late',
    context: 'patience',
  },
  {
    chinese: '心急吃不了热豆腐',
    pinyin: 'xīn jí chī bù liǎo rè dòufu',
    english: 'the impatient cannot eat hot tofu — rushing burns the tongue',
    context: 'patience',
  },
  {
    chinese: '千里之行，始于足下',
    pinyin: 'qiān lǐ zhī xíng, shǐ yú zú xià',
    english: 'a journey of a thousand miles begins with a single step',
    context: 'patience',
  },

  // --- risk ---
  {
    chinese: '不入虎穴，焉得虎子',
    pinyin: 'bù rù hǔ xué, yān dé hǔ zǐ',
    english: 'nothing ventured, nothing gained — you must enter the tiger\'s den to catch the cub',
    context: 'risk',
  },
  {
    chinese: '艺高人胆大',
    pinyin: 'yì gāo rén dǎn dà',
    english: 'great skill brings great courage — but know the limits of your craft',
    context: 'risk',
  },
  {
    chinese: '小心驶得万年船',
    pinyin: 'xiǎo xīn shǐ dé wàn nián chuán',
    english: 'caution keeps the ship sailing for ten thousand years',
    context: 'risk',
  },
  {
    chinese: '不怕慢，就怕站',
    pinyin: 'bù pà màn, jiù pà zhàn',
    english: 'don\'t fear going slow, fear standing still — but standing still beats a bad bet',
    context: 'risk',
  },

  // --- timing ---
  {
    chinese: '机不可失，时不再来',
    pinyin: 'jī bù kě shī, shí bù zài lái',
    english: 'opportunity lost never returns — strike while the kitchen is hot',
    context: 'timing',
  },
  {
    chinese: '趁热打铁',
    pinyin: 'chèn rè dǎ tiě',
    english: 'strike while the iron is hot — the fire won\'t wait',
    context: 'timing',
  },
  {
    chinese: '时机成熟，水到渠成',
    pinyin: 'shí jī chéng shú, shuǐ dào qú chéng',
    english: 'when the time is ripe, water flows to its channel naturally',
    context: 'timing',
  },

  // --- community ---
  {
    chinese: '一家人，不说两家话',
    pinyin: 'yī jiā rén, bù shuō liǎng jiā huà',
    english: 'family doesn\'t need formalities — we are all at the same table',
    context: 'community',
  },
  {
    chinese: '众人拾柴火焰高',
    pinyin: 'zhòng rén shí chái huǒ yàn gāo',
    english: 'when everyone gathers firewood, the flames rise high',
    context: 'community',
  },
  {
    chinese: '一个篱笆三个桩，一个好汉三个帮',
    pinyin: 'yī gè lí ba sān gè zhuāng, yī gè hǎo hàn sān gè bāng',
    english: 'a fence needs three posts; even a hero needs three helpers',
    context: 'community',
  },

  // --- perseverance ---
  {
    chinese: '失败是成功之母',
    pinyin: 'shī bài shì chénggōng zhī mǔ',
    english: 'failure is the mother of success',
    context: 'perseverance',
  },
  {
    chinese: '只要功夫深，铁杵磨成针',
    pinyin: 'zhǐ yào gōngfu shēn, tiě chǔ mó chéng zhēn',
    english: 'with enough effort, even an iron pestle can be ground into a needle',
    context: 'perseverance',
  },

  // --- wisdom ---
  {
    chinese: '知之为知之，不知为不知，是知也',
    pinyin: 'zhī zhī wéi zhī zhī, bù zhī wéi bù zhī, shì zhī yě',
    english: 'to know what you know and know what you don\'t — that is wisdom',
    context: 'wisdom',
  },
  {
    chinese: '塞翁失马，焉知非福',
    pinyin: 'sài wēng shī mǎ, yān zhī fēi fú',
    english: 'the old man lost his horse — how could one know it wasn\'t a blessing',
    context: 'wisdom',
  },
  {
    chinese: '欲速则不达',
    pinyin: 'yù sù zé bù dá',
    english: 'haste makes waste — the bamboo that grows fastest bends first in the wind',
    context: 'wisdom',
  },
];

/**
 * Get all proverbs for a given context.
 */
export function getByContext(context: ProverbContext): Proverb[] {
  return PROVERBS.filter((p) => p.context === context);
}

/**
 * Pick a random proverb for a given context.
 * Falls back to 'wisdom' if none found.
 */
export function pickRandom(context: ProverbContext): Proverb {
  const pool = getByContext(context);
  if (pool.length === 0) {
    const fallback = getByContext('wisdom');
    return fallback[Math.floor(Math.random() * fallback.length)];
  }
  return pool[Math.floor(Math.random() * pool.length)];
}

/**
 * Get all proverbs.
 */
export function getAllProverbs(): Proverb[] {
  return [...PROVERBS];
}
