/**
 * 砚迹（YanTrace）- 用户偏好设置服务
 * 职责：管理每个用户的偏好设置，持久化到 localStorage
 */

import Storage from '../../utils/storage.js';

// ============================================
// 常量
// ============================================

const STORAGE_KEY = 'yantrace_settings';

// 默认设置
const DEFAULT_SETTINGS = {
    defaultMode: 'practice-cn',
    fontSize: 22,
    theme: 'dark'
};


// ============================================
// 设置服务类
// ============================================

class SettingsService {
    constructor() {
        this.settings = {};
        this._loaded = false;
    }

    /**
     * 加载所有设置
     * @returns {Object}
     */
    loadAll() {
        if (this._loaded) return this.settings;

        const data = Storage.get(STORAGE_KEY);
        this.settings = (data && typeof data === 'object') ? data : {};
        this._loaded = true;
        return this.settings;
    }

    /**
     * 获取用户设置
     * @param {string} userId
     * @returns {Object} 设置对象（合并默认值）
     */
    get(userId) {
        this.loadAll();
        const userSettings = this.settings[userId] || {};
        return { ...DEFAULT_SETTINGS, ...userSettings };
    }

    /**
     * 获取用户的单个设置项
     * @param {string} userId
     * @param {string} key - 设置键名
     * @param {*} defaultValue - 默认值
     * @returns {*}
     */
    getItem(userId, key, defaultValue) {
        const settings = this.get(userId);
        return settings[key] !== undefined ? settings[key] : defaultValue;
    }

    /**
     * 设置用户的单个设置项
     * @param {string} userId
     * @param {string} key - 设置键名
     * @param {*} value - 设置值
     * @returns {boolean}
     */
    setItem(userId, key, value) {
        this.loadAll();

        if (!this.settings[userId]) {
            this.settings[userId] = { ...DEFAULT_SETTINGS };
        }

        this.settings[userId][key] = value;
        this._save();
        return true;
    }

    /**
     * 批量更新用户设置
     * @param {string} userId
     * @param {Object} updates - 要更新的设置对象
     * @returns {boolean}
     */
    update(userId, updates) {
        this.loadAll();

        if (!this.settings[userId]) {
            this.settings[userId] = { ...DEFAULT_SETTINGS };
        }

        this.settings[userId] = { ...this.settings[userId], ...updates };
        this._save();
        return true;
    }

    /**
     * 重置用户设置为默认值
     * @param {string} userId
     * @returns {boolean}
     */
    reset(userId) {
        this.loadAll();
        this.settings[userId] = { ...DEFAULT_SETTINGS };
        this._save();
        return true;
    }

    /**
     * 删除用户设置（用户删除时调用）
     * @param {string} userId
     * @returns {boolean}
     */
    delete(userId) {
        this.loadAll();
        if (this.settings[userId]) {
            delete this.settings[userId];
            this._save();
        }
        return true;
    }

    /**
     * 获取默认设置
     * @returns {Object}
     */
    getDefaults() {
        return { ...DEFAULT_SETTINGS };
    }

    /**
     * 保存到 localStorage
     * @private
     */
    _save() {
        Storage.set(STORAGE_KEY, this.settings);
    }
}


// ============================================
// 导出
// ============================================

export default SettingsService;