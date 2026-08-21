/**
 * 砚迹（YanTrace）- 页面模板
 * 职责：生成各页面的 HTML 结构
 */

import { MENU_CONFIG } from "../../config/menu.js";


// ============================================================
// 首页模板
// ============================================================

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

// ============================================================
// 练习页面模板（统一）
// ============================================================

/**
 * @param {Object} config
 * @param {string} config.id - 页面 ID
 * @param {string} config.title - 页面标题
 * @param {string} config.prefix - DOM ID 前缀
 * @param {string} config.speedLabel - 速度标签 (CPM/WPM)
 * @param {string} config.placeholder - 占位文字
 * @param {string} config.icon - 图标
 * @param {string} config.type - 内容类型 (article/phrase)
 */
export function getPracticeHtml(config) {
  const { id, title, prefix, speedLabel, placeholder } = config;
  return `
    <div id="page-${id}" class="page">
      <div class="mode-header">
        <button class="btn btn-back back-btn" data-target="home">← 返回</button>
        <h2>${title}</h2>
        <select id="${prefix}TimeLimitSelect" class="article-select">
          <option value="0">无限时</option>
          <option value="15">15秒</option>
          <option value="30">30秒</option>
          <option value="60">60秒</option>
          <option value="120">120秒</option>
        </select>
        <select id="${prefix}Select" class="article-select"></select>
        <button class="btn btn-reset" id="${prefix}ResetBtn">⟳ 重新开始</button>
        <button class="btn btn-stop" id="${prefix}StopBtn">⏹ 停止</button>
      </div>

      <div class="stats-bar" id="${prefix}StatsBar">
        <span>${speedLabel}⚡<b id="${prefix}Speed">0</b></span>
        <span>KPM⌨️<b id="${prefix}Kpm">0</b></span>
        <span>KSPC📊<b id="${prefix}Kspc">0</b></span>
        <span>准确率🎯<b id="${prefix}Accuracy">100</b>%</span>
        <span>字数📝<b id="${prefix}ProgressChars">0</b>/<b id="${prefix}TotalChars">0</b></span>
        <span>⏱<b id="${prefix}Timer">00:00</b></span>
        <span>峰值⚡<b id="${prefix}PeakSpeed">0</b></span>
      </div>

      <div class="progress-container">
        <div class="progress-bar">
          <div class="progress-fill" id="${prefix}ProgressFill" style="width:0%"></div>
        </div>
        <span class="progress-text" id="${prefix}ProgressText">0%</span>
      </div>

      <div class="text-box" id="${prefix}TextBox">
        <span class="placeholder">${placeholder}</span>
      </div>
    </div>
  `;
}

// ============================================================
// 练习页面配置
// ============================================================

export const PRACTICE_PAGES = [
  {
    id: "practice-cn",
    title: "📜 中文文章",
    prefix: "cn",
    speedLabel: "CPM",
    placeholder: "选择一篇文章开始练习",
  },
  {
    id: "practice-en",
    title: "📰 英文文章",
    prefix: "en",
    speedLabel: "WPM",
    placeholder: "选择一篇文章开始练习",
  },
  {
    id: "practice-phrase-cn",
    title: "🖌️ 中文词句",
    prefix: "cn",
    speedLabel: "CPM",
    placeholder: "选择词组集开始练习",
  },
  {
    id: "practice-phrase-en",
    title: "✒️ 英文词句",
    prefix: "en",
    speedLabel: "WPM",
    placeholder: "选择词组集开始练习",
  },
];
