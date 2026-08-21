/**
 * 砚迹（YanTrace）- 内容策略工厂
 * 位置：modules/practice/strategies/ContentFactory.js
 */

import ArticleStrategy from './ArticleStrategy.js';
import PhraseStrategy from './PhraseStrategy.js';

export default class ContentFactory {
  constructor(articleService, phraseService = null) {
    this._articleService = articleService;
    this._phraseService = phraseService;
    this._cache = new Map();
  }

  create(language, type) {
    const cacheKey = `${language}-${type}`;

    if (this._cache.has(cacheKey)) {
      return this._cache.get(cacheKey);
    }

    let strategy = null;

    switch (type) {
      case 'article':
        strategy = new ArticleStrategy(this._articleService, language);
        break;

      case 'phrase':
        if (!this._phraseService) {
          throw new Error('[ContentFactory] 词组服务未提供');
        }
        strategy = new PhraseStrategy(this._phraseService, language);
        break;

      default:
        throw new Error(`[ContentFactory] 未知内容类型: ${type}`);
    }

    this._cache.set(cacheKey, strategy);
    return strategy;
  }

  clearCache() {
    this._cache.clear();
  }
}
