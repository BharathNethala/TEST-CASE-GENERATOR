
require('dotenv').config();
const OpenAI = require('openai');


const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const DEFAULT_MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini';

const model = {
  async generateContent(prompt) {
   
    const completion = await client.chat.completions.create({
      model: DEFAULT_MODEL,
      temperature: 0.4,
      messages: [
        { role: 'system', content: 'You are a precise test generation assistant. Keep outputs clean and directly usable as code when asked.' },
        { role: 'user', content: prompt }
      ]
    });

    const content =
      completion?.choices?.[0]?.message?.content?.trim() || '';

    return {
      response: {
        text: () => content
      }
    };
  }
};

function extractText(result) {
  try {
    return result.response.text();
  } catch {
    return '';
  }
}

module.exports = {
  model,
  extractText,
};
