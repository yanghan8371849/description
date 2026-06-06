export async function generateChineseDefinition(word) {
  if (!word) throw new Error('请输入单词');

  const baseUrl = window.location.protocol === 'file:'
    ? 'http://localhost:3001'
    : window.location.origin;
  const apiUrl = `${baseUrl}/api/generate-definition`;

  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ word }),
  });

  const result = await response.json();
  if (!response.ok) {
    const message = result?.error?.message || result?.error || `AI 代理请求失败：${response.status}`;
    throw new Error(message);
  }

  if (!result.definition) {
    throw new Error('AI 未返回释义');
  }

  return result.definition;
}
