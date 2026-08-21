export const MENU_CONFIG = {
  sections: [
    {
      id: "practice",
      title: "🎯 练习",
      items: [
        // ⭐ 新增词组入口
        {
          id: "practice-phrase",
          icon: "📝",
          label: "词组练习",
          desc: "二字词 · 三字词 · 成语 · 短句 · 长句",
        },
        // 原有的中文/英文练习保持不变
        {
          id: "practice-cn",
          icon: "✍️",
          label: "中文练习",
          desc: "开始打字",
        },
        {
          id: "practice-en",
          icon: "🔤",
          label: "英文练习",
          desc: "Start Typing",
        },
      ],
    },
    {
      id: "management",
      title: "📂 管理",
      items: [
        { id: "article-management", icon: "📄", label: "文章管理" },
        { id: "history", icon: "📊", label: "历史记录" },
      ],
    },
  ],
};