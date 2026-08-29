/**
 * 砚迹（YanTrace）- 文章库服务
 * 职责：管理文章的增删改查，持久化到 localStorage
 */

import Storage from '../../utils/storage.js';
import Helpers from '../../utils/helpers.js';

// ============================================
// 常量
// ============================================

const STORAGE_KEY = 'yantrace_articles';


// ============================================
// 默认内置文章
// ============================================

const DEFAULT_ARTICLES = [
    // 中文文章
    {
        id: 'cn-1',
        title: '荷塘月色',
        content: '曲曲折折的荷塘上面，弥望的是田田的叶子。叶子出水很高，像亭亭的舞女的裙。层层的叶子中间，零星地点缀着些白花，有袅娜地开着的，有羞涩地打着朵儿的。',
        type: 'chinese'
    },
    {
        id: 'cn-2',
        title: '论语',
        content: '学而时习之，不亦说乎。有朋自远方来，不亦乐乎。人不知而不愠，不亦君子乎。吾日三省吾身，为人谋而不忠乎，与朋友交而不信乎，传不习乎。',
        type: 'chinese'
    },
    {
        id: 'cn-3',
        title: '将进酒',
        content: '君不见黄河之水天上来，奔流到海不复回。君不见高堂明镜悲白发，朝如青丝暮成雪。人生得意须尽欢，莫使金樽空对月。天生我材必有用，千金散尽还复来。',
        type: 'chinese'
    },
    {
        id: 'cn-4',
        title: '逍遥游',
        content: '北冥有鱼，其名为鲲。鲲之大，不知其几千里也。化而为鸟，其名为鹏。鹏之背，不知其几千里也。怒而飞，其翼若垂天之云。',
        type: 'chinese'
    },
    {
        id: 'cn-5',
        title: '背影',
        content: '我与父亲不相见已二年余了，我最不能忘记的是他的背影。我看见他戴着黑布小帽，穿着黑布大马褂，深青布棉袍，蹒跚地走到铁道边，慢慢探身下去，尚不大难。',
        type: 'chinese'
    },
    {
        id: 'cn-6',
        title: '励志名言',
        content: '天行健，君子以自强不息。地势坤，君子以厚德载物。路漫漫其修远兮，吾将上下而求索。宝剑锋从磨砺出，梅花香自苦寒来。',
        type: 'chinese'
    },
    {
        id: 'cn-7',
        title: '面朝大海',
        content: '从明天起，做一个幸福的人。喂马，劈柴，周游世界。从明天起，关心粮食和蔬菜。我有一所房子，面朝大海，春暖花开。',
        type: 'chinese'
    },
    // 英文文章
    {
        id: 'en-1',
        title: 'Philosophy',
        content: 'The unexamined life is not worth living. Wisdom begins in wonder, and philosophy is the art of asking the right questions.',
        type: 'english'
    },
    {
        id: 'en-2',
        title: 'Technology',
        content: 'The future of artificial intelligence is not about machines replacing humans, but about augmenting our capabilities. AI will help us solve complex problems.',
        type: 'english'
    },
    {
        id: 'en-3',
        title: 'Poetry',
        content: 'The woods are lovely, dark and deep. But I have promises to keep, and miles to go before I sleep.',
        type: 'english'
    }
];


// ============================================
// 文章服务类
// ============================================

class ArticleService {
    constructor() {
        this.articles = [];
        this._loaded = false;
    }

    /**
     * 加载所有文章（从 localStorage 或默认数据）
     * @returns {Array} 文章列表
     */
    loadAll() {
        if (this._loaded) return this.articles;

        const data = Storage.get(STORAGE_KEY);
        if (data && data.length > 0) {
            this.articles = data;
        } else {
            this.articles = this._cloneDefaults();
            this._save();
        }

        this._loaded = true;
        return this.articles;
    }

    /**
     * 获取所有文章
     * @returns {Array} 文章列表
     */
    getAll() {
        if (!this._loaded) this.loadAll();
        return this.articles;
    }

    /**
     * 根据类型获取文章
     * @param {string} type - 'chinese' 或 'english'
     * @returns {Array} 文章列表
     */
    getByType(type) {
        return this.getAll().filter(a => a.type === type);
    }

    /**
     * 根据 ID 获取文章
     * @param {string} id - 文章 ID
     * @returns {Object|null} 文章对象
     */
    getById(id) {
        return this.getAll().find(a => a.id === id) || null;
    }

    /**
     * 获取中文文章
     * @returns {Array} 中文文章列表
     */
    getChinese() {
        return this.getByType('chinese');
    }

    /**
     * 获取英文文章
     * @returns {Array} 英文文章列表
     */
    getEnglish() {
        return this.getByType('english');
    }

    /**
     * 创建新文章
     * @param {string} title - 标题
     * @param {string} content - 内容
     * @param {string} type - 'chinese' 或 'english'
     * @returns {Object} 创建的文章对象
     */
    create(title, content, type) {
        const article = {
            id: Helpers.generateId('art'),
            title: title.trim(),
            content: content.trim(),
            type: type
        };

        this.articles.push(article);
        this._save();
        return article;
    }

    /**
     * 更新文章
     * @param {string} id - 文章 ID
     * @param {Object} data - 要更新的数据
     * @returns {Object|null} 更新后的文章对象
     */
    update(id, data) {
        const index = this.articles.findIndex(a => a.id === id);
        if (index === -1) return null;

        this.articles[index] = { ...this.articles[index], ...data };
        this._save();
        return this.articles[index];
    }

    /**
     * 追加内容到文章
     * @param {string} id - 文章 ID
     * @param {string} newContent - 追加的内容
     * @returns {Object|null} 更新后的文章对象
     */
    append(id, newContent) {
        const article = this.getById(id);
        if (!article) return null;

        const trimmed = newContent.trim();
        if (!trimmed) return article;

        article.content = article.content + '\n' + trimmed;
        this._save();
        return article;
    }

    /**
     * 删除文章
     * @param {string} id - 文章 ID
     * @returns {boolean} 是否删除成功
     */
    delete(id) {
        const index = this.articles.findIndex(a => a.id === id);
        if (index === -1) return false;

        this.articles.splice(index, 1);
        this._save();
        return true;
    }

    /**
     * 获取文章总数
     * @returns {number}
     */
    count() {
        return this.articles.length;
    }

    /**
     * 获取文章选项（用于下拉菜单）
     * @param {string} type - 'chinese' 或 'english'
     * @returns {Array} [{ value: id, label: title }]
     */
    getOptions(type) {
        return this.getByType(type).map(a => ({
            value: a.id,
            label: a.title
        }));
    }

    /**
     * 保存到 localStorage
     * @private
     */
    _save() {
        Storage.set(STORAGE_KEY, this.articles);
    }

    /**
     * 克隆默认文章
     * @private
     */
    _cloneDefaults() {
        return DEFAULT_ARTICLES.map(a => ({ ...a }));
    }

    /**
     * 重置为默认文章（慎用）
     */
    resetToDefaults() {
        this.articles = this._cloneDefaults();
        this._save();
    }
}


// ============================================
// 导出
// ============================================

export default ArticleService;
