/**
 * ContentView - 统一内容管理视图
 * 职责：渲染文章/词组管理界面，处理用户交互
 *
 * 支持两级分类：
 *   第一级：中文文章 / 英文文章 / 中文词组 / 英文单词
 *   第二级：根据第一级动态变化
 *
 * 渲染方式：根据内容格式自动判断
 *   - 包含 \n\n：段落式（首行缩进）
 *   - 包含 \n：行式（每行统一缩进）
 *   - 词组：词列表，词间距
 */

export default class ContentView {
  // 子分类配置映射
  static SUB_OPTIONS = {
    "chinese-article": [
      { value: "prose", label: "散文" },
      { value: "news", label: "新闻" },
      { value: "ancient", label: "古文" },
      { value: "fable", label: "寓言" },
      { value: "modern-poetry", label: "现代诗" },
    ],
    "english-article": [
      { value: "prose", label: "散文" },
      { value: "news", label: "新闻" },
      { value: "fable", label: "寓言" },
    ],
    "chinese-phrase": [
      { value: "two-char", label: "二字词" },
      { value: "three-char", label: "三字词" },
      { value: "four-char", label: "四字词" },
    ],
    "english-phrase": [{ value: "words", label: "单词" }],
  };

  constructor(options = {}) {
    this.onSwitch = options.onSwitch || null;
    this.onSelectItem = options.onSelectItem || null;
    this.onCreateNew = options.onCreateNew || null;
    this.onEdit = options.onEdit || null;
    this.onDelete = options.onDelete || null;
    this.onSave = options.onSave || null;
    this.onCancel = options.onCancel || null;
    this.onReset = options.onReset || null;
    this.onUpdate = options.onUpdate || null;

    this.container = null;
    this.currentType = "article";
    this.currentLang = "chinese";
    this.currentCategory = "prose";
    this.items = [];
    this.selectedId = null;
    this.mode = "view";
  }

  render(container) {
    this.container = container;
    container.innerHTML = this._getHtml();
    this._cacheElements();
    this._bindEvents();
    this._updateSubOptions();
  }

  updateList(items, selectedId) {
    this.items = items;
    this.selectedId = selectedId;
    this._renderList();
  }

  // ============================================
  // 展示方法
  // ============================================

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

    let content = "";
    if (isArticle) {
      content = item.content || "";
    } else {
      content = (item.words || []).join(" ");
    }

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

    let content = "";
    if (isArticle) {
      content = item.content || "";
    } else {
      content = (item.words || []).join(" ");
    }

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

  getCurrentCategory() {
    return this.currentCategory;
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
        
        <!-- 第一级：主分类 -->
        <select id="contentMainSelect" class="article-select">
          <option value="chinese-article">📄 中文文章</option>
          <option value="english-article">📄 英文文章</option>
          <option value="chinese-phrase">📝 中文词组</option>
          <option value="english-phrase">📝 英文单词</option>
        </select>
        
        <!-- 第二级：子分类（动态变化） -->
        <select id="contentSubSelect" class="article-select">
          <option value="prose">散文</option>
        </select>
        
        <button class="btn btn-action" id="contentUpdateBtn">🔄 更新</button>
        <button class="btn btn-action danger" id="contentResetBtn">↻ 重置</button>
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
    this.mainSelect = document.getElementById("contentMainSelect");
    this.subSelect = document.getElementById("contentSubSelect");
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
    this.resetBtn = document.getElementById("contentResetBtn");
    this.updateBtn = document.getElementById("contentUpdateBtn");
  }

  _bindEvents() {
    if (this.mainSelect) {
      this.mainSelect.addEventListener("change", () => {
        this._updateSubOptions();
        this._triggerSwitch();
      });
    }

    if (this.subSelect) {
      this.subSelect.addEventListener("change", () => {
        this._triggerSwitch();
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

    if (this.resetBtn) {
      this.resetBtn.addEventListener("click", () => {
        if (this.onReset) this.onReset();
      });
    }

    if (this.updateBtn) {
      this.updateBtn.addEventListener("click", () => {
        if (this.onUpdate) this.onUpdate();
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

  _updateSubOptions() {
    const mainValue = this.mainSelect?.value || "chinese-article";
    const options = ContentView.SUB_OPTIONS[mainValue] || [];

    if (!this.subSelect) return;

    const currentValue = this.subSelect.value;

    this.subSelect.innerHTML = options
      .map((opt) => `<option value="${opt.value}">${opt.label}</option>`)
      .join("");

    if (options.some((opt) => opt.value === currentValue)) {
      this.subSelect.value = currentValue;
    } else if (options.length > 0) {
      this.subSelect.value = options[0].value;
    }
  }

  _triggerSwitch() {
    if (!this.mainSelect || !this.subSelect) return;

    const parts = this.mainSelect.value.split("-");
    const lang = parts[0];
    const type = parts[1];
    const category = this.subSelect.value;

    this.currentLang = lang;
    this.currentType = type;
    this.currentCategory = category;

    if (this.onSwitch) this.onSwitch(type, lang, category);
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

  // ============================================
  // 核心渲染方法
  // ============================================

  /**
   * 设置内容 - 根据内容格式自动判断渲染方式
   */
  _setContent(content) {
    if (!this.contentEl) return;

    const placeholder = this.contentEl.querySelector(".placeholder");
    if (placeholder) placeholder.remove();

    if (!content || !content.trim()) {
      if (this.mode === "view") {
        this.contentEl.innerHTML = '<span class="placeholder">暂无内容</span>';
      } else {
        this.contentEl.textContent = "";
      }
      return;
    }

    // 清除之前的类
    this.contentEl.classList.remove("content-phrase");

    // 如果是词组类型，直接渲染
    if (this.currentType === "phrase") {
      this._renderPhrase(content);
      return;
    }

    // 按 \n\n 分割段落块
    const blocks = content.split(/\n\n/);

    const html = blocks
      .map((block) => {
        if (!block.trim()) return "";

        // 如果块内包含 \n，按行式渲染
        if (block.includes("\n")) {
          const lines = block.split("\n").filter((line) => line.trim() !== "");
          if (lines.length === 0) return "";
          return `<div class="stanza">${lines
            .map(
              (line) =>
                `<div class="line poem-line">${this._escapeHtml(line)}</div>`,
            )
            .join("")}</div>`;
        } else {
          // 否则按段落渲染
          return `<p>${this._escapeHtml(block)}</p>`;
        }
      })
      .join("");

    this.contentEl.innerHTML =
      html || '<span class="placeholder">暂无内容</span>';
    this.contentEl.style.textIndent = "";
  }

  /**
   * 渲染词组：词列表，词间距
   */
  _renderPhrase(content) {
    const words = content.split(" ");
    this.contentEl.innerHTML = words
      .map(
        (word) => `<span class="phrase-word">${this._escapeHtml(word)}</span>`,
      )
      .join(" ");
    this.contentEl.classList.add("content-phrase");
    this.contentEl.style.textIndent = "0";
  }

  /**
   * HTML 转义
   */
  _escapeHtml(text) {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
  }

  // ============================================
  // 编辑控制
  // ============================================

  _setContentEditable(editable) {
    if (this.contentEl) {
      this.contentEl.setAttribute(
        "contenteditable",
        editable ? "true" : "false",
      );
      if (editable) {
        this.contentEl.classList.add("editing");
        const placeholder = this.contentEl.querySelector(".placeholder");
        if (placeholder) placeholder.remove();
      } else {
        this.contentEl.classList.remove("editing");
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

  // ============================================
  // 外部设置方法
  // ============================================

  setType(type) {
    this.currentType = type;
    if (this.mainSelect) {
      const value = `${this.currentLang}-${type}`;
      const option = this.mainSelect.querySelector(`option[value="${value}"]`);
      if (option) {
        this.mainSelect.value = value;
        this._updateSubOptions();
      }
    }
  }

  setLang(lang) {
    this.currentLang = lang;
    if (this.mainSelect) {
      const value = `${lang}-${this.currentType}`;
      const option = this.mainSelect.querySelector(`option[value="${value}"]`);
      if (option) {
        this.mainSelect.value = value;
        this._updateSubOptions();
      }
    }
  }

  setCategory(category) {
    this.currentCategory = category;
    if (this.subSelect) {
      const option = this.subSelect.querySelector(
        `option[value="${category}"]`,
      );
      if (option) {
        this.subSelect.value = category;
      }
    }
  }

  setSelection(type, lang, category) {
    this.currentType = type;
    this.currentLang = lang;
    this.currentCategory = category;

    if (this.mainSelect) {
      const value = `${lang}-${type}`;
      const option = this.mainSelect.querySelector(`option[value="${value}"]`);
      if (option) {
        this.mainSelect.value = value;
        this._updateSubOptions();
      }
    }

    if (this.subSelect) {
      const option = this.subSelect.querySelector(
        `option[value="${category}"]`,
      );
      if (option) {
        this.subSelect.value = category;
      }
    }
  }
}