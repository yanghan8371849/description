import { supabase } from './supabaseClient.js';

async function getCurrentUser() {
  const { data, error } = await supabase.auth.getUser();
  if (error) {
    console.error('获取当前用户失败', error);
    return null;
  }
  return data?.user || null;
}

async function addWord(word, definition, example, userId) {
  const { data, error } = await supabase
    .from('words')
    .insert([{ word, definition, example, user_id: userId }]);
  if (error) throw error;
  return data;
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

function renderCards(list, root) {
  root.innerHTML = '';
  if (!list.length) {
    root.innerHTML = '<p class="text-gray-600">未找到相关单词</p>';
    return;
  }
  list.forEach(item => {
    const card = document.createElement('div');
    card.className = 'bg-white rounded-xl shadow-lg p-6';
    card.innerHTML = `
      <div class="text-center">
        <h4 class="text-3xl font-bold text-blue-600 mb-3">${item.word}</h4>
        <p class="text-gray-600 mb-4">${item.definition || ''}</p>
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
      const definition = defInput.value.trim();
      const example = exampleInput.value.trim();
      if (!word) return alert('请输入英文单词');
      try {
        await addWord(word, definition, example, user.id);
        alert('已保存');
        form.reset();
      } catch (err) {
        console.error(err);
        alert('保存失败：' + (err.message || JSON.stringify(err)));
      }
    });
  }

  if (searchBtn) {
    searchBtn.addEventListener('click', async () => {
      const q = searchInput.value.trim();
      try {
        const list = await queryWords(q);
        renderCards(list, searchResults);
      } catch (err) {
        console.error(err);
        alert('查询失败：' + (err.message || JSON.stringify(err)));
      }
    });
  }

});
