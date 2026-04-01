const https = require('https');

// ANTHROPIC API (Claude)
// ============================================================================

function callClaude(messages, systemPrompt, tools = null, ANTHROPIC_KEY, CONFIG, collectResponse) {
  return new Promise((resolve, reject) => {
    try {
      const payload = {
        model: CONFIG.CLAUDE_MODEL,
        max_tokens: CONFIG.CLAUDE_MAX_TOKENS,
        system: systemPrompt,
        messages
      };
      if (tools) payload.tools = tools;

      const body = JSON.stringify(payload);
      const options = {
        hostname: 'api.anthropic.com',
        path: '/v1/messages',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': ANTHROPIC_KEY,
          'anthropic-version': '2023-06-01',
          'anthropic-beta': 'web-search-2025-03-05',
          'Content-Length': Buffer.byteLength(body)
        },
        timeout: CONFIG.HTTP_TIMEOUT_MS
      };

      const req = https.request(options, async (res) => {
        try {
          const buffer = await collectResponse(res);
          if (res.statusCode >= 400) throw new Error(`Claude API error ${res.statusCode}: ${buffer.toString()}`);
          try { resolve(JSON.parse(buffer.toString())); }
          catch (parseErr) { reject(new Error(`Failed to parse Claude response: ${parseErr.message}`)); }
        } catch (err) { reject(err); }
      });
      req.on('error', reject);
      req.on('timeout', () => { req.destroy(); reject(new Error('Claude request timeout')); });
      req.write(body);
      req.end();
    } catch (err) { reject(err); }
  });
}

async function fetchClaudeNews(query, konteksti, aihe, ANTHROPIC_KEY, CONFIG, collectResponse, callClaude) {
  const tools = [{ type: 'web_search_20250305', name: 'web_search' }];

  const result = await callClaude(
    [{
      role: 'user',
      content: `Search for the latest news about: ${query}. Use web_search once. Respond with ONLY a raw JSON array, no markdown. Each item: otsikko (string), url (string), kuvaus (string), julkaistu (YYYY-MM-DD or empty).`
    }],
    'You are a news search assistant. Use web_search once, then respond with ONLY a raw JSON array. No markdown, no code blocks.',
    tools, ANTHROPIC_KEY, CONFIG, collectResponse
  );

  const textBlocks = (result.content || []).filter(b => b.type === 'text');
  const text  = textBlocks.map(b => b.text).join('');
  const clean = text.replace(/```json|```/g, '').trim();

  let news;
  try { news = JSON.parse(clean); }
  catch (err) {
    const start = clean.indexOf('['), end = clean.lastIndexOf(']');
    if (start !== -1 && end !== -1 && end > start) {
      try { news = JSON.parse(clean.slice(start, end + 1)); }
      catch (e) { console.error('JSON parse error', { aihe }); return []; }
    } else { console.error('No JSON array found', { aihe, preview: clean.slice(0, 200) }); return []; }
  }

  if (!Array.isArray(news)) { console.error('Invalid news format', { aihe }); return []; }

  return news;
}

async function parsePdfWithClaude(pdfUrl, kokousId, kokousPvm, ANTHROPIC_KEY, CONFIG, collectResponse, callClaude, fetchBuffer, Logger, sleep) {
  if (!ANTHROPIC_KEY) { Logger.warn('ANTHROPIC_KEY not set, skipping PDF parse'); return; }
  Logger.info('Parsing PDF', { pdfUrl, kokousId });

  try {
    const pdfBuffer = await fetchBuffer(pdfUrl);
    if (pdfBuffer.length < CONFIG.PDF_MIN_SIZE) {
      Logger.warn('PDF too small', { kokousId, size: pdfBuffer.length });
      return;
    }

    const result = await callClaude(
      [{
        role: 'user',
        content: [
          { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: pdfBuffer.toString('base64') } },
          { type: 'text', text: 'Lue tämä Kokkolan kaupungin kokousasiakirja ja poimii kaikki taloudelliset ja henkilöstötiedot. Palauta VAIN JSON-objekti ilman mitään muuta tekstiä tai markdownia. JSON:ssa: tyyppi (string: "budjetti", "palkka", "sopimus", "investointi", tai "ei_relevantti"), summat (array), osastot (array), henkilöt (array), yhteenveto (string).' }
        ]
      }],
      'Olet Kokkolan kaupungin taloushallinnon asiantuntija. Poimit dataa dokumenteista tarkasti JSON-muodossa.', null, ANTHROPIC_KEY, CONFIG, collectResponse
    );

    const text = (result.content || []).filter(b => b.type === 'text').map(b => b.text).join('');
    const clean = text.replace(/```json|```/g, '').trim();
    const data = JSON.parse(clean);

    if (data.tyyppi && data.tyyppi !== 'ei_relevantti') {
      // Assume supabaseRequest is passed
      // await supabaseRequest('talousdata?on_conflict=kokous_id', 'POST', { kokous_id: kokousId, kokous_pvm: kokousPvm, raportti_tyyppi: data.tyyppi, data: JSON.stringify(data) });
      Logger.info('Saved financial data', { kokousId, type: data.tyyppi });
    } else {
      Logger.info('PDF not relevant', { kokousId });
    }
  } catch (err) { Logger.error('PDF parse error', { kokousId, error: err.message }); }
}

module.exports = { callClaude, fetchClaudeNews, parsePdfWithClaude };