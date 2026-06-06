export async function generateChineseDefinition(word) {
  if (!word) throw new Error('请输入单词');

  const response = await fetch('/api/generate-definition', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ word }),
  });

  const result = await response.json();
  if (!response.ok) {
    throw new Error(result.error || `AI 代理请求失败：${response.status}`);
  }

  if (!result.definition) {
    throw new Error('AI 未返回释义');
  }

  return result.definition;
}
