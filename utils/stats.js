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
        isFinished = false
    } = data;

    // 用时
    const elapsed = startTime ? (Date.now() - startTime) / 1000 : 0;
    const minutes = elapsed / 60;

    const processed = correct + errors + fixed;
    const totalCorrect = correct + fixed;

    // 准确率
    const actualAccuracy = processed === 0 ? 100 : Math.round((totalCorrect / processed) * 100);

    // 速度
    const cpm = minutes > 0 ? Math.round(totalCorrect / minutes) : 0;
    const wpm = minutes > 0 ? Math.round((totalCorrect / 5) / minutes) : 0;
    const kpm = minutes > 0 ? Math.round(keystrokes / minutes) : 0;

    // 净速度
    const netCpm = Math.round(cpm * (actualAccuracy / 100));
    const netWpm = Math.round(wpm * (actualAccuracy / 100));

    // 效率
    const kspc = totalCorrect > 0 ? parseFloat((keystrokes / totalCorrect).toFixed(2)) : 0;
    const backspaceRate = keystrokes > 0 ? Math.round((backspaces / keystrokes) * 100) : 0;

    // 进度
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

        // 准确率
        actualAccuracy,

        // 效率
        backspaceRate,
        kspc,

        // 进度
        progress
    };
}

/**
 * 计算录入统计（无原文比对）
 */
export function calcInputStats(data) {
    const {
        charCount = 0,
        keystrokes = 0,
        backspaces = 0,
        startTime = null,
        currentMode = 'chinese'
    } = data;

    const elapsed = startTime ? (Date.now() - startTime) / 1000 : 0;
    const minutes = elapsed / 60;

    const isChinese = currentMode === 'chinese';
    const mainSpeed = isChinese
        ? (minutes > 0 ? Math.round(charCount / minutes) : 0)
        : (minutes > 0 ? Math.round((charCount / 5) / minutes) : 0);

    const kpm = minutes > 0 ? Math.round(keystrokes / minutes) : 0;
    const backspaceRate = keystrokes > 0 ? Math.round((backspaces / keystrokes) * 100) : 0;
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
