const express = require('express');
const { supabaseAdmin, createUserClient } = require('../config/supabase');
const { authenticateJWT } = require('../middleware/auth');
const { chatRateLimiter } = require('../middleware/rateLimiter');
const { validate, chatAskSchema } = require('../schemas');
const { generateEmbedding, generateRAGResponse } = require('../services/geminiService');

const router = express.Router();

// ── POST /api/chat/ask ────────────────────────────────────────────────────────
// Employee: Ask a policy question (RAG pipeline → SSE streaming response)
router.post(
  '/ask',
  express.json(), // Apply JSON parsing specifically for this route
  authenticateJWT,
  chatRateLimiter,
  validate(chatAskSchema),
  async (req, res, next) => {
    const { question } = req.body;
    const { id: userId, role, department } = req.user;

    // Set up SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no'); // Disable Nginx buffering (Render)
    res.flushHeaders();

    const sendEvent = (event, data) => {
      res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
    };

    try {
      // ── Step 1: Emit "thinking" status ────────────────────────────────────
      sendEvent('status', { message: 'Searching HR policies...' });

      // ── Step 2: Embed the user's question ────────────────────────────────
      const queryEmbedding = await generateEmbedding(question);
      sendEvent('status', { message: 'Finding relevant policy sections...' });

      // ── Step 3: pgvector cosine similarity search ─────────────────────────
      const { data: chunks, error: searchError } = await supabaseAdmin.rpc('match_policy_chunks', {
        query_embedding: queryEmbedding,
        match_threshold: 0.3,
        match_count: 5,
      });

      if (searchError) throw searchError;

      if (!chunks || chunks.length === 0) {
        sendEvent('result', {
          answer:
            '## No Relevant Policies Found\n\nI cannot find the answer to this in the currently retrieved HR policies. **Please escalate** to an HR representative for assistance.',
          citations: [],
          requires_escalation: true,
        });
        sendEvent('done', { message: 'Complete' });
        return res.end();
      }

      sendEvent('status', { message: `Found ${chunks.length} relevant sections. Generating answer...` });

      // ── Step 4: Generate RAG response with Gemini ─────────────────────────
      const aiResponse = await generateRAGResponse(question, chunks);

      // ── Step 5: Persist interaction to database ───────────────────────────
      const { data: interaction, error: interactionError } = await supabaseAdmin
        .from('interactions')
        .insert({
          user_id: userId,
          raw_prompt: question,
          llm_response: aiResponse.answer,
          cited_chunk_ids: aiResponse.citations,
          requires_escalation: aiResponse.requires_escalation,
        })
        .select('id')
        .single();

      if (interactionError) {
        console.error('Failed to save interaction:', interactionError);
        // Don't fail the request — just log
      }

      // ── Step 6: Stream the result back via SSE ────────────────────────────
      sendEvent('result', {
        ...aiResponse,
        interaction_id: interaction?.id,
      });

      sendEvent('done', { message: 'Complete' });
      res.end();
    } catch (err) {
      console.error('Chat error:', err);
      sendEvent('error', {
        message: err.status === 429
          ? 'Rate limit exceeded. Please wait before asking another question.'
          : 'Failed to generate a response. Please try again or escalate to HR.',
        requires_escalation: true,
      });
      res.end();
    }
  }
);

// ── GET /api/chat/history ─────────────────────────────────────────────────────
// Employee: Get own interaction history
router.get('/history', authenticateJWT, async (req, res, next) => {
  try {
    const { data: interactions, error } = await supabaseAdmin
      .from('interactions')
      .select('id, raw_prompt, llm_response, cited_chunk_ids, requires_escalation, created_at')
      .eq('user_id', req.user.id)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) throw error;

    res.json({ interactions });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
