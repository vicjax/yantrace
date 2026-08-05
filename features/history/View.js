/**
 * HistoryView - 历史记录视图
 * 职责：纯 DOM 渲染，不包含业务逻辑
 */
export default class HistoryView {
    constructor(options = {}) {
        this.onExport = options.onExport || null;
        this.onClear = options.onClear || null;

        this.container = null;
        this.records = [];
    }

    render(container) {
        this.container = container;
        container.innerHTML = this._getHtml();
        this._cacheElements();
        this._bindEvents();
    }

    updateList(records) {
        this.records = records;
        this._renderList();
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
                <button class="back-btn" data-target="home">← 返回</button>
                <h2>📊 历史记录</h2>
                <div class="history-actions">
                    <button class="action-btn" id="exportHistoryBtn">📥 导出CSV</button>
                    <button class="action-btn danger" id="clearHistoryBtn">🗑️ 清空</button>
                </div>
            </div>
            <div class="history-list" id="historyList">
                <div class="history-empty">加载中...</div>
            </div>
        `;
    }

    _cacheElements() {
        this.listEl = document.getElementById('historyList');
        this.exportBtn = document.getElementById('exportHistoryBtn');
        this.clearBtn = document.getElementById('clearHistoryBtn');
    }

    _bindEvents() {
        // 返回按钮
        this.container.querySelectorAll('.back-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const target = btn.dataset.target;
                if (target && window.app?.navigator) {
                    window.app.navigator.goTo(target);
                }
            });
        });

        if (this.exportBtn) {
            this.exportBtn.addEventListener('click', () => {
                if (this.onExport) this.onExport();
            });
        }

        if (this.clearBtn) {
            this.clearBtn.addEventListener('click', () => {
                if (this.onClear) this.onClear();
            });
        }
    }

    _renderList() {
        if (!this.listEl) return;

        if (!this.records || this.records.length === 0) {
            this.listEl.innerHTML = '<div class="history-empty">暂无历史记录</div>';
            return;
        }

        this.listEl.innerHTML = this.records.map(record => {
            const modeMap = {
                'practice-cn': '中文练习',
                'practice-en': '英文练习',
                'input-cn': '中文录入',
                'input-en': '英文录入'
            };
            const modeLabel = modeMap[record.mode] || record.mode || '未知';

            const stats = record.stats || {};
            const speed = stats.wpm || stats.cpm || 0;
            // ⭐ 修复：添加空值检查
            const speedLabel = record.mode && record.mode.includes('en') ? 'WPM' : 'CPM';

            return `
            <div class="history-item">
                <span class="date">${this._formatDate(record.createdAt)}</span>
                <span class="mode">${modeLabel}</span>
                <span class="article">${record.articleTitle || ''}</span>
                <span class="stats">
                    <span>${speedLabel} <span class="num">${speed}</span></span>
                    <span>准确率 <span class="num">${stats.accuracy || 0}%</span></span>
                    <span>正确 <span class="num">${stats.correct || 0}</span></span>
                    <span>错误 <span class="num">${stats.errors || 0}</span></span>
                </span>
            </div>
        `;
        }).join('');
    }

    _formatDate(timestamp) {
        if (!timestamp) return '--';
        const date = new Date(timestamp);
        return date.toLocaleString('zh-CN', {
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        });
    }
}