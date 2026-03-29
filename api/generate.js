export const config = {
  api: { bodyParser: true }
};

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'APIキーが未設定' });

  const body = req.body || {};
  const { type, prompt, imageBase64 } = body;

  if (!type) return res.status(400).json({ error: 'typeが必要です' });

  let messages;
  if (type === 'recipe') {
    if (!prompt) return res.status(400).json({ error: 'promptが必要です' });
    messages = [{ role: 'user', content: prompt }];
  } else if (type === 'scan') {
    if (!imageBase64) return res.status(400).json({ error: 'imageBase64が必要です' });
    messages = [{
      role: 'user',
      content: [
        { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: imageBase64 } },
        { type: 'text', text: 'この画像は麹調味料の仕込みレシピの手書きメモです。JSONのみで返してください。マークダウン不要。\n\n{"name":"麹調味料名","type":"塩麹 または 醤油麹 または あずき麹 または 甘酒 または 味噌 または 米麹 または その他","period":"仕込み期間","desc":"特徴（20文字以内）","ingredients":["材料1 分量"],"steps":["手順1"],"point":"コツ","storage":"保存方法"}' }
      ]
    }];
  } else {
    return res.status(400).json({ error: '不正なtypeです: ' + type });
  }

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({ model: 'claude-sonnet-4-20250514', max_tokens: 1000, messages })
    });

    const data = await response.json();
    if (!response.ok) return res.status(response.status).json({ error: JSON.stringify(data) });

    const text = data.content.map(c => c.text || '').join('');
    return res.status(200).json({ text });

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
