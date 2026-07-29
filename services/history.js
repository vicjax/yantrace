/**
 * 砚迹（YanTrace）- 历史记录服务
 * 职责：管理历史记录的增删改查、统计，持久化到 localStorage
 */

import Storage from '../utils/storage.js';
import Helpers from '../utils/helpers.js';

// ============================================
// 常量
// ============================================

const STORAGE_KEY = 'yantrace_history';


// ============================================
// 历史记录服务类
// ============================================

class HistoryService {
    constructor() {
        this.records = [];
        this._loaded = false;
    }

    /**
     * 加载所有历史记录
     * @returns {Array}
     */
    loadAll() {
        if (this._loaded) return this.records;

        const data = Storage.get(STORAGE_KEY);
        this.records = (data && data.length > 0) ? data : [];
        this._loaded = true;
        return this.records;
    }

    /**
     * 获取所有记录
     * @returns {Array}
     */
    getAll() {
        if (!this._loaded) this.loadAll();
        return this.records;
    }

    /**
     * 获取指定用户的历史记录
     * @param {string} userId
     * @returns {Array}
     */
    getByUser(userId) {
        return this.getAll().filter(r => r.userId === userId);
    }

    /**
     * 获取指定模式的历史记录
     * @param {string} mode - 'practice-cn' 或 'practice-en'
     * @returns {Array}
     */
    getByMode(mode) {
        return this.getAll().filter(r => r.mode === mode);
    }

    /**
     * 获取指定用户的最近记录（默认最近 20 条）
     * @param {string} userId
     * @param {number} limit - 数量限制
     * @returns {Array}
     */
    getRecentByUser(userId, limit = 20) {
        const records = this.getByUser(userId);
        return records
            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
            .slice(0, limit);
    }

    /**
     * 添加一条历史记录
     * @param {Object} data - 记录数据
     * @param {string} data.userId - 用户 ID
     * @param {string} data.mode - 'practice-cn' 或 'practice-en'
     * @param {string} data.articleTitle - 文章标题
     * @param {Object} data.stats - 统计数据
     * @returns {Object} 创建的记录
     */
    add(data) {
        const record = {
            id: Helpers.generateId('rec'),
            userId: data.userId,
            mode: data.mode,
            articleTitle: data.articleTitle || '',
            stats: {
                correct: data.stats?.correct || 0,
                errors: data.stats?.errors || 0,
                backspaces: data.stats?.backspaces || 0,
                keystrokes: data.stats?.keystrokes || 0,
                elapsed: data.stats?.elapsed || 0,
                accuracy: data.stats?.accuracy || 0,
                cpm: data.stats?.cpm || 0,
                wpm: data.stats?.wpm || 0,
                kpm: data.stats?.kpm || 0
            },
            createdAt: new Date().toISOString()
        };

        this.records.push(record);
        this._save();
        return record;
    }

    /**
     * 删除一条记录
     * @param {string} id
     * @returns {boolean}
     */
    delete(id) {
        const index = this.records.findIndex(r => r.id === id);
        if (index === -1) return false;

        this.records.splice(index, 1);
        this._save();
        return true;
    }

    /**
     * 删除指定用户的所有记录
     * @param {string} userId
     * @returns {number} 删除的数量
     */
    deleteByUser(userId) {
        const before = this.records.length;
        this.records = this.records.filter(r => r.userId !== userId);
        const deleted = before - this.records.length;
        if (deleted > 0) this._save();
        return deleted;
    }

    /**
     * 清空所有记录
     * @returns {boolean}
     */
    clearAll() {
        this.records = [];
        this._save();
        return true;
    }

    /**
     * 获取记录总数
     * @returns {number}
     */
    count() {
        return this.getAll().length;
    }

    /**
     * 获取用户的练习总次数
     * @param {string} userId
     * @returns {number}
     */
    getTotalPractices(userId) {
        return this.getByUser(userId).length;
    }

    /**
     * 获取用户的统计摘要
     * @param {string} userId
     * @returns {Object} { totalPractices, totalCorrect, avgAccuracy, avgWpm, avgCpm, bestWpm, bestCpm }
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
                bestCpm: 0
            };
        }

        const totalCorrect = records.reduce((sum, r) => sum + r.stats.correct, 0);
        const avgAccuracy = Math.round(records.reduce((sum, r) => sum + r.stats.accuracy, 0) / records.length);
        const avgWpm = Math.round(records.reduce((sum, r) => sum + r.stats.wpm, 0) / records.length);
        const avgCpm = Math.round(records.reduce((sum, r) => sum + r.stats.cpm, 0) / records.length);
        const bestWpm = Math.max(...records.map(r => r.stats.wpm));
        const bestCpm = Math.max(...records.map(r => r.stats.cpm));

        return {
            totalPractices: records.length,
            totalCorrect,
            avgAccuracy,
            avgWpm,
            avgCpm,
            bestWpm,
            bestCpm
        };
    }

    /**
     * 导出为 CSV
     * @param {string} userId
     * @returns {string} CSV 字符串
     */
    exportCSV(userId) {
        const records = this.getByUser(userId);
        if (records.length === 0) return '';

        const headers = ['日期', '模式', '文章', '正确', '错误', '退格', '准确率', 'WPM', 'CPM', 'KPM', '用时(秒)'];
        const rows = records.map(r => [
            Helpers.formatDate(r.createdAt),
            r.mode === 'practice-cn' ? '中文练习' : '英文练习',
            r.articleTitle,
            r.stats.correct,
            r.stats.errors,
            r.stats.backspaces,
            r.stats.accuracy + '%',
            r.stats.wpm,
            r.stats.cpm,
            r.stats.kpm,
            r.stats.elapsed
        ]);

        return [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
    }

    /**
     * 保存到 localStorage
     * @private
     */
    _save() {
        Storage.set(STORAGE_KEY, this.records);
    }
}


// ============================================
// 导出
// ============================================

export default HistoryService;