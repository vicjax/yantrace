/**
 * 砚迹（YanTrace）- 英文打字策略
 * 职责：处理英文打字输入（keydown 直接监听）
 * 无输入框，直接捕获键盘事件
 */

export default class EnglishStrategy {
    constructor(engine) {
        this.engine = engine;
        this._keydownHandler = null;
        this._visibilityHandler = null;
        this._pageObserver = null;
        this._documentClickHandler = null;
        this._containerClickHandler = null;
        this._isActive = false;
    }

    init() {
        if (this._isActive) return;
        this._isActive = true;

        // ===== keydown =====
        this._keydownHandler = (e) => {
            if (this.engine.isFinished) {
                e.preventDefault();
                return;
            }

            if (e.ctrlKey || e.metaKey || e.altKey) return;

            if (e.key.length === 1) {
                e.preventDefault();
                this.engine.recordKeypress();
                this.engine._handleCharInput(e.key);
                return;
            }

            if (e.key === 'Backspace') {
                e.preventDefault();
                this.engine.recordBackspace();
                this.engine._handleBackspace();
                return;
            }

            if (e.key === 'Enter' || e.key === 'Tab') {
                e.preventDefault();
                return;
            }
        };
        document.addEventListener('keydown', this._keydownHandler);

        // ===== 点击外部 → 暂停 =====
        this._documentClickHandler = (e) => {
            const container = this.engine.textBox;
            if (!container) return;

            // 点击在文章区内部 → 不处理
            if (container.contains(e.target)) return;

            // 点击在工具栏（下拉框、按钮等）→ 也暂停（和中文逻辑一致）
            // 中文点击下拉框会触发 focusout → 暂停
            this.engine._stopTimer();
        };
        document.addEventListener('click', this._documentClickHandler);

        // ===== 点击文章区 → 仅聚焦（不恢复计时） =====
        // 恢复计时由 keydown → recordKeypress() → _startTimer() 触发
        this._containerClickHandler = () => {
            // 无操作，只用于占位
            // 确保点击文章区不会触发暂停（被 documentClick 排除）
        };
        const container = this.engine.textBox;
        if (container) {
            container.addEventListener('click', this._containerClickHandler);
        }

        // ===== 页面可见性变化 =====
        this._visibilityHandler = () => {
            if (document.hidden) {
                this.engine._stopTimer();
            } else {
                if (!this.engine.isFinished && this.engine.startTime) {
                    this.engine._startTimer();
                }
            }
        };
        document.addEventListener('visibilitychange', this._visibilityHandler);

        this._setupPageObserver();
    }

    _setupPageObserver() {
        const page = document.getElementById('page-practice-en');
        if (!page) return;

        const observer = new MutationObserver(() => {
            if (!page.classList.contains('active')) {
                this.destroy();
            }
        });
        observer.observe(page, { attributes: true, attributeFilter: ['class'] });
        this._pageObserver = observer;
    }

    focus() {
        // 无操作
    }

    updatePosition() {
        // 无操作
    }

    destroy() {
        if (this._keydownHandler) {
            document.removeEventListener('keydown', this._keydownHandler);
            this._keydownHandler = null;
        }

        if (this._documentClickHandler) {
            document.removeEventListener('click', this._documentClickHandler);
            this._documentClickHandler = null;
        }

        if (this._containerClickHandler) {
            const container = this.engine.textBox;
            if (container) {
                container.removeEventListener('click', this._containerClickHandler);
            }
            this._containerClickHandler = null;
        }

        if (this._visibilityHandler) {
            document.removeEventListener('visibilitychange', this._visibilityHandler);
            this._visibilityHandler = null;
        }

        if (this._pageObserver) {
            this._pageObserver.disconnect();
            this._pageObserver = null;
        }

        this._isActive = false;
    }
}