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

    init() {
        if (this._isActive) return;
        this._isActive = true;

        const container = this.engine.textBox;
        container.addEventListener('click', this._handleContainerClick.bind(this));
        container.addEventListener('scroll', this._handleScroll.bind(this));

        this._setupPageObserver();

        document.addEventListener('visibilitychange', this._handleVisibilityChange.bind(this));
    }

    _setupPageObserver() {
        const page = document.getElementById('page-practice-cn');
        if (!page) return;

        const observer = new MutationObserver(() => {
            if (!page.classList.contains('active')) {
                this._destroyInput();
            }
        });
        observer.observe(page, { attributes: true, attributeFilter: ['class'] });
        this._pageObserver = observer;
    }

    _handleContainerClick(e) {
        if (!this.inputEl) return;
        if (this.engine.isFinished) return;

        this.inputEl.style.opacity = '1';
        this.inputEl.placeholder = '';
        this.inputEl.focus();
    }

    _handleScroll() {
        if (this.inputEl) {
            requestAnimationFrame(() => {
                this.updatePosition();
            });
        }
    }

    createInput() {
        this._createInput();
    }

    _createInput() {
        if (this._isCreating) return;
        if (this.inputEl) return;
        this._isCreating = true;

        this.inputEl = document.createElement('input');
        this.inputEl.type = 'text';
        this.inputEl.className = 'floating-input';
        this.inputEl.spellcheck = false;
        this.inputEl.autocomplete = 'off';
        this.inputEl.autocorrect = 'off';
        this.inputEl.autocapitalize = 'off';
        this.inputEl.style.opacity = '1';
        document.body.appendChild(this.inputEl);

        this._bindInputEvents();

        // 强制回流后定位
        this.engine.textBox.offsetHeight;

        requestAnimationFrame(() => {
            this.updatePosition();
            this.inputEl.focus();
        });

        this._highlightCurrentChar(true);
        this._isCreating = false;
    }

    _destroyInput() {
        if (!this.inputEl) return;

        this._highlightCurrentChar(false);

        const h = this._handlers;
        this.inputEl.removeEventListener('compositionstart', h.compositionStart);
        this.inputEl.removeEventListener('compositionend', h.compositionEnd);
        this.inputEl.removeEventListener('input', h.input);
        this.inputEl.removeEventListener('keydown', h.keydown);
        this.inputEl.removeEventListener('focusout', h.focusout);

        this.inputEl.remove();
        this.inputEl = null;
        this._handlers = {};
        this._isComposing = false;
        this._compositionProcessed = false;
    }

    _highlightCurrentChar(show) {
        const container = this.engine.textBox;
        const charEl = container?.querySelector('.char.current');
        if (!charEl) return;

        if (show) {
            charEl.style.boxShadow = '0 0 20px rgba(79, 70, 229, 0.5)';
            charEl.style.transform = 'scale(1.05)';
            charEl.style.transition = 'box-shadow 0.2s, transform 0.2s';
        } else {
            charEl.style.boxShadow = '';
            charEl.style.transform = '';
        }
    }

    _bindInputEvents() {
        if (!this.inputEl) return;

        const handlers = {
            compositionStart: () => {
                this._isComposing = true;
                this._compositionProcessed = false;
                // 组合输入开始时启动计时器（中文输入法下首次按键）
                this.engine._startTimer();
            },

            compositionEnd: (e) => {
                this._isComposing = false;
                const data = e.data || '';
                if (data) {
                    for (const char of data) {
                        this.engine._handleCharInput(char);
                    }
                }
                this.inputEl.value = '';
                this._compositionProcessed = true;
                this.updatePosition();
            },

            input: (e) => {
                if (this._isComposing) return;
                if (this._compositionProcessed) {
                    this._compositionProcessed = false;
                    return;
                }
                const value = this.inputEl.value;
                if (value.length > 0) {
                    const char = value.charAt(value.length - 1);
                    if (char.length === 1) {
                        this.engine._handleCharInput(char);
                        this.inputEl.value = '';
                        this.updatePosition();
                    }
                }
            },

            keydown: (e) => {
                
                 console.log('keydown 触发, key:', e.key, 'isBackspace:', e.key === 'Backspace' || e.code === 'Backspace');
                const isPrintable = e.code && e.code.startsWith('Key') || e.code && e.code.startsWith('Digit');
                const isBackspace = e.key === 'Backspace' || e.code === 'Backspace';

                // ===== 可打印字符（拼音字母/数字）=====
                if (isPrintable && !e.ctrlKey && !e.metaKey && !e.altKey) {
                    this.engine.recordKeypress();
                }

                // ===== 退格处理 =====
                if (isBackspace) {
                    e.preventDefault();
                    this.engine.recordBackspace();
                    if (!this._isComposing) {
                        this.engine._handleBackspace();
                    }
                    this.updatePosition();
                    return;
                }
                // ...
            },

            focusout: (e) => {
                const relatedTarget = e.relatedTarget;
                if (relatedTarget === this.inputEl) return;

                const container = this.engine.textBox;
                if (relatedTarget && container.contains(relatedTarget)) {
                    return;
                }

                // ===== 新增：失焦时停止计时（暂停） =====
                this.engine._stopTimer();

                if (this.inputEl) {
                    this.inputEl.style.opacity = '0.3';
                    this.inputEl.placeholder = '点击文章区继续...';
                }
            }
        };

        this._handlers = handlers;

        this.inputEl.addEventListener('compositionstart', handlers.compositionStart);
        this.inputEl.addEventListener('compositionend', handlers.compositionEnd);
        this.inputEl.addEventListener('input', handlers.input);
        this.inputEl.addEventListener('keydown', handlers.keydown);
        this.inputEl.addEventListener('focusout', handlers.focusout);
    }

    updatePosition() {
        if (!this.inputEl) return;

        const pos = this.engine.getCharPosition();
        if (!pos) return;

        const containerRect = this.engine.getContainerRect();
        if (!containerRect) return;

        const containerWidth = containerRect.width;
        const remainingWidth = containerWidth - pos.x - 4;

        const left = containerRect.left + pos.x;
        // 上边框紧贴字符底部：pos.y 就是字符底部位置
        const top = containerRect.top + pos.y;

        this.inputEl.style.left = left + 'px';
        this.inputEl.style.top = top + 'px';
        this.inputEl.style.width = Math.max(remainingWidth, 20) + 'px';
        // 高度由 CSS 控制，不设置固定高度
    }

    focus() {
        if (this.inputEl) {
            this.inputEl.focus();
        } else {
            this._createInput();
        }
    }

    _handleVisibilityChange() {
        const page = document.getElementById('page-practice-cn');
        if (page && !page.classList.contains('active')) {
            this._destroyInput();
        }
    }

    destroy() {
        this._destroyInput();

        if (this._pageObserver) {
            this._pageObserver.disconnect();
            this._pageObserver = null;
        }

        const container = this.engine.textBox;
        container.removeEventListener('click', this._handleContainerClick);
        container.removeEventListener('scroll', this._handleScroll);
        document.removeEventListener('visibilitychange', this._handleVisibilityChange);

        this._isActive = false;
    }
}