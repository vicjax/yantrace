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
        this._windowBlurHandler = null;
        this._windowFocusHandler = null;
        this._isActive = false;
    }

    /**
     * 初始化（绑定键盘事件）
     */
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

        // ===== 窗口失焦 → 暂停（类似中文的 focusout） =====
        this._windowBlurHandler = () => {
            this.engine._stopTimer();
        };
        window.addEventListener('blur', this._windowBlurHandler);

        // ===== 窗口聚焦 → 无操作，等待按键恢复（类似中文的 focus） =====
        this._windowFocusHandler = () => {
            // 只记录状态，不恢复计时
            // 计时由 keydown → recordKeypress() → _startTimer() 恢复
        };
        window.addEventListener('focus', this._windowFocusHandler);

        // ===== 页面隐藏（切标签页/最小化）→ 暂停 =====
        this._visibilityHandler = () => {
            if (document.hidden) {
                this.engine._stopTimer();
            }
            // 页面恢复时不恢复计时，等待按键
        };
        document.addEventListener('visibilitychange', this._visibilityHandler);

        // ===== 点击文章区外部 → 暂停 =====
        this._documentClickHandler = (e) => {
            const container = this.engine.textBox;
            if (!container) return;

            // 点击在文章区内部 → 不处理
            if (container.contains(e.target)) return;

            // 点击外部 → 暂停
            this.engine._stopTimer();
        };
        document.addEventListener('click', this._documentClickHandler);

        // ===== 页面切换自动销毁 =====
        this._setupPageObserver();
    }

    /**
     * 监听页面切换，自动销毁
     */
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

    /**
     * 聚焦（英文无输入框，保持接口一致）
     */
    focus() {
        // 无操作
    }

    /**
     * 更新位置（英文无输入框，保持接口一致）
     */
    updatePosition() {
        // 无操作
    }

    /**
     * 销毁（移除事件监听）
     */
    destroy() {
        if (this._keydownHandler) {
            document.removeEventListener('keydown', this._keydownHandler);
            this._keydownHandler = null;
        }

        if (this._windowBlurHandler) {
            window.removeEventListener('blur', this._windowBlurHandler);
            this._windowBlurHandler = null;
        }

        if (this._windowFocusHandler) {
            window.removeEventListener('focus', this._windowFocusHandler);
            this._windowFocusHandler = null;
        }

        if (this._visibilityHandler) {
            document.removeEventListener('visibilitychange', this._visibilityHandler);
            this._visibilityHandler = null;
        }

        if (this._documentClickHandler) {
            document.removeEventListener('click', this._documentClickHandler);
            this._documentClickHandler = null;
        }

        if (this._pageObserver) {
            this._pageObserver.disconnect();
            this._pageObserver = null;
        }

        this._isActive = false;
    }
}
