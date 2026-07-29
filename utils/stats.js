/**
 * 砚迹（YanTrace）- 统一统计计算服务
 * 职责：计算练习和录入的所有统计数据
 * 供 PracticeEngine、input.js、result.js 复用
 */

/**
 * 格式化时间（秒 → MM:SS）
 * @param {number} seconds - 秒数
 * @returns {string} MM:SS 格式
 */
export function formatTime(seconds) {
    const mins = String(Math.floor(seconds / 60)).padStart(2, '0');
    const secs = String(Math.floor(seconds % 60)).padStart(2, '0');
    return `${mins}:${secs}`;
}

/**
 * 计算练习统计（有原文比对）
 * @param {Object} data
 * @param {number} data.correct - 正确字符数
 * @param {number} data.errors - 错误字符数
 * @param {number} data.fixed - 改正字符数
 * @param {number} data.backspaces - 退格次数
 * @param {number} data.keystrokes - 总击键数
 * @param {number} data.totalChars - 文章总字符数
 * @param {number|null} data.startTime - 开始时间戳
 * @param {string} data.currentMode - 'chinese' 或 'english'
 * @param {number} data.peakCpm - 峰值速度（中文）
 * @param {number} data.peakWpm - 峰值速度（英文）
 * @param {number} data.instantCorrect - 瞬时速度采样正确数
 * @param {number|null} data.instantStartTime - 瞬时采样开始时间
 * @param {boolean} data.isFinished - 是否已完成
 * @returns {Object} 全部统计指标
 */
export function calcPracticeStats(data) {
    const {
        correct = 0,
        errors = 0,
        fixed = 0,
        backspaces = 0,
        keystrokes = 0,
        totalChars = 0,
        startTime = null,
        currentMode = 'chinese',
        peakCpm = 0,
        peakWpm = 0,
        instantCorrect = 0,
        instantStartTime = null,
        isFinished = false
    } = data;

    // 用时
    const elapsed = startTime ? (Date.now() - startTime) / 1000 : 0;
    const minutes = elapsed / 60;

    // 已处理字符
    const processed = correct + errors + fixed;

    // ========== 速度 ==========
    const cpm = minutes > 0 ? Math.round((correct + fixed) / minutes) : 0;
    const wpm = minutes > 0 ? Math.round(((correct + fixed) / 5) / minutes) : 0;
    const kpm = minutes > 0 ? Math.round(keystrokes / minutes) : 0;

    // 实际正确率（用于净速度计算）
    const actualAccuracy = processed === 0 ? 100 : Math.round(((correct + fixed) / processed) * 100);
    const netCpm = Math.round(cpm * (actualAccuracy / 100));
    const netWpm = Math.round(wpm * (actualAccuracy / 100));

    // 峰值速度
    const peakSpeed = currentMode === 'chinese' ? peakCpm : peakWpm;

    // 瞬时速度（最近30秒）
    let instantSpeed = 0;
    if (instantStartTime) {
        const instantElapsed = (Date.now() - instantStartTime) / 1000;
        if (instantElapsed >= 5) {
            const instantMinutes = instantElapsed / 60;
            instantSpeed = instantMinutes > 0 ? Math.round(instantCorrect / instantMinutes) : 0;
        } else {
            instantSpeed = minutes > 0 ? Math.round(instantCorrect / minutes) : 0;
        }
    }

    // ========== 准确率 ==========
    const rawAccuracy = processed === 0 ? 100 : Math.round((correct / processed) * 100);
    const fixRate = processed === 0 ? 0 : Math.round((fixed / processed) * 100);
    const errorRate = processed === 0 ? 0 : Math.round((errors / processed) * 100);

    // ========== 效率 ==========
    const finalCorrect = correct + fixed;
    const kspc = finalCorrect > 0 ? parseFloat((keystrokes / finalCorrect).toFixed(2)) : 0;
    const backspaceRate = keystrokes > 0 ? Math.round((backspaces / keystrokes) * 100) : 0;

    // ========== 进度 ==========
    const progress = totalChars === 0 ? 0 : Math.round((processed / totalChars) * 100);

    return {
        // 基础
        correct,
        errors,
        fixed,
        backspaces,
        keystrokes,
        elapsed: Math.round(elapsed),
        totalChars,
        processed,
        isFinished: isFinished || (processed >= totalChars && totalChars > 0),

        // 速度
        cpm,
        wpm,
        kpm,
        netCpm,
        netWpm,
        peakSpeed,
        instantSpeed,

        // 准确率
        rawAccuracy,
        actualAccuracy,
        fixRate,
        errorRate,

        // 效率
        backspaceRate,
        kspc,

        // 进度
        progress
    };
}

/**
 * 计算录入统计（无原文比对）
 * @param {Object} data
 * @param {number} data.charCount - 录入字符数
 * @param {number} data.keystrokes - 总击键数
 * @param {number} data.backspaces - 退格次数
 * @param {number|null} data.startTime - 开始时间戳
 * @param {string} data.currentMode - 'chinese' 或 'english'
 * @returns {Object} 录入统计指标
 */
export function calcInputStats(data) {
    const {
        charCount = 0,
        keystrokes = 0,
        backspaces = 0,
        startTime = null,
        currentMode = 'chinese'
    } = data;

    // 用时
    const elapsed = startTime ? (Date.now() - startTime) / 1000 : 0;
    const minutes = elapsed / 60;

    // 速度
    const isChinese = currentMode === 'chinese';
    const mainSpeed = isChinese
        ? (minutes > 0 ? Math.round(charCount / minutes) : 0)
        : (minutes > 0 ? Math.round((charCount / 5) / minutes) : 0);

    const kpm = minutes > 0 ? Math.round(keystrokes / minutes) : 0;

    // 退格率
    const backspaceRate = keystrokes > 0 ? Math.round((backspaces / keystrokes) * 100) : 0;

    // KSPC（每字符击键数）
    const kspc = charCount > 0 ? parseFloat((keystrokes / charCount).toFixed(2)) : 0;

    return {
        charCount,
        keystrokes,
        backspaces,
        elapsed: Math.round(elapsed),
        cpm: isChinese ? mainSpeed : 0,
        wpm: isChinese ? 0 : mainSpeed,
        speed: mainSpeed,
        kpm,
        backspaceRate,
        kspc,
        currentMode
    };
}