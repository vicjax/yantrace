/**
 * ArticleView - 文章管理视图
 * 职责：纯 DOM 渲染，不包含业务逻辑
 */
export default class ArticleView {
  constructor(options = {}) {
    this.onLanguageSwitch = options.onLanguageSwitch || null;
    this.onSelectArticle = options.onSelectArticle || null;
    this.onCreateNew = options.onCreateNew || null;
    this.onView = options.onView || null;
    this.onEdit = options.onEdit || null;
    this.onDelete = options.onDelete || null;
    this.onSave = options.onSave || null;
    this.onCancel = options.onCancel || null;

    this.container = null;
    this.currentLang = "chinese";
    this.articles = [];
    this.selectedId = null;
    this.mode = "view";
  }

  render(container) {
    this.container = container;
    container.innerHTML = this._getHtml();
    this._cacheElements();
    this._bindEvents();
  }

  updateList(articles, selectedId) {
    this.articles = articles;
    this.selectedId = selectedId;
    this._renderList();
  }

  showArticle(article) {
    this.mode = "view";
    this._setTitle(article?.title || "");
    this._setContent(article?.content || "");
    this._setContentEditable(false);
    this._updateButtons();
    this._setStatus("查看中", "#8888aa");
    this._hideTitleInput();
  }

  showEdit(article) {
    this.mode = "edit";
    this._setTitle(article?.title || "");
    this._setContent(article?.content || "");
    this._setContentEditable(true);
    this._updateButtons();
    this._setStatus("编辑中", "#f59e0b");
    this._hideTitleInput();
    this._focusContent();
  }

  showNew() {
    this.mode = "new";
    this._setTitle("");
    this._setContent("");
    this._setContentEditable(true);
    this._updateButtons();
    this._setStatus("新建文章", "#f59e0b");
    this._showTitleInput();
    this._focusTitle();
  }

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

  clear() {
    this._setTitle("");
    this._setContent("");
    this.mode = "view";
    this._updateButtons();
    this._setStatus("请选择文章", "#8888aa");
    this._hideTitleInput();
  }

  destroy() {
    this.container = null;
  }

  // ============================================
  // 私有方法
  // ============================================

  _getHtml() {
    return `
            <div class="mode-header">
                <button class="btn btn-back back-btn" data-target="home">← 返回</button>
                <h2>📄 文章管理</h2>
                <select id="amLangSelect" class="article-select">
                    <option value="chinese">中文</option>
                    <option value="english">English</option>
                </select>
                <button class="new-btn" id="amNewBtn">➕ 新建</button>
            </div>

            <div class="article-management-body">
                <div class="am-left">
                    <div class="am-list-header">
                        <span>文章列表</span>
                        <span class="am-count" id="amCount">0 篇</span>
                    </div>
                    <div class="am-list" id="amList">
                        <span class="placeholder">加载中...</span>
                    </div>
                </div>

                <div class="am-right">
                    <div class="am-content-header">
                        <span class="am-title" id="amTitle">请选择一篇文章</span>
                        <span class="am-status" id="amStatus">查看中</span>
                    </div>
                    <div class="am-content" id="amContent" contenteditable="false">
                        <span class="placeholder">请从左侧选择一篇文章</span>
                    </div>
                    <div class="am-title-edit" id="amTitleEdit" style="display:none;">
                        <label>标题：</label>
                        <input type="text" id="amTitleInput" placeholder="请输入文章标题" />
                    </div>
                </div>
            </div>

            <div class="am-actions">
                <button class="btn btn-action" id="amViewBtn">📖 查看</button>
                <button class="btn btn-action" id="amEditBtn">✏️ 编辑</button>
                <button class="btn btn-action danger" id="amDeleteBtn">🗑️ 删除</button>
                <button class="btn btn-save" id="amSaveBtn" style="display:none;">💾 保存</button>
                <button class="btn btn-reset" id="amCancelBtn" style="display:none;">↻ 取消</button>
            </div>
        `;
  }

  _cacheElements() {
    this.langSelect = document.getElementById("amLangSelect");
    this.listEl = document.getElementById("amList");
    this.countEl = document.getElementById("amCount");
    this.titleEl = document.getElementById("amTitle");
    this.statusEl = document.getElementById("amStatus");
    this.contentEl = document.getElementById("amContent");
    this.titleEdit = document.getElementById("amTitleEdit");
    this.titleInput = document.getElementById("amTitleInput");

    this.viewBtn = document.getElementById("amViewBtn");
    this.editBtn = document.getElementById("amEditBtn");
    this.deleteBtn = document.getElementById("amDeleteBtn");
    this.saveBtn = document.getElementById("amSaveBtn");
    this.cancelBtn = document.getElementById("amCancelBtn");
    this.newBtn = document.getElementById("amNewBtn");
  }

  _bindEvents() {
    if (this.langSelect) {
      this.langSelect.addEventListener("change", () => {
        const lang = this.langSelect.value;
        this.currentLang = lang;
        if (this.onLanguageSwitch) this.onLanguageSwitch(lang);
      });
    }

    if (this.newBtn) {
      this.newBtn.addEventListener("click", () => {
        if (this.onCreateNew) this.onCreateNew();
      });
    }

    if (this.viewBtn) {
      this.viewBtn.addEventListener("click", () => {
        if (this.onView) this.onView();
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
          if (this.onSelectArticle) this.onSelectArticle(id);
        }
      });
    }
  }

  _renderList() {
    if (!this.listEl) return;

    if (this.articles.length === 0) {
      this.listEl.innerHTML = '<span class="placeholder">暂无文章</span>';
      if (this.countEl) this.countEl.textContent = "0 篇";
      return;
    }

    this.listEl.innerHTML = this.articles
      .map((article) => {
        const active = article.id === this.selectedId ? "active" : "";
        return `
                <div class="am-list-item ${active}" data-id="${article.id}">
                    <span class="am-item-title">${article.title}</span>
                    <span class="am-item-type">${article.type === "chinese" ? "中文" : "EN"}</span>
                </div>
            `;
      })
      .join("");

    if (this.countEl) {
      this.countEl.textContent = `${this.articles.length} 篇`;
    }
  }

  _setTitle(title) {
    if (this.titleEl) {
      this.titleEl.textContent = title || "未命名文章";
    }
  }

  _setContent(content) {
    if (this.contentEl) {
      this.contentEl.textContent = content || "";
      if (!content) {
        this.contentEl.innerHTML = '<span class="placeholder">暂无内容</span>';
      }
    }
  }

  _setContentEditable(editable) {
    if (this.contentEl) {
      if (editable) {
        this.contentEl.setAttribute("contenteditable", "true");
        this.contentEl.classList.add("editing");
        const placeholder = this.contentEl.querySelector(".placeholder");
        if (placeholder) placeholder.remove();
      } else {
        this.contentEl.setAttribute("contenteditable", "false");
        this.contentEl.classList.remove("editing");
        if (!this.contentEl.textContent.trim()) {
          this.contentEl.innerHTML =
            '<span class="placeholder">请从左侧选择一篇文章</span>';
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

    if (this.viewBtn)
      this.viewBtn.style.display = isEditing ? "none" : "inline-block";
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
}
