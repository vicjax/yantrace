/**
 * 砚迹（YanTrace）- 内置词组数据
 * 职责：提供各级别内置词组
 * 位置：features/phrase/phraseData.js
 */

export const PHRASE_DATA = {
  chinese: [
    // ========== 二字词 ==========
    {
      id: 'ph-cn-2-1',
      name: '二字词（常用）',
      type: 'chinese',
      difficulty: 1,
      words: ['学习', '工作', '生活', '快乐', '健康', '幸福', '美好', '未来', '梦想', '奋斗'],
    },
    {
      id: 'ph-cn-2-2',
      name: '二字词（自然）',
      type: 'chinese',
      difficulty: 1,
      words: ['春天', '夏天', '秋天', '冬天', '阳光', '月亮', '星星', '白云', '青山', '绿水'],
    },
    // ========== 三字词 ==========
    {
      id: 'ph-cn-3-1',
      name: '三字词（常用）',
      type: 'chinese',
      difficulty: 2,
      words: ['计算机', '互联网', '大数据', '人工智能', '云计算', '物联网', '区块链', '元宇宙'],
    },
    {
      id: 'ph-cn-3-2',
      name: '三字词（生活）',
      type: 'chinese',
      difficulty: 2,
      words: ['咖啡馆', '图书馆', '电影院', '健身房', '游泳池', '游乐场', '植物园', '动物园'],
    },
    // ========== 四字词/成语 ==========
    {
      id: 'ph-cn-4-1',
      name: '成语精选（一）',
      type: 'chinese',
      difficulty: 3,
      words: ['一帆风顺', '万事如意', '心想事成', '前程似锦', '鹏程万里', '马到成功'],
    },
    {
      id: 'ph-cn-4-2',
      name: '成语精选（二）',
      type: 'chinese',
      difficulty: 3,
      words: ['坚持不懈', '自强不息', '厚德载物', '上善若水', '道法自然', '天人合一'],
    },
    // ========== 短句（5-10字） ==========
    {
      id: 'ph-cn-5-1',
      name: '短句（励志）',
      type: 'chinese',
      difficulty: 4,
      words: ['天道酬勤', '业精于勤', '学无止境', '知足常乐', '随遇而安'],
    },
    {
      id: 'ph-cn-5-2',
      name: '短句（写景）',
      type: 'chinese',
      difficulty: 4,
      words: ['春眠不觉晓', '处处闻啼鸟', '夜来风雨声', '花落知多少'],
    },
    // ========== 长句（10-20字） ==========
    {
      id: 'ph-cn-6-1',
      name: '长句（经典）',
      type: 'chinese',
      difficulty: 5,
      words: ['学而时习之，不亦说乎', '有朋自远方来，不亦乐乎', '人不知而不愠，不亦君子乎'],
    },
    {
      id: 'ph-cn-6-2',
      name: '长句（写景）',
      type: 'chinese',
      difficulty: 5,
      words: ['落霞与孤鹜齐飞', '秋水共长天一色', '渔舟唱晚，响穷彭蠡之滨'],
    },
  ],

  english: [
    {
      id: 'ph-en-2-1',
      name: '2-3 Letter Words',
      type: 'english',
      difficulty: 1,
      words: ['go', 'do', 'be', 'to', 'of', 'in', 'it', 'he', 'she', 'we', 'they', 'you', 'and', 'the'],
    },
    {
      id: 'ph-en-3-1',
      name: '4-5 Letter Words',
      type: 'english',
      difficulty: 2,
      words: ['work', 'life', 'love', 'hope', 'dream', 'future', 'happy', 'healthy', 'strong', 'brave'],
    },
    {
      id: 'ph-en-4-1',
      name: '6-8 Letter Words',
      type: 'english',
      difficulty: 3,
      words: ['science', 'technology', 'internet', 'computer', 'software', 'program', 'system'],
    },
    {
      id: 'ph-en-5-1',
      name: 'Short Phrases',
      type: 'english',
      difficulty: 4,
      words: ['good morning', 'thank you', 'you are welcome', 'see you later', 'have a nice day'],
    },
    {
      id: 'ph-en-6-1',
      name: 'Longer Phrases',
      type: 'english',
      difficulty: 5,
      words: [
        'the quick brown fox jumps over the lazy dog',
        'to be or not to be that is the question',
        'all that glitters is not gold',
      ],
    },
  ],
};

export function getPhrasesByDifficulty(type, difficulty) {
  const all = PHRASE_DATA[type] || [];
  return all.filter((item) => item.difficulty === difficulty);
}

export function getPhraseSets(type) {
  return PHRASE_DATA[type] || [];
}

export function getPhraseSetById(id) {
  const all = [...(PHRASE_DATA.chinese || []), ...(PHRASE_DATA.english || [])];
  return all.find((item) => item.id === id) || null;
}
