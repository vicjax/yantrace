/**
 * 砚迹（YanTrace）- 页面模板
 * 职责：生成各页面的 HTML 结构
 */

import { MENU_CONFIG } from "../config/menu.js";

// ============================================================
// 标语列表（API 获取失败时的备用）
// ============================================================

// 备用标语
function getFallbackSloganData() {
  const fallbacks = [
    // 经典诗词
    { content: "学而不思则罔，思而不学则殆", source: "《论语》" },
    { content: "温故而知新，可以为师矣", source: "《论语》" },
    { content: "三人行，必有我师焉", source: "《论语》" },
    { content: "工欲善其事，必先利其器", source: "《论语》" },
    { content: "岁寒，然后知松柏之后凋也", source: "《论语》" },
    { content: "路漫漫其修远兮，吾将上下而求索", source: "屈原《离骚》" },
    { content: "举世皆浊我独清，众人皆醉我独醒", source: "屈原《渔父》" },
    { content: "采菊东篱下，悠然见南山", source: "陶渊明《饮酒》" },
    { content: "此中有真意，欲辨已忘言", source: "陶渊明《饮酒》" },
    { content: "长风破浪会有时，直挂云帆济沧海", source: "李白《行路难》" },
    { content: "天生我材必有用，千金散尽还复来", source: "李白《将进酒》" },
    {
      content: "安得广厦千万间，大庇天下寒士俱欢颜",
      source: "杜甫《茅屋为秋风所破歌》",
    },
    { content: "欲穷千里目，更上一层楼", source: "王之涣《登鹳雀楼》" },
    { content: "海上生明月，天涯共此时", source: "张九龄《望月怀远》" },
    {
      content: "独在异乡为异客，每逢佳节倍思亲",
      source: "王维《九月九日忆山东兄弟》",
    },
    {
      content: "劝君更尽一杯酒，西出阳关无故人",
      source: "王维《送元二使安西》",
    },
    { content: "山重水复疑无路，柳暗花明又一村", source: "陆游《游山西村》" },
    {
      content: "纸上得来终觉浅，绝知此事要躬行",
      source: "陆游《冬夜读书示子聿》",
    },
    { content: "问渠那得清如许，为有源头活水来", source: "朱熹《观书有感》" },
    { content: "不畏浮云遮望眼，自缘身在最高层", source: "王安石《登飞来峰》" },
    { content: "千磨万击还坚劲，任尔东西南北风", source: "郑燮《竹石》" },
    { content: "海内存知己，天涯若比邻", source: "王勃《送杜少府之任蜀州》" },
    { content: "大漠孤烟直，长河落日圆", source: "王维《使至塞上》" },
    { content: "春蚕到死丝方尽，蜡炬成灰泪始干", source: "李商隐《无题》" },
    { content: "身无彩凤双飞翼，心有灵犀一点通", source: "李商隐《无题》" },
    // 砚迹专属
    { content: "砚台虽小，可书天下", source: "" },
    { content: "一笔一画，皆是修行", source: "" },
    { content: "慢下来，好好打字", source: "" },
    { content: "字里行间，遇见自己", source: "" },
    { content: "键盘如砚，字字如墨", source: "" },
    { content: "以字为舟，以砚为海", source: "" },
    { content: "行云流水，皆在指尖", source: "" },
    { content: "练字练心，字如其人", source: "" },
  ];
  const data = fallbacks[Math.floor(Math.random() * fallbacks.length)];
  return {
    content: data.content,
    title: "",
    author: "",
    dynasty: "",
    source: data.source || "",
  };
}

// ============================================================
// 获取诗词（今日诗词 API）
// ============================================================

/**
 * 从今日诗词 API 获取诗句（REST API 方式，每次随机）
 */
/**
 * 获取名言/诗词（优先使用 API，失败时使用备用列表）
 */
export async function fetchSlogan() {
  // 1. 尝试获取 API 数据
  try {
    // 使用 "一言" API（稳定，支持诗词）
    const response = await fetch("https://v1.hitokoto.cn/?c=i");
    if (!response.ok) throw new Error("API 请求失败");
    const data = await response.json();

    // 如果返回了有效内容
    if (data && data.hitokoto) {
      const content = data.hitokoto;
      const author = data.from_who || "";
      const title = data.from || "";

      let source = "";
      if (author && title) {
        source = `${author}《${title}》`;
      } else if (title) {
        source = title;
      } else if (author) {
        source = author;
      }

      return {
        content: content,
        title: title,
        author: author,
        dynasty: "",
        source: source,
      };
    }
    throw new Error("API 返回数据无效");
  } catch (e) {
    console.warn("获取名言失败，使用备用标语:", e);
    return getFallbackSloganData();
  }
}

// ============================================================
// 获取时段图标
// ============================================================

function getTimeIcon(hour) {
  if (hour < 5) return "🌙";
  if (hour < 8) return "🌅";
  if (hour < 12) return "☀️";
  if (hour < 14) return "🌤️";
  if (hour < 18) return "🌤️";
  if (hour < 21) return "🌇";
  return "🌙";
}

// ============================================================
// 获取日期 + 星期
// ============================================================

function getDateStr() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const day = now.getDate();
  const weekdays = ["日", "一", "二", "三", "四", "五", "六"];
  const weekDay = weekdays[now.getDay()];
  return `${year}年${month}月${day}日  ·  周${weekDay}`;
}
// ============================================================
// 首页模板
// ============================================================

export function getHomeHtml(sloganData) {
  const user = window.app?.userService?.getCurrent();
  const userName = user?.name || "砚客";

  const hour = new Date().getHours();
  const icon = getTimeIcon(hour);

  let greeting = "你好";
  if (hour < 5) greeting = "夜深了";
  else if (hour < 8) greeting = "早上好";
  else if (hour < 12) greeting = "上午好";
  else if (hour < 14) greeting = "中午好";
  else if (hour < 18) greeting = "下午好";
  else if (hour < 21) greeting = "晚上好";
  else greeting = "夜深了";

  const dateStr = getDateStr();

  // 使用传入的数据或备用数据
  const data = sloganData || getFallbackSloganData();
  const content = data.content || "砚台虽小，可书天下";
  const sourceText = data.source ? `—— ${data.source}` : "";

  let html = ``;

  // 欢迎标语区
  html += `
    <div class="home-welcome">
      <p class="home-greeting">
        <span class="home-time-icon">${icon}</span>
        ${greeting}，${userName}
        <span class="home-date">·  ${dateStr}</span>
      </p>
      <div class="home-slogan-wrapper">
        <span class="home-quote-mark">"</span>
        <p class="home-slogan" id="homeSloganText">${content}</p>
        <span class="home-quote-mark">"</span>
      </div>
      <div class="home-slogan-footer">
        <span class="home-slogan-source" id="homeSloganSource">${sourceText}</span>
        <button class="home-slogan-refresh" id="homeSloganRefresh" title="换一句">⟳</button>
      </div>
    </div>
  `;

  // 练习网格
  MENU_CONFIG.sections.forEach((section) => {
    if (section.id === "practice") {
      html += `<div class="home-section home-section-practice">`;
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
    }
  });

  html += `
  <div class="home-footer">
    © 2026 <a href="https://github.com/vicjax/yantrace" target="_blank" rel="noopener noreferrer">YanTrace | GitHub</a>
  </div>
`;

  html += `</div>`;
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
