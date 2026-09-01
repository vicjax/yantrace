/**
 * 砚迹（YanTrace）- 文章内容策略
 */

import ContentStrategy from './ContentStrategy.js';

export default class ArticleStrategy extends ContentStrategy {
  constructor(articleService, language) {
    super();
    this._articleService = articleService;
    this._language = language;
    this._currentArticle = null;
    this._articles = [];
    this._loaded = false;
    this._loadPromise = null;
  }

  loadList() {
    if (this._loaded) return Promise.resolve(this._articles);
    if (this._loadPromise) return this._loadPromise;

    this._loadPromise = (async () => {
      const result = await this._articleService.getByType(this._language);
      this._articles = result || [];
      this._loaded = true;
      return this._articles;
    })();

    return this._loadPromise;
  }

  async load(id) {
    await this.loadList();
    const article = await this._articleService.getById(id);
    if (!article) {
      console.warn(`[ArticleStrategy] 文章 ${id} 不存在`);
      return;
    }
    this._currentArticle = article;
    this._setCurrentId(id);
  }

  getChars() {
    if (!this._currentArticle) return [];
    return this._currentArticle.content
      .split('')
      .filter(char => char !== '\n');
  }

  getRawContent() {
    return this._currentArticle?.content || '';
  }

  getTitle() {
    return this._currentArticle?.title || '未选择文章';
  }

  getType() {
    return 'article';
  }

  getLanguage() {
    return this._language;
  }

  getList(category) {
    if (!this._loaded) {
      console.warn('[ArticleStrategy] getList called before loadList');
      return [];
    }

    let articles = this._articles;
    if (category) {
      articles = articles.filter((a) => a.category === category);
    }

    return articles.map((article) => ({
      id: article.id,
      title: article.title,
      type: 'article',
    }));
  }

  getMetadata() {
    if (!this._currentArticle) return {};
    return {
      wordCount: this._currentArticle.content?.length || 0,
      tags: ['文章', this._language === 'chinese' ? '中文' : '英文'],
    };
  }
}