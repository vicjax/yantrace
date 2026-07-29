/**
 * 砚迹（YanTrace）- 打字引擎核心
 * 职责：状态管理、统计计算、流程控制
 * 不直接处理输入，委托给策略（ChineseStrategy / EnglishStrategy）
 * 
 * 统计刷新机制：
 *   - 按键时只更新数据，不刷新 DOM
 *   - 定时器每秒刷新一次统计显示
 *   - 计时器从首次按键开始计时
 * 
 * 字符状态规则：
 *   - 第一次输对 → 绿色 (CORRECT)
 *   - 错误后改正 → 黄色 (FIXED)
 *   - 任何情况输错 → 红色 (ERROR)
 *   - 退格时颜色保留，计数减一
 *   - 正确总数 = 绿色 + 黄色
 */

import ChineseStrategy from './ChineseStrategy.js';
import EnglishStrategy from './EnglishStrategy.js';
import { calcPracticeStats, formatTime } from '../../utils/stats.js';

const STATUS = {
    PENDING: 'pending',
    CORRECT: 'correct',
    ERROR: 'error',
    FIXED: 'fixed'
};

export default class PracticeEngine {
    constructor(options = {}) {
        this.articleService = options.articleService || null;
        this.onComplete = options.onComplete || null;

        // DOM 引用
        this.textBox = document.getElementById('cnTextBox');
        this.selector = document.getElementById('cnArticleSelect');
        this.resetBtn = document.getElementById('cnResetBtn');

        // 统计元素
        this.stats = {
            cpm: document.getElementById('cnCpm'),
            kpm: document.getElementById('cnKpm'),
            kspc: document.getElementById('cnKspc'),
            accuracy: document.getElementById('cnAccuracy'),
            backspaceRate: document.getElementById('cnBackspaceRate'),
            backspaceCount: document.getElementById('cnBackspaceCount'),
            fixed: document.getElementById('cnFixed'),
            fixRate: document.getElementById('cnFixRate'),
            progressChars: document.getElementById('cnProgressChars'),
            totalChars: document.getElementById('cnTotalChars'),
            timer: document.getElementById('cnTimer'),
            progressFill: document.getElementById('cnProgressFill'),
            progressText: document.getElementById('cnProgressText')
        };

        // 核心状态
        this.chars = [];
        this.totalChars = 0;
        this.correct = 0;
        this.errors = 0;
        this.fixed = 0;
        this.backspaces = 0;
        this.keystrokes = 0;
        this.startTime = null;
        this.isFinished = false;
        this.currentMode = 'chinese';
        this.currentArticleId = null;
        this.currentArticleTitle = '';
        this.currentCharIndex = 0;

        // 峰值速度
        this._peakCpm = 0;
        this._peakWpm = 0;
        this._lastSampleTime = 0;

        // 策略
        this.strategy = null;

        // 窗口 resize 防抖
        this._resizeHandler = null;

        // 统计定时器
        this._statsTimer = null;
        this._timerStartTime = null;
        this._timerSeconds = 0;
        this._instantCorrect = 0;
        this._instantStartTime = null;

        // 计时器控制（失焦暂停/聚焦继续）
        this._timerPaused = false;
        this._timerAccumulated = 0;

        this._bindUIEvents();
        this._bindResizeEvent();

        if (this.textBox) {
            this.textBox.style.position = 'relative';
        }
    }

    // ============================================
    // 生命周期方法
    // ============================================

    enter(pageId) {
        const type = pageId === 'practice-cn' ? 'chinese' : 'english';
        this.loadFirstArticle(type);
    }

    leave(pageId) {
        this.clearStrategy();
    }

    // ============================================
    // 公共方法
    // ============================================

    loadArticleList(type) {
        if (!this.articleService) return;
        const articles = this.articleService.getByType(type);
        const currentValue = this.selector.value;

        this.selector.innerHTML = articles.map(a =>
            `<option value="${a.id}">${a.title}</option>`
        ).join('');

        if (currentValue && articles.some(a => a.id === currentValue)) {
            this.selector.value = currentValue;
        } else if (articles.length > 0) {
            this.selector.value = articles[0].id;
        }

        if (articles.length > 0) {
            this.loadArticle(type, this.selector.value);
        }
    }

    loadArticle(type, articleId) {
        if (!this.articleService) return;
        const article = this.articleService.getById(articleId);
        if (!article) return;

        // 清理旧策略和定时器
        if (this.strategy) {
            this.strategy.destroy();
            this.strategy = null;
        }
        if (this._statsTimer) {
            clearInterval(this._statsTimer);
            this._statsTimer = null;
        }

        this._switchStrategy(type);
        this._resetState();

        this.currentMode = type;
        this.currentArticleId = articleId;
        this.currentArticleTitle = article.title;

        const content = article.content;
        this.chars = content.split('').map(char => ({
            char: char,
            status: STATUS.PENDING,
            keepColor: null
        }));
        this.totalChars = this.chars.length;

        this._renderArticle();
        this._updateProgressOnly();
        this._updateTimerDisplay(0);

        // 中文模式：创建浮动输入框
        if (this.strategy && this.currentMode === 'chinese') {
            this.textBox.offsetHeight;
            requestAnimationFrame(() => {
                if (this.strategy && typeof this.strategy.createInput === 'function') {
                    this.strategy.createInput();
                    requestAnimationFrame(() => {
                        this.strategy.updatePosition();
                        this.strategy.focus();
                    });
                }
            });
        } else {
            setTimeout(() => this.focus(), 100);
        }
    }

    loadFirstArticle(type) {
        this.loadArticleList(type);
    }

    reset(type) {
        const articleId = this.selector.value;
        if (articleId) {
            this.loadArticle(type, articleId);
        }
    }

    focus() {
        if (this.strategy) {
            this.strategy.focus();
        }
    }

    clearStrategy() {
        if (this.strategy) {
            this.strategy.destroy();
            this.strategy = null;
        }
    }

    destroy() {
        if (this._statsTimer) {
            clearInterval(this._statsTimer);
            this._statsTimer = null;
        }
        this.clearStrategy();
        if (this._resizeHandler) {
            window.removeEventListener('resize', this._resizeHandler);
            this._resizeHandler = null;
        }
        this.selector.removeEventListener('change', this._selectorHandler);
        this.resetBtn.removeEventListener('click', this._resetHandler);
    }

    // ============================================
    // 渲染方法
    // ============================================

    _renderArticle() {
        if (!this.textBox) return;

        const html = this.chars.map((item, index) => {
            const char = item.char;
            const display = char === ' ' ? '&nbsp;' : this._escapeHtml(char);

            let displayStatus = item.status;
            if (item.status === STATUS.PENDING && item.keepColor) {
                displayStatus = item.keepColor;
            }
            const statusClass = displayStatus !== STATUS.PENDING ? displayStatus : '';
            const currentClass = index === this.currentCharIndex && !this.isFinished ? 'current' : '';
            return `<span class="char ${statusClass} ${currentClass}" data-index="${index}">${display}</span>`;
        }).join('');

        this.textBox.innerHTML = html;
    }

    _updateCurrentChar(index) {
        this.textBox?.querySelectorAll('.char.current').forEach(el => {
            el.classList.remove('current');
        });

        const charEl = this.textBox?.querySelector(`.char[data-index="${index}"]`);
        if (charEl) {
            charEl.classList.add('current');
        }
        this.currentCharIndex = index;
    }

    getCharPosition() {
        if (!this.textBox) return null;
        const charEl = this.textBox.querySelector(`.char[data-index="${this.currentCharIndex}"]`);
        if (!charEl) return null;

        const rect = charEl.getBoundingClientRect();
        const containerRect = this.textBox.getBoundingClientRect();

        return {
            x: rect.left - containerRect.left,
            y: rect.bottom - containerRect.top,
            width: rect.width,
            height: rect.height
        };
    }

    getContainerRect() {
        return this.textBox?.getBoundingClientRect() || null;
    }

    // ============================================
    // 核心输入处理
    // ============================================

    /**
     * 启动计时器（首次击键或恢复计时）
     */
    _startTimer() {
        if (this._statsTimer) return;

        if (this._timerAccumulated === 0) {
            this.startTime = Date.now();
        } else {
            this.startTime = Date.now() - this._timerAccumulated * 1000;
        }

        this._timerPaused = false;
        this._startStatsTimer();
    }

    /**
     * 停止计时器（失焦时调用，保存累计时间）
     */
    _stopTimer() {
        if (!this._statsTimer) return;

        if (this.startTime) {
            this._timerAccumulated = (Date.now() - this.startTime) / 1000;
        }

        clearInterval(this._statsTimer);
        this._statsTimer = null;
        this._timerPaused = true;

        this._updateTimerDisplay(Math.floor(this._timerAccumulated));
    }

    /**
     * 记录击键（物理按键，由策略层调用）
     */
    recordKeypress() {
        this.keystrokes++;
        this._startTimer();
        this._updateProgressOnly();
    }

    /**
     * 记录退格（物理按键，由策略层调用）
     */
    recordBackspace() {
        this.backspaces++;
        this.keystrokes++;
        this._updateProgressOnly();
    }

    /**
     * 处理字符输入（由策略层调用）
     */
    _handleCharInput(char) {
        if (this.isFinished) return;
        if (this.totalChars === 0) return;
        if (this.currentCharIndex >= this.totalChars) return;

        const idx = this.currentCharIndex;
        const item = this.chars[idx];
        const isMatch = char === item.char;

        const currentStatus = item.status;
        const wasError = item.keepColor === STATUS.ERROR;
        const wasFixed = item.keepColor === STATUS.FIXED;

        let newStatus;
        let correctChange = 0, errorsChange = 0, fixedChange = 0;

        if (isMatch) {
            if (currentStatus === STATUS.PENDING && (wasError || wasFixed)) {
                newStatus = STATUS.FIXED;
                fixedChange = 1;
            } else if (currentStatus === STATUS.PENDING) {
                newStatus = STATUS.CORRECT;
                correctChange = 1;
            } else if (currentStatus === STATUS.ERROR) {
                newStatus = STATUS.FIXED;
                errorsChange = -1;
                fixedChange = 1;
            } else {
                newStatus = currentStatus;
            }
        } else {
            if (currentStatus === STATUS.PENDING) {
                newStatus = STATUS.ERROR;
                errorsChange = 1;
            } else if (currentStatus === STATUS.CORRECT) {
                newStatus = STATUS.ERROR;
                correctChange = -1;
                errorsChange = 1;
            } else if (currentStatus === STATUS.FIXED) {
                newStatus = STATUS.ERROR;
                fixedChange = -1;
                errorsChange = 1;
            } else {
                newStatus = currentStatus;
            }
        }

        this.correct += correctChange;
        this.errors += errorsChange;
        this.fixed += fixedChange;

        item.keepColor = null;
        item.status = newStatus;

        this.currentCharIndex++;
        this._renderArticle();
        this._updateCurrentChar(this.currentCharIndex);

        this._updateProgressOnly();
        this._samplePeakSpeed();
        this._updateFloatingInputPosition();
        this._scrollToCurrentChar();

        // 检查是否完成
        if (this.currentCharIndex >= this.totalChars) {
            this.isFinished = true;
            if (this._statsTimer) {
                clearInterval(this._statsTimer);
                this._statsTimer = null;
            }
            this._refreshStatsDisplay();
            if (this.onComplete) {
                this.onComplete(this.getStats());
            }
        }
    }

    /**
     * 处理退格（颜色保留，计数减掉对应状态）
     */
    _handleBackspace() {
        if (this.isFinished) return;
        if (this.currentCharIndex === 0) return;

        this.currentCharIndex--;
        this._updateCurrentChar(this.currentCharIndex);

        const item = this.chars[this.currentCharIndex];
        const currentStatus = item.status;

        if (currentStatus === STATUS.PENDING) return;

        if (currentStatus === STATUS.CORRECT) {
            this.correct--;
        } else if (currentStatus === STATUS.ERROR) {
            this.errors--;
        } else if (currentStatus === STATUS.FIXED) {
            this.fixed--;
        }

        item.keepColor = currentStatus;
        item.status = STATUS.PENDING;

        this._renderArticle();
        this._updateProgressOnly();
        this._updateFloatingInputPosition();
        this._scrollToCurrentChar();
    }

    /**
     * 滚动到当前字符位置（容器 20% 处，输入框不被遮挡）
     */
    _scrollToCurrentChar() {
        if (!this.textBox || this.isFinished) return;

        const charEl = this.textBox.querySelector(`.char[data-index="${this.currentCharIndex}"]`);
        if (!charEl) return;

        const containerRect = this.textBox.getBoundingClientRect();
        const charRect = charEl.getBoundingClientRect();

        const distanceToBottom = containerRect.bottom - charRect.bottom;

        // 字符即将被输入框盖住时触发滚动
        if (distanceToBottom < 80) {
            const targetOffset = containerRect.height * 0.2;
            const currentOffset = charRect.top - containerRect.top;
            const scrollDelta = currentOffset - targetOffset;
            this.textBox.scrollTop += scrollDelta;
        }
    }

    _updateFloatingInputPosition() {
        if (this.strategy && typeof this.strategy.updatePosition === 'function') {
            this.strategy.updatePosition();
        }
    }

    // ============================================
    // 统计方法
    // ============================================

    _startStatsTimer() {
        if (this._statsTimer) {
            clearInterval(this._statsTimer);
            this._statsTimer = null;
        }

        this._statsTimer = setInterval(() => {
            if (this.isFinished) {
                if (this._statsTimer) {
                    clearInterval(this._statsTimer);
                    this._statsTimer = null;
                }
                return;
            }

            if (this._timerStartTime) {
                this._timerSeconds = Math.floor((Date.now() - this._timerStartTime) / 1000);
                this._updateTimerDisplay(this._timerSeconds);
            }

            this._refreshStatsDisplay();
        }, 1000);
    }

    _refreshStatsDisplay() {
        const stats = this._calcStats();
        const isChinese = this.currentMode === 'chinese';
        const processed = stats.correct + stats.errors + stats.fixed;
        const fixRate = processed === 0 ? 0 : Math.round((stats.fixed / processed) * 100);

        if (this.stats.cpm) {
            this.stats.cpm.textContent = isChinese ? stats.cpm : stats.wpm;
        }
        if (this.stats.kpm) {
            this.stats.kpm.textContent = stats.kpm;
        }
        if (this.stats.kspc) {
            this.stats.kspc.textContent = stats.kspc;
        }
        if (this.stats.accuracy) {
            this.stats.accuracy.textContent = stats.actualAccuracy;
        }
        if (this.stats.backspaceCount) {
            this.stats.backspaceCount.textContent = stats.backspaces;
        }
        if (this.stats.backspaceRate) {
            this.stats.backspaceRate.textContent = stats.backspaceRate;
        }
        if (this.stats.fixed) {
            this.stats.fixed.textContent = stats.fixed;
        }
        if (this.stats.fixRate) {
            this.stats.fixRate.textContent = fixRate;
        }
        if (this.stats.progressChars) {
            this.stats.progressChars.textContent = stats.processed;
        }
        if (this.stats.totalChars) {
            this.stats.totalChars.textContent = stats.totalChars;
        }
        if (this.stats.timer) {
            this.stats.timer.textContent = formatTime(stats.elapsed);
        }
    }

    _updateTimerDisplay(seconds) {
        const timerText = formatTime(seconds);

        const cnTimer = document.getElementById('cnTimer');
        if (cnTimer) cnTimer.textContent = timerText;

        const enTimer = document.getElementById('enTimer');
        if (enTimer) enTimer.textContent = timerText;
    }

    _updateProgressOnly() {
        const stats = this._calcStats();
        if (this.stats.progressFill) {
            this.stats.progressFill.style.width = stats.progress + '%';
        }
        if (this.stats.progressText) {
            this.stats.progressText.textContent = stats.progress + '%';
        }
    }

    _calcStats() {
        // 用时计算（考虑暂停）
        let elapsed = 0;
        if (this._timerPaused) {
            elapsed = this._timerAccumulated;
        } else if (this.startTime) {
            elapsed = (Date.now() - this.startTime) / 1000;
            if (this._timerAccumulated > 0) {
                elapsed += this._timerAccumulated;
            }
        }
        const minutes = elapsed / 60;
        const processed = this.correct + this.errors + this.fixed;

        const totalCorrect = this.correct + this.fixed;
        const actualAccuracy = processed === 0 ? 100 : Math.round((totalCorrect / processed) * 100);

        const cpm = minutes > 0 ? Math.round(totalCorrect / minutes) : 0;
        const wpm = minutes > 0 ? Math.round((totalCorrect / 5) / minutes) : 0;
        const kpm = minutes > 0 ? Math.round(this.keystrokes / minutes) : 0;
        const netCpm = Math.round(cpm * (actualAccuracy / 100));
        const netWpm = Math.round(wpm * (actualAccuracy / 100));

        const backspaceRate = this.keystrokes > 0 ? Math.round((this.backspaces / this.keystrokes) * 100) : 0;
        const kspc = totalCorrect > 0 ? parseFloat((this.keystrokes / totalCorrect).toFixed(2)) : 0;
        const progress = this.totalChars === 0 ? 0 : Math.round((processed / this.totalChars) * 100);

        const peakSpeed = this.currentMode === 'chinese' ? this._peakCpm : this._peakWpm;

        let instantSpeed = 0;
        if (this._instantStartTime) {
            const instantElapsed = (Date.now() - this._instantStartTime) / 1000;
            if (instantElapsed >= 5) {
                const instantMinutes = instantElapsed / 60;
                instantSpeed = instantMinutes > 0 ? Math.round(this._instantCorrect / instantMinutes) : 0;
            } else {
                instantSpeed = minutes > 0 ? Math.round(this._instantCorrect / minutes) : 0;
            }
        }

        return {
            correct: this.correct,
            errors: this.errors,
            fixed: this.fixed,
            totalCorrect: totalCorrect,
            backspaces: this.backspaces,
            keystrokes: this.keystrokes,
            elapsed: Math.round(elapsed),
            totalChars: this.totalChars,
            processed: processed,
            isFinished: this.isFinished,
            actualAccuracy: actualAccuracy,
            cpm: cpm,
            wpm: wpm,
            kpm: kpm,
            netCpm: netCpm,
            netWpm: netWpm,
            peakSpeed: peakSpeed,
            instantSpeed: instantSpeed,
            backspaceRate: backspaceRate,
            kspc: kspc,
            progress: progress
        };
    }

    getStats() {
        return this._calcStats();
    }

    _samplePeakSpeed() {
        if (!this.startTime) return;
        const now = Date.now();
        if (now - this._lastSampleTime < 10000) return;

        const stats = this._calcStats();
        const speed = this.currentMode === 'chinese' ? stats.cpm : stats.wpm;
        if (speed > (this.currentMode === 'chinese' ? this._peakCpm : this._peakWpm)) {
            if (this.currentMode === 'chinese') this._peakCpm = speed;
            else this._peakWpm = speed;
        }
        this._lastSampleTime = now;
    }

    getFontSize() {
        try {
            const user = window.app?.userService?.getCurrent();
            if (user && window.app?.settingsService) {
                const settings = window.app.settingsService.get(user.id);
                return settings.fontSize || 22;
            }
        } catch (e) { }
        return 22;
    }

    // ============================================
    // 策略管理
    // ============================================

    _switchStrategy(type) {
        if (this.strategy) {
            this.strategy.destroy();
            this.strategy = null;
        }
        if (type === 'chinese') {
            this.strategy = new ChineseStrategy(this);
        } else {
            this.strategy = new EnglishStrategy(this);
        }
        this.strategy.init();
    }

    _resetState() {
        this.correct = 0;
        this.errors = 0;
        this.fixed = 0;
        this.backspaces = 0;
        this.keystrokes = 0;
        this.startTime = null;
        this.isFinished = false;
        this.currentCharIndex = 0;
        this._peakCpm = 0;
        this._peakWpm = 0;
        this._lastSampleTime = 0;
        this.chars = [];
        this.totalChars = 0;

        this._timerSeconds = 0;
        this._timerStartTime = null;
        this._instantCorrect = 0;
        this._instantStartTime = null;
        this._timerPaused = false;
        this._timerAccumulated = 0;

        if (this._statsTimer) {
            clearInterval(this._statsTimer);
            this._statsTimer = null;
        }
        this._updateTimerDisplay(0);
        this._resetStatsDisplay();
    }

    /**
     * 重置统计栏所有显示为 0
     */
    _resetStatsDisplay() {
        if (this.stats.cpm) this.stats.cpm.textContent = '0';
        if (this.stats.kpm) this.stats.kpm.textContent = '0';
        if (this.stats.kspc) this.stats.kspc.textContent = '0';
        if (this.stats.accuracy) this.stats.accuracy.textContent = '100';
        if (this.stats.backspaceRate) this.stats.backspaceRate.textContent = '0';
        if (this.stats.backspaceCount) this.stats.backspaceCount.textContent = '0';
        if (this.stats.fixed) this.stats.fixed.textContent = '0';
        if (this.stats.fixRate) this.stats.fixRate.textContent = '0';
        if (this.stats.progressChars) this.stats.progressChars.textContent = '0';
        if (this.stats.totalChars) this.stats.totalChars.textContent = '0';
        if (this.stats.timer) this.stats.timer.textContent = '00:00';
        if (this.stats.progressFill) this.stats.progressFill.style.width = '0%';
        if (this.stats.progressText) this.stats.progressText.textContent = '0%';
    }

    // ============================================
    // UI 事件绑定
    // ============================================

    _bindUIEvents() {
        this._selectorHandler = () => {
            this.loadArticle('chinese', this.selector.value);
        };
        this._resetHandler = () => {
            this.reset('chinese');
        };
        this.selector.addEventListener('change', this._selectorHandler);
        this.resetBtn.addEventListener('click', this._resetHandler);
    }

    _bindResizeEvent() {
        this._resizeHandler = this._debounce(() => {
            if (this.currentArticleId && this.strategy) {
                this.strategy.updatePosition();
            }
        }, 300);
        window.addEventListener('resize', this._resizeHandler);
    }

    _debounce(fn, delay) {
        let timer = null;
        return function (...args) {
            clearTimeout(timer);
            timer = setTimeout(() => fn.apply(this, args), delay);
        };
    }

    _escapeHtml(str) {
        const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
        return String(str).replace(/[&<>"']/g, m => map[m] || m);
    }
}