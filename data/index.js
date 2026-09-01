/**
 * 砚迹（YanTrace）- 系统数据加载器
 * 职责：加载所有内置文章和词组数据
 * 
 * 鲁棒性：某个文件不存在时，返回空数组，不影响其他数据加载
 */

let dataCache = null;
let loadPromise = null;

// 安全的 JSON 加载函数
async function safeFetchJSON(url) {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      console.warn(`⚠️ 文件不存在或加载失败: ${url}`);
      return [];
    }
    const data = await response.json();
    return Array.isArray(data) ? data : [];
  } catch (e) {
    console.warn(`⚠️ 加载 JSON 失败: ${url}`, e.message);
    return [];
  }
}

export function loadAllSystemData() {
  if (dataCache) return Promise.resolve(dataCache);
  if (loadPromise) return loadPromise;

  loadPromise = (async () => {
    try {
      const basePath = './data';
      
      // 所有文件都使用 safeFetchJSON，不存在的返回 []
      const [
        chineseProse,
        chineseNews,
        chineseAncient,
        chineseFable,
        chineseModernPoetry,
        englishProse,
        englishNews,
        englishFable,
        chineseTwoChar,
        chineseThreeChar,
        chineseFourChar,
        englishWords,
      ] = await Promise.all([
        safeFetchJSON(`${basePath}/articles/chinese/prose.json`),
        safeFetchJSON(`${basePath}/articles/chinese/news.json`),
        safeFetchJSON(`${basePath}/articles/chinese/ancient.json`),
        safeFetchJSON(`${basePath}/articles/chinese/fable.json`),
        safeFetchJSON(`${basePath}/articles/chinese/modern-poetry.json`),
        safeFetchJSON(`${basePath}/articles/english/prose.json`),
        safeFetchJSON(`${basePath}/articles/english/news.json`),
        safeFetchJSON(`${basePath}/articles/english/fable.json`),
        safeFetchJSON(`${basePath}/phrases/chinese/two-char.json`),
        safeFetchJSON(`${basePath}/phrases/chinese/three-char.json`),
        safeFetchJSON(`${basePath}/phrases/chinese/four-char.json`),
        safeFetchJSON(`${basePath}/phrases/english/words.json`),
      ]);

      // 统计加载结果
      const loadedFiles = [
        { name: '中文散文', count: chineseProse.length },
        { name: '中文新闻', count: chineseNews.length },
        { name: '中文古文', count: chineseAncient.length },
        { name: '中文寓言', count: chineseFable.length },
        { name: '中文现代诗', count: chineseModernPoetry.length },
        { name: '英文散文', count: englishProse.length },
        { name: '英文新闻', count: englishNews.length },
        { name: '英文寓言', count: englishFable.length },
        { name: '中文二字词', count: chineseTwoChar.length },
        { name: '中文三字词', count: chineseThreeChar.length },
        { name: '中文四字词', count: chineseFourChar.length },
        { name: '英文单词', count: englishWords.length },
      ];
      
      console.log('📚 系统数据加载完成:', loadedFiles.filter(f => f.count > 0));

      dataCache = {
        article: {
          chinese: {
            prose: chineseProse,
            news: chineseNews,
            ancient: chineseAncient,
            fable: chineseFable,
            'modern-poetry': chineseModernPoetry,
          },
          english: {
            prose: englishProse,
            news: englishNews,
            fable: englishFable,
          },
        },
        phrase: {
          chinese: {
            'two-char': chineseTwoChar,
            'three-char': chineseThreeChar,
            'four-char': chineseFourChar,
          },
          english: {
            words: englishWords,
          },
        },
      };

      return dataCache;
    } catch (e) {
      console.warn('加载系统数据失败:', e);
      dataCache = {
        article: { chinese: {}, english: {} },
        phrase: { chinese: {}, english: {} },
      };
      return dataCache;
    }
  })();

  return loadPromise;
}

export function getSystemData(type, lang, category) {
  if (!dataCache) return [];
  try {
    return dataCache[type]?.[lang]?.[category] || [];
  } catch (e) {
    return [];
  }
}

export function getAllSystemData(type, lang) {
  if (!dataCache) return [];
  const typeMap = dataCache[type]?.[lang];
  if (!typeMap) return [];
  let result = [];
  for (const category in typeMap) {
    if (Array.isArray(typeMap[category])) {
      result = result.concat(typeMap[category]);
    }
  }
  return result;
}

export default {
  loadAllSystemData,
  getSystemData,
  getAllSystemData,
};