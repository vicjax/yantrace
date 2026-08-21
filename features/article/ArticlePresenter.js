/**
 * ArticlePresenter - 文章管理展示器
 * 职责：业务逻辑（增删改查、模式管理）
 */
import BasePresenter from "../../core/BasePresenter.js";
import ArticleView from "./ArticleView.js";
import Modal from "../../modules/Modal.js";

export default class ArticlePresenter extends BasePresenter {
  constructor(options = {}) {
    super(options);
    this.articleService = options.articleService;
    this.historyService = options.historyService;
    this.userService = options.userService;

    this.currentLang = "chinese";
    this.articles = [];
    this.selectedId = null;
    this.mode = "view";

    this.view = new ArticleView({
      onLanguageSwitch: (lang) => this._handleLanguageSwitch(lang),
      onSelectArticle: (id) => this._handleSelectArticle(id),
      onCreateNew: () => this._handleCreateNew(),
      onEdit: () => this._handleEdit(),
      onDelete: () => this._handleDelete(),
      onSave: () => this._handleSave(),
      onCancel: () => this._handleCancel(),
    });
  }

  render(container) {
    super.render(container);
    this._loadList();
  }

  setLanguage(lang) {
    this.currentLang = lang;
    this._loadList();
  }

  destroy() {
    super.destroy();
  }

  // ============================================
  // 私有方法
  // ============================================

  _loadList() {
    this.articles = this.articleService.getByType(this.currentLang);

    if (
      this.selectedId &&
      this.articles.some((a) => a.id === this.selectedId)
    ) {
      // 保持选中
    } else if (this.articles.length > 0) {
      this.selectedId = this.articles[0].id;
    } else {
      this.selectedId = null;
    }

    this.view.updateList(this.articles, this.selectedId);

    if (this.selectedId) {
      this._loadArticle(this.selectedId);
    } else {
      this.view.clear();
    }
  }

  _loadArticle(id) {
    const article = this.articleService.getById(id);
    if (!article) return;

    this.selectedId = id;
    this.mode = "view";
    this.view.showArticle(article);
    this.view.updateList(this.articles, id);
  }

  // ============================================
  // 事件处理
  // ============================================

  _handleLanguageSwitch(lang) {
    this.currentLang = lang;
    this.selectedId = null;
    this._loadList();
  }

  async _handleSelectArticle(id) {
    if (this.mode === "edit" || this.mode === "new") {
      if (!await Modal.confirm('当前有未保存的修改，确定要切换文章吗？')) {
        return;
      }
    }
    this._loadArticle(id);
  }

  _handleCreateNew() {
    this.mode = "new";
    this.selectedId = null;
    this.view.showNew();
    this.view.updateList(this.articles, null);
  }

  async _handleEdit() {
    if (!this.selectedId) {
      await Modal.alert('请先选择一篇文章');
      return;
    }
    const article = this.articleService.getById(this.selectedId);
    if (!article) return;

    this.mode = "edit";
    this.view.showEdit(article);
  }

  async _handleDelete() {
    if (!this.selectedId) {
      await Modal.alert('请先选择一篇文章');
      return;
    }

    const article = this.articleService.getById(this.selectedId);
    if (!article) return;

    if (!await Modal.confirm(`确定要删除「${article.title}」吗？此操作不可恢复！`)) {
      return;
    }

    this.articleService.delete(this.selectedId);

    this.articles = this.articleService.getByType(this.currentLang);
    if (this.articles.length > 0) {
      this.selectedId = this.articles[0].id;
      this._loadArticle(this.selectedId);
    } else {
      this.selectedId = null;
      this.view.clear();
      this.view.updateList(this.articles, null);
    }
  }

  async _handleSave() {
    const title = this.view.getTitle().trim();
    const content = this.view.getContent().trim();

    if (!title) {
      await Modal.alert('请输入文章标题');
      return;
    }

    if (!content) {
      await Modal.alert('请输入文章内容');
      return;
    }

    let savedArticle = null;

    if (this.mode === "new") {
      savedArticle = this.articleService.create(
        title,
        content,
        this.currentLang,
      );
    } else if (this.mode === "edit") {
      savedArticle = this.articleService.update(this.selectedId, {
        title,
        content,
      });
    }

    if (savedArticle) {
      this.mode = "view";
      this.selectedId = savedArticle.id;
      this._loadList();
      this._loadArticle(savedArticle.id);
      console.log(`✅ 文章已保存：${savedArticle.title}`);
    } else {
      await Modal.alert('保存失败，请重试');
    }
  }

  _handleCancel() {
    this.mode = "view";
    if (this.selectedId) {
      this._loadArticle(this.selectedId);
    } else {
      this.view.clear();
    }
    this.view.updateList(this.articles, this.selectedId);
  }
}
