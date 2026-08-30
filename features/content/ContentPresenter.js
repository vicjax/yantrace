/**
 * ContentPresenter - 统一内容管理展示器
 * 职责：业务逻辑（增删改查、模式管理），同时支持文章和词组
 */
import BasePresenter from "../../core/BasePresenter.js";
import ContentView from "./ContentView.js";
import ContentModel from "./ContentModel.js";
import Modal from "../../modules/Modal.js";

export default class ContentPresenter extends BasePresenter {
  constructor(options = {}) {
    super(options);
    this.contentModel = options.contentModel || new ContentModel();
    this.historyService = options.historyService || null;
    this.userService = options.userService || null;

    // 当前状态
    this.currentType = "article";     // 'article' | 'phrase'
    this.currentLang = "chinese";     // 'chinese' | 'english'
    this.items = [];
    this.selectedId = null;
    this.mode = "view";

    this.view = new ContentView({
      onSwitch: (type, lang) => this._handleSwitch(type, lang),
      onSelectItem: (id) => this._handleSelectItem(id),
      onCreateNew: () => this._handleCreateNew(),
      onEdit: () => this._handleEdit(),
      onDelete: () => this._handleDelete(),
      onSave: () => this._handleSave(),
      onCancel: () => this._handleCancel(),
    });
  }

  render(container) {
    super.render(container);
    // 同步下拉菜单的初始值
    this.view.setType(this.currentType);
    this.view.setLang(this.currentLang);
    this._loadList();
  }

  destroy() {
    super.destroy();
  }

  // ============================================
  // 私有方法
  // ============================================

  _loadList() {
    this.items = this.contentModel.getItems(this.currentType, this.currentLang);

    if (
      this.selectedId &&
      this.items.some((item) => item.id === this.selectedId)
    ) {
      // 保持选中
    } else if (this.items.length > 0) {
      this.selectedId = this.items[0].id;
    } else {
      this.selectedId = null;
    }

    this.view.updateList(this.items, this.selectedId);

    if (this.selectedId) {
      this._loadItem(this.selectedId);
    } else {
      this.view.clear();
    }
  }

  _loadItem(id) {
    const item = this.contentModel.getItem(this.currentType, id);
    if (!item) return;

    this.selectedId = id;
    this.mode = "view";
    this.view.showItem(item);
    this.view.updateList(this.items, id);
  }

  // ============================================
  // 事件处理
  // ============================================

  _handleSwitch(type, lang) {
    this.currentType = type;
    this.currentLang = lang;
    this.selectedId = null;
    this._loadList();
  }

  async _handleSelectItem(id) {
    if (this.mode === "edit" || this.mode === "new") {
      if (!await Modal.confirm("当前有未保存的修改，确定要切换吗？")) {
        return;
      }
    }
    this._loadItem(id);
  }

  _handleCreateNew() {
    this.mode = "new";
    this.selectedId = null;
    this.view.showNew();
    this.view.updateList(this.items, null);
  }

  async _handleEdit() {
    if (!this.selectedId) {
      await Modal.alert("请先选择一项");
      return;
    }
    const item = this.contentModel.getItem(this.currentType, this.selectedId);
    if (!item) return;

    this.mode = "edit";
    this.view.showEdit(item);
  }

  async _handleDelete() {
    if (!this.selectedId) {
      await Modal.alert("请先选择一项");
      return;
    }

    const item = this.contentModel.getItem(this.currentType, this.selectedId);
    if (!item) return;

    const isArticle = this.currentType === "article";
    const name = isArticle ? item.title : item.name;
    const typeLabel = isArticle ? "文章" : "词组";

    if (!await Modal.confirm(`确定要删除「${name}」吗？此操作不可恢复！`)) {
      return;
    }

    this.contentModel.delete(this.currentType, this.selectedId);

    this.items = this.contentModel.getItems(this.currentType, this.currentLang);
    if (this.items.length > 0) {
      this.selectedId = this.items[0].id;
      this._loadItem(this.selectedId);
    } else {
      this.selectedId = null;
      this.view.clear();
      this.view.updateList(this.items, null);
    }
  }

async _handleSave() {
  const title = this.view.getTitle().trim();
  const content = this.view.getContent().trim();

  if (!title) {
    await Modal.alert("请输入标题/名称");
    return;
  }

  const isArticle = this.currentType === "article";

  // 文章：内容不能为空
  if (isArticle && !content) {
    await Modal.alert("请输入内容");
    return;
  }

  // 词组：内容不能为空
  if (!isArticle && !content) {
    await Modal.alert("请输入词组（用空格分隔）");
    return;
  }

  let savedItem = null;

  if (this.mode === "new") {
    if (isArticle) {
      savedItem = this.contentModel.create("article", {
        title: title,
        content: content,
        type: this.currentLang,
      });
    } else {
      // 词组：用空格分割
      const words = content.split(/\s+/).filter((w) => w.trim());
      savedItem = this.contentModel.create("phrase", {
        name: title,
        words: words,
        type: this.currentLang,
      });
    }
  } else if (this.mode === "edit") {
    if (isArticle) {
      savedItem = this.contentModel.update("article", this.selectedId, {
        title: title,
        content: content,
      });
    } else {
      const words = content.split(/\s+/).filter((w) => w.trim());
      savedItem = this.contentModel.update("phrase", this.selectedId, {
        name: title,
        words: words,
      });
    }
  }

  if (savedItem) {
    this.mode = "view";
    this.selectedId = savedItem.id;
    this._loadList();
    this._loadItem(savedItem.id);
  } else {
    await Modal.alert("保存失败，请重试");
  }
}

  _handleCancel() {
    this.mode = "view";
    if (this.selectedId) {
      this._loadItem(this.selectedId);
    } else {
      this.view.clear();
    }
    this.view.updateList(this.items, this.selectedId);
  }
}