/**
 * Records Presenter - 记录展示器
 */

import RecordsModel from "./RecordsModel.js";
import RecordsView from "./RecordsView.js";
import Modal from "../../modules/Modal.js";

export default class RecordsPresenter {
  constructor(options = {}) {
    this.historyService = options.historyService;
    this.userService = options.userService;
    this.onBack = options.onBack || null;

    this.model = new RecordsModel();
    this.view = new RecordsView();

    this.currentRecords = [];
    this.selectedRecord = null;
    this.selectedId = null;

    this.view.setCallbacks(
      (id) => this._handleSelectRecord(id),
      () => this._handleCopy(),
      () => this._handleBack(),
      () => this._handleExport(),
      () => this._handleDelete(),
      () => this._handleClear(),
    );
  }

  getRecords() {
    const user = this.userService?.getCurrent();
    if (!user) return [];
    return this.model.getByUser(user.id);
  }

  render(container, highlightId = null) {
    const user = this.userService?.getCurrent();
    if (!user) {
      this.view.render(container, [], null);
      return;
    }

    const records = this.model.getRecentByUser(user.id, 50);
    this.currentRecords = records;

    let selectedId = highlightId;
    if (!selectedId && records.length > 0) {
      selectedId = records[0].id;
    }

    this.selectedId = selectedId;
    this.view.render(container, records, selectedId);

    if (selectedId) {
      this._loadRecordDetail(selectedId);
    }
  }

  refresh(highlightId = null) {
    const user = this.userService?.getCurrent();
    if (!user) return;

    const records = this.model.getRecentByUser(user.id, 50);
    this.currentRecords = records;

    let selectedId = highlightId;
    if (!selectedId && records.length > 0) {
      selectedId = records[0].id;
    }

    this.selectedId = selectedId;

    // ⭐ 重新渲染，传入空记录时显示空状态
    this.view.render(this.view.container, records, selectedId);

    if (selectedId) {
      this._loadRecordDetail(selectedId);
    } else {
      // ⭐ 没有记录时，清空详情区
      this.view.updateDetail(null);
    }
  }

  _loadRecordDetail(recordId) {
    const record = this.currentRecords.find((r) => r.id === recordId);
    if (!record) {
      this.view.updateDetail(null);
      return;
    }

    this.selectedRecord = record;
    const data = this.model.formatRecord(record);
    const otherRecords = this.currentRecords.filter((r) => r.id !== recordId);
    const comparison = this.model.getRecentComparison(
      otherRecords,
      data.netSpeed,
    );

    this.view.updateDetail(data, comparison);
  }

  _handleSelectRecord(recordId) {
    this.selectedId = recordId;
    this.view.updateListSelection(recordId);
    this._loadRecordDetail(recordId);
  }

  async _handleCopy() {
    if (!this.selectedRecord) {
      await Modal.alert('请先选择一条记录');
      return;
    }

    const data = this.model.formatRecord(this.selectedRecord);
    const user = this.userService?.getCurrent();
    let comparison = { max: 0, min: 0, avg: 0, rank: 0, total: 0 };

    if (user) {
      const records = this.model.getRecentByUser(user.id, 50);
      const otherRecords = records.filter(
        (r) => r.id !== this.selectedRecord.id,
      );
      comparison = this.model.getRecentComparison(otherRecords, data.speed);
    }

    const text = this._formatResultText(data, comparison);

    // ⭐ 用稳定方案替代 navigator.clipboard
    try {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.left = "-9999px";
      ta.style.top = "-9999px";
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      ta.remove();
      await Modal.alert('结果已复制到剪贴板！', '📋 复制成功');
    } catch (e) {
      console.error("复制失败:", e);
      await Modal.alert('复制失败，请手动复制', '❌ 复制失败');
    }
  }

  async _handleExport() {
    const user = this.userService?.getCurrent();
    if (!user) return;
    const csv = this.model.exportCSV(user.id);
    if (!csv) {
      await Modal.alert('暂无历史记录可导出');
      return;
    }
    const blob = new Blob(["\uFEFF" + csv], {
      type: "text/csv;charset=utf-8;",
    });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `砚迹_历史记录_${user.name}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  }

  async _handleDelete() {
    if (!this.selectedRecord) {
      await Modal.alert('请先选择一条记录');
      return;
    }
    if (!await Modal.confirm('确定要删除这条记录吗？')) return;
    this.model.delete(this.selectedRecord.id);
    // ⭐ 删除后刷新，不传 highlightId，自动选第一条（如果有）
    this.refresh();
  }

  async _handleClear() {
    const user = this.userService?.getCurrent();
    if (!user) return;
    if (!await Modal.confirm('确定要清空所有历史记录吗？此操作不可恢复！')) return;
    this.model.clearByUser(user.id);
    // ⭐ 清空后刷新
    this.refresh();
  }

  _formatResultText(data, comparison) {
    const rankText =
      comparison.total > 0 ? `${comparison.rank}/${comparison.total}` : "--";
    const dateStr = new Date(data.createdAt).toLocaleString("zh-CN", {
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });

    return `📊 打字统计结果
─────────────────────────────────────
速度: ${data.speed} ${data.speedLabel}
净速度: ${data.netSpeed}  ·  毛速度: ${data.rawSpeed}
准确率: ${data.accuracy}%  ·  KPM: ${data.kpm}  ·  峰值: ${data.peakSpeed}
用时: ${data.elapsed}s  ·  退格率: ${data.backspaceRate}%
KSPC: ${data.kspc}  ·  净击键: ${data.netKeystrokes}
─────────────────────────────────────
✅ 正确: ${data.correct}  ❌ 错误: ${data.errors}  🔄 改正: ${data.fixed}
⌫ 退格: ${data.backspaces}  ⌨️ 击键: ${data.keystrokes}
─────────────────────────────────────
📈 近10次对比: 本次 ${data.speed}  ·  最高 ${comparison.max}  ·  最低 ${comparison.min}  ·  平均 ${comparison.avg}  ·  排名 ${rankText}
📄 ${data.articleTitle}  ·  📅 ${dateStr}`;
  }

  _handleBack() {
    if (this.onBack) {
      this.onBack();
    } else if (window.app?.navigator) {
      window.app.navigator.goTo("home");
    }
  }

  destroy() {
    this.view.destroy();
  }
}
