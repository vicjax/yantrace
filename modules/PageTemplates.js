/**
 * 砚迹（YanTrace）- 页面模板
 * 职责：生成各页面的 HTML 结构
 */

import { MENU_CONFIG } from "../config/menu.js";

export function getHomeHtml() {
  let html = "";

  MENU_CONFIG.sections.forEach((section) => {
    const sectionClass =
      section.id === "practice"
        ? "home-section-practice"
        : "home-section-management";
    html += `<div class="home-section ${sectionClass}">`;
    html += `<div class="home-section-title">${section.title}</div>`;
    html += `<div class="home-grid">`;

    section.items.forEach((item) => {
      const descHtml = item.desc
        ? `<span class="home-btn-desc">${item.desc}</span>`
        : "";
      html += `
                <button class="home-btn" data-target="${item.id}">
                    <span class="home-btn-icon">${item.icon}</span>
                    <span class="home-btn-label">${item.label}</span>
                    ${descHtml}
                </button>
            `;
    });

    html += `</div></div>`;
  });

  return html;
}

export function getPracticeCnHtml() {
  return `
        <div class="mode-header">
            <button class="btn btn-back back-btn" data-target="home">← 返回</button>
            <h2>🀄 中文打字练习</h2>
            <select id="cnArticleSelect" class="article-select"></select>
            <button class="btn btn-reset" id="cnResetBtn">⟳ 重新开始</button>
        </div>

        <div class="stats-bar" id="cnStatsBar">
            <span>CPM⚡<b id="cnCpm">0</b></span>
            <span>KPM⌨️<b id="cnKpm">0</b></span>
            <span>KSPC📊<b id="cnKspc">0</b></span>
            <span>准确率🎯<b id="cnAccuracy">100</b>%</span>
            <span>字数📝<b id="cnProgressChars">0</b>/<b id="cnTotalChars">0</b></span>
            <span>用时⏱<b id="cnTimer">00:00</b></span>
            <span>峰值⚡<b id="cnPeakSpeed">0</b></span>
        </div>

        <div class="progress-container">
            <div class="progress-bar">
                <div class="progress-fill" id="cnProgressFill" style="width:0%"></div>
            </div>
            <span class="progress-text" id="cnProgressText">0%</span>
        </div>

        <div class="text-box" id="cnTextBox">
            <span class="placeholder">选择一篇文章开始练习</span>
        </div>
    `;
}

export function getPracticeEnHtml() {
  return `
        <div class="mode-header">
            <button class="btn btn-back back-btn" data-target="home">← 返回</button>
            <h2>🔤 英文打字练习</h2>
            <select id="enArticleSelect" class="article-select"></select>
            <button class="btn btn-reset" id="enResetBtn">⟳ 重新开始</button>
        </div>

        <div class="stats-bar" id="enStatsBar">
            <span>WPM⚡<b id="enWpm">0</b></span>
            <span>KPM⌨️<b id="enKpm">0</b></span>
            <span>KSPC📊<b id="enKspc">0</b></span>
            <span>准确率🎯<b id="enAccuracy">100</b>%</span>
            <span>字数📝<b id="enProgressChars">0</b>/<b id="enTotalChars">0</b></span>
            <span>用时⏱<b id="enTimer">00:00</b></span>
            <span>峰值⚡<b id="enPeakSpeed">0</b></span>
        </div>

        <div class="progress-container">
            <div class="progress-bar">
                <div class="progress-fill" id="enProgressFill" style="width:0%"></div>
            </div>
            <span class="progress-text" id="enProgressText">0%</span>
        </div>

        <div class="text-box" id="enTextBox">
            <span class="placeholder">选择一篇文章开始练习</span>
        </div>
    `;
}
