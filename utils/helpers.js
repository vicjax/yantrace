/**
 * 砚迹（YanTrace）- 通用工具函数
 * 职责：提供通用的辅助函数
 */

// ============================================
// 工具函数
// ============================================

const Helpers = {
    /**
     * 生成唯一 ID
     * @param {string} prefix - 前缀
     * @returns {string} 唯一 ID
     */
    generateId(prefix = '') {
        const timestamp = Date.now().toString(36);
        const random = Math.random().toString(36).substring(2, 8);
        return prefix ? `${prefix}-${timestamp}-${random}` : `${timestamp}-${random}`;
    },

    /**
     * 防抖
     * @param {Function} fn - 要执行的函数
     * @param {number} delay - 延迟时间（毫秒）
     * @returns {Function} 防抖后的函数
     */
    debounce(fn, delay = 300) {
        let timer = null;
        return function (...args) {
            clearTimeout(timer);
            timer = setTimeout(() => fn.apply(this, args), delay);
        };
    },

    /**
     * 节流
     * @param {Function} fn - 要执行的函数
     * @param {number} limit - 时间限制（毫秒）
     * @returns {Function} 节流后的函数
     */
    throttle(fn, limit = 300) {
        let inThrottle = false;
        return function (...args) {
            if (!inThrottle) {
                fn.apply(this, args);
                inThrottle = true;
                setTimeout(() => (inThrottle = false), limit);
            }
        };
    },

    /**
     * 格式化时间（秒 → 分:秒）
     * @param {number} seconds - 秒数
     * @returns {string} 格式化后的时间字符串
     */
    formatTime(seconds) {
        if (seconds < 60) return `${Math.round(seconds)}s`;
        const mins = Math.floor(seconds / 60);
        const secs = Math.round(seconds % 60);
        return `${mins}m ${secs}s`;
    },

    /**
     * 格式化日期
     * @param {string|number|Date} date - 日期对象或时间戳
     * @returns {string} 格式化后的日期字符串
     */
    formatDate(date) {
        const d = new Date(date);
        return d.toLocaleString('zh-CN', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        });
    },

    /**
     * 转义 HTML 特殊字符（防止 XSS）
     * @param {string} str - 要转义的字符串
     * @returns {string} 转义后的字符串
     */
    escapeHtml(str) {
        const map = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        };
        return String(str).replace(/[&<>"']/g, (m) => map[m]);
    },

    /**
     * 判断是否为中文
     * @param {string} text - 要检测的文本
     * @returns {boolean}
     */
    isChinese(text) {
        return /[\u4e00-\u9fa5]/.test(text);
    },

    /**
     * 深拷贝
     * @param {*} obj - 要拷贝的对象
     * @returns {*} 拷贝后的对象
     */
    deepClone(obj) {
        try {
            return JSON.parse(JSON.stringify(obj));
        } catch {
            return obj;
        }
    },

    /**
     * 获取 DOM 元素
     * @param {string} selector - CSS 选择器
     * @param {Element} parent - 父元素（默认 document）
     * @returns {Element|null}
     */
    $(selector, parent = document) {
        return parent.querySelector(selector);
    },

    /**
     * 获取多个 DOM 元素
     * @param {string} selector - CSS 选择器
     * @param {Element} parent - 父元素（默认 document）
     * @returns {NodeList}
     */
    $$(selector, parent = document) {
        return parent.querySelectorAll(selector);
    },

    /**
     * 获取元素在父元素中的索引
     * @param {Element} element - 目标元素
     * @returns {number} 索引值
     */
    getIndex(element) {
        const children = Array.from(element.parentElement.children);
        return children.indexOf(element);
    },

    /**
     * 检查字符串是否为空或仅包含空白
     * @param {string} str
     * @returns {boolean}
     */
    isEmpty(str) {
        return !str || str.trim() === '';
    },

    /**
     * 安全的 JSON 解析
     * @param {string} str - 要解析的字符串
     * @param {*} defaultValue - 解析失败时的默认值
     * @returns {*}
     */
    safeJsonParse(str, defaultValue = null) {
        try {
            return JSON.parse(str);
        } catch {
            return defaultValue;
        }
    }
};

// ============================================
// 导出
// ============================================

export default Helpers;
