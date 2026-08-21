export const MENU_CONFIG = {
  sections: [
    {
      id: "practice",
      title: "🎯 练习",
      items: [
        {
          id: "practice-phrase-cn",
          icon: "🖌️",
          label: "中文·词句",
          desc: "词语/短句/长句",
        },
        
        {
          id: "practice-phrase-en",
          icon: "✒️",
          label: "英文·词句",
          desc: "Words/Phrases/Sentences",
        },
        {
          id: "practice-cn",
          icon: "📜 ",
          label: "中文·文章",
          desc: "短篇/长篇/古诗",
        },
        {
          id: "practice-en",
          icon: "📰",
          label: "英文·文章",
          desc: "Short/Long/Poetry",
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
