const express = require('express');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const AI_API_URL = process.env.AI_API_URL || process.env.OPENAI_API_URL || (process.env.OPENAI_API_KEY ? 'https://api.openai.com/v1/chat/completions' : undefined);
const AI_API_KEY = process.env.AI_API_KEY || process.env.OPENAI_API_KEY || process.env.DEEPSEEK_API_KEY;
const AI_MODEL = process.env.AI_MODEL || 'gpt-4o-mini';
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

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
        // if path already contains /v1 or /v1beta assume it's a full endpoint
        if (u.pathname && u.pathname !== '/' && (u.pathname.includes('/v1/') || u.pathname.includes('/v1beta/'))) return AI_API_URL;
        // otherwise append OpenAI-compatible chat completions path
        return AI_API_URL.replace(/\/+$/, '') + '/v1/chat/completions';
      } catch (e) {
        return AI_API_URL;
      }
    })();

    const isGemini = targetUrl.includes('gemini.googleapis.com') || targetUrl.includes('generativelanguage.googleapis.com');
    const isGeminiContent = targetUrl.includes('generativelanguage.googleapis.com') && targetUrl.includes(':generateContent');
    const definitionPrompt = `请用中文生成英文单词“${word}”的简短释义，返回一个直接的中文释义，不要包含示例或额外说明。`;
    const requestBody = isGeminiContent
      ? {
          model: AI_MODEL,
          temperature: 0.2,
          maxOutputTokens: 60,
          contents: [
            {
              parts: [
                {
                  text: definitionPrompt,
                },
              ],
            },
          ],
        }
      : isGemini
      ? {
          model: AI_MODEL,
          temperature: 0.2,
          maxOutputTokens: 60,
          messages: [
            {
              author: 'user',
              content: {
                text: definitionPrompt,
              },
            },
          ],
        }
      : {
          model: AI_MODEL,
          messages: [
            {
              role: 'user',
              content: definitionPrompt,
            },
          ],
          max_tokens: 60,
        };

    const headers = {
      'Content-Type': 'application/json',
    };
    if (isGemini && targetUrl.includes('generativelanguage.googleapis.com')) {
      if (AI_API_KEY.startsWith('AQ.') || AI_API_KEY.startsWith('AIza')) {
        headers['X-goog-api-key'] = AI_API_KEY;
      } else {
        headers.Authorization = `Bearer ${AI_API_KEY}`;
      }
    } else {
      headers.Authorization = `Bearer ${AI_API_KEY}`;
    }

    const response = await fetch(targetUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(requestBody),
    });
    const rawBody = await response.text();
    console.log('========== DeepSeek Raw Response ==========');
    console.log(rawBody);
    console.log('==========================================');
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

    const fallbackDictionary = {
      apple: '苹果',
      orange: '橙子',
      banana: '香蕉',
      computer: '计算机',
      network: '网络',
      database: '数据库',
      algorithm: '算法',
      software: '软件',
      hardware: '硬件',
    };

    if (!response.ok) {
      const errorMessage = result?.error?.message || result?.error || result?.message || rawBody || 'AI proxy error';
      console.error('AI request failed', { status: response.status, body: rawBody });
      const fallback = fallbackDictionary[word.toLowerCase()];
      if (fallback) {
        return res.json({ definition: fallback, source: 'fallback' });
      }
      return res.status(response.status).json({ error: errorMessage, debug: result });
    }

    const definition = result?.choices?.[0]?.message?.content?.trim()
      || result?.choices?.[0]?.text?.trim()
      || result?.response?.trim()
      || result?.content?.trim()
      || result?.text?.trim()
      || result?.data?.text?.trim()
      || result?.candidates?.[0]?.output?.[0]?.content?.[0]?.text?.trim()
      || result?.candidates?.[0]?.content?.[0]?.text?.trim()
      || result?.output?.[0]?.content?.[0]?.text?.trim();
    if (!definition) {
      const fallback = fallbackDictionary[word.toLowerCase()];
      if (fallback) {
        return res.json({ definition: fallback, source: 'fallback' });
      }
      return res.status(500).json({ error: 'AI did not return a definition', debug: result });
    }

    res.json({ definition });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message || 'AI proxy failed' });
  }
});
app.post('/api/save-word', async (req, res) => {
  const { word, definition, example, user_id } = req.body;
  if (!word || !definition) {
    return res.status(400).json({ error: 'word and definition are required' });
  }
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return res.status(500).json({ error: 'SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is not configured' });
  }

  try {
    const payload = { word, definition };
    if (example) payload.example = example;
    if (user_id) payload.user_id = user_id;

    const saveUrl = SUPABASE_URL.replace(/\/+$/, '') + '/rest/v1/words';
    const response = await fetch(saveUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        Prefer: 'return=representation',
      },
      body: JSON.stringify(payload),
    });
    const rawBody = await response.text();
    let result;
    try {
      result = rawBody ? JSON.parse(rawBody) : null;
    } catch (parseError) {
      console.error('Supabase save-word returned invalid JSON', { status: response.status, body: rawBody, parseError: parseError.message });
      return res.status(502).json({ error: 'Supabase save-word returned invalid JSON', body: rawBody });
    }

    if (!response.ok) {
      const errorMessage = result?.message || result?.error_description || result?.error || rawBody || 'Supabase save failed';
      return res.status(response.status).json({ error: errorMessage, debug: result });
    }

    return res.json({ data: result });
  } catch (error) {
    console.error('Supabase save-word failed', error);
    res.status(500).json({ error: error.message || 'Supabase save-word failed' });
  }
});

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    model: AI_MODEL,
    apiUrl: AI_API_URL,
  });
});
app.listen(PORT, () => {
  console.log(`Server started on http://localhost:${PORT}`);
  console.log(`AI proxy using URL: ${AI_API_URL}`);
  try {
    const displayUrl = (AI_API_URL && (AI_API_URL.includes('/v1/') || AI_API_URL.includes('/v1beta/') ? AI_API_URL : AI_API_URL.replace(/\/+$/, '') + '/v1/chat/completions')) || AI_API_URL;
    console.log(`AI request target URL: ${displayUrl}`);
  } catch (e) {}
  console.log(`AI model: ${AI_MODEL}`);
});
