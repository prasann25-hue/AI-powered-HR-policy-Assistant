const express = require('express');
const { supabaseAdmin } = require('../config/supabase');
const { authenticateJWT } = require('../middleware/auth');
const { requireRole } = require('../middleware/roleGuard');
const { validate, policyIngestSchema } = require('../schemas');
const { generateEmbedding, chunkText } = require('../services/geminiService');

const router = express.Router();

// All policy routes require authentication
router.use(authenticateJWT);

// ── POST /api/policies/ingest ─────────────────────────────────────────────────
// HR Admin only: ingest a policy document (chunk → embed → store)
router.post(
  '/ingest',
  requireRole('hr_admin'),
  validate(policyIngestSchema),
  async (req, res, next) => {
    try {
      const { title, category, content, access_level } = req.body;

      // 1. Create policy record
      const { data: policy, error: policyError } = await supabaseAdmin
        .from('policies')
        .insert({ title, category, created_by: req.user.id })
        .select('id')
        .single();

      if (policyError) throw policyError;

      // 2. Create policy version
      const { data: version, error: versionError } = await supabaseAdmin
        .from('policy_versions')
        .insert({
          policy_id: policy.id,
          valid_from: new Date().toISOString(),
          access_level,
        })
        .select('id')
        .single();

      if (versionError) throw versionError;

      // 3. Chunk the content into ~500 token segments
      const textChunks = chunkText(content, 500);
      console.log(`📄 Ingesting "${title}": ${textChunks.length} chunks`);

      // 4. Generate embeddings and build insert rows
      const chunkRows = [];
      for (let i = 0; i < textChunks.length; i++) {
        const chunkText_i = textChunks[i];
        console.log(`  → Embedding chunk ${i + 1}/${textChunks.length}`);
        const embedding = await generateEmbedding(chunkText_i);
        chunkRows.push({
          version_id: version.id,
          chunk_text: chunkText_i,
          embedding: JSON.stringify(embedding), // pgvector accepts array notation
          chunk_index: i,
        });
      }

      // 5. Batch insert all chunks
      const { error: chunksError } = await supabaseAdmin
        .from('policy_chunks')
        .insert(chunkRows);

      if (chunksError) throw chunksError;

      res.status(201).json({
        message: 'Policy ingested successfully.',
        policy_id: policy.id,
        version_id: version.id,
        chunks_created: chunkRows.length,
        title,
        category,
        access_level,
      });
    } catch (err) {
      next(err);
    }
  }
);

// ── GET /api/policies ─────────────────────────────────────────────────────────
// Get all policies with latest version info (HR admin only for full list)
router.get('/', requireRole('hr_admin'), async (req, res, next) => {
  try {
    const { data: policies, error } = await supabaseAdmin
      .from('policies')
      .select(`
        id, title, category, created_at,
        policy_versions (
          id, valid_from, access_level,
          policy_chunks (count)
        )
      `)
      .order('created_at', { ascending: false });

    if (error) throw error;

    res.json({ policies });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
