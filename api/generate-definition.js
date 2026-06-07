export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Method Not Allowed"
    });
  }

  const { word } = req.body;

  if (!word) {
    return res.status(400).json({
      error: "word is required"
    });
  }

  try {
    const response = await fetch(
      "https://api.deepseek.com/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.DEEPSEEK_API_KEY}`
        },
        body: JSON.stringify({
          model: "deepseek-chat",
          messages: [
            {
              role: "user",
              content: `请用中文解释英文单词 ${word}，只返回简短中文释义。`
            }
          ],
          max_tokens: 50
        })
      }
    );

    const data = await response.json();

    const definition =
      data?.choices?.[0]?.message?.content?.trim();

    if (!definition) {
      return res.status(500).json({
        error: "AI did not return a definition"
      });
    }

    return res.status(200).json({
      definition
    });

  } catch (err) {
    return res.status(500).json({
      error: err.message
    });
  }
}