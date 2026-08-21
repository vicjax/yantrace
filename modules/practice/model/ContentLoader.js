/**
 * 砚迹（YanTrace）- 内容加载器
 * 职责：从数据层加载文章/词组内容，适配为统一数据格式
 * 位置：modules/practice/model/ContentLoader.js
 */

export default class ContentLoader {
  /**
   * @param {object} articleService - ArticleModel 实例
   */
  constructor(articleService) {
    this._articleService = articleService;
    this._currentType = null;
  }

  /**
   * 获取文章列表（按类型）
   * @param {string} type - 'chinese' | 'english'
   * @returns {Array<{id: string, title: string}>}
   */
  getList(type) {
    this._currentType = type;
    const articles = this._articleService.getByType(type) || [];
    return articles.map((a) => ({
      id: a.id,
      title: a.title,
    }));
  }

  /**
   * 加载文章内容
   * @param {string} type - 'chinese' | 'english'
   * @param {string} articleId - 文章 ID
   * @returns {object|null} { title, content, type }
   */
  load(type, articleId) {
    this._currentType = type;
    const article = this._articleService.getById(articleId);
    if (!article) return null;

    return {
      title: article.title,
      content: article.content,
      type: article.type || type,
    };
  }

  /**
   * 获取当前语言类型
   */
  getCurrentType() {
    return this._currentType;
  }
}