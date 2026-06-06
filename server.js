const express = require('express');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

app.use(express.json());
app.use(express.static(path.join(process.cwd())));

app.post('/api/generate-definition', async (req, res) => {
  const { word } = req.body;
  if (!word) {
    return res.status(400).json({ error: 'word is required' });
  }

  if (!OPENAI_API_KEY) {
    return res.status(500).json({ error: 'OPENAI_API_KEY is not configured' });
  }

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'user',
            content: `请用中文生成英文单词“${word}”的简短释义，返回一个直接的中文释义，不要包含示例或额外说明。`,
          },
        ],
        max_tokens: 60,
      }),
    });

    const result = await response.json();
    if (!response.ok) {
      return res.status(response.status).json({ error: result.error || 'AI proxy error' });
    }

    const definition = result?.choices?.[0]?.message?.content?.trim() || result?.text?.trim();
    if (!definition) {
      return res.status(500).json({ error: 'AI did not return a definition' });
    }

    res.json({ definition });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message || 'AI proxy failed' });
  }
});

app.listen(PORT, () => {
  console.log(`Server started on http://localhost:${PORT}`);
});
