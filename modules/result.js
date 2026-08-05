/**
 * 砚迹（YanTrace）- 结果管理模块
 * 职责：保存历史记录 + 调用 DataDisplay 展示
 */

class ResultManager {
    constructor(options = {}) {
        this.historyService = options.historyService || null;
        this.userService = options.userService || null;
        this.onRestart = options.onRestart || null;

        // ⭐ 接收注入的 dataDisplay
        this.display = options.dataDisplay;

        if (!this.display) {
            console.warn('[ResultManager] dataDisplay 未注入，使用默认实例');
            import('./DataDisplay.js').then(module => {
                this.display = new module.default();
            });
        } else {
            this.display.onRestart(() => {
                if (this.onRestart) this.onRestart();
            });
        }
    }

    show(stats, mode, articleTitle) {
        this._saveHistory(stats, mode, articleTitle);
        if (this.display) {
            this.display.show({
                stats: stats,
                mode: mode,
                articleTitle: articleTitle,
                createdAt: Date.now(),
            });
        }
    }

    hide() {
        if (this.display) {
            this.display.hide();
        }
    }

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
            },
        };

        try {
            this.historyService.add(record);
            console.log('✅ 历史记录已保存');
        } catch (error) {
            console.error('[ResultManager] 保存历史失败:', error);
        }
    }
}

export default ResultManager;