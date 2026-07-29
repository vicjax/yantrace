/**
 * 砚迹（YanTrace）- 结果管理模块
 * 职责：显示练习完成弹窗、保存历史记录、复制结果
 * 
 * 统计指标说明：
 *   速度：CPM/WPM、净速度、KPM
 *   正确率：实际正确率、原始正确率、改正率
 *   效率：KSPC、退格率
 *   基础：正确/错误/改正/退格/用时
 */


class ResultManager {
    constructor(options = {}) {
        this.historyService = options.historyService || null;
        this.userService = options.userService || null;
        this.onRestart = options.onRestart || null;

        // DOM 引用
        this.overlay = document.getElementById('resultOverlay');
        this.title = document.getElementById('resultTitle');
        this.mainNumber = document.getElementById('resultMainNumber');
        this.mainLabel = document.getElementById('resultMainLabel');
        this.grid = document.getElementById('resultGrid');

        // 按钮
        this.restartBtn = document.getElementById('resultRestartBtn');
        this.copyBtn = document.getElementById('resultCopyBtn');
        this.homeBtn = document.getElementById('resultHomeBtn');

        // 当前结果数据
        this._currentStats = null;
        this._currentMode = null;

        // 绑定事件
        this._bindEvents();
    }

    /**
     * 绑定事件
     * @private
     */
    _bindEvents() {
        this.restartBtn.addEventListener('click', () => {
            this.hide();
            if (this.onRestart) {
                this.onRestart();
            }
        });

        this.copyBtn.addEventListener('click', () => {
            this._copyResult();
        });

        this.homeBtn.addEventListener('click', () => {
            this.hide();
            const nav = window.app?.navigator;
            if (nav) {
                nav.goHome();
            } else {
                document.querySelector('.back-btn[data-target="home"]')?.click();
            }
        });
    }

    /**
     * 显示结果弹窗
     * @param {Object} stats - 统计数据（来自 practice.js 的 _getStats）
     * @param {string} mode - 'practice-cn' 或 'practice-en'
     * @param {string} articleTitle - 文章标题
     */
    show(stats, mode, articleTitle = '') {
        if (!stats) return;

        this._currentStats = stats;
        this._currentMode = mode;

        const isChinese = mode === 'practice-cn';

        // 保存历史记录
        this._saveHistory(stats, mode, articleTitle);

        // 设置标题
        this.title.textContent = isChinese ? '🎉 中文练习完成！' : '🎉 English Practice Complete!';

        // 设置主速度显示：速度 / 净速度
        const speed = isChinese ? stats.cpm : stats.wpm;
        const netSpeed = isChinese ? stats.netCpm : stats.netWpm;
        this.mainNumber.textContent = `${speed} / ${netSpeed}`;
        this.mainLabel.textContent = isChinese ? 'CPM / 净CPM' : 'WPM / 净WPM';

        // 构建统计网格（9项）
        const items = this._buildGridItems(stats, isChinese);
        this.grid.innerHTML = items.map(item =>
            `<div class="item">
                <div class="num" style="color:${item.color}">${item.num}</div>
                <div class="lbl">${item.label}</div>
            </div>`
        ).join('');

        // 显示弹窗
        this.overlay.classList.add('show');

        console.log(`📊 结果弹窗已显示: ${isChinese ? '中文' : '英文'}练习`);
    }

    /**
     * 隐藏结果弹窗
     */
    hide() {
        this.overlay.classList.remove('show');
    }

    /**
     * 保存历史记录
     * @param {Object} stats - 统计数据
     * @param {string} mode - 模式
     * @param {string} articleTitle - 文章标题
     * @private
     */
    _saveHistory(stats, mode, articleTitle) {
        if (!this.historyService || !this.userService) return;

        const user = this.userService.getCurrent();
        if (!user) {
            console.warn('[ResultManager] 未找到当前用户，无法保存历史');
            return;
        }

        // 去重检查：5秒内同一模式不重复保存
        const recent = this.historyService.getRecentByUser(user.id, 1);
        if (recent.length > 0) {
            const last = recent[0];
            const lastTime = new Date(last.createdAt).getTime();
            const now = Date.now();
            if (now - lastTime < 5000 && last.mode === mode) {
                console.log('[ResultManager] 重复记录，跳过保存');
                return;
            }
        }

        const record = {
            userId: user.id,
            mode: mode,
            articleTitle: articleTitle || '未知文章',
            stats: {
                correct: stats.correct || 0,
                errors: stats.errors || 0,
                fixed: stats.fixed || 0,
                backspaces: stats.backspaces || 0,
                keystrokes: stats.keystrokes || 0,
                elapsed: stats.elapsed || 0,
                rawAccuracy: stats.rawAccuracy || 0,
                actualAccuracy: stats.actualAccuracy || 0,
                fixRate: stats.fixRate || 0,
                cpm: stats.cpm || 0,
                wpm: stats.wpm || 0,
                kpm: stats.kpm || 0,
                netCpm: stats.netCpm || 0,
                netWpm: stats.netWpm || 0,
                kspc: stats.kspc || 0,
                backspaceRate: stats.backspaceRate || 0
            }
        };

        try {
            this.historyService.add(record);
            console.log('✅ 历史记录已保存');
        } catch (error) {
            console.error('[ResultManager] 保存历史失败:', error);
        }
    }

    /**
     * 构建统计网格项（9项 + 净速度）
     * 布局：3列 × 4行
     *   Row1: 速度 | 净速度 | KPM
     *   Row2: 实际正确率 | 原始正确率 | 改正率
     *   Row3: 退格率 | KSPC | 用时
     *   Row4: ✅正确 | ❌错误 | 🔄改正
     * @param {Object} stats - 统计数据
     * @param {boolean} isChinese - 是否中文模式
     * @returns {Array} 网格项数组
     * @private
     */
    _buildGridItems(stats, isChinese) {
        const items = [
            // 第一行：速度指标
            { num: isChinese ? stats.cpm : stats.wpm, 
              label: isChinese ? 'CPM' : 'WPM', 
              color: '#60a5fa' },
            { num: isChinese ? stats.netCpm : stats.netWpm, 
              label: isChinese ? '净CPM' : '净WPM', 
              color: '#34d399' },
            { num: stats.kpm || 0, 
              label: 'KPM', 
              color: '#f59e0b' },

            // 第二行：正确率相关
            { num: (stats.actualAccuracy || 0) + '%', 
              label: '实际正确率', 
              color: '#34d399' },
            { num: (stats.rawAccuracy || 0) + '%', 
              label: '原始正确率', 
              color: '#818cf8' },
            { num: (stats.fixRate || 0) + '%', 
              label: '改正率', 
              color: '#fbbf24' },

            // 第三行：效率指标
            { num: (stats.backspaceRate || 0) + '%', 
              label: '退格率', 
              color: '#f59e0b' },
            { num: stats.kspc || 0, 
              label: 'KSPC', 
              color: '#a78bfa' },
            { num: (stats.elapsed || 0) + 's', 
              label: '用时', 
              color: '#f87171' },

            // 第四行：原始数据
            { num: stats.correct || 0, 
              label: '✅ 正确', 
              color: '#34d399' },
            { num: stats.errors || 0, 
              label: '❌ 错误', 
              color: '#f87171' },
            { num: stats.fixed || 0, 
              label: '🔄 改正', 
              color: '#fbbf24' }
        ];

        return items;
    }

    /**
     * 复制结果到剪贴板
     * @private
     */
    _copyResult() {
        const items = this.grid.querySelectorAll('.item');
        let text = '📊 打字统计结果\n';
        text += '─'.repeat(35) + '\n';
        text += `${this.mainLabel.textContent}: ${this.mainNumber.textContent}\n`;
        text += '─'.repeat(35) + '\n';

        items.forEach(item => {
            const num = item.querySelector('.num')?.textContent || '';
            const label = item.querySelector('.lbl')?.textContent || '';
            text += `${label}: ${num}\n`;
        });

        text += '─'.repeat(35) + '\n';
        text += `📅 ${new Date().toLocaleString()}`;

        navigator.clipboard.writeText(text).then(() => {
            alert('📋 结果已复制到剪贴板！');
        }).catch(() => {
            const ta = document.createElement('textarea');
            ta.value = text;
            document.body.appendChild(ta);
            ta.select();
            document.execCommand('copy');
            ta.remove();
            alert('📋 结果已复制到剪贴板！');
        });
    }

    /**
     * 渲染历史记录列表
     * @param {string} userId - 用户 ID
     */
    renderHistory(userId) {
        const container = document.getElementById('historyList');
        if (!container) return;

        const targetUserId = userId || this.userService?.getCurrent()?.id;
        if (!targetUserId) {
            container.innerHTML = '<div class="history-empty">请先选择用户</div>';
            return;
        }

        const records = this.historyService?.getRecentByUser(targetUserId, 50) || [];

        if (records.length === 0) {
            container.innerHTML = '<div class="history-empty">暂无历史记录</div>';
            return;
        }

        const modeLabels = {
            'practice-cn': '🀄 中文练习',
            'practice-en': '🔤 英文练习'
        };

        container.innerHTML = records.map(r => `
            <div class="history-item">
                <span class="date">${new Date(r.createdAt).toLocaleString()}</span>
                <span class="mode">${modeLabels[r.mode] || r.mode}</span>
                <span class="stats">
                    <span>速度 <span class="num">${r.mode === 'practice-cn' ? r.stats.cpm : r.stats.wpm}</span></span>
                    <span>净速度 <span class="num">${r.mode === 'practice-cn' ? r.stats.netCpm : r.stats.netWpm}</span></span>
                    <span>准确率 <span class="num">${r.stats.actualAccuracy}%</span></span>
                    <span>✅ <span class="num">${r.stats.correct}</span></span>
                    <span>❌ <span class="num">${r.stats.errors}</span></span>
                    <span>🔄 <span class="num">${r.stats.fixed}</span></span>
                </span>
            </div>
        `).join('');
    }
}

export default ResultManager;