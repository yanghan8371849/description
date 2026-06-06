import { supabase } from './supabaseClient.js';

async function addWord(word, definition, example) {
  const { data, error } = await supabase
    .from('words')
    .insert([{ word, definition, example }]);
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

document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('add-word-form');
  const wordInput = document.getElementById('word-input');
  const defInput = document.getElementById('def-input');
  const exampleInput = document.getElementById('example-input');
  const searchInput = document.getElementById('search-input');
  const searchBtn = document.getElementById('search-button');
  const searchResults = document.getElementById('search-results');

  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const word = wordInput.value.trim();
      const definition = defInput.value.trim();
      const example = exampleInput.value.trim();
      if (!word) return alert('请输入英文单词');
      try {
        await addWord(word, definition, example);
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
