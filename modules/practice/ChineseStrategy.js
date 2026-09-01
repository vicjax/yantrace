/**
 * 砚迹（YanTrace）- 中文打字策略
 * 职责：处理中文打字输入（浮动输入框 + composition）
 * 输入框在文章加载后自动创建，跟随字符移动，失焦变暗
 */

export default class ChineseStrategy {
  constructor(engine) {
    this.engine = engine;
    this.inputEl = null;
    this._isComposing = false;
    this._compositionProcessed = false;
    this._isActive = false;
    this._handlers = {};
    this._isCreating = false;
    this._pageObserver = null;
  }

  /**
   * 初始化策略（绑定事件）
   */
  init() {
    if (this._isActive) {
      console.warn("ChineseStrategy 已激活，跳过初始化");
      return;
    }
    this._isActive = true;

    const container = this.engine.textBox;
    container.addEventListener("click", this._handleContainerClick.bind(this));
    container.addEventListener("scroll", this._handleScroll.bind(this));

    document.addEventListener(
      "visibilitychange",
      this._handleVisibilityChange.bind(this),
    );
  }

  /**
   * 监听页面切换，自动销毁输入框
   */
  _setupPageObserver() {
    const page = document.getElementById("page-practice-cn");
    if (!page) return;

    const observer = new MutationObserver(() => {
      if (!page.classList.contains("active")) {
        this._destroyInput();
      }
    });
    observer.observe(page, { attributes: true, attributeFilter: ["class"] });
    this._pageObserver = observer;
  }

  /**
   * 点击文章区 → 聚焦输入框
   */
  _handleContainerClick(e) {
    if (!this.inputEl) return;
    if (this.engine.isFinished) return;
    this.inputEl.focus();
  }

  /**
   * 滚动时更新输入框位置
   */
  _handleScroll() {
    if (this.inputEl) {
      requestAnimationFrame(() => {
        this.updatePosition();
      });
    }
  }

  /**
   * 创建输入框（由 PracticeEngine 调用）
   */
  createInput() {
    this._createInput();
  }

  /**
   * 创建输入框并绑定事件
   */
  _createInput() {
    if (this._isCreating) return;
    if (this.inputEl) return;
    this._isCreating = true;

    this.inputEl = document.createElement("input");
    this.inputEl.type = "text";
    this.inputEl.className = "floating-input";
    this.inputEl.spellcheck = false;
    this.inputEl.autocomplete = "off";
    this.inputEl.autocorrect = "off";
    this.inputEl.autocapitalize = "off";
    this.inputEl.style.opacity = "1";
    document.body.appendChild(this.inputEl);

    this._bindInputEvents();

    // 强制回流后定位
    this.engine.textBox.offsetHeight;
    requestAnimationFrame(() => {
      this.updatePosition();
      this.inputEl.focus();
    });

    this._isCreating = false;
  }

  /**
   * 销毁输入框
   */
  _destroyInput() {
    if (!this.inputEl) return;

    const h = this._handlers;
    this.inputEl.removeEventListener("compositionstart", h.compositionStart);
    this.inputEl.removeEventListener("compositionend", h.compositionEnd);
    this.inputEl.removeEventListener("input", h.input);
    this.inputEl.removeEventListener("keydown", h.keydown);
    this.inputEl.removeEventListener("focusout", h.focusout);

    this.inputEl.remove();
    this.inputEl = null;
    this._handlers = {};
    this._isComposing = false;
    this._compositionProcessed = false;
  }

  /**
   * 绑定输入事件（composition + input + keydown + focus + focusout）
   */
  _bindInputEvents() {
    if (!this.inputEl) return;

    const handlers = {
      compositionStart: () => {
        this._isComposing = true;
        this._compositionProcessed = false;
        this.engine._startTimer();
      },

      compositionEnd: (e) => {
        this._isComposing = false;
        const data = e.data || "";
        if (data) {
          this.engine.recordKeypress();
          for (const char of data) {
            this.engine._handleCharInput(char);
          }
        }
        this.inputEl.value = "";
        this._compositionProcessed = true;
        this.updatePosition();
      },

      input: (e) => {
        const value = this.inputEl.value;

        // ⭐ 空格特殊处理：不受组合状态限制
        if (value === " ") {
          this.engine.recordKeypress();
          this.engine._handleCharInput(" ");
          this.inputEl.value = "";
          this.updatePosition();
          return;
        }

        if (this._isComposing) return;
        if (this._compositionProcessed) {
          this._compositionProcessed = false;
          return;
        }

        if (value.length > 0) {
          const char = value.charAt(value.length - 1);
          if (char.length === 1) {
            this.engine.recordKeypress();
            this.engine._handleCharInput(char);
            this.inputEl.value = "";
            this.updatePosition();
          }
        }
      },

      focus: () => {
        if (this.inputEl) {
          this.inputEl.placeholder = "";
          this.inputEl.style.opacity = "1";
        }
      },

      keydown: (e) => {
        const isPrintable =
          (e.code && e.code.startsWith("Key")) ||
          (e.code && e.code.startsWith("Digit"));
        const isBackspace = e.key === "Backspace" || e.code === "Backspace";

        // 可打印字符（拼音字母/数字）→ 记录击键
        if (isPrintable && !e.ctrlKey && !e.metaKey && !e.altKey) {
          this.engine.recordKeypress();
        }

        // 退格处理
        if (isBackspace) {
          e.preventDefault();
          this.engine.recordBackspace();
          if (!this._isComposing) {
            this.engine._handleBackspace();
          }
          this.updatePosition();
          return;
        }

        // 组合输入中，不处理其他按键
        if (this._isComposing) return;

        // Enter / Escape
        if (e.key === "Enter") {
          e.preventDefault();
          return;
        }
        if (e.key === "Escape") {
          this.inputEl.value = "";
          return;
        }
      },

      focusout: (e) => {
        const relatedTarget = e.relatedTarget;
        if (relatedTarget === this.inputEl) return;

        const container = this.engine.textBox;
        if (relatedTarget && container.contains(relatedTarget)) {
          return;
        }

        this.engine._stopTimer();

        if (this.inputEl) {
          this.inputEl.style.opacity = "0.3";
          this.inputEl.placeholder = "已暂停，点击此处继续...";
        }
      },
    };

    this._handlers = handlers;

    this.inputEl.addEventListener(
      "compositionstart",
      handlers.compositionStart,
    );
    this.inputEl.addEventListener("compositionend", handlers.compositionEnd);
    this.inputEl.addEventListener("input", handlers.input);
    this.inputEl.addEventListener("focus", handlers.focus);
    this.inputEl.addEventListener("keydown", handlers.keydown);
    this.inputEl.addEventListener("focusout", handlers.focusout);
  }

  /**
   * 更新输入框位置到当前字符下方
   * 优化版：使用 transform 减少重排，增加容错
   */
  updatePosition() {
    if (!this.inputEl) return;
    if (!this.engine.textBox) return;

    requestAnimationFrame(() => {
      try {
        const pos = this._getCharPosition();
        if (!pos || typeof pos.x !== "number" || typeof pos.y !== "number")
          return;

        const containerRect = this.engine.getContainerRect();
        if (
          !containerRect ||
          containerRect.width === 0 ||
          containerRect.height === 0
        )
          return;

        const computedStyle = getComputedStyle(this.engine.textBox);
        const fontSize = parseFloat(computedStyle.fontSize) || 22;
        if (fontSize < 8) return;

        const lineHeight = parseFloat(computedStyle.lineHeight);
        const effectiveLineHeight =
          lineHeight && lineHeight > 0 ? lineHeight : fontSize * 1.8;

        const inputHeight = Math.max(
          Math.round(effectiveLineHeight * 0.55),
          20,
        );
        const pinyinSize = Math.max(Math.round(inputHeight * 0.75), 12);

        const left = containerRect.left + pos.x;
        const top = containerRect.top + pos.y;

        const containerWidth = containerRect.width;
        const remainingWidth = Math.max(containerWidth - pos.x - 8, 20);

        this.inputEl.style.left = Math.max(0, left) + "px";
        this.inputEl.style.top = Math.max(0, top) + "px";
        this.inputEl.style.width =
          Math.min(remainingWidth, containerWidth - 20) + "px";
        this.inputEl.style.height = inputHeight + "px";
        this.inputEl.style.fontSize = pinyinSize + "px";
      } catch (e) {
        console.debug("更新输入框位置失败:", e);
      }
    });
  }
  /**
   * 获取当前字符位置（增强容错）
   */
  _getCharPosition() {
    const container = this.engine.textBox;
    if (!container) return null;

    const charEl = container.querySelector(
      `.char[data-index="${this.engine.currentCharIndex}"]`,
    );
    if (!charEl) return null;

    const containerRect = container.getBoundingClientRect();
    const charRect = charEl.getBoundingClientRect();

    const isVisible =
      charRect.bottom > containerRect.top &&
      charRect.top < containerRect.bottom;

    if (!isVisible) {
      charEl.scrollIntoView({ block: "nearest", behavior: "smooth" });
      return {
        x: charRect.left - containerRect.left,
        y: charRect.bottom - containerRect.top,
        width: charRect.width || 22,
        height: charRect.height || 22,
      };
    }

    return {
      x: charRect.left - containerRect.left,
      y: charRect.bottom - containerRect.top,
      width: charRect.width || 22,
      height: charRect.height || 22,
    };
  }

  /**
   * 主动聚焦
   */
  focus() {
    if (this.inputEl) {
      this.inputEl.focus();
    } else {
      this._createInput();
    }
  }

  /**
   * 页面可见性变化时
   */
  _handleVisibilityChange() {
    // 只做一件事：防止浏览器自动恢复焦点
    if (this.inputEl) {
      this.inputEl.blur();
    }
  }
  /**
   * 完全销毁策略
   */
  destroy() {
    this._destroyInput();

    if (this._pageObserver) {
      this._pageObserver.disconnect();
      this._pageObserver = null;
    }

    const container = this.engine.textBox;
    container.removeEventListener("click", this._handleContainerClick);
    container.removeEventListener("scroll", this._handleScroll);
    document.removeEventListener(
      "visibilitychange",
      this._handleVisibilityChange,
    );

    this._isActive = false;
  }
}
