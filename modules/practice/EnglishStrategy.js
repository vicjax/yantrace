/**
 * 砚迹（YanTrace）- 英文打字策略
 * 职责：处理英文打字输入（keydown 直接监听）
 * 无输入框，直接捕获键盘事件
 */

export default class EnglishStrategy {
    constructor(engine) {
        this.engine = engine;
        this._keydownHandler = null;
        this._isActive = false;
    }

    /**
     * 初始化（绑定事件）
     */
    init() {
        if (this._isActive) return;
        this._isActive = true;

       this._keydownHandler = (e) => {
    if (e.ctrlKey || e.metaKey || e.altKey) return;

    // ===== 可打印字符 =====
    if (e.key.length === 1) {
        e.preventDefault();
        this.engine.recordKeypress();
        this.engine._handleCharInput(e.key);
        return;
    }

    // ===== 退格处理 =====
    if (e.key === 'Backspace') {
        e.preventDefault();
        this.engine.recordBackspace();
        this.engine._handleBackspace();
        return;
    }

    if (e.key === 'Enter') {
        e.preventDefault();
        return;
    }
};

        document.addEventListener('keydown', this._keydownHandler);
    }

    /**
     * 聚焦（英文不需要输入框，但保持接口一致）
     */
    focus() {
        // 无操作，直接监听 document
    }

    /**
     * 销毁（移除事件监听）
     */
    destroy() {
        if (this._keydownHandler) {
            document.removeEventListener('keydown', this._keydownHandler);
            this._keydownHandler = null;
        }
        this._isActive = false;
    }
}