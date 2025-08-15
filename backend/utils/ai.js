// backend/utils/ai.js
// OpenAI drop-in wrapper that mimics the previous Gemini interface.
// No other files need to change.

require('dotenv').config();
const OpenAI = require('openai');

// Use env var OPENAI_API_KEY
const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Choose a fast, inexpensive model suitable for summaries/code gen.
// You can swap to "gpt-4o" if you want heavier reasoning.
const DEFAULT_MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini';

// Create a "model" object with a generateContent(prompt) method
// that returns { response: { text: () => string } }, like Gemini.
const model = {
  async generateContent(prompt) {
    // You can move the system instruction here if you want global guidance.
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

// keep the same API your controller already imports
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
