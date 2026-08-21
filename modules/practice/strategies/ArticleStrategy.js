/**
 * 砚迹（YanTrace）- 文章内容策略
 * 位置：modules/practice/strategies/ArticleStrategy.js
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
  }

  async loadList() {
    if (this._loaded) return;
    this._articles = this._articleService.getByType(this._language) || [];
    this._loaded = true;
  }

  async load(id) {
    await this.loadList();
    const article = this._articleService.getById(id);
    if (!article) {
      console.warn(`[ArticleStrategy] 文章 ${id} 不存在`);
      return;
    }
    this._currentArticle = article;
    this._setCurrentId(id);
  }

  getChars() {
    if (!this._currentArticle) return [];
    return this._currentArticle.content.split('');
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

  getList() {
    if (!this._loaded) {
      this._articles = this._articleService.getByType(this._language) || [];
      this._loaded = true;
    }
    return this._articles.map((article) => ({
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