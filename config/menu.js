/**
 * 砚迹（YanTrace）- 菜单配置
 * 职责：定义首页菜单结构
 */

export const MENU_CONFIG = {
  sections: [
    {
      id: "practice",
      title: "🎯 练习",
      items: [
        {
          id: "practice-cn",
          icon: "🀄",
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
        // user 已移除
        { id: "history", icon: "📊", label: "历史记录" },
      ],
    },
  ],
};
