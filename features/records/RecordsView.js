/**
 * Records View - 记录视图
 * 职责：左侧列表 + 右侧详情 UI 渲染
 */

export default class RecordsView {
  constructor() {
    this.container = null;
    this.records = [];
    this.selectedId = null;
    this.onSelectRecord = null;
    this.onCopy = null;
    this.onBack = null;
    this.onExport = null;
    this.onDelete = null;
    this.onClear = null;
  }

  setCallbacks(onSelectRecord, onCopy, onBack, onExport, onDelete, onClear) {
    this.onSelectRecord = onSelectRecord;
    this.onCopy = onCopy;
    this.onBack = onBack;
    this.onExport = onExport;
    this.onDelete = onDelete;
    this.onClear = onClear;
  }

  render(container, records, selectedId) {
    this.container = container;
    const sorted = [...records].sort(
      (a, b) => (b.createdAt || 0) - (a.createdAt || 0),
    );
    this.records = sorted;

    const defaultId = selectedId || (sorted.length > 0 ? sorted[0].id : null);
    this.selectedId = defaultId;

    container.innerHTML = this._getHtml(this.records, defaultId);
    this._bindEvents();
    this._renderList(this.records, defaultId);

    if (defaultId) {
      const record = this.records.find((r) => r.id === defaultId);
      if (record && this.onSelectRecord) {
        this.onSelectRecord(defaultId);
      }
    }
  }

  updateDetail(recordData, comparison) {
    const detailEl = this.container?.querySelector(".records-detail");
    if (!detailEl) return;
    if (!recordData) {
      detailEl.innerHTML = `<div class="records-detail-empty">请选择一条记录</div>`;
      return;
    }
    detailEl.innerHTML = this._getDetailHtml(recordData, comparison);
    // this._bindDetailEvents();  // ⭐ 已删除
  }

  updateListSelection(selectedId) {
    this.selectedId = selectedId;
    this.container?.querySelectorAll(".records-list-item").forEach((el) => {
      el.classList.toggle("active", el.dataset.id === selectedId);
    });
  }

  _getHtml(records, selectedId) {
    return `
            <div class="records-page">
                <div class="records-header">
                    <button class="btn btn-back back-btn" data-target="home">← 返回</button>
                    <span class="records-title">📊 历史记录</span>
                    <div class="records-header-actions">
                        <button class="records-btn-header" data-action="export">📥 导出CSV</button>
                        <button class="records-btn-header" data-action="copy">📋 复制结果</button>
                        <button class="records-btn-header danger" data-action="delete">🗑️ 删除记录</button>
                        <button class="records-btn-header danger" data-action="clear">🗑️ 清空记录</button>
                    </div>
                </div>
                <div class="records-body">
                    <div class="records-list">
                        <div class="records-list-header">
                            <span>记录列表</span>
                            <span class="records-count">${records.length} 条</span>
                        </div>
                        <div class="records-list-items" id="recordsList">
                            ${records.length === 0 ? '<div class="records-empty">暂无记录</div>' : ""}
                        </div>
                    </div>
                    <div class="records-detail">
                        <div class="records-detail-empty">请选择一条记录</div>
                    </div>
                </div>
            </div>
        `;
  }

  _renderList(records, selectedId) {
    const listEl = this.container?.querySelector(".records-list-items");
    if (!listEl || records.length === 0) return;

    listEl.innerHTML = records
      .map((record) => {
        const isChinese =
          record.mode === "practice-cn" || record.mode === "input-cn";
        const stats = record.stats || {};
        const totalCorrect = (stats.correct || 0) + (stats.fixed || 0);
        const processed =
          (stats.correct || 0) + (stats.errors || 0) + (stats.fixed || 0);
        const minutes = (stats.elapsed || 0) / 60;
        const accuracy =
          processed === 0 ? 100 : Math.round((totalCorrect / processed) * 100);
        const rawSpeed =
          minutes > 0
            ? isChinese
              ? Math.round(totalCorrect / minutes)
              : Math.round(totalCorrect / 5 / minutes)
            : 0;
        const speed = Math.round(rawSpeed * (accuracy / 100));
        const speedLabel = isChinese ? "CPM" : "WPM";
        const date = this._formatDate(record.createdAt);

        return `
                <div class="records-list-item ${record.id === selectedId ? "active" : ""}" data-id="${record.id}">
                    <span class="records-item-title">${record.articleTitle || "未知文章"}</span>
                    <span class="records-item-speed">${speed} ${speedLabel} · ${date}</span>
                </div>
            `;
      })
      .join("");

    listEl.querySelectorAll(".records-list-item").forEach((el) => {
      el.addEventListener("click", () => {
        const id = el.dataset.id;
        if (this.onSelectRecord) this.onSelectRecord(id);
      });
    });
  }

  _getDetailHtml(data, comparison) {
    const dateStr = this._formatDate(data.createdAt);
    const rankText =
      comparison.total > 0 ? `${comparison.rank}/${comparison.total}` : "--";
    // 第 145-150 行
    const modeLabel =
      data.mode === "practice-cn"
        ? "中文练习"
        : data.mode === "practice-en"
          ? "英文练习"
          : data.mode === "practice-phrase"
            ? "词组练习"
            : data.mode;
    const totalChars = data.correct + data.errors + data.fixed;

    return `
        <div class="records-detail-content">
            <div class="records-detail-header">
                <span class="records-detail-title">📊 ${modeLabel} · ${dateStr}</span>
                <span class="records-detail-article-info">${data.articleTitle} · ${totalChars}字</span>
            </div>

           <div class="records-detail-speed-wrapper">
                <div class="records-detail-speed">
                    <span class="records-detail-number">${data.netSpeed}</span>
                    <span class="records-detail-label">
                        ${data.speedLabel} <span style="font-size:12px;color:var(--text-muted);font-weight:normal;">毛速度 ${data.speed}</span>
                    </span>
                </div>
            </div>
            <div class="records-detail-stats">
                <div class="records-stat-item">
                    <span class="records-stat-number">${data.accuracy}%</span>
                    <span class="records-stat-label">准确率</span>
                </div>
                <div class="records-stat-item">
                    <span class="records-stat-number">${data.kpm}</span>
                    <span class="records-stat-label">KPM</span>
                </div>
                <div class="records-stat-item">
                    <span class="records-stat-number">${data.peakSpeed}</span>
                    <span class="records-stat-label">峰值</span>
                </div>
            </div>

            <div class="records-detail-divider"></div>

            <div class="records-detail-section">📝 基础指标</div>
            <div class="records-detail-row">
                <span>✅ 正确 <b>${data.correct}</b></span>
                <span>❌ 错误 <b>${data.errors}</b></span>
                <span>🔄 改正 <b>${data.fixed}</b></span>
                <span>⌫ 退格 <b>${data.backspaces}</b></span>
                <span>⌨️ 击键 <b>${data.keystrokes}</b></span>
                <span>⏱ 用时 <b>${data.elapsed}s</b></span>
            </div>

            <div class="records-detail-divider"></div>

            <div class="records-detail-section">📊 效率指标</div>
            <div class="records-detail-row">
                <span>KSPC <b>${data.kspc}</b></span>
                <span>退格率 <b>${data.backspaceRate}%</b></span>
                <span>净击键 <b>${data.netKeystrokes}</b></span>
            </div>

            <div class="records-detail-divider"></div>

            <div class="records-detail-section">📈 近10次对比</div>
            <div class="records-detail-row">
                <span>本次 <b>${data.netSpeed}</b></span>
                <span>最高 <b>${comparison.max}</b></span>
                <span>最低 <b>${comparison.min}</b></span>
                <span>平均 <b>${comparison.avg}</b></span>
                <span>排名 <b>${rankText}</b></span>
            </div>
        </div>
    `;
  }

  _bindEvents() {
    const container = this.container;
    if (!container) return;

    container
      .querySelector('[data-action="export"]')
      ?.addEventListener("click", () => {
        if (this.onExport) this.onExport();
      });

    container
      .querySelector('[data-action="copy"]')
      ?.addEventListener("click", () => {
        if (this.onCopy) this.onCopy();
      });

    container
      .querySelector('[data-action="delete"]')
      ?.addEventListener("click", () => {
        if (this.onDelete) this.onDelete();
      });

    container
      .querySelector('[data-action="clear"]')
      ?.addEventListener("click", () => {
        if (this.onClear) this.onClear();
      });
  }

  _formatDate(timestamp) {
    if (!timestamp) return "--";
    const date = new Date(timestamp);
    return date.toLocaleString("zh-CN", {
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  destroy() {
    this.container = null;
  }

  updateList(records, selectedId) {
    this.records = records;
    this.selectedId = selectedId;
    this._renderList(records, selectedId);
  }
}
