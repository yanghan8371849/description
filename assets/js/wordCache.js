import { supabase } from './supabaseClient.js';
import { generateChineseDefinition } from './aiService.js';

// 本模块实现三级缓存：localStorage -> Supabase -> DeepSeek(通过 aiService 代理)
// 并提供缓存统计、清理、loading 与防重复提交逻辑。

// 本地缓存键前缀
const LOCAL_KEY_PREFIX = 'word_';
// 统计数据在 localStorage 中的键
const STATS_KEY = 'word_cache_stats';

// 并发锁，防止同一单词被重复请求
const inProgress = new Set();

// ---------------------- 辅助函数：统计管理 ----------------------
function _getStats() {
  try {
    const raw = localStorage.getItem(STATS_KEY);
    if (!raw) return { localHits: 0, supabaseHits: 0, aiRequests: 0 };
    return JSON.parse(raw);
  } catch (e) {
    console.error('读取缓存统计失败', e);
    return { localHits: 0, supabaseHits: 0, aiRequests: 0 };
  }
}

function _saveStats(stats) {
  try {
    localStorage.setItem(STATS_KEY, JSON.stringify(stats));
  } catch (e) {
    console.error('保存缓存统计失败', e);
  }
}

function _incStat(key) {
  const stats = _getStats();
  if (key === 'local') stats.localHits++;
  if (key === 'supabase') stats.supabaseHits++;
  if (key === 'ai') stats.aiRequests++;
  _saveStats(stats);
  updateStatsDisplay();
}

// ---------------------- 导出的缓存函数 ----------------------
// 从 localStorage 读取
export async function getFromLocalCache(word) {
  if (!word) return null;
  try {
    const raw = localStorage.getItem(`${LOCAL_KEY_PREFIX}${word}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && parsed.meaning) {
      _incStat('local');
      return parsed;
    }
    return null;
  } catch (e) {
    console.error('解析本地缓存失败', e);
    return null;
  }
}

// 查询 Supabase
export async function getFromSupabase(word) {
  if (!word) return null;
  try {
    const { data, error } = await supabase
      .from('words')
      .select('*')
      .eq('word', word)
      .limit(1);

    if (error) {
      console.error('Supabase 查询错误', error);
      return null;
    }

    if (!data || data.length === 0) return null;

    const row = data[0];
    _incStat('supabase');
    return { word: row.word, meaning: row.meaning };
  } catch (e) {
    console.error('查询 Supabase 异常', e);
    return null;
  }
}

// 调用 DeepSeek（通过 aiService 代理）
export async function getFromDeepSeek(word) {
  if (!word) throw new Error('单词不能为空');
  _incStat('ai'); // 无论成功或失败，都算一次 AI 调用尝试
  try {
    const meaning = await generateChineseDefinition(word);
    if (!meaning) throw new Error('AI 未返回释义');
    return { word, meaning };
  } catch (e) {
    console.error('调用 AI 异常', e);
    throw e;
  }
}

// 保存到 Supabase
export async function saveToSupabase(word, meaning) {
  if (!word || !meaning) throw new Error('保存时 word/meaning 不可为空');
  try {
    const response = await fetch('/api/save-word', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ word, definition: meaning }),
    });
    const result = await response.json();
    if (!response.ok) {
      console.error('写入 Supabase 失败', result);
      return false;
    }
    return true;
  } catch (e) {
    console.error('写入 Supabase 异常', e);
    return false;
  }
}

// 保存到 localStorage
export function saveToLocalCache(word, meaning) {
  if (!word || !meaning) return;
  try {
    localStorage.setItem(`${LOCAL_KEY_PREFIX}${word}`, JSON.stringify({ word, meaning }));
  } catch (e) {
    console.error('保存本地缓存失败', e);
  }
}

// ---------------------- 主函数：按三级缓存顺序获取释义 ----------------------
export async function getWordMeaning(word) {
  if (!word) throw new Error('请输入要查询的单词');
  word = word.trim().toLowerCase();

  // 防重复提交：如果当前单词正在请求中，则直接抛出或返回
  if (inProgress.has(word)) {
    throw new Error('请求已在进行中，请稍候');
  }

  inProgress.add(word);
  try {
    // 1) localStorage
    const local = await getFromLocalCache(word);
    if (local) return local;

    // 2) Supabase
    const sup = await getFromSupabase(word);
    if (sup) {
      // 写回 localStorage（增强下一次命中）
      try { saveToLocalCache(word, sup.meaning); } catch (e) { console.warn(e); }
      return sup;
    }

    // 3) DeepSeek（AI）
    const ai = await getFromDeepSeek(word);

    // 将结果写入 Supabase 与 localStorage（后台尽力而为）
    try { saveToLocalCache(word, ai.meaning); } catch (e) { console.warn('写本地缓存失败', e); }
    try { await saveToSupabase(word, ai.meaning); } catch (e) { console.warn('写 Supabase 失败', e); }

    return ai;
  } finally {
    inProgress.delete(word);
  }
}

// ---------------------- 页面交互与统计展示 ----------------------
// 更新页面上的统计显示，期待页面上存在下面几个 id：
// localCacheHit, supabaseCacheHit, aiRequests
export function updateStatsDisplay() {
  const stats = _getStats();
  const localEl = document.getElementById('localCacheHit');
  const supEl = document.getElementById('supabaseCacheHit');
  const aiEl = document.getElementById('aiRequests');

  if (localEl) localEl.textContent = String(stats.localHits || 0);
  if (supEl) supEl.textContent = String(stats.supabaseHits || 0);
  if (aiEl) aiEl.textContent = String(stats.aiRequests || 0);
}

// 清理本地 word_ 前缀的缓存
export function clearLocalWordCache() {
  try {
    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(LOCAL_KEY_PREFIX)) keysToRemove.push(key);
    }
    keysToRemove.forEach(k => localStorage.removeItem(k));
    updateStatsDisplay();
  } catch (e) {
    console.error('清理本地缓存失败', e);
  }
}

// 清空统计
export function clearStats() {
  try {
    localStorage.removeItem(STATS_KEY);
    updateStatsDisplay();
  } catch (e) {
    console.error('清理统计失败', e);
  }
}

// 页面自动挂载：若页面存在特定元素则自动绑定交互
function _mountUI() {
  const input = document.getElementById('wordInput');
  const btn = document.getElementById('lookupBtn');
  const resultEl = document.getElementById('result');
  const clearBtn = document.getElementById('clearLocalCacheBtn');

  function showLoading(loading) {
    if (btn) btn.disabled = loading;
    if (resultEl) resultEl.textContent = loading ? '加载中...' : '';
  }

  if (btn && input && resultEl) {
    btn.addEventListener('click', async (e) => {
      e.preventDefault();
      const raw = input.value || '';
      const w = raw.trim().toLowerCase();
      if (!w) {
        resultEl.textContent = '请输入单词';
        return;
      }

      try {
        showLoading(true);
        const res = await getWordMeaning(w);
        resultEl.textContent = res.meaning || '未找到释义';
      } catch (err) {
        resultEl.textContent = err.message || '查询失败';
      } finally {
        showLoading(false);
      }
    });
  }

  if (clearBtn) {
    clearBtn.addEventListener('click', (e) => {
      e.preventDefault();
      clearLocalWordCache();
      // 同时清空统计
      clearStats();
      const resultEl = document.getElementById('result');
      if (resultEl) resultEl.textContent = '本地缓存已清空';
    });
  }

  // 首次展示统计
  updateStatsDisplay();
}

// DOMContentLoaded 时自动挂载
if (typeof window !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', _mountUI);
  } else {
    _mountUI();
  }
}
