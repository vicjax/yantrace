/**
 * 砚迹（YanTrace）- 完成提示弹窗
 * 职责：练习完成后显示简略数据，提供入口
 * 位置：modules/ResultToast.js（全局 UI 组件）
 */

export default class ResultToast {
    constructor() {
        this.overlay = null;
        this.title = null;
        this.speedEl = null;
        this.accuracyEl = null;
        this.timeEl = null;
        this.restartBtn = null;
        this.detailBtn = null;

        this._onRestart = null;
        this._onDetail = null;
        this._isShowing = false;
        this._pendingData = null;

        this._cacheElements();
        this._bindEvents();
        this._bindShortcuts();
    }

    // ============================================
    // DOM 缓存
    // ============================================

    _cacheElements() {
        this.overlay = document.getElementById('resultOverlay');
        this.title = document.getElementById('resultTitle');
        this.speedEl = document.getElementById('resultMainNumber');
        this.accuracyEl = document.getElementById('resultAccuracy');
        this.timeEl = document.getElementById('resultTime');

        this.restartBtn = document.getElementById('resultRestartBtn');
        this.detailBtn = document.getElementById('resultDetailBtn');

        // 隐藏网格（弹窗模式不显示详细网格）
        const grid = document.getElementById('resultGrid');
        if (grid) grid.style.display = 'none';
    }

    // ============================================
    // 事件绑定
    // ============================================

    _bindEvents() {
        if (this.restartBtn) {
            this.restartBtn.addEventListener('click', () => {
                this.hide();
                if (this._onRestart) this._onRestart();
            });
        }

        if (this.detailBtn) {
            this.detailBtn.addEventListener('click', () => {
                this.hide();
                if (this._onDetail && this._pendingData) {
                    this._onDetail(this._pendingData);
                }
            });
        }

        if (this.overlay) {
            this.overlay.addEventListener('click', (e) => {
                if (e.target === this.overlay) {
                    this.hide();
                }
            });
        }
    }

    // ============================================
    // 快捷键
    // ============================================

    _bindShortcuts() {
        document.addEventListener('keydown', (e) => {
            if (!this._isShowing) return;

            if (e.key === 'Escape') {
                e.preventDefault();
                this.hide();
            }

            if (e.key === 'Enter') {
                e.preventDefault();
                this.hide();
                if (this._onRestart) this._onRestart();
            }
        });
    }

    // ============================================
    // 公共方法
    // ============================================

    /**
     * 设置回调
     */
    setCallbacks(onRestart, onDetail) {
        this._onRestart = onRestart;
        this._onDetail = onDetail;
    }

    /**
     * 显示弹窗
     */
    show(stats, mode, articleTitle) {
        if (!stats) return;

        // 保存数据供详细查看使用
        this._pendingData = { stats, mode, articleTitle, createdAt: Date.now() };

        const isChinese = mode === 'practice-cn' || mode === 'input-cn';
        const speed = isChinese ? stats.cpm : stats.wpm;

        // 标题
        const titleText = isChinese ? '🎉 中文练习完成！' : '🎉 English Practice Complete!';
        if (this.title) this.title.textContent = titleText;

        // 速度
        if (this.speedEl) this.speedEl.textContent = speed || 0;

        // 准确率
        if (this.accuracyEl) this.accuracyEl.textContent = (stats.actualAccuracy || 0) + '%';

        // 用时
        if (this.timeEl) this.timeEl.textContent = (stats.elapsed || 0) + 's';

        // 按钮文字
        if (this.detailBtn) this.detailBtn.textContent = '📊 查看详细数据';

        // 显示弹窗
        if (this.overlay) {
            this.overlay.classList.add('show');
            this.overlay.classList.add('toast-mode');
        }

        this._isShowing = true;
        console.log(`📊 完成弹窗: ${titleText}`);
    }

    /**
     * 隐藏弹窗
     */
    hide() {
        if (this.overlay) {
            this.overlay.classList.remove('show');
            this.overlay.classList.remove('toast-mode');
        }
        this._isShowing = false;
    }
}