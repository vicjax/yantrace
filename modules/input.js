/**
 * 砚迹（YanTrace）- 录入引擎模块
 * 职责：管理中/英文文章录入的核心逻辑（选文、新建、追加、保存）
 * 
 * 统计说明：
 *   charCount  - 通过 input 事件实时重算（删除时自动减少）
 *   keystrokes - 通过 keydown 事件累加（反映总按键，用于 KPM）
 *   backspaces - 通过 keydown 事件累加
 *   startTime  - 首次输入时记录，用于计算速度
 */

import { calcInputStats, formatTime } from '../utils/stats.js';

class InputEngine {
    constructor(options = {}) {
        this.articleService = options.articleService || null;
        this.userService = options.userService || null;
        this.historyService = options.historyService || null;

        // DOM 引用
        this.cn = {
            selector: document.getElementById('cnInputSelect'),
            newBtn: document.getElementById('cnInputNewBtn'),
            saveBtn: document.getElementById('cnInputSaveBtn'),
            resetBtn: document.getElementById('cnInputResetBtn'),
            existingText: document.getElementById('cnExistingText'),
            existingContent: document.getElementById('cnExistingContent'),
            display: document.getElementById('cnInputDisplay'),
            stats: {
                main: document.getElementById('cnInputCpm'),
                count: document.getElementById('cnInputCount'),
                kpm: document.getElementById('cnInputKpm'),
                backspaceRate: document.getElementById('cnInputBackspaceRate'),
                kspc: document.getElementById('cnInputKspc'),
                timer: document.getElementById('cnInputTimer'),
                status: document.getElementById('cnInputStatus')
            }
        };

        this.en = {
            selector: document.getElementById('enInputSelect'),
            newBtn: document.getElementById('enInputNewBtn'),
            saveBtn: document.getElementById('enInputSaveBtn'),
            resetBtn: document.getElementById('enInputResetBtn'),
            existingText: document.getElementById('enExistingText'),
            existingContent: document.getElementById('enExistingContent'),
            display: document.getElementById('enInputDisplay'),
            stats: {
                main: document.getElementById('enInputWpm'),
                count: document.getElementById('enInputCount'),
                kpm: document.getElementById('enInputKpm'),
                backspaceRate: document.getElementById('enInputBackspaceRate'),
                kspc: document.getElementById('enInputKspc'),
                timer: document.getElementById('enInputTimer'),
                status: document.getElementById('enInputStatus')
            }
        };

        // 状态
        this.currentType = 'chinese';
        this.currentArticleId = null;
        this.currentArticleTitle = '';
        this.isNew = true;
        this.startTime = null;
        this.charCount = 0;
        this.keystrokes = 0;
        this.backspaces = 0;
        this._isCnComposing = false;
        this._isEnComposing = false;
        this._isSaved = false;

        this._bindEvents();
    }

    // ============================================
    // 生命周期方法（由 app.js 调用）
    // ============================================

    enter(pageId) {
        const type = pageId === 'input-cn' ? 'chinese' : 'english';
        this.loadArticleList(type);
    }

    leave(pageId) {
        // 录入页面不需要清理，页面隐藏即可
    }

    /**
     * 绑定所有事件
     * @private
     */
    _bindEvents() {
        this.cn.selector.addEventListener('change', () => {
            this._onSelectorChange('chinese');
        });
        this.en.selector.addEventListener('change', () => {
            this._onSelectorChange('english');
        });

        this.cn.newBtn.addEventListener('click', () => {
            this._createNew('chinese');
        });
        this.en.newBtn.addEventListener('click', () => {
            this._createNew('english');
        });

        this.cn.saveBtn.addEventListener('click', () => {
            this._save('chinese');
        });
        this.en.saveBtn.addEventListener('click', () => {
            this._save('english');
        });

        this.cn.resetBtn.addEventListener('click', () => {
            this._reset('chinese');
        });
        this.en.resetBtn.addEventListener('click', () => {
            this._reset('english');
        });

        this._bindInputEvents('chinese', this.cn.display, this.cn.stats);
        this._bindInputEvents('english', this.en.display, this.en.stats);
    }

    /**
     * 绑定录入区域的输入事件
     * @param {string} type - 'chinese' | 'english'
     * @param {HTMLElement} display - contenteditable 元素
     * @param {Object} stats - 统计元素引用
     * @private
     */
    _bindInputEvents(type, display, stats) {
        const isChinese = type === 'chinese';
        const composingKey = isChinese ? '_isCnComposing' : '_isEnComposing';

        display.addEventListener('compositionstart', () => {
            this[composingKey] = true;
        });

        display.addEventListener('compositionend', () => {
            this[composingKey] = false;
            this._recalcStats(type);
        });

        display.addEventListener('input', () => {
            if (this[composingKey]) return;
            this._recalcStats(type);
        });

        display.addEventListener('keydown', (e) => {
            if (this[composingKey]) return;

            // ===== 新增：首次按键时启动计时器 =====
            if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
                if (!this.startTime) {
                    this.startTime = Date.now();
                }
            }

            if (e.key === 'Backspace') {
                this.backspaces++;
                this.keystrokes++;
            } else if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
                this.keystrokes++;
            }

            requestAnimationFrame(() => {
                this._updateStats(type);
            });
        });
    }

    /**
     * 重新计算统计（基于当前录入内容）
     * @param {string} type - 'chinese' | 'english'
     * @private
     */
    _recalcStats(type) {
        const el = type === 'chinese' ? this.cn : this.en;
        const display = el.display;
        const text = display.textContent || '';
        this.charCount = text.replace(/\s/g, '').length;
        this._updateStats(type);
    }

    /**
     * 加载文章列表
     * @param {string} type - 'chinese' | 'english'
     */
    loadArticleList(type) {
        if (!this.articleService) return;

        const articles = this.articleService.getByType(type);
        const selector = type === 'chinese' ? this.cn.selector : this.en.selector;
        const currentValue = selector.value;

        selector.innerHTML = `
            <option value="__new__">📝 新建文章</option>
            ${articles.map(a => `<option value="${a.id}">${a.title}</option>`).join('')}
        `;

        if (currentValue && articles.some(a => a.id === currentValue)) {
            selector.value = currentValue;
        } else if (articles.length > 0) {
            selector.value = articles[0].id;
        } else {
            selector.value = '__new__';
        }

        this._onSelectorChange(type);
    }

    /**
     * 选择器变化处理
     * @param {string} type - 'chinese' | 'english'
     * @private
     */
    _onSelectorChange(type) {
        const selector = type === 'chinese' ? this.cn.selector : this.en.selector;
        const value = selector.value;

        if (value === '__new__') {
            this._createNew(type);
        } else {
            this._loadExisting(type, value);
        }
    }

    /**
     * 创建新文章
     * @param {string} type - 'chinese' | 'english'
     * @private
     */
    _createNew(type) {
        this.currentType = type;
        this.currentArticleId = null;
        this.currentArticleTitle = '';
        this.isNew = true;
        this._isSaved = false;
        this.startTime = null;
        this.charCount = 0;
        this.keystrokes = 0;
        this.backspaces = 0;

        const el = type === 'chinese' ? this.cn : this.en;

        el.existingContent.style.display = 'none';
        el.existingText.textContent = '';
        el.display.textContent = '';
        el.display.focus();

        this._updateStats(type);
        this._setStatus(type, '新建文章', '#f59e0b');
    }

    /**
     * 加载已有文章
     * @param {string} type - 'chinese' | 'english'
     * @param {string} articleId - 文章 ID
     * @private
     */
    _loadExisting(type, articleId) {
        if (!this.articleService) return;

        const article = this.articleService.getById(articleId);
        if (!article) return;

        this.currentType = type;
        this.currentArticleId = articleId;
        this.currentArticleTitle = article.title;
        this.isNew = false;
        this._isSaved = false;
        this.startTime = null;
        this.charCount = 0;
        this.keystrokes = 0;
        this.backspaces = 0;

        const el = type === 'chinese' ? this.cn : this.en;

        el.existingContent.style.display = 'block';
        el.existingText.textContent = article.content;
        el.display.textContent = '';
        el.display.focus();

        this._updateStats(type);
        this._setStatus(type, '已加载，可追加', '#34d399');
    }

    /**
     * 保存文章
     * @param {string} type - 'chinese' | 'english'
     * @private
     */
    _save(type) {
        const el = type === 'chinese' ? this.cn : this.en;
        const display = el.display;
        const content = (display.textContent || '').trim();

        if (!content) {
            this._setStatus(type, '⚠️ 没有内容可保存', '#f87171');
            return;
        }

        let savedArticle = null;

        if (this.isNew) {
            const title = prompt(
                type === 'chinese' ? '请输入文章标题：' : 'Enter article title:'
            );
            if (!title || !title.trim()) {
                this._setStatus(type, '⚠️ 取消保存', '#f87171');
                return;
            }

            savedArticle = this.articleService.create(title.trim(), content, type);
            if (savedArticle) {
                this.currentArticleId = savedArticle.id;
                this.currentArticleTitle = savedArticle.title;
                this.isNew = false;

                el.existingContent.style.display = 'block';
                el.existingText.textContent = content;
                el.display.textContent = '';

                this.loadArticleList(type);
                el.selector.value = savedArticle.id;

                this._isSaved = true;
                this._updateStats(type);
                this._setStatus(type, '✅ 已保存（新建）', '#34d399');

                // 保存录入历史
                this._saveInputHistory(type, savedArticle.title, '新建');
            }
        } else {
            savedArticle = this.articleService.append(this.currentArticleId, content);
            if (savedArticle) {
                el.existingText.textContent = savedArticle.content;
                el.display.textContent = '';

                this._isSaved = true;
                this._updateStats(type);
                this._setStatus(type, '✅ 已保存（追加）', '#34d399');

                // 保存录入历史
                this._saveInputHistory(type, this.currentArticleTitle, '追加');
            } else {
                this._setStatus(type, '❌ 保存失败', '#f87171');
            }
        }

        // 重置统计（保存后归零）
        if (savedArticle) {
            this.startTime = null;
            this.charCount = 0;
            this.keystrokes = 0;
            this.backspaces = 0;
            this._updateStats(type);
        }
    }

    /**
     * 保存录入历史
     * @param {string} type - 'chinese' | 'english'
     * @param {string} articleTitle - 文章标题
     * @param {string} action - '新建' 或 '追加'
     * @private
     */
    _saveInputHistory(type, articleTitle, action) {
        if (!this.historyService || !this.userService) return;

        const user = this.userService.getCurrent();
        if (!user) {
            console.warn('[InputEngine] 未找到当前用户，无法保存录入历史');
            return;
        }

        const stats = calcInputStats({
            charCount: this.charCount,
            keystrokes: this.keystrokes,
            backspaces: this.backspaces,
            startTime: this.startTime,
            currentMode: type
        });

        const mode = type === 'chinese' ? 'input-cn' : 'input-en';
        const modeLabel = type === 'chinese' ? '中文录入' : '英文录入';

        const record = {
            userId: user.id,
            mode: mode,
            articleTitle: articleTitle || '未命名',
            action: action,
            stats: {
                charCount: stats.charCount,
                elapsed: stats.elapsed,
                cpm: stats.cpm || 0,
                wpm: stats.wpm || 0,
                kpm: stats.kpm || 0,
                backspaceRate: stats.backspaceRate || 0,
                kspc: stats.kspc || 0,
                keystrokes: stats.keystrokes
            }
        };

        try {
            this.historyService.add(record);
            console.log(`✅ 录入历史已保存: ${modeLabel} ${action} ${articleTitle}`);
        } catch (error) {
            console.error('[InputEngine] 保存录入历史失败:', error);
        }
    }

    /**
     * 重置录入区
     * @param {string} type - 'chinese' | 'english'
     * @private
     */
    _reset(type) {
        const el = type === 'chinese' ? this.cn : this.en;
        el.display.textContent = '';

        this.startTime = null;
        this.charCount = 0;
        this.keystrokes = 0;
        this.backspaces = 0;

        this._updateStats(type);
        this._setStatus(type, '↻ 已重置', '#f59e0b');
        el.display.focus();
    }

    /**
     * 更新统计显示
     * @param {string} type - 'chinese' | 'english'
     * @private
     */
    _updateStats(type) {
        const stats = calcInputStats({
            charCount: this.charCount,
            keystrokes: this.keystrokes,
            backspaces: this.backspaces,
            startTime: this.startTime,
            currentMode: type
        });

        const el = type === 'chinese' ? this.cn : this.en;
        const statsEl = el.stats;

        if (statsEl.main) statsEl.main.textContent = stats.speed;
        if (statsEl.kpm) statsEl.kpm.textContent = stats.kpm;
        if (statsEl.kspc) statsEl.kspc.textContent = stats.kspc;
        if (statsEl.backspaceRate) statsEl.backspaceRate.textContent = stats.backspaceRate;
        if (statsEl.timer) statsEl.timer.textContent = formatTime(stats.elapsed);
        if (statsEl.count) statsEl.count.textContent = stats.charCount;
    }

    /**
     * 更新状态显示
     * @param {string} type - 'chinese' | 'english'
     * @param {string} text - 状态文本
     * @param {string} color - 颜色
     * @private
     */
    _setStatus(type, text, color) {
        const el = type === 'chinese' ? this.cn : this.en;
        const statusEl = el.stats.status;
        if (statusEl) {
            statusEl.textContent = text;
            statusEl.style.color = color;
        }
    }

    /**
     * 清理事件绑定
     */
    destroy() {
        // 无需额外清理
    }
}

export default InputEngine;