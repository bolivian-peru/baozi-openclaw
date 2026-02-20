/**
 * 夜厨房 — Chinese Cultural Wisdom Module
 * 
 * Maps market themes to Chinese proverbs, idioms (成语), and cultural references.
 * Each entry includes the original Chinese, pinyin, and English translation.
 */

export interface WisdomEntry {
  chinese: string;
  pinyin: string;
  english: string;
  category: WisdomCategory;
  explanation: string;
}

export type WisdomCategory =
  | 'risk'        // 风险 — risk and gambling
  | 'timing'      // 时机 — timing and patience
  | 'strategy'    // 策略 — strategy and planning
  | 'fortune'     // 财运 — fortune and wealth
  | 'change'      // 变化 — change and transformation
  | 'wisdom'      // 智慧 — general wisdom
  | 'competition' // 竞争 — competition and contest
  | 'nature'      // 自然 — nature and cycles
  | 'politics'    // 政治 — politics and governance
  | 'technology'  // 科技 — technology and innovation
  | 'sports'      // 体育 — sports and athletics
  | 'finance';    // 金融 — finance and economics

/**
 * Master collection of Chinese proverbs and idioms
 */
export const WISDOM_COLLECTION: WisdomEntry[] = [
  // === Risk & Gambling 风险 ===
  {
    chinese: '不入虎穴，焉得虎子',
    pinyin: 'bù rù hǔ xué, yān dé hǔ zǐ',
    english: 'If you don\'t enter the tiger\'s den, how can you catch the tiger cub?',
    category: 'risk',
    explanation: 'Nothing ventured, nothing gained — great rewards require great courage.',
  },
  {
    chinese: '富贵险中求',
    pinyin: 'fù guì xiǎn zhōng qiú',
    english: 'Wealth and honor are sought amid danger',
    category: 'risk',
    explanation: 'Fortune favors the bold who dare to take calculated risks.',
  },
  {
    chinese: '刀口舔血',
    pinyin: 'dāo kǒu tiǎn xuè',
    english: 'Licking blood from a knife\'s edge',
    category: 'risk',
    explanation: 'Taking extreme risks for profit — handle with care.',
  },
  {
    chinese: '孤注一掷',
    pinyin: 'gū zhù yī zhì',
    english: 'Stake everything on a single throw',
    category: 'risk',
    explanation: 'Going all-in on a single bet — a desperate gamble.',
  },

  // === Timing 时机 ===
  {
    chinese: '机不可失，时不再来',
    pinyin: 'jī bù kě shī, shí bù zài lái',
    english: 'Opportunity knocks but once; time waits for no one',
    category: 'timing',
    explanation: 'Act decisively when the window of opportunity opens.',
  },
  {
    chinese: '守株待兔',
    pinyin: 'shǒu zhū dài tù',
    english: 'Guarding a tree stump, waiting for a rabbit',
    category: 'timing',
    explanation: 'Don\'t rely on luck or past success — adapt to changing conditions.',
  },
  {
    chinese: '好饭不怕晚',
    pinyin: 'hǎo fàn bù pà wǎn',
    english: 'A good meal is worth waiting for',
    category: 'timing',
    explanation: 'Patience brings the best rewards — don\'t rush decisions.',
  },
  {
    chinese: '欲速则不达',
    pinyin: 'yù sù zé bù dá',
    english: 'Haste makes waste',
    category: 'timing',
    explanation: 'Rushing leads to failure; steady progress wins the race.',
  },

  // === Strategy 策略 ===
  {
    chinese: '知己知彼，百战不殆',
    pinyin: 'zhī jǐ zhī bǐ, bǎi zhàn bù dài',
    english: 'Know yourself, know your enemy — a hundred battles, a hundred victories',
    category: 'strategy',
    explanation: 'Sun Tzu\'s wisdom: thorough analysis leads to confident positions.',
  },
  {
    chinese: '三十六计，走为上计',
    pinyin: 'sān shí liù jì, zǒu wéi shàng jì',
    english: 'Of the thirty-six stratagems, retreat is the best',
    category: 'strategy',
    explanation: 'Sometimes the wisest move is knowing when to step back.',
  },
  {
    chinese: '围魏救赵',
    pinyin: 'wéi wèi jiù zhào',
    english: 'Besiege Wei to rescue Zhao',
    category: 'strategy',
    explanation: 'An indirect approach often works better than a frontal assault.',
  },
  {
    chinese: '运筹帷幄',
    pinyin: 'yùn chóu wéi wò',
    english: 'Strategize within the command tent',
    category: 'strategy',
    explanation: 'Careful planning behind the scenes determines victory in the field.',
  },

  // === Fortune 财运 ===
  {
    chinese: '财聚人散，财散人聚',
    pinyin: 'cái jù rén sàn, cái sàn rén jù',
    english: 'When wealth gathers, people scatter; when wealth scatters, people gather',
    category: 'fortune',
    explanation: 'The relationship between wealth distribution and community.',
  },
  {
    chinese: '塞翁失马，焉知非福',
    pinyin: 'sài wēng shī mǎ, yān zhī fēi fú',
    english: 'The old man lost his horse — who knows if it\'s not a blessing?',
    category: 'fortune',
    explanation: 'Apparent losses may become gains; markets turn in unexpected ways.',
  },
  {
    chinese: '水满则溢，月满则亏',
    pinyin: 'shuǐ mǎn zé yì, yuè mǎn zé kuī',
    english: 'When water is full it overflows; when the moon is full it wanes',
    category: 'fortune',
    explanation: 'At the peak, decline begins — watch for turning points.',
  },
  {
    chinese: '一本万利',
    pinyin: 'yī běn wàn lì',
    english: 'A small investment yielding ten-thousand-fold returns',
    category: 'fortune',
    explanation: 'The dream of every trader: small risk, enormous reward.',
  },

  // === Change 变化 ===
  {
    chinese: '风水轮流转',
    pinyin: 'fēng shuǐ lún liú zhuǎn',
    english: 'Fortune\'s wheel keeps turning',
    category: 'change',
    explanation: 'Luck and momentum are cyclical — today\'s underdog may be tomorrow\'s champion.',
  },
  {
    chinese: '三十年河东，三十年河西',
    pinyin: 'sān shí nián hé dōng, sān shí nián hé xī',
    english: 'Thirty years on the east bank, thirty years on the west bank',
    category: 'change',
    explanation: 'Power and fortune shift over time — nothing lasts forever.',
  },
  {
    chinese: '否极泰来',
    pinyin: 'pǐ jí tài lái',
    english: 'After extreme adversity comes prosperity',
    category: 'change',
    explanation: 'The darkest hour is just before dawn — reversals are natural.',
  },
  {
    chinese: '物极必反',
    pinyin: 'wù jí bì fǎn',
    english: 'Things reverse when they reach an extreme',
    category: 'change',
    explanation: 'Markets at extremes tend to mean-revert.',
  },

  // === Wisdom 智慧 ===
  {
    chinese: '旁观者清，当局者迷',
    pinyin: 'páng guān zhě qīng, dāng jú zhě mí',
    english: 'The spectator sees clearly; the player is confused',
    category: 'wisdom',
    explanation: 'Emotional distance brings clarity — don\'t trade with clouded judgment.',
  },
  {
    chinese: '一叶障目',
    pinyin: 'yī yè zhàng mù',
    english: 'A single leaf blocks the view',
    category: 'wisdom',
    explanation: 'Don\'t let one data point obscure the bigger picture.',
  },
  {
    chinese: '兼听则明，偏信则暗',
    pinyin: 'jiān tīng zé míng, piān xìn zé àn',
    english: 'Listen to all sides and you\'ll be enlightened; heed only one and you\'ll be in the dark',
    category: 'wisdom',
    explanation: 'Consider all perspectives before making market decisions.',
  },
  {
    chinese: '聪明反被聪明误',
    pinyin: 'cōng míng fǎn bèi cōng míng wù',
    english: 'Cleverness can be one\'s own undoing',
    category: 'wisdom',
    explanation: 'Overthinking and overconfidence can lead to poor outcomes.',
  },

  // === Competition 竞争 ===
  {
    chinese: '鹿死谁手',
    pinyin: 'lù sǐ shuí shǒu',
    english: 'Who will claim the deer?',
    category: 'competition',
    explanation: 'The outcome is still uncertain — the contest is far from decided.',
  },
  {
    chinese: '逆水行舟，不进则退',
    pinyin: 'nì shuǐ xíng zhōu, bù jìn zé tuì',
    english: 'Rowing against the current — if you don\'t advance, you fall back',
    category: 'competition',
    explanation: 'In competitive markets, standing still means losing ground.',
  },
  {
    chinese: '龙争虎斗',
    pinyin: 'lóng zhēng hǔ dòu',
    english: 'A battle between dragon and tiger',
    category: 'competition',
    explanation: 'An evenly matched contest between powerful forces.',
  },
  {
    chinese: '棋逢对手',
    pinyin: 'qí féng duì shǒu',
    english: 'Meeting one\'s match in chess',
    category: 'competition',
    explanation: 'When evenly matched opponents face off, the game becomes truly interesting.',
  },

  // === Nature 自然 ===
  {
    chinese: '春江水暖鸭先知',
    pinyin: 'chūn jiāng shuǐ nuǎn yā xiān zhī',
    english: 'The duck is first to know when the river warms in spring',
    category: 'nature',
    explanation: 'Insiders and early movers sense changes before the crowd.',
  },
  {
    chinese: '山雨欲来风满楼',
    pinyin: 'shān yǔ yù lái fēng mǎn lóu',
    english: 'Wind fills the tower before the mountain storm arrives',
    category: 'nature',
    explanation: 'Signs of major change appear before the event itself.',
  },
  {
    chinese: '大浪淘沙',
    pinyin: 'dà làng táo shā',
    english: 'Great waves wash away the sand',
    category: 'nature',
    explanation: 'Volatile conditions reveal who is truly resilient.',
  },
  {
    chinese: '水滴石穿',
    pinyin: 'shuǐ dī shí chuān',
    english: 'Dripping water wears through stone',
    category: 'nature',
    explanation: 'Persistent small efforts accumulate into significant results.',
  },

  // === Politics 政治 ===
  {
    chinese: '得民心者得天下',
    pinyin: 'dé mín xīn zhě dé tiān xià',
    english: 'He who wins the people\'s hearts wins the world',
    category: 'politics',
    explanation: 'Public sentiment drives political outcomes.',
  },
  {
    chinese: '水能载舟，亦能覆舟',
    pinyin: 'shuǐ néng zài zhōu, yì néng fù zhōu',
    english: 'Water can carry a boat, and water can capsize it',
    category: 'politics',
    explanation: 'The people\'s support can elevate or topple leaders.',
  },

  // === Technology 科技 ===
  {
    chinese: '工欲善其事，必先利其器',
    pinyin: 'gōng yù shàn qí shì, bì xiān lì qí qì',
    english: 'To do good work, first sharpen your tools',
    category: 'technology',
    explanation: 'Invest in the right tools and infrastructure before execution.',
  },
  {
    chinese: '青出于蓝而胜于蓝',
    pinyin: 'qīng chū yú lán ér shèng yú lán',
    english: 'Blue comes from indigo yet surpasses it',
    category: 'technology',
    explanation: 'The student surpasses the master; new technology eclipses the old.',
  },

  // === Sports 体育 ===
  {
    chinese: '胜败乃兵家常事',
    pinyin: 'shèng bài nǎi bīng jiā cháng shì',
    english: 'Victory and defeat are commonplace in warfare',
    category: 'sports',
    explanation: 'Wins and losses are natural — don\'t be shaken by either.',
  },
  {
    chinese: '台上一分钟，台下十年功',
    pinyin: 'tái shàng yī fēn zhōng, tái xià shí nián gōng',
    english: 'One minute on stage, ten years of practice off stage',
    category: 'sports',
    explanation: 'Great performance is built on years of unseen preparation.',
  },

  // === Finance 金融 ===
  {
    chinese: '君子爱财，取之有道',
    pinyin: 'jūn zǐ ài cái, qǔ zhī yǒu dào',
    english: 'A gentleman loves wealth, but acquires it through righteous means',
    category: 'finance',
    explanation: 'Pursue profit ethically — the means matter as much as the ends.',
  },
  {
    chinese: '落袋为安',
    pinyin: 'luò dài wéi ān',
    english: 'Put it in your pocket to be safe',
    category: 'finance',
    explanation: 'Secure your gains — a profit unrealized is not a profit earned.',
  },
  {
    chinese: '鸡蛋不要放在一个篮子里',
    pinyin: 'jī dàn bú yào fàng zài yī gè lán zi lǐ',
    english: 'Don\'t put all your eggs in one basket',
    category: 'finance',
    explanation: 'Diversification reduces risk — spread your positions.',
  },
  {
    chinese: '买定离手',
    pinyin: 'mǎi dìng lí shǒu',
    english: 'Once you\'ve placed your bet, hands off',
    category: 'finance',
    explanation: 'Commit to your position — second-guessing erodes confidence.',
  },
];

/**
 * Theme keywords that map to wisdom categories
 */
const THEME_KEYWORDS: Record<string, WisdomCategory[]> = {
  // Politics & governance
  'election': ['politics', 'competition'],
  'president': ['politics', 'competition'],
  'vote': ['politics', 'competition'],
  'congress': ['politics', 'strategy'],
  'government': ['politics', 'change'],
  'policy': ['politics', 'strategy'],
  'trump': ['politics', 'competition'],
  'biden': ['politics', 'change'],
  'democrat': ['politics', 'competition'],
  'republican': ['politics', 'competition'],
  'senate': ['politics', 'strategy'],
  'legislation': ['politics', 'strategy'],

  // Finance & crypto
  'bitcoin': ['finance', 'change', 'risk'],
  'crypto': ['finance', 'risk', 'technology'],
  'btc': ['finance', 'change'],
  'eth': ['finance', 'technology'],
  'solana': ['finance', 'technology'],
  'sol': ['finance', 'technology'],
  'price': ['finance', 'fortune'],
  'market': ['finance', 'strategy'],
  'stock': ['finance', 'fortune'],
  'trading': ['finance', 'risk'],
  'inflation': ['finance', 'change'],
  'fed': ['finance', 'politics'],
  'interest rate': ['finance', 'change'],

  // Sports
  'game': ['sports', 'competition'],
  'championship': ['sports', 'competition'],
  'win': ['sports', 'competition'],
  'score': ['sports', 'competition'],
  'match': ['sports', 'competition'],
  'nba': ['sports', 'competition'],
  'nfl': ['sports', 'competition'],
  'soccer': ['sports', 'competition'],
  'world cup': ['sports', 'competition'],
  'super bowl': ['sports', 'competition'],
  'olympics': ['sports', 'competition'],

  // Technology
  'ai': ['technology', 'change'],
  'artificial intelligence': ['technology', 'change'],
  'launch': ['technology', 'timing'],
  'release': ['technology', 'timing'],
  'app': ['technology', 'change'],
  'google': ['technology', 'competition'],
  'apple': ['technology', 'competition'],
  'spacex': ['technology', 'risk'],
  'tesla': ['technology', 'change'],

  // Nature / weather / environment
  'weather': ['nature', 'change'],
  'storm': ['nature', 'risk'],
  'climate': ['nature', 'change'],
  'earthquake': ['nature', 'risk'],

  // General
  'deadline': ['timing', 'strategy'],
  'before': ['timing', 'strategy'],
  'will': ['fortune', 'change'],
  'when': ['timing', 'change'],
  'odds': ['risk', 'strategy'],
  'chance': ['risk', 'fortune'],
  'probability': ['risk', 'strategy'],
};

/**
 * Detect relevant wisdom categories from a market question
 */
export function detectCategories(question: string): WisdomCategory[] {
  const lower = question.toLowerCase();
  const categories = new Set<WisdomCategory>();

  for (const [keyword, cats] of Object.entries(THEME_KEYWORDS)) {
    if (lower.includes(keyword)) {
      for (const cat of cats) {
        categories.add(cat);
      }
    }
  }

  // Default categories if nothing matched
  if (categories.size === 0) {
    categories.add('wisdom');
    categories.add('fortune');
  }

  return Array.from(categories);
}

/**
 * Get wisdom entries relevant to a market question
 */
export function getWisdomForMarket(question: string, count: number = 3): WisdomEntry[] {
  const categories = detectCategories(question);

  // Get all matching entries
  const matching = WISDOM_COLLECTION.filter(w => categories.includes(w.category));

  // If not enough matches, add some general wisdom
  const pool = matching.length >= count
    ? matching
    : [...matching, ...WISDOM_COLLECTION.filter(w => w.category === 'wisdom' || w.category === 'fortune')];

  // Deduplicate
  const unique = Array.from(new Map(pool.map(w => [w.chinese, w])).values());

  // Shuffle and pick
  const shuffled = unique.sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

/**
 * Get a single wisdom entry based on market odds sentiment
 */
export function getOddsWisdom(yesPercent: number): WisdomEntry {
  // Heavily lopsided YES (>80%)
  if (yesPercent > 80) {
    return WISDOM_COLLECTION.find(w => w.chinese === '水满则溢，月满则亏')!;
  }
  // Heavily lopsided NO (<20%)
  if (yesPercent < 20) {
    return WISDOM_COLLECTION.find(w => w.chinese === '否极泰来')!;
  }
  // Evenly split (40-60%)
  if (yesPercent >= 40 && yesPercent <= 60) {
    return WISDOM_COLLECTION.find(w => w.chinese === '龙争虎斗')!;
  }
  // Leaning YES (60-80%)
  if (yesPercent >= 60) {
    return WISDOM_COLLECTION.find(w => w.chinese === '风水轮流转')!;
  }
  // Leaning NO (20-40%)
  return WISDOM_COLLECTION.find(w => w.chinese === '塞翁失马，焉知非福')!;
}

/**
 * Format a wisdom entry as a beautiful bilingual block
 */
export function formatWisdom(entry: WisdomEntry): string {
  return [
    `🏮 「${entry.chinese}」`,
    `   ${entry.pinyin}`,
    `   "${entry.english}"`,
    `   — ${entry.explanation}`,
  ].join('\n');
}
