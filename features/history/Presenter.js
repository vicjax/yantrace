/**
 * HistoryPresenter - 历史记录展示器
 * 职责：业务逻辑（加载历史、导出、清空）
 */
import BasePresenter from '../../core/BasePresenter.js';
import HistoryView from './View.js';

export default class HistoryPresenter extends BasePresenter {
    constructor(options = {}) {
        super(options);
        this.historyService = options.historyService;
        this.userService = options.userService;

        this.view = new HistoryView({
            onExport: () => this._handleExport(),
            onClear: () => this._handleClear()
        });
    }

    render(container) {
        super.render(container);
        this._loadHistory();
    }

    refresh() {
        this._loadHistory();
    }

    destroy() {
        super.destroy();
    }

    // ============================================
    // 私有方法
    // ============================================

    _loadHistory() {
        const user = this.userService.getCurrent();
        if (!user) {
            this.view.updateList([]);
            return;
        }

        const records = this.historyService.getRecentByUser(user.id, 50);
        this.view.updateList(records);
    }

    _handleExport() {
        const user = this.userService.getCurrent();
        if (!user) {
            alert('请先登录');
            return;
        }

        const csv = this.historyService.exportCSV(user.id);
        if (!csv) {
            alert('暂无历史记录可导出');
            return;
        }

        const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `砚迹_历史记录_${user.name}.csv`;
        link.click();
        URL.revokeObjectURL(link.href);
    }

    _handleClear() {
        const user = this.userService.getCurrent();
        if (!user) return;

        if (!confirm('确定要清空所有历史记录吗？此操作不可恢复！')) return;

        const records = this.historyService.getByUser(user.id);
        records.forEach(record => {
            this.historyService.delete(record.id);
        });

        this._loadHistory();
        alert('✅ 历史记录已清空');
    }
}