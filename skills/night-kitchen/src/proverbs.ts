/**
 * 谚语库 — 根据市场上下文选择合适的中文谚语
 * proverb library for matching market conditions
 */

export interface Proverb {
  chinese: string;
  pinyin: string;
  english: string;
  context: 'patience' | 'risk' | 'luck' | 'warmth' | 'community' | 'wisdom';
}

export const PROVERBS: Proverb[] = [
  { chinese: '心急吃不了热豆腐', pinyin: 'xīn jí chī bù liǎo rè dòufu', english: "you can't rush hot tofu", context: 'patience' },
  { chinese: '慢工出细活', pinyin: 'màn gōng chū xì huó', english: 'slow work, fine craft', context: 'patience' },
  { chinese: '好饭不怕晚', pinyin: 'hǎo fàn bù pà wǎn', english: "good food doesn't fear being late", context: 'patience' },
  { chinese: '火候到了，自然熟', pinyin: 'huǒ hòu dào le, zì rán shú', english: 'right heat, naturally cooked', context: 'patience' },
  { chinese: '贪多嚼不烂', pinyin: 'tān duō jiáo bù làn', english: 'bite off too much, can\'t chew', context: 'risk' },
  { chinese: '见好就收', pinyin: 'jiàn hǎo jiù shōu', english: 'quit while ahead', context: 'risk' },
  { chinese: '小心驶得万年船', pinyin: 'xiǎo xīn shǐ dé wàn nián chuán', english: 'careful steering, ten thousand years of sailing', context: 'risk' },
  { chinese: '不怕一万，只怕万一', pinyin: 'bù pà yī wàn, zhǐ pà wàn yī', english: 'not afraid of ten thousand, just the one', context: 'risk' },
  { chinese: '谋事在人，成事在天', pinyin: 'móu shì zài rén, chéng shì zài tiān', english: 'you make your bet, fate decides', context: 'wisdom' },
  { chinese: '知足常乐', pinyin: 'zhī zú cháng lè', english: 'contentment brings happiness', context: 'wisdom' },
  { chinese: '民以食为天', pinyin: 'mín yǐ shí wéi tiān', english: 'food is heaven for people', context: 'wisdom' },
  { chinese: '塞翁失马，焉知非福', pinyin: 'sài wēng shī mǎ, yān zhī fēi fú', english: 'old man lost his horse — who knows if it\'s bad luck?', context: 'luck' },
  { chinese: '时来运转', pinyin: 'shí lái yùn zhuǎn', english: 'when the time comes, luck turns', context: 'luck' },
  { chinese: '三人行，必有我师', pinyin: 'sān rén xíng, bì yǒu wǒ shī', english: 'among three people, one must be my teacher', context: 'community' },
  { chinese: '小小一笼，大大缘分', pinyin: 'xiǎo xiǎo yī lóng, dà dà yuán fèn', english: 'small steamer, big fate', context: 'warmth' },
  { chinese: '人间烟火气，最抚凡人心', pinyin: 'rén jiān yān huǒ qì, zuì fǔ fán rén xīn', english: 'the warmth of everyday cooking soothes ordinary hearts', context: 'warmth' },
];

export class ProverbSelector {
  private used: Set<string> = new Set();

  /**
   * 根据市场条件选择合适的谚语
   */
  select(context: Partial<ProverbContext>): Proverb {
    const ctx = context;

    // 高风险（大池子、接近结束）→ 风险谚语
    if (ctx.highStakes) return this.pickByContext('risk');

    // 长期市场（还剩很多天）→ 耐心谚语
    if (ctx.longTerm) return this.pickByContext('patience');

    // 势均力敌 → 智慧谚语
    if (ctx.closeRace) return this.pickByContext('wisdom');

    // 多个市场、社区活动 → 社区谚语
    if (ctx.community) return this.pickByContext('community');

    // 默认：随机但避免重复
    return this.pickRandom();
  }

  /**
   * 选择2个不同context的谚语用于报告
   */
  selectPair(context: Partial<ProverbContext> = {}): [Proverb, Proverb] {
    const first = this.select(context);
    const otherContexts = PROVERBS.filter(p => p.context !== first.context);
    const second = this.pickFrom(otherContexts);
    return [first, second];
  }

  private pickByContext(ctx: Proverb['context']): Proverb {
    const matching = PROVERBS.filter(p => p.context === ctx);
    return this.pickFrom(matching);
  }

  private pickFrom(pool: Proverb[]): Proverb {
    const available = pool.filter(p => !this.used.has(p.chinese));
    if (available.length === 0) {
      // Reset used if all consumed
      this.used.clear();
      return pool[Math.floor(Math.random() * pool.length)];
    }
    const chosen = available[Math.floor(Math.random() * available.length)];
    this.used.add(chosen.chinese);
    return chosen;
  }

  private pickRandom(): Proverb {
    return this.pickFrom(PROVERBS);
  }
}

export interface ProverbContext {
  highStakes: boolean;   // 大池子 (>10 SOL) 或即将结束 (<1天)
  longTerm: boolean;     // 还剩 >7 天
  closeRace: boolean;    // 胜率接近 (45-55%)
  community: boolean;    // 多个市场活跃
}
