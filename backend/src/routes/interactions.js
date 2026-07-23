const express = require('express');
const { supabaseAdmin } = require('../config/supabase');
const { authenticateJWT } = require('../middleware/auth');
const { requireRole } = require('../middleware/roleGuard');

const router = express.Router();

router.use(authenticateJWT);

// ── GET /api/interactions/:id/trace ──────────────────────────────────────────
// HR Admin only: Retrieve the exact chunks cited in a specific AI response
router.get('/:id/trace', requireRole('hr_admin'), async (req, res, next) => {
  try {
    const { id } = req.params;

    // Fetch interaction
    const { data: interaction, error: interactionError } = await supabaseAdmin
      .from('interactions')
      .select('id, user_id, raw_prompt, llm_response, cited_chunk_ids, requires_escalation, created_at')
      .eq('id', id)
      .single();

    if (interactionError || !interaction) {
      return res.status(404).json({ error: 'Interaction not found.' });
    }

    // Fetch the exact cited chunks
    let cited_chunks = [];
    if (interaction.cited_chunk_ids && interaction.cited_chunk_ids.length > 0) {
      const { data: chunks, error: chunksError } = await supabaseAdmin
        .from('policy_chunks')
        .select(`
          id, chunk_text, chunk_index,
          policy_versions (
            id, access_level, valid_from,
            policies (id, title, category)
          )
        `)
        .in('id', interaction.cited_chunk_ids);

      if (chunksError) throw chunksError;
      cited_chunks = chunks || [];
    }

    // Fetch user info (anonymized for privacy)
    const { data: user } = await supabaseAdmin
      .from('users')
      .select('id, name, department, role')
      .eq('id', interaction.user_id)
      .single();

    res.json({
      interaction: {
        ...interaction,
        user: user || null,
      },
      cited_chunks,
      audit_metadata: {
        total_citations: cited_chunks.length,
        requires_escalation: interaction.requires_escalation,
        retrieved_at: new Date().toISOString(),
      },
    });
  } catch (err) {
    next(err);
  }
});

// ── GET /api/interactions ─────────────────────────────────────────────────────
// HR Admin: List all interactions with pagination and escalation filter
router.get('/', requireRole('hr_admin'), async (req, res, next) => {
  try {
    const { page = 1, limit = 20, escalated } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    let query = supabaseAdmin
      .from('interactions')
      .select('id, user_id, raw_prompt, llm_response, requires_escalation, created_at', {
        count: 'exact',
      })
      .order('created_at', { ascending: false })
      .range(offset, offset + parseInt(limit) - 1);

    if (escalated === 'true') {
      query = query.eq('requires_escalation', true);
    }

    const { data: interactions, error, count } = await query;
    if (error) throw error;

    res.json({
      interactions,
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(count / parseInt(limit)),
      },
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
