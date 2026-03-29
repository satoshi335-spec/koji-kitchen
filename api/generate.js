export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'APIキーが設定されていません' });
  }

  const { type, prompt, imageBase64 } = req.body;

  try {
    let messages;

    if (type === 'recipe') {
      messages = [{ role: 'user', content: prompt }];
    } else if (type === 'scan') {
      messages = [{
        role: 'user',
        content: [
          { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: imageBase64 } },
          { type: 'text', text: 'この画像は麹調味料の仕込みレシピの手書きメモです。JSONのみで返してください。マークダウン不要。\n\n{"name":"麹調味料名","type":"塩麹 または 醤油麹 または あずき麹 または 甘酒 または 味噌 または 米麹 または その他","period":"仕込み期間","desc":"特徴（20文字以内）","ingredients":["材料1 分量"],"steps":["手順1"],"point":"コツ","storage":"保存方法"}' }
        ]
      }];
    } else {
      return res.status(400).json({ error: '不正なtypeです' });
    }

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1000,
        messages
      })
    });

    if (!response.ok) {
      const err = await response.text();
      return res.status(response.status).json({ error: err });
    }

    const data = await response.json();
    const text = data.content.map(c => c.text || '').join('');
    return res.status(200).json({ text });

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
