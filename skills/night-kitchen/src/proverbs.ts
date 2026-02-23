/**
 * Chinese proverbs mapped to market conditions
 */

export interface Proverb {
  chinese: string;
  pinyin: string;
  english: string;
  context: 'uncertain' | 'bullish' | 'bearish' | 'resolving' | 'patience' | 'general';
}

export const PROVERBS: Proverb[] = [
  {
    chinese: '心急吃不了热豆腐',
    pinyin: 'xīn jí chī bù liǎo rè dòufu',
    english: "you can't rush hot tofu — patience.",
    context: 'patience',
  },
  {
    chinese: '谋事在人，成事在天',
    pinyin: 'móu shì zài rén, chéng shì zài tiān',
    english: 'you make your bet, the market decides.',
    context: 'uncertain',
  },
  {
    chinese: '水满则溢，月满则亏',
    pinyin: 'shuǐ mǎn zé yì, yuè mǎn zé kuī',
    english: 'when water is full it overflows, when the moon is full it wanes.',
    context: 'bearish',
  },
  {
    chinese: '机不可失，失不再来',
    pinyin: 'jī bù kě shī, shī bù zài lái',
    english: 'opportunity knocks once — the kitchen closes at midnight.',
    context: 'bullish',
  },
  {
    chinese: '欲速则不达',
    pinyin: 'yù sù zé bù dá',
    english: 'haste makes waste — let the dough rise.',
    context: 'patience',
  },
  {
    chinese: '塞翁失马，焉知非福',
    pinyin: 'sài wēng shī mǎ, yān zhī fēi fú',
    english: "losing a horse may be a blessing — grandma knows.",
    context: 'uncertain',
  },
  {
    chinese: '众人拾柴火焰高',
    pinyin: 'zhòng rén shí chái huǒyàn gāo',
    english: 'many hands make the fire burn high.',
    context: 'bullish',
  },
  {
    chinese: '静水流深',
    pinyin: 'jìng shuǐ liú shēn',
    english: 'still waters run deep — the pool grows quietly.',
    context: 'general',
  },
  {
    chinese: '不入虎穴，焉得虎子',
    pinyin: 'bù rù hǔ xué, yān dé hǔ zǐ',
    english: "no risk, no reward — even grandma bets sometimes.",
    context: 'general',
  },
  {
    chinese: '祸兮福之所倚',
    pinyin: 'huò xī fú zhī suǒ yǐ',
    english: 'misfortune is where fortune hides.',
    context: 'resolving',
  },
];

export function selectProverb(
  totalPool: number,
  closingHours: number,
  leadingPercent: number
): Proverb {
  if (closingHours < 24) return PROVERBS.find(p => p.context === 'patience')!;
  if (leadingPercent > 75) return PROVERBS.find(p => p.context === 'bullish')!;
  if (leadingPercent < 35) return PROVERBS.find(p => p.context === 'uncertain')!;
  if (totalPool > 50) return PROVERBS.find(p => p.context === 'bearish')!;
  const generals = PROVERBS.filter(p => p.context === 'general');
  return generals[Math.floor(Math.random() * generals.length)];
}
