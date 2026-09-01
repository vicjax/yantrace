/**
 * ContentPresenter - 统一内容管理展示器
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

    this.currentType = "article";
    this.currentLang = "chinese";
    this.currentCategory = "prose";
    this.items = [];
    this.selectedId = null;
    this.mode = "view";

    this.view = new ContentView({
      onSwitch: (type, lang, category) => this._handleSwitch(type, lang, category),
      onSelectItem: (id) => this._handleSelectItem(id),
      onCreateNew: () => this._handleCreateNew(),
      onEdit: () => this._handleEdit(),
      onDelete: () => this._handleDelete(),
      onSave: () => this._handleSave(),
      onCancel: () => this._handleCancel(),
      onReset: () => this.resetData(),
      onUpdate: () => this.updateData(),
    });
  }

  render(container) {
    super.render(container);
    this.view.setSelection(this.currentType, this.currentLang, this.currentCategory);
    this._loadList();
  }

  destroy() {
    super.destroy();
  }

  // ============================================
  // 私有方法
  // ============================================

  async _loadList() {
    this.items = await this.contentModel.getItemsByCategory(
      this.currentType,
      this.currentLang,
      this.currentCategory
    );

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
      await this._loadItem(this.selectedId);
    } else {
      this.view.clear();
    }
  }

  async _loadItem(id) {
    const item = await this.contentModel.getItem(this.currentType, id);
    if (!item) return;

    this.selectedId = id;
    this.mode = "view";
    this.view.showItem(item);
    this.view.updateList(this.items, id);
  }

  // ============================================
  // 事件处理
  // ============================================

  async _handleSwitch(type, lang, category) {
    this.currentType = type;
    this.currentLang = lang;
    this.currentCategory = category;
    this.selectedId = null;
    await this._loadList();
  }

  async _handleSelectItem(id) {
    if (this.mode === "edit" || this.mode === "new") {
      if (!await Modal.confirm("当前有未保存的修改，确定要切换吗？")) {
        return;
      }
    }
    await this._loadItem(id);
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
    const item = await this.contentModel.getItem(this.currentType, this.selectedId);
    if (!item) return;

    this.mode = "edit";
    this.view.showEdit(item);
  }

  async _handleDelete() {
    if (!this.selectedId) {
      await Modal.alert("请先选择一项");
      return;
    }

    const item = await this.contentModel.getItem(this.currentType, this.selectedId);
    if (!item) return;

    const isArticle = this.currentType === "article";
    const name = isArticle ? item.title : item.name;
    const typeLabel = isArticle ? "文章" : "词组";

    if (!await Modal.confirm(`确定要删除「${name}」吗？此操作不可恢复！`)) {
      return;
    }

    await this.contentModel.delete(this.currentType, this.selectedId);

    await this._loadList();
  }

  async _handleSave() {
    const title = this.view.getTitle().trim();
    const content = this.view.getContent().trim();

    if (!title) {
      await Modal.alert("请输入标题/名称");
      return;
    }

    const isArticle = this.currentType === "article";

    if (isArticle && !content) {
      await Modal.alert("请输入内容");
      return;
    }

    if (!isArticle && !content) {
      await Modal.alert("请输入词组（用空格分隔）");
      return;
    }

    let savedItem = null;

    if (this.mode === "new") {
      if (isArticle) {
        savedItem = await this.contentModel.create("article", {
          title: title,
          content: content,
          type: this.currentLang,
          category: this.currentCategory,
          renderMode: "paragraph",
        });
      } else {
        const words = content.split(/\s+/).filter((w) => w.trim());
        savedItem = await this.contentModel.create("phrase", {
          name: title,
          words: words,
          type: this.currentLang,
          category: this.currentCategory,
        });
      }
    } else if (this.mode === "edit") {
      if (isArticle) {
        savedItem = await this.contentModel.update("article", this.selectedId, {
          title: title,
          content: content,
        });
      } else {
        const words = content.split(/\s+/).filter((w) => w.trim());
        savedItem = await this.contentModel.update("phrase", this.selectedId, {
          name: title,
          words: words,
        });
      }
    }

    if (savedItem) {
      this.mode = "view";
      this.selectedId = savedItem.id;
      await this._loadList();
      await this._loadItem(savedItem.id);
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

  // ============================================
  // 数据管理方法
  // ============================================

  async resetData() {
    const typeLabel = this.currentType === 'article' ? '文章' : '词组';
    const confirmed = await Modal.confirm(`确定要重置所有${typeLabel}吗？`);
    if (!confirmed) return;
    
    await this.contentModel.reset(this.currentType);
    this.selectedId = null;
    await this._loadList();
  }

  async updateData() {
    const typeLabel = this.currentType === 'article' ? '文章' : '词组';
    const count = await this.contentModel.updateSystemData(this.currentType);
    if (count > 0) {
      this.selectedId = null;
      await this._loadList();
      await Modal.alert(`已新增 ${count} 条系统${typeLabel}`);
    } else {
      await Modal.alert(`没有新的系统${typeLabel}`);
    }
  }

  switchCategory(type, lang, category) {
    this._handleSwitch(type, lang, category);
  }
}