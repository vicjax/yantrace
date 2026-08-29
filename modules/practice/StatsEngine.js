/**
 * 砚迹（YanTrace）- 统计引擎
 * 职责：纯函数统计计算，不依赖 DOM
 * 位置：modules/practice/model/StatsEngine.js
 */

/**
 * 计算统计数据
 * @param {object} state - PracticeState 实例
 * @param {number} effectiveElapsed - 有效打字时间（秒）
 * @param {number} peakCpm - 峰值 CPM
 * @param {number} peakWpm - 峰值 WPM
 * @returns {object} 统计结果
 */
export function calcStats(state, effectiveElapsed, peakCpm, peakWpm) {
  const elapsed = effectiveElapsed;
  const minutes = elapsed / 60;
  const processed = state.getProcessed();
  const totalCorrect = state.getTotalCorrect();

  const actualAccuracy =
    processed === 0 ? 100 : Math.round((totalCorrect / processed) * 100);

  const cpm = minutes > 0 ? Math.round(totalCorrect / minutes) : 0;
  const wpm = minutes > 0 ? Math.round(totalCorrect / 5 / minutes) : 0;
  const kpm = minutes > 0 ? Math.round(state.keystrokes / minutes) : 0;
  const netCpm = Math.round(cpm * (actualAccuracy / 100));
  const netWpm = Math.round(wpm * (actualAccuracy / 100));

  const backspaceRate =
    state.keystrokes > 0
      ? Math.round((state.backspaces / state.keystrokes) * 100)
      : 0;

  const kspc =
    totalCorrect > 0
      ? parseFloat((state.keystrokes / totalCorrect).toFixed(2))
      : 0;

  const progress =
    state.totalChars === 0
      ? 0
      : Math.round((processed / state.totalChars) * 100);

  const peakSpeed = state.currentMode === "chinese" ? peakCpm : peakWpm;

  return {
    correct: state.correct,
    errors: state.errors,
    fixed: state.fixed,
    totalCorrect: totalCorrect,
    backspaces: state.backspaces,
    keystrokes: state.keystrokes,
    elapsed: Math.round(elapsed),
    totalChars: state.totalChars,
    processed: processed,
    isFinished: state.isFinished,
    actualAccuracy: actualAccuracy,
    cpm: cpm,
    wpm: wpm,
    kpm: kpm,
    netCpm: netCpm,
    netWpm: netWpm,
    peakSpeed: peakSpeed,
    backspaceRate: backspaceRate,
    kspc: kspc,
    progress: progress,
  };
}
