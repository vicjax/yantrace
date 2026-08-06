/**
 * 砚迹（YanTrace）- 历史记录服务
 * 职责：管理历史记录的增删改查、统计，持久化到 localStorage
 */

import Storage from "../../utils/storage.js";
import Helpers from "../../utils/helpers.js";

const STORAGE_KEY = "yantrace_history";

class HistoryService {
  constructor() {
    this.records = [];
    this._loaded = false;
  }

  /**
   * 加载所有历史记录
   */
  loadAll() {
    if (this._loaded) return this.records;

    const data = Storage.get(STORAGE_KEY);
    this.records = data && data.length > 0 ? data : [];
    this._loaded = true;
    return this.records;
  }

  /**
   * 获取所有记录
   */
  getAll() {
    if (!this._loaded) this.loadAll();
    return this.records;
  }

  /**
   * 获取指定用户的历史记录
   */
  getByUser(userId) {
    return this.getAll().filter((r) => r.userId === userId);
  }

  /**
   * 获取指定模式的历史记录
   */
  getByMode(mode) {
    return this.getAll().filter((r) => r.mode === mode);
  }

  /**
   * 获取指定用户的最近记录
   */
  getRecentByUser(userId, limit = 20) {
    const records = this.getByUser(userId);
    return records
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, limit);
  }

  /**
   * 添加一条历史记录
   */

  // features/history/Model.js

  /**
   * 添加历史记录（含去重）
   */
  addWithDedup(userId, mode, articleTitle, stats, threshold = 5000) {
    // 1. 去重检查
    const recent = this.getRecentByUser(userId, 1);
    if (recent.length > 0) {
      const last = recent[0];
      const lastTime = new Date(last.createdAt).getTime();
      const now = Date.now();
      if (now - lastTime < threshold && last.mode === mode) {
        console.log("[History] 重复记录，跳过保存");
        return null;
      }
    }

    // 2. 格式化数据
    const record = {
      userId: userId,
      mode: mode,
      articleTitle: articleTitle || "未知文章",
      stats: {
        correct: stats.correct || 0,
        errors: stats.errors || 0,
        fixed: stats.fixed || 0,
        backspaces: stats.backspaces || 0,
        keystrokes: stats.keystrokes || 0,
        elapsed: stats.elapsed || 0,
      },
    };

    // 3. 保存
    try {
      const result = this.add(record);
      console.log("✅ 历史记录已保存");
      return result;
    } catch (error) {
      console.error("[History] 保存历史失败:", error);
      return null;
    }
  }

  add(data) {
    const record = {
      id: Helpers.generateId("rec"),
      userId: data.userId,
      mode: data.mode,
      articleTitle: data.articleTitle || "",
      stats: {
        // 基础
        correct: data.stats?.correct || 0,
        errors: data.stats?.errors || 0,
        fixed: data.stats?.fixed || 0,
        backspaces: data.stats?.backspaces || 0,
        keystrokes: data.stats?.keystrokes || 0,
        elapsed: data.stats?.elapsed || 0,
        // 速度
        cpm: data.stats?.cpm || 0,
        wpm: data.stats?.wpm || 0,
        kpm: data.stats?.kpm || 0,
        netCpm: data.stats?.netCpm || 0,
        netWpm: data.stats?.netWpm || 0,
        // 准确率
        actualAccuracy: data.stats?.actualAccuracy || 0,
        // 效率
        kspc: data.stats?.kspc || 0,
        backspaceRate: data.stats?.backspaceRate || 0,
        // 录入专用
        charCount: data.stats?.charCount || 0,
      },
      createdAt: new Date().toISOString(),
    };

    this.records.push(record);
    this._save();
    return record;
  }

  /**
   * 删除一条记录
   */
  delete(id) {
    const index = this.records.findIndex((r) => r.id === id);
    if (index === -1) return false;

    this.records.splice(index, 1);
    this._save();
    return true;
  }

  /**
   * 删除指定用户的所有记录
   */
  deleteByUser(userId) {
    const before = this.records.length;
    this.records = this.records.filter((r) => r.userId !== userId);
    const deleted = before - this.records.length;
    if (deleted > 0) this._save();
    return deleted;
  }

  /**
   * 清空所有记录
   */
  clearAll() {
    this.records = [];
    this._save();
    return true;
  }

  /**
   * 获取记录总数
   */
  count() {
    return this.getAll().length;
  }

  /**
   * 获取用户的练习总次数
   */
  getTotalPractices(userId) {
    return this.getByUser(userId).length;
  }

  /**
   * 获取用户的统计摘要
   */
  getSummary(userId) {
    const records = this.getByUser(userId);
    if (records.length === 0) {
      return {
        totalPractices: 0,
        totalCorrect: 0,
        avgAccuracy: 0,
        avgWpm: 0,
        avgCpm: 0,
        bestWpm: 0,
        bestCpm: 0,
      };
    }

    // 正确总数 = correct + fixed
    const totalCorrect = records.reduce(
      (sum, r) => sum + (r.stats.correct || 0) + (r.stats.fixed || 0),
      0,
    );
    const avgAccuracy = Math.round(
      records.reduce(
        (sum, r) => sum + (r.stats.actualAccuracy || r.stats.accuracy || 0),
        0,
      ) / records.length,
    );
    const avgWpm = Math.round(
      records.reduce((sum, r) => sum + (r.stats.wpm || 0), 0) / records.length,
    );
    const avgCpm = Math.round(
      records.reduce((sum, r) => sum + (r.stats.cpm || 0), 0) / records.length,
    );
    const bestWpm = Math.max(...records.map((r) => r.stats.wpm || 0));
    const bestCpm = Math.max(...records.map((r) => r.stats.cpm || 0));

    return {
      totalPractices: records.length,
      totalCorrect,
      avgAccuracy,
      avgWpm,
      avgCpm,
      bestWpm,
      bestCpm,
    };
  }

  /**
   * 导出为 CSV
   */
  exportCSV(userId) {
    const records = this.getByUser(userId);
    if (records.length === 0) return "";

    const headers = [
      "日期",
      "模式",
      "文章",
      "正确",
      "错误",
      "改正",
      "退格",
      "击键",
      "准确率",
      "WPM",
      "CPM",
      "净WPM",
      "净CPM",
      "KPM",
      "KSPC",
      "退格率",
      "用时(秒)",
    ];
    const rows = records.map((r) => [
      Helpers.formatDate(r.createdAt),
      r.mode === "practice-cn"
        ? "中文练习"
        : r.mode === "practice-en"
          ? "英文练习"
          : r.mode === "input-cn"
            ? "中文录入"
            : "英文录入",
      r.articleTitle,
      r.stats.correct || 0,
      r.stats.errors || 0,
      r.stats.fixed || 0,
      r.stats.backspaces || 0,
      r.stats.keystrokes || 0,
      (r.stats.actualAccuracy || r.stats.accuracy || 0) + "%",
      r.stats.wpm || 0,
      r.stats.cpm || 0,
      r.stats.netWpm || 0,
      r.stats.netCpm || 0,
      r.stats.kpm || 0,
      r.stats.kspc || 0,
      (r.stats.backspaceRate || 0) + "%",
      r.stats.elapsed || 0,
    ]);

    return [headers.join(","), ...rows.map((row) => row.join(","))].join("\n");
  }

  /**
   * 保存到 localStorage
   */
  _save() {
    Storage.set(STORAGE_KEY, this.records);
  }
}

export default HistoryService;
