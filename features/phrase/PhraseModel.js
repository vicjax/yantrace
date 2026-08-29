/**
 * 砚迹（YanTrace）- 词组数据模型
 * 职责：词组数据的 CRUD 和存储管理
 * 位置：features/phrase/PhraseModel.js
 */

import Storage from '../../utils/storage.js';
import { getPhraseSets, getPhraseSetById } from './phraseData.js';

const STORAGE_KEY = 'yantrace_phrases';

export default class PhraseModel {
  constructor() {
    this._phrases = null;
    this._loaded = false;
  }

  loadAll() {
    if (this._loaded) return this._phrases;

    const stored = Storage.get(STORAGE_KEY);
    if (stored && stored.length > 0) {
      this._phrases = stored;
    } else {
      this._phrases = this._getBuiltInData();
      this._save();
    }
    this._loaded = true;
    return this._phrases;
  }

  getAll() {
    this.loadAll();
    return this._phrases;
  }

  getByType(type) {
    this.loadAll();
    return this._phrases.filter((item) => item.type === type);
  }

  getById(id) {
    this.loadAll();
    return this._phrases.find((item) => item.id === id) || null;
  }

  _getBuiltInData() {
    const chinese = getPhraseSets('chinese');
    const english = getPhraseSets('english');
    return [...chinese, ...english];
  }

  _save() {
    Storage.set(STORAGE_KEY, this._phrases);
  }

  resetToBuiltIn() {
    this._phrases = this._getBuiltInData();
    this._save();
    return this._phrases;
  }
}
