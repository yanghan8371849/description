const express = require('express');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const AI_API_URL = process.env.AI_API_URL || process.env.OPENAI_API_URL || (process.env.OPENAI_API_KEY ? 'https://api.openai.com/v1/chat/completions' : undefined);
const AI_API_KEY = process.env.AI_API_KEY || process.env.OPENAI_API_KEY;
const AI_MODEL = process.env.AI_MODEL || 'gpt-4o-mini';

app.use(express.json());
app.use(express.static(path.join(process.cwd())));

app.post('/api/generate-definition', async (req, res) => {
  const { word } = req.body;
  if (!word) {
    return res.status(400).json({ error: 'word is required' });
  }

  if (!AI_API_URL || !AI_API_KEY) {
    return res.status(500).json({ error: 'AI_API_URL or AI_API_KEY is not configured' });
  }

  try {
    const targetUrl = (() => {
      if (!AI_API_URL) return AI_API_URL;
      try {
        const u = new URL(AI_API_URL);
        // if path already contains /v1/ assume it's a full endpoint
        if (u.pathname && u.pathname !== '/' && u.pathname.includes('/v1/')) return AI_API_URL;
        // otherwise append OpenAI-compatible chat completions path
        return AI_API_URL.replace(/\/+$/, '') + '/v1/chat/completions';
      } catch (e) {
        return AI_API_URL;
      }
    })();

    const response = await fetch(targetUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${AI_API_KEY}`,
      },
      body: JSON.stringify({
        model: AI_MODEL,
        messages: [
          {
            role: 'user',
            content: `请用中文生成英文单词“${word}”的简短释义，返回一个直接的中文释义，不要包含示例或额外说明。`,
          },
        ],
        max_tokens: 60,
      }),
    });
    const rawBody = await response.text();
    let result;
    if (rawBody) {
      try {
        result = JSON.parse(rawBody);
      } catch (parseError) {
        console.error('AI proxy returned invalid JSON', {
          status: response.status,
          contentType: response.headers.get('content-type'),
          body: rawBody,
          parseError: parseError.message,
        });
        return res.status(502).json({
          error: 'AI proxy returned invalid JSON',
          status: response.status,
          body: rawBody,
        });
      }
    }
    if (!response.ok) {
      const errorMessage = result?.error?.message || result?.error || result?.message || rawBody || 'AI proxy error';
      console.error('AI request failed', { status: response.status, body: rawBody });
      return res.status(response.status).json({ error: errorMessage });
    }

    const definition = result?.choices?.[0]?.message?.content?.trim() || result?.text?.trim() || result?.data?.text?.trim();
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
  console.log(`AI proxy using URL: ${AI_API_URL}`);
  try {
    const displayUrl = (AI_API_URL && (AI_API_URL.includes('/v1/') ? AI_API_URL : AI_API_URL.replace(/\/+$/, '') + '/v1/chat/completions')) || AI_API_URL;
    console.log(`AI request target URL: ${displayUrl}`);
  } catch (e) {}
  console.log(`AI model: ${AI_MODEL}`);
});
