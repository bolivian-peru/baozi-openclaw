export type ProverbTheme =
  | 'patience'    // long-dated markets, wait it out
  | 'timing'      // markets closing soon, act now
  | 'risk'        // high-stakes pools, caution
  | 'luck'        // close races, uncertain outcome
  | 'profit'      // smart exits, take wins
  | 'warmth'      // resolved markets, community
  | 'quality'     // well-built markets, craftsmanship
  | 'acceptance'; // fate/randomness plays role

export interface Proverb {
  zh: string;
  pinyin: string;
  en: string;
  theme: ProverbTheme;
  context: string; // when to use this proverb
}

export const PROVERBS: Proverb[] = [
  // patience
  {
    zh: '心急吃不了热豆腐',
    pinyin: 'xīn jí chī bù liǎo rè dòufu',
    en: "you can't rush hot tofu — patience",
    theme: 'patience',
    context: 'markets > 7 days out, resist urge to exit early',
  },
  {
    zh: '慢工出细活',
    pinyin: 'màn gōng chū xì huó',
    en: 'slow work, fine craft — quality takes time',
    theme: 'patience',
    context: 'deliberate markets with complex outcomes',
  },
  {
    zh: '好饭不怕晚',
    pinyin: 'hǎo fàn bù pà wǎn',
    en: "good food doesn't fear being late — worth waiting",
    theme: 'patience',
    context: "market hasn't resolved but looks promising",
  },
  {
    zh: '瓜熟蒂落',
    pinyin: 'guā shú dì luò',
    en: 'when the melon is ripe, it falls from the vine',
    theme: 'patience',
    context: 'market nearing natural resolution',
  },
  // timing
  {
    zh: '火候到了，自然熟',
    pinyin: 'huǒ hòu dào le, zì rán shú',
    en: 'right heat, naturally cooked — timing is everything',
    theme: 'timing',
    context: 'market closing within 24h, now is the moment',
  },
  {
    zh: '趁热打铁',
    pinyin: 'chèn rè dǎ tiě',
    en: 'strike while the iron is hot',
    theme: 'timing',
    context: 'strong momentum, act before odds shift',
  },
  {
    zh: '机不可失，失不再来',
    pinyin: 'jī bù kě shī, shī bù zài lái',
    en: 'opportunity missed is opportunity gone',
    theme: 'timing',
    context: 'closing in hours, final window',
  },
  // risk
  {
    zh: '贪多嚼不烂',
    pinyin: 'tān duō jiáo bù làn',
    en: "bite off too much, you can't chew — risk warning",
    theme: 'risk',
    context: 'very large pool, high stakes market',
  },
  {
    zh: '刀口舔蜜，贪甜必割',
    pinyin: 'dāo kǒu tiǎn mì, tān tián bì gē',
    en: 'licking honey off a blade — sweetness has a price',
    theme: 'risk',
    context: 'extreme odds skew, 90%+ one side',
  },
  {
    zh: '小心驶得万年船',
    pinyin: 'xiǎo xīn shǐ dé wàn nián chuán',
    en: 'caution steers a ship ten thousand years',
    theme: 'risk',
    context: 'volatile market, uncertain fundamentals',
  },
  // luck
  {
    zh: '谋事在人，成事在天',
    pinyin: 'móu shì zài rén, chéng shì zài tiān',
    en: 'you make your bet, the market decides',
    theme: 'luck',
    context: 'close race, odds near 50/50',
  },
  {
    zh: '运气是留给有准备的人',
    pinyin: 'yùn qì shì liú gěi yǒu zhǔnbèi de rén',
    en: 'luck favors the prepared',
    theme: 'luck',
    context: 'close race with strong research advantage',
  },
  {
    zh: '塞翁失马，焉知非福',
    pinyin: 'sài wēng shī mǎ, yān zhī fēi fú',
    en: "the old man lost his horse — who knows if it's bad fortune",
    theme: 'luck',
    context: 'market swung against position, but not resolved',
  },
  // profit
  {
    zh: '见好就收',
    pinyin: 'jiàn hǎo jiù shōu',
    en: 'quit while ahead — smart exits',
    theme: 'profit',
    context: 'position up significantly, take profit',
  },
  {
    zh: '知足常乐',
    pinyin: 'zhī zú cháng lè',
    en: 'contentment brings happiness — take profits',
    theme: 'profit',
    context: 'modest win, no need to press further',
  },
  {
    zh: '落袋为安',
    pinyin: 'luò dài wéi ān',
    en: 'in the bag is safe — lock in gains',
    theme: 'profit',
    context: 'strong position, extraction is the move',
  },
  // warmth
  {
    zh: '小小一笼，大大缘分',
    pinyin: 'xiǎo xiǎo yī lóng, dà dà yuán fèn',
    en: 'small steamer, big fate — baozi tagline',
    theme: 'warmth',
    context: 'resolved market, community milestone',
  },
  {
    zh: '人间烟火气，最抚凡人心',
    pinyin: 'rén jiān yān huǒ qì, zuì fǔ fán rén xīn',
    en: 'the warmth of everyday cooking soothes ordinary hearts',
    theme: 'warmth',
    context: 'community gathering, celebrating resolution',
  },
  {
    zh: '民以食为天',
    pinyin: 'mín yǐ shí wéi tiān',
    en: 'food is heaven for people — fundamentals matter',
    theme: 'warmth',
    context: 'market about everyday fundamentals (sports, culture)',
  },
  {
    zh: '一粥一饭，当思来之不易',
    pinyin: 'yī zhōu yī fàn, dāng sī lái zhī bù yì',
    en: 'every grain of rice has its story — nothing comes easy',
    theme: 'warmth',
    context: 'hard-won resolution, respect the effort',
  },
  // quality
  {
    zh: '包子虽小，馅儿实在',
    pinyin: 'bāozi suī xiǎo, xiànr shízài',
    en: 'the bun is small, but the filling is real',
    theme: 'quality',
    context: 'small pool but well-structured market',
  },
  {
    zh: '一分耕耘，一分收获',
    pinyin: 'yī fēn gēng yún, yī fēn shōu huò',
    en: 'one part effort, one part harvest',
    theme: 'quality',
    context: 'earned resolution through well-placed bet',
  },
  // acceptance
  {
    zh: '既来之，则安之',
    pinyin: 'jì lái zhī, zé ān zhī',
    en: "since you're here, be at peace",
    theme: 'acceptance',
    context: 'market resolved against position',
  },
  {
    zh: '顺其自然',
    pinyin: 'shùn qí zì rán',
    en: 'let things take their natural course',
    theme: 'acceptance',
    context: 'unresolved, waiting for outcome',
  },
];

/**
 * Select the most contextually appropriate proverb for a market.
 */
export function selectProverb(params: {
  daysToClose: number;
  poolSol: number;
  yesOdds: number;  // 0–100
  resolved: boolean;
}): Proverb {
  const { daysToClose, poolSol, yesOdds, resolved } = params;
  const oddsBalance = Math.abs(yesOdds - 50); // 0=even, 50=sure thing

  let theme: ProverbTheme;

  if (resolved) {
    theme = 'warmth';
  } else if (daysToClose <= 1) {
    theme = 'timing';
  } else if (poolSol > 50) {
    theme = oddsBalance > 35 ? 'risk' : 'luck';
  } else if (daysToClose > 14) {
    theme = 'patience';
  } else if (oddsBalance < 10) {
    theme = 'luck';
  } else if (oddsBalance > 40) {
    theme = 'profit';
  } else {
    theme = 'warmth';
  }

  const candidates = PROVERBS.filter(p => p.theme === theme);
  // pick deterministically based on pool size (stable across runs)
  return candidates[Math.floor(poolSol * 7) % candidates.length];
}
// cache-bust
