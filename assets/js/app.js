import { supabase } from './supabaseClient.js';
import { generateChineseDefinition } from './aiService.js';
import { getWordMeaning, updateStatsDisplay } from './wordCache.js';
import { DEV_USER_ID } from './config.js';

function isLocalhost() {
  return window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
}

async function getCurrentUser() {
  const { data, error } = await supabase.auth.getUser();
  if (error) {
    if (DEV_USER_ID && isLocalhost() && isValidUuid(DEV_USER_ID)) {
      console.warn('Using local dev user fallback because auth session is missing.');
      return {
        id: DEV_USER_ID,
        email: 'dev@localhost',
      };
    }
    if (DEV_USER_ID && isLocalhost()) {
      console.warn('DEV_USER_ID is set but invalid. Please provide a valid UUID for local dev fallback.');
    }
    console.error('获取当前用户失败', error);
    return null;
  }
  return data?.user || null;
}

const WORD_DEFINITION_FIELD = 'definition';
const FALLBACK_DEFINITION_FIELDS = ['definition', 'meaning', 'description', 'content', 'def', 'explanation'];

function isMissingFieldError(error) {
  if (!error || !error.message) return false;
  return /Could not find the '.+' column of 'words' in the schema cache|column .* does not exist/i.test(error.message);
}

function isValidUuid(uuid) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(uuid);
}

async function addWord(word, definition, example, userId) {
  if (!word || !definition) throw new Error('word and definition are required');
  const payload = { word, definition };
  if (example) payload.example = example;
  if (userId) payload.user_id = userId;

  const response = await fetch('/api/save-word', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const result = await response.json();
  if (!response.ok) {
    throw new Error(result?.error || JSON.stringify(result));
  }
  return result.data;
}

async function queryWords(q) {
  if (!q) return [];
  const { data, error } = await supabase
    .from('words')
    .select('*')
    .ilike('word', `%${q}%`);
  if (error) throw error;
  return data || [];
}

function getDefinitionFromRecord(item) {
  return item[WORD_DEFINITION_FIELD] || item.definition || item.meaning || item.description || item.content || item.def || '';
}

function renderCards(list, root) {
  root.innerHTML = '';
  if (!list.length) {
    root.innerHTML = '<p class="text-gray-600">未找到相关单词</p>';
    return;
  }
  list.forEach(item => {
    const definition = getDefinitionFromRecord(item);
    const card = document.createElement('div');
    card.className = 'bg-white rounded-xl shadow-lg p-6';
    card.innerHTML = `
      <div class="text-center">
        <h4 class="text-3xl font-bold text-blue-600 mb-3">${item.word}</h4>
        <p class="text-gray-600 mb-4">${definition}</p>
        <div class="bg-gray-100 rounded-lg p-3">${item.example || ''}</div>
      </div>
    `;
    root.appendChild(card);
  });
}

function updateAuthStatus(user, statusEl, signOutBtn, authForm) {
  if (user) {
    statusEl.textContent = `已登录：${user.email}`;
    signOutBtn.classList.remove('hidden');
    authForm.classList.add('hidden');
  } else {
    statusEl.textContent = '未登录，登录后可新增单词';
    signOutBtn.classList.add('hidden');
    authForm.classList.remove('hidden');
  }
}

async function handleSignIn(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  if (error) throw error;
  return data.user;
}

async function handleSignUp(email, password) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  });
  if (error) throw error;
  return data.user;
}

document.addEventListener('DOMContentLoaded', () => {
  const authForm = document.getElementById('auth-form');
  const authEmail = document.getElementById('auth-email');
  const authPassword = document.getElementById('auth-password');
  const signInBtn = document.getElementById('sign-in-button');
  const signUpBtn = document.getElementById('sign-up-button');
  const signOutBtn = document.getElementById('sign-out-button');
  const userStatus = document.getElementById('user-status');
  const form = document.getElementById('add-word-form');
  const wordInput = document.getElementById('word-input');
  const defInput = document.getElementById('def-input');
  const exampleInput = document.getElementById('example-input');
  const searchInput = document.getElementById('search-input');
  const searchBtn = document.getElementById('search-button');
  const searchResults = document.getElementById('search-results');

  async function refreshUser() {
    const user = await getCurrentUser();
    updateAuthStatus(user, userStatus, signOutBtn, authForm);
    return user;
  }

  refreshUser();

  if (signInBtn) {
    signInBtn.addEventListener('click', async () => {
      const email = authEmail.value.trim();
      const password = authPassword.value.trim();
      if (!email || !password) return alert('请填写邮箱和密码');
      try {
        await handleSignIn(email, password);
        alert('登录成功');
        authEmail.value = '';
        authPassword.value = '';
        await refreshUser();
      } catch (err) {
        console.error(err);
        alert('登录失败：' + (err.message || JSON.stringify(err)));
      }
    });
  }

  if (signUpBtn) {
    signUpBtn.addEventListener('click', async () => {
      const email = authEmail.value.trim();
      const password = authPassword.value.trim();
      if (!email || !password) return alert('请填写邮箱和密码');
      try {
        await handleSignUp(email, password);
        alert('注册成功，请检查邮箱完成确认后再登录');
        authEmail.value = '';
        authPassword.value = '';
      } catch (err) {
        console.error(err);
        alert('注册失败：' + (err.message || JSON.stringify(err)));
      }
    });
  }

  if (signOutBtn) {
    signOutBtn.addEventListener('click', async () => {
      await supabase.auth.signOut();
      await refreshUser();
      alert('已登出');
    });
  }

  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const user = await getCurrentUser();
      if (!user) return alert('请先登录');
      const word = wordInput.value.trim();
      let definition = defInput.value.trim();
      const example = exampleInput.value.trim();
      if (!word) return alert('请输入英文单词');
      try {
        if (!definition) {
          definition = await generateChineseDefinition(word);
          defInput.value = definition;
        }
        await addWord(word, definition, example, user.id);
        alert('已保存');
        form.reset();
      } catch (err) {
        console.error(err);
        alert('保存失败：' + (err.message || JSON.stringify(err)));
      }
    });
  }

  const generateDefinitionBtn = document.getElementById('generate-definition-button');
  if (generateDefinitionBtn) {
    generateDefinitionBtn.addEventListener('click', async () => {
      const word = wordInput.value.trim();
      if (!word) return alert('请输入英文单词以生成释义');
      generateDefinitionBtn.textContent = '生成中...';
      generateDefinitionBtn.disabled = true;
      try {
        const generated = await generateChineseDefinition(word);
        defInput.value = generated;
      } catch (err) {
        console.error(err);
        alert('生成释义失败：' + (err.message || JSON.stringify(err)));
      } finally {
        generateDefinitionBtn.textContent = '自动生成释义';
        generateDefinitionBtn.disabled = false;
      }
    });
  }

  if (searchBtn) {
    searchBtn.addEventListener('click', async () => {
      const q = searchInput.value.trim();
      if (!q) return;
      try {
        // 优先尝试精确查单词（走三级缓存）。若抛出错误或未命中，再回退到模糊查询
        try {
          const exact = await getWordMeaning(q);
          renderCards([{ word: exact.word, meaning: exact.meaning, example: '' }], searchResults);
          return;
        } catch (e) {
          // 若精确查失败（例如未命中或并发锁），继续做模糊查询
          console.warn('精确缓存查找未返回结果，回退模糊查询：', e.message || e);
        }

        const list = await queryWords(q);
        renderCards(list, searchResults);
      } catch (err) {
        console.error(err);
        alert('查询失败：' + (err.message || JSON.stringify(err)));
      }
    });
  }

  // 展示缓存统计（若存在）
  updateStatsDisplay();

});
