/**
 * 砚迹（YanTrace）- 存储工具
 * 职责：封装 localStorage 读写操作
 */

// ============================================
// 存储工具对象
// ============================================

const Storage = {
    /**
     * 检查 localStorage 是否可用
     */
    isAvailable() {
        try {
            localStorage.setItem('_test_', '1');
            localStorage.removeItem('_test_');
            return true;
        } catch {
            return false;
        }
    },

    /**
     * 读取数据
     * @param {string} key - 存储键名
     * @param {*} defaultValue - 默认值（数据不存在或解析失败时返回）
     * @returns {*} 解析后的数据
     */
    get(key, defaultValue = null) {
        try {
            const data = localStorage.getItem(key);
            if (data === null) return defaultValue;
            return JSON.parse(data);
        } catch (e) {
            console.warn(`[Storage] 读取 ${key} 失败:`, e);
            return defaultValue;
        }
    },

    /**
     * 写入数据
     * @param {string} key - 存储键名
     * @param {*} value - 要存储的数据
     * @returns {boolean} 是否成功
     */
    set(key, value) {
        try {
            localStorage.setItem(key, JSON.stringify(value));
            return true;
        } catch (e) {
            console.warn(`[Storage] 写入 ${key} 失败:`, e);
            return false;
        }
    },

    /**
     * 删除数据
     * @param {string} key - 存储键名
     * @returns {boolean} 是否成功
     */
    remove(key) {
        try {
            localStorage.removeItem(key);
            return true;
        } catch (e) {
            console.warn(`[Storage] 删除 ${key} 失败:`, e);
            return false;
        }
    },

    /**
     * 清空所有数据
     * @returns {boolean} 是否成功
     */
    clear() {
        try {
            localStorage.clear();
            return true;
        } catch (e) {
            console.warn('[Storage] 清空失败:', e);
            return false;
        }
    },

    /**
     * 检查键是否存在
     * @param {string} key
     * @returns {boolean}
     */
    has(key) {
        return localStorage.getItem(key) !== null;
    }
};

// ============================================
// 导出
// ============================================

export default Storage;
