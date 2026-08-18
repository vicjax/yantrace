/**
 * Records Model - 记录数据层
 * 职责：历史记录 CRUD + 数据格式化 + 数据分析
 */

import Storage from "../../utils/storage.js";
import Helpers from "../../utils/helpers.js";

const STORAGE_KEY = "yantrace_history";

export default class RecordsModel {
  constructor() {}

  // ============================================
  // 基础 CRUD
  // ============================================

  getAll() {
    return Storage.get(STORAGE_KEY, []);
  }

  getByUser(userId) {
    return this.getAll().filter((r) => r.userId === userId);
  }

  getRecentByUser(userId, limit = 50) {
    const records = this.getByUser(userId);
    return records
      .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
      .slice(0, limit);
  }

  getById(id) {
    return this.getAll().find((r) => r.id === id) || null;
  }

  add(record) {
    const all = this.getAll();
    all.push(record);
    Storage.set(STORAGE_KEY, all);
    return record;
  }

  addWithDedup(userId, mode, articleTitle, stats, threshold = 5000) {
    const recent = this.getRecentByUser(userId, 1);
    if (recent.length > 0) {
      const last = recent[0];
      const now = Date.now();
      if (now - last.createdAt < threshold && last.mode === mode) {
        console.log("[Records] 重复记录，跳过保存");
        return null;
      }
    }

    const record = {
      id: Helpers.generateId("rec"),
      userId,
      mode,
      articleTitle: articleTitle || "未知文章",
      stats: {
        correct: stats.correct || 0,
        errors: stats.errors || 0,
        fixed: stats.fixed || 0,
        backspaces: stats.backspaces || 0,
        keystrokes: stats.keystrokes || 0,
        elapsed: stats.elapsed || 0,
      },
      createdAt: Date.now(),
    };

    return this.add(record);
  }

  delete(id) {
    let all = this.getAll();
    all = all.filter((r) => r.id !== id);
    Storage.set(STORAGE_KEY, all);
    return true;
  }

  clearByUser(userId) {
    let all = this.getAll();
    all = all.filter((r) => r.userId !== userId);
    Storage.set(STORAGE_KEY, all);
    return true;
  }

  // ============================================
  // 导出功能
  // ============================================

  exportCSV(userId) {
    const records = this.getByUser(userId);
    if (records.length === 0) return null;

    const headers = [
      "日期",
      "模式",
      "文章",
      "速度",
      "净速度",
      "准确率",
      "KPM",
      "用时",
      "正确",
      "错误",
      "改正",
      "退格",
      "击键",
    ];

    const rows = records.map((r) => {
      const stats = r.stats || {};
      const isChinese = r.mode === "practice-cn" || r.mode === "input-cn";
      const totalCorrect = (stats.correct || 0) + (stats.fixed || 0);
      const processed =
        (stats.correct || 0) + (stats.errors || 0) + (stats.fixed || 0);
      const minutes = (stats.elapsed || 0) / 60;
      const accuracy =
        processed === 0 ? 100 : Math.round((totalCorrect / processed) * 100);
      const speed =
        minutes > 0
          ? isChinese
            ? Math.round(totalCorrect / minutes)
            : Math.round(totalCorrect / 5 / minutes)
          : 0;
      const netSpeed = Math.round(speed * (accuracy / 100));
      const kpm =
        minutes > 0 ? Math.round((stats.keystrokes || 0) / minutes) : 0;

      return [
        new Date(r.createdAt).toLocaleString(),
        r.mode === "practice-cn"
          ? "中文练习"
          : r.mode === "practice-en"
            ? "英文练习"
            : r.mode,
        r.articleTitle || "",
        speed,
        netSpeed,
        accuracy,
        kpm,
        stats.elapsed || 0,
        stats.correct || 0,
        stats.errors || 0,
        stats.fixed || 0,
        stats.backspaces || 0,
        stats.keystrokes || 0,
      ].join(",");
    });

    return [headers.join(","), ...rows].join("\n");
  }

  getSummary(userId) {
    const records = this.getByUser(userId);
    if (records.length === 0) {
      return {
        total: 0,
        avgSpeed: 0,
        maxSpeed: 0,
        avgAccuracy: 0,
        totalCorrect: 0,
        totalErrors: 0,
      };
    }

    let totalSpeed = 0,
      maxSpeed = 0,
      totalAccuracy = 0,
      totalCorrect = 0,
      totalErrors = 0;

    records.forEach((r) => {
      const stats = r.stats || {};
      const isChinese = r.mode === "practice-cn" || r.mode === "input-cn";
      const totalCorrectVal = (stats.correct || 0) + (stats.fixed || 0);
      const processed =
        (stats.correct || 0) + (stats.errors || 0) + (stats.fixed || 0);
      const minutes = (stats.elapsed || 0) / 60;
      const accuracy =
        processed === 0 ? 100 : Math.round((totalCorrectVal / processed) * 100);
      const speed =
        minutes > 0
          ? isChinese
            ? Math.round(totalCorrectVal / minutes)
            : Math.round(totalCorrectVal / 5 / minutes)
          : 0;

      totalSpeed += speed;
      if (speed > maxSpeed) maxSpeed = speed;
      totalAccuracy += accuracy;
      totalCorrect += totalCorrectVal;
      totalErrors += stats.errors || 0;
    });

    return {
      total: records.length,
      avgSpeed: Math.round(totalSpeed / records.length),
      maxSpeed: maxSpeed,
      avgAccuracy: Math.round(totalAccuracy / records.length),
      totalCorrect,
      totalErrors,
    };
  }

  // ============================================
  // 数据格式化
  // ============================================

  formatRecord(record) {
    if (!record || !record.stats) return null;

    const stats = record.stats;
    const isChinese =
      record.mode === "practice-cn" || record.mode === "input-cn";

    const processed =
      (stats.correct || 0) + (stats.errors || 0) + (stats.fixed || 0);
    const totalCorrect = (stats.correct || 0) + (stats.fixed || 0);
    const minutes = (stats.elapsed || 0) / 60;

    const speed =
      minutes > 0
        ? isChinese
          ? Math.round(totalCorrect / minutes)
          : Math.round(totalCorrect / 5 / minutes)
        : 0;
    const accuracy =
      processed === 0 ? 100 : Math.round((totalCorrect / processed) * 100);
    const netSpeed = Math.round(speed * (accuracy / 100));
    const rawSpeed = minutes > 0 ? Math.round(processed / minutes) : 0;
    const kpm = minutes > 0 ? Math.round((stats.keystrokes || 0) / minutes) : 0;

    return {
      id: record.id,
      mode: record.mode,
      articleTitle: record.articleTitle || "未知文章",
      createdAt: record.createdAt || Date.now(),

      speed,
      speedLabel: isChinese ? "CPM" : "WPM",
      netSpeed,
      rawSpeed,
      accuracy,
      kpm,
      peakSpeed: stats.peakSpeed || 0,

      correct: stats.correct || 0,
      errors: stats.errors || 0,
      fixed: stats.fixed || 0,
      backspaces: stats.backspaces || 0,
      keystrokes: stats.keystrokes || 0,
      elapsed: stats.elapsed || 0,

      backspaceRate:
        (stats.keystrokes || 0) > 0
          ? Math.round(
              ((stats.backspaces || 0) / (stats.keystrokes || 0)) * 100,
            )
          : 0,
      kspc:
        totalCorrect > 0
          ? parseFloat(((stats.keystrokes || 0) / totalCorrect).toFixed(2))
          : 0,
      netKeystrokes: (stats.keystrokes || 0) - (stats.backspaces || 0),
      fixRate:
        processed > 0 ? Math.round(((stats.fixed || 0) / processed) * 100) : 0,
      fixSuccessRate:
        (stats.errors || 0) + (stats.fixed || 0) > 0
          ? Math.round(
              ((stats.fixed || 0) /
                ((stats.errors || 0) + (stats.fixed || 0))) *
                100,
            )
          : 0,
      charsPerBackspace:
        (stats.backspaces || 0) > 0
          ? parseFloat((processed / (stats.backspaces || 0)).toFixed(1))
          : 0,
    };
  }

  getRecentComparison(records, currentNetSpeed) {
    const speeds = records
      .filter((r) => r.stats)
      .map((r) => {
        const stats = r.stats || {};
        const isEn = r.mode === "practice-en" || r.mode === "input-en";
        const totalCorrect = (stats.correct || 0) + (stats.fixed || 0);
        const processed =
          (stats.correct || 0) + (stats.errors || 0) + (stats.fixed || 0);
        const minutes = (stats.elapsed || 0) / 60;
        if (minutes <= 0) return 0;
        const accuracy =
          processed === 0 ? 100 : Math.round((totalCorrect / processed) * 100);
        const rawSpeed = isEn
          ? Math.round(totalCorrect / 5 / minutes)
          : Math.round(totalCorrect / minutes);
        return Math.round(rawSpeed * (accuracy / 100));
      })
      .filter((s) => s > 0)
      .slice(0, 10);

    return {
      max: speeds.length > 0 ? Math.max(...speeds) : 0,
      min: speeds.length > 0 ? Math.min(...speeds) : 0,
      avg:
        speeds.length > 0
          ? Math.round(speeds.reduce((a, b) => a + b, 0) / speeds.length)
          : 0,
      rank:
        speeds.length > 0
          ? speeds.filter((s) => s > currentNetSpeed).length + 1
          : 0,
      total: speeds.length,
    };
  }
}
