/**
 * ContentView - 统一内容管理视图
 * 职责：渲染文章/词组管理界面，处理用户交互
 *
 * 支持两种内容类型：article（文章）和 phrase（词组）
 * 通过下拉菜单选择：中文文章 / 英文文章 / 中文词组 / 英文词组
 *
 * 编辑逻辑：内容区统一使用 contentEditable，查看/编辑通过 contenteditable 切换
 */

export default class ContentView {
  constructor(options = {}) {
    // 回调函数
    this.onSwitch = options.onSwitch || null;
    this.onSelectItem = options.onSelectItem || null;
    this.onCreateNew = options.onCreateNew || null;
    this.onEdit = options.onEdit || null;
    this.onDelete = options.onDelete || null;
    this.onSave = options.onSave || null;
    this.onCancel = options.onCancel || null;

    this.container = null;
    this.currentType = "article"; // 'article' | 'phrase'
    this.currentLang = "chinese"; // 'chinese' | 'english'
    this.items = [];
    this.selectedId = null;
    this.mode = "view"; // 'view' | 'edit' | 'new'
  }

  render(container) {
    this.container = container;
    container.innerHTML = this._getHtml();
    this._cacheElements();
    this._bindEvents();
  }

  updateList(items, selectedId) {
    this.items = items;
    this.selectedId = selectedId;
    this._renderList();
  }

  showItem(item) {
    this.mode = "view";
    if (!item) {
      this._setTitle("");
      this._setContent("");
      this._setContentEditable(false);
      this._setStatus("请选择", "#8888aa");
      this._hideTitleInput();
      this._updateButtons();
      return;
    }

    const isArticle = this.currentType === "article";
    const title = isArticle ? item.title : item.name;
    const content = isArticle ? item.content : (item.words || []).join(" ");

    this._setTitle(title);
    this._setContent(content);
    this._setContentEditable(false);
    this._setStatus("查看中", "#8888aa");
    this._hideTitleInput();
    this._updateButtons();
  }

  showEdit(item) {
    this.mode = "edit";
    if (!item) return;

    const isArticle = this.currentType === "article";
    const title = isArticle ? item.title : item.name;
    const content = isArticle ? item.content : (item.words || []).join(" ");

    this._setTitle(title);
    this._setContent(content);
    this._setContentEditable(true);
    this._setStatus("编辑中", "#f59e0b");
    this._showTitleInput();
    if (this.titleInput) {
      this.titleInput.value = title;
    }
    this._updateButtons();
    this._focusContent();
  }

  showNew() {
    this.mode = "new";
    this._setTitle("");
    this._setContent("");
    this._setContentEditable(true);
    this._setStatus("新建中", "#f59e0b");
    this._showTitleInput();
    if (this.titleInput) {
      this.titleInput.value = "";
    }
    this._updateButtons();
    this._focusTitle();
  }

  clear() {
    this._setTitle("");
    this._setContent("");
    this.mode = "view";
    this._setContentEditable(false);
    this._hideTitleInput();
    this._updateButtons();
    this._setStatus("请选择", "#8888aa");
  }

  // ============================================
  // 数据获取
  // ============================================

  getTitle() {
    return this.titleInput?.value || "";
  }

  getContent() {
    return this.contentEl?.textContent || "";
  }

  getMode() {
    return this.mode;
  }

  getSelectedId() {
    return this.selectedId;
  }

  getCurrentType() {
    return this.currentType;
  }

  getCurrentLang() {
    return this.currentLang;
  }

  destroy() {
    this.container = null;
  }

  // ============================================
  // 私有方法
  // ============================================

  _getHtml() {
    const typeLabel = this.currentType === "article" ? "文章" : "词组";

    return `
      <div class="mode-header">
        <button class="btn btn-back back-btn" data-target="home">← 返回</button>
        <h2>📚 内容管理</h2>
        <select id="contentTypeSelect" class="article-select">
          <option value="chinese-article">📄 中文文章</option>
          <option value="english-article">📄 英文文章</option>
          <option value="chinese-phrase">📝 中文词组</option>
          <option value="english-phrase">📝 英文词组</option>
        </select>
        <button class="btn btn-new" id="contentNewBtn">➕ 新建</button>
      </div>

      <div class="article-management-body">
        <div class="am-left">
          <div class="am-list-header">
            <span>${typeLabel}列表</span>
            <span class="am-count" id="contentCount">0 项</span>
          </div>
          <div class="am-list" id="contentList">
            <span class="placeholder">加载中...</span>
          </div>
        </div>

        <div class="am-right">
          <div class="am-content-header">
            <span class="am-title" id="contentTitle">请选择一项</span>
            <span class="am-status" id="contentStatus">查看中</span>
          </div>
          <div class="am-content" id="contentContent" contenteditable="false">
            <span class="placeholder">请从左侧选择一项</span>
          </div>
          <div class="am-title-edit" id="contentTitleEdit" style="display:none;">
            <label>标题/名称：</label>
            <input type="text" id="contentTitleInput" placeholder="请输入标题或名称" />
          </div>
        </div>
      </div>

      <div class="am-actions">
        <button class="btn btn-action" id="contentEditBtn">✏️ 编辑</button>
        <button class="btn btn-action danger" id="contentDeleteBtn">🗑️ 删除</button>
        <button class="btn btn-save" id="contentSaveBtn" style="display:none;">💾 保存</button>
        <button class="btn btn-reset" id="contentCancelBtn" style="display:none;">↻ 取消</button>
      </div>
    `;
  }

  _cacheElements() {
    this.typeSelect = document.getElementById("contentTypeSelect");
    this.listEl = document.getElementById("contentList");
    this.countEl = document.getElementById("contentCount");
    this.titleEl = document.getElementById("contentTitle");
    this.statusEl = document.getElementById("contentStatus");
    this.contentEl = document.getElementById("contentContent");
    this.titleEdit = document.getElementById("contentTitleEdit");
    this.titleInput = document.getElementById("contentTitleInput");

    this.editBtn = document.getElementById("contentEditBtn");
    this.deleteBtn = document.getElementById("contentDeleteBtn");
    this.saveBtn = document.getElementById("contentSaveBtn");
    this.cancelBtn = document.getElementById("contentCancelBtn");
    this.newBtn = document.getElementById("contentNewBtn");
  }

  _bindEvents() {
    // 下拉菜单切换
    if (this.typeSelect) {
      this.typeSelect.addEventListener("change", () => {
        const value = this.typeSelect.value;
        const parts = value.split("-");
        const lang = parts[0];
        const type = parts[1];
        this.currentLang = lang;
        this.currentType = type;
        if (this.onSwitch) this.onSwitch(type, lang);
      });
    }

    if (this.newBtn) {
      this.newBtn.addEventListener("click", () => {
        if (this.onCreateNew) this.onCreateNew();
      });
    }

    if (this.editBtn) {
      this.editBtn.addEventListener("click", () => {
        if (this.onEdit) this.onEdit();
      });
    }

    if (this.deleteBtn) {
      this.deleteBtn.addEventListener("click", () => {
        if (this.onDelete) this.onDelete();
      });
    }

    if (this.saveBtn) {
      this.saveBtn.addEventListener("click", () => {
        if (this.onSave) this.onSave();
      });
    }

    if (this.cancelBtn) {
      this.cancelBtn.addEventListener("click", () => {
        if (this.onCancel) this.onCancel();
      });
    }

    if (this.listEl) {
      this.listEl.addEventListener("click", (e) => {
        const item = e.target.closest(".am-list-item");
        if (item) {
          const id = item.dataset.id;
          if (this.onSelectItem) this.onSelectItem(id);
        }
      });
    }
  }

  _renderList() {
    if (!this.listEl) return;

    if (this.items.length === 0) {
      this.listEl.innerHTML = '<span class="placeholder">暂无数据</span>';
      if (this.countEl) this.countEl.textContent = "0 项";
      return;
    }

    const isArticle = this.currentType === "article";
    this.listEl.innerHTML = this.items
      .map((item) => {
        const active = item.id === this.selectedId ? "active" : "";
        const title = isArticle ? item.title : item.name;
        const label = item.type === "chinese" ? "中文" : "EN";
        return `
          <div class="am-list-item ${active}" data-id="${item.id}">
            <span class="am-item-title">${title}</span>
            <span class="am-item-type">${label}</span>
          </div>
        `;
      })
      .join("");

    if (this.countEl) {
      this.countEl.textContent = `${this.items.length} 项`;
    }
  }

  _setTitle(title) {
    if (this.titleEl) {
      this.titleEl.textContent = title || "未命名";
    }
  }

  _setContent(content) {
    if (this.contentEl) {
      // 移除已有的 placeholder
      const placeholder = this.contentEl.querySelector(".placeholder");
      if (placeholder) placeholder.remove();

      this.contentEl.textContent = content || "";
      if (!content && this.mode === "view") {
        this.contentEl.innerHTML = '<span class="placeholder">暂无内容</span>';
      }
    }
  }

  _setContentEditable(editable) {
    if (this.contentEl) {
      this.contentEl.setAttribute(
        "contenteditable",
        editable ? "true" : "false",
      );
      if (editable) {
        this.contentEl.classList.add("editing");
        // 移除 placeholder（如果有）
        const placeholder = this.contentEl.querySelector(".placeholder");
        if (placeholder) placeholder.remove();
      } else {
        this.contentEl.classList.remove("editing");
        // 如果内容为空，重新添加 placeholder
        if (!this.contentEl.textContent.trim()) {
          this.contentEl.innerHTML =
            '<span class="placeholder">暂无内容</span>';
        }
      }
    }
  }
  _showTitleInput() {
    if (this.titleEdit) {
      this.titleEdit.style.display = "block";
    }
    if (this.titleInput) {
      this.titleInput.value = "";
      setTimeout(() => this.titleInput.focus(), 50);
    }
  }

  _hideTitleInput() {
    if (this.titleEdit) {
      this.titleEdit.style.display = "none";
    }
  }

  _setStatus(text, color) {
    if (this.statusEl) {
      this.statusEl.textContent = text;
      this.statusEl.style.color = color || "#8888aa";
    }
  }

  _updateButtons() {
    const isEditing = this.mode === "edit" || this.mode === "new";

    if (this.editBtn)
      this.editBtn.style.display = isEditing ? "none" : "inline-block";
    if (this.deleteBtn)
      this.deleteBtn.style.display = isEditing ? "none" : "inline-block";
    if (this.saveBtn)
      this.saveBtn.style.display = isEditing ? "inline-block" : "none";
    if (this.cancelBtn)
      this.cancelBtn.style.display = isEditing ? "inline-block" : "none";
    if (this.newBtn)
      this.newBtn.style.display = isEditing ? "none" : "inline-block";
  }

  _focusContent() {
    if (this.contentEl) {
      this.contentEl.focus();
      const range = document.createRange();
      range.selectNodeContents(this.contentEl);
      range.collapse(false);
      const sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(range);
    }
  }

  _focusTitle() {
    if (this.titleInput) {
      setTimeout(() => this.titleInput.focus(), 50);
    }
  }

  setType(type) {
    this.currentType = type;
    if (this.typeSelect) {
      const value = `${this.currentLang}-${type}`;
      if (this.typeSelect.querySelector(`option[value="${value}"]`)) {
        this.typeSelect.value = value;
      }
    }
  }

  setLang(lang) {
    this.currentLang = lang;
    if (this.typeSelect) {
      const value = `${lang}-${this.currentType}`;
      if (this.typeSelect.querySelector(`option[value="${value}"]`)) {
        this.typeSelect.value = value;
      }
    }
  }
}
