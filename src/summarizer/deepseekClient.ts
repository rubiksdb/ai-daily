import OpenAI from 'openai';

let client: OpenAI | null = null;

export function getDeepSeekClient() {
  if (!client) {
    client = new OpenAI({
      apiKey: process.env.DEEPSEEK_API_KEY,
      baseURL: 'https://api.deepseek.com',
    });
  }
  return client;
}

export async function chat(systemPrompt: string, userPrompt: string): Promise<string> {
  const response = await getDeepSeekClient().chat.completions.create({
    model: 'deepseek-chat',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    temperature: 0.3,
    max_tokens: 2048,
  });
  return response.choices[0]?.message?.content ?? '';
}
