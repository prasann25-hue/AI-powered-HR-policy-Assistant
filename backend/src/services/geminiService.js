const { GoogleGenerativeAI } = require('@google/generative-ai');

if (!process.env.GEMINI_API_KEY) {
  throw new Error('Missing GEMINI_API_KEY environment variable');
}

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// ── Models ────────────────────────────────────────────────────────────────────
const CHAT_MODEL = 'models/gemini-2.5-flash';       // Latest Gemini model
const EMBEDDING_MODEL = 'models/gemini-embedding-001'; // 768-dim embeddings
const EMBEDDING_DIMENSIONS = 768;

// ── System Prompt ─────────────────────────────────────────────────────────────
const SYSTEM_PROMPT = `You are a strict HR Policy Assistant. Answer based EXCLUSIVELY on the provided <CONTEXT>. 
Zero external knowledge. Zero hallucination. If the answer is not in the context, output exactly: 
"I cannot find the answer to this in the currently retrieved HR policies. Please escalate."

You MUST respond with valid JSON matching this exact schema:
{
  "answer": "The markdown-formatted response string",
  "citations": ["chunk_id_1", "chunk_id_2"],
  "requires_escalation": boolean
}

Rules:
- "answer" must be markdown-formatted (use **bold**, bullet lists, etc.)
- "citations" must be an array of chunk UUIDs from the provided context
- "requires_escalation" must be true if the answer is not in the context, or if the question involves sensitive HR matters (termination, legal disputes, discrimination)
- Never invent information. Never use knowledge outside the provided <CONTEXT>.`;

/**
 * Generate an embedding vector for a text string.
 * @param {string} text
 * @returns {Promise<number[]>} 768-dimensional embedding vector
 */
const generateEmbedding = async (text) => {
  try {
    const model = genAI.getGenerativeModel({ model: EMBEDDING_MODEL });
    const result = await model.embedContent({
      content: { parts: [{ text }] },
      outputDimensionality: EMBEDDING_DIMENSIONS,
    });
    if (!result.embedding?.values) {
      throw new Error('Gemini returned empty embedding — check API key and model access.');
    }
    console.log(`✅ Embedding generated: ${result.embedding.values.length} dimensions`);
    return result.embedding.values;
  } catch (err) {
    console.error(`❌ Embedding error [model: ${EMBEDDING_MODEL}]:`, err.status, err.statusText, err.message);
    throw err;
  }
};

/**
 * Generate a RAG response from Gemini 1.5 Flash with forced JSON output.
 * @param {string} question - User's question
 * @param {Array<{id: string, chunk_text: string}>} chunks - Retrieved policy chunks
 * @returns {Promise<{answer: string, citations: string[], requires_escalation: boolean}>}
 */
const generateRAGResponse = async (question, chunks) => {
  const model = genAI.getGenerativeModel({
    model: CHAT_MODEL,
    generationConfig: {
      responseMimeType: 'application/json',
      temperature: 0.1, // Low temperature for factual, consistent responses
      maxOutputTokens: 2048,
    },
    systemInstruction: SYSTEM_PROMPT,
  });

  // Build context block with chunk IDs for citation tracking
  const contextBlock = chunks
    .map((chunk) => `[chunk_id: ${chunk.id}]\n${chunk.chunk_text}`)
    .join('\n\n---\n\n');

  const prompt = `<CONTEXT>
${contextBlock}
</CONTEXT>

USER QUESTION: ${question}

Respond with the JSON schema specified in your instructions.`;

  const result = await model.generateContent(prompt);
  const responseText = result.response.text();

  try {
    const parsed = JSON.parse(responseText);

    // Validate required fields
    if (
      typeof parsed.answer !== 'string' ||
      !Array.isArray(parsed.citations) ||
      typeof parsed.requires_escalation !== 'boolean'
    ) {
      throw new Error('Invalid response schema from Gemini');
    }

    return parsed;
  } catch (parseError) {
    console.error('Failed to parse Gemini JSON response:', responseText);
    // Fallback: return safe escalation response
    return {
      answer:
        'I encountered an issue processing your request. Please escalate to an HR representative.',
      citations: [],
      requires_escalation: true,
    };
  }
};

/**
 * Chunk text into segments of approximately targetTokens tokens (by word count).
 * @param {string} text
 * @param {number} targetTokens - Approximate tokens per chunk (default: 500)
 * @returns {string[]}
 */
const chunkText = (text, targetTokens = 500) => {
  // Approximate: 1 token ≈ 0.75 words
  const wordsPerChunk = Math.floor(targetTokens * 0.75);
  const words = text.split(/\s+/);
  const chunks = [];

  for (let i = 0; i < words.length; i += wordsPerChunk) {
    const chunk = words.slice(i, i + wordsPerChunk).join(' ').trim();
    if (chunk.length > 0) chunks.push(chunk);
  }

  return chunks;
};

module.exports = {
  generateEmbedding,
  generateRAGResponse,
  chunkText,
  EMBEDDING_DIMENSIONS,
};
