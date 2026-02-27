// ============================================================
// CONSTANTS
// ============================================================

const PROXY_BASE        = 'https://kaupunki.onrender.com';
const PROXY_DECISIONS   = PROXY_BASE + '/decisions';
const PROXY_MEETINGS    = PROXY_BASE + '/meetings';
const PROXY_AGENDAS     = PROXY_BASE + '/agendas';
const STAT_VAESTO_URL   = 'https://pxdata.stat.fi/PxWeb/api/v1/fi/StatFin/vaerak/statfin_vaerak_pxt_11ra.px';
const STAT_TYO_URL      = 'https://pxdata.stat.fi/PxWeb/api/v1/fi/StatFin/tyonv/statfin_tyonv_pxt_12tf.px';

// ============================================================
// STATE
// ============================================================

let activeFilter    = 'all';
let showAll         = false;
let activeQuery     = '';
let allAgendaItems  = [];
let meetingFilter   = 'tulevat';
const newsCache     = {};

// ============================================================
// VIEW NAVIGATION
// ============================================================

function showView(name) {
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  document.getElementById('view-' + name).classList.add('active');
  document.querySelectorAll('.nav-btn[data-view]').forEach(b => {
    b.classList.toggle('active', b.dataset.view === name);
  });

  document.getElementById('nav-search').style.display = name === 'dashboard' ? 'flex' : 'none';

  if (name === 'dashboard') {
    loadDecisions();
    loadStats();
    loadMeetings();
    loadAgendas();
  }
}

// ============================================================
// STATISTICS — Tilastokeskus PxWeb API
// ============================================================

async function fetchStat(url, body) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  const data = await res.json();
  return parseFloat(data.data[0]?.values[0]);
}

async function loadStats() {
  // Väestö ja alle 18-v
  const statDefs = [
    { tiedot: 'vaesto',          elValue: 'stat-vaesto',    elChange: 'stat-vaesto-change',  format: v => Math.round(v).toLocaleString('fi-FI'), unit: 'hlö' },
    { tiedot: 'vaesto_alle15_p', elValue: 'stat-nuoret',    elChange: 'stat-nuoret-change',  format: v => v.toFixed(1) + '%',                    unit: '%'   },
  ];

  for (const s of statDefs) {
    try {
      const makeBody = (vuosi) => ({
        query: [
          { code: 'Alue',   selection: { filter: 'item', values: ['KU272'] } },
          { code: 'Tiedot', selection: { filter: 'item', values: [s.tiedot] } },
          { code: 'Vuosi',  selection: { filter: 'item', values: [vuosi] } }
        ],
        response: { format: 'json' }
      });

      const [v2024, v2023] = await Promise.all([
        fetchStat(STAT_VAESTO_URL, makeBody('2024')),
        fetchStat(STAT_VAESTO_URL, makeBody('2023'))
      ]);

      document.getElementById(s.elValue).textContent = s.format(v2024);

      const diff = v2024 - v2023;
      const sign = diff >= 0 ? '+' : '';
      const changeEl = document.getElementById(s.elChange);
      changeEl.textContent = sign + (s.unit === '%'
        ? diff.toFixed(1) + '% (2024 vs 2023)'
        : Math.round(diff).toLocaleString('fi-FI') + ' hlö (2024 vs 2023)');
      changeEl.className = 'stat-change ' + (diff > 0 ? 'up' : diff < 0 ? 'down' : 'neutral');
    } catch (e) {
      document.getElementById(s.elValue).textContent = '–';
      document.getElementById(s.elChange).textContent = 'virhe';
    }
  }

  // Työttömyysaste
  try {
    const metaRes = await fetch(STAT_TYO_URL);
    const meta    = await metaRes.json();
    const kuukaudet   = meta.variables.find(v => v.code === 'Kuukausi').values;
    const uusinKk     = kuukaudet[kuukaudet.length - 1];
    const edellinenKk = kuukaudet[kuukaudet.length - 13];

    const tyoBody = {
      query: [
        { code: 'Alue',     selection: { filter: 'item', values: ['KU272'] } },
        { code: 'Kuukausi', selection: { filter: 'item', values: [uusinKk, edellinenKk] } },
        { code: 'Tiedot',   selection: { filter: 'item', values: ['TYOTOSUUS'] } }
      ],
      response: { format: 'json' }
    };

    const tyoRes  = await fetch(STAT_TYO_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(tyoBody) });
    const tyoData = await tyoRes.json();

    const uusinArvo     = parseFloat(tyoData.data[0]?.values[0]);
    const edellinenArvo = parseFloat(tyoData.data[1]?.values[0]);

    if (!isNaN(uusinArvo)) {
      document.getElementById('stat-tyottomyys').textContent = uusinArvo.toFixed(1) + '%';
      const kkLabel = uusinKk.replace('M', '/');
      if (!isNaN(edellinenArvo)) {
        const diff = uusinArvo - edellinenArvo;
        const sign = diff >= 0 ? '+' : '';
        const changeEl = document.getElementById('stat-tyottomyys-change');
        changeEl.textContent = sign + diff.toFixed(1) + '% vs vuosi sitten (' + kkLabel + ')';
        changeEl.className = 'stat-change ' + (diff > 0 ? 'up' : diff < 0 ? 'down' : 'neutral');
      } else {
        document.getElementById('stat-tyottomyys-change').textContent = kkLabel;
      }
    }
  } catch (e) {
    document.getElementById('stat-tyottomyys').textContent = '–';
    document.getElementById('stat-tyottomyys-change').textContent = 'ei dataa';
  }
}

// ============================================================
// DECISIONS
// ============================================================

async function loadDecisions() {
  const list = document.getElementById('decisions-list');
  list.innerHTML = '<div style="padding:32px 24px;text-align:center;color:var(--text3);font-size:0.8rem;">⏳ Ladataan päätöksiä Kokkolasta...</div>';

  try {
    const res    = await fetch(PROXY_DECISIONS);
    const buffer = await res.arrayBuffer();
    let text     = new TextDecoder('windows-1252').decode(buffer);
    text         = text.replace(/encoding="[^"]+"/i, 'encoding="utf-8"');
    const xml    = new DOMParser().parseFromString(text, 'application/xml');
    const items  = xml.querySelectorAll('item');

    if (!items.length) {
      list.innerHTML = '<div style="padding:32px 24px;text-align:center;color:var(--text3);font-size:0.8rem;">⚠️ Ei päätöksiä saatavilla</div>';
      return;
    }

    list.innerHTML = '';
    items.forEach(item => {
      const title   = item.querySelector('title')?.textContent || '–';
      const desc    = item.querySelector('description')?.textContent || '';
      const link    = item.querySelector('link')?.textContent || '#';
      const pubDate = item.querySelector('pubDate')?.textContent || '';

      let dateStr = '';
      if (pubDate) { const d = new Date(pubDate); if (!isNaN(d)) dateStr = d.toLocaleDateString('fi-FI'); }

      let issuer = 'Kokkola', decisionTitle = title;
      if (title.includes(' / ')) {
        const parts = title.split(' / ');
        issuer = parts[0].trim();
        decisionTitle = parts.slice(1).join(' / ').trim();
      }

      const el = document.createElement('div');
      el.className     = 'decision-item';
      el.dataset.status = 'passed';
      el.dataset.text  = (title + ' ' + desc).toLowerCase();
      if (pubDate) { const pd = new Date(pubDate); if (!isNaN(pd)) el.dataset.date = pd.toISOString(); }
      el.innerHTML = `
        <div class="decision-dot" style="background:var(--green)"></div>
        <div class="decision-content">
          <div class="decision-title">${decisionTitle}</div>
          <div class="decision-meta">
            <span>${issuer}</span>
            ${dateStr ? `<span>${dateStr}</span>` : ''}
          </div>
        </div>
        <div class="decision-status status-passed">Päätös</div>
      `;
      el.addEventListener('click', () => openModal(decisionTitle, desc || 'Ei kuvausta saatavilla.', issuer + (dateStr ? ' · ' + dateStr : ''), link));
      list.appendChild(el);
    });

    document.getElementById('decisions-count').textContent = items.length + ' kpl';
    applyFilters();
  } catch (e) {
    list.innerHTML = '<div style="padding:32px 24px;text-align:center;color:var(--red);font-size:0.8rem;">⚠️ Virhe ladattaessa päätöksiä.</div>';
  }
}

// ============================================================
// MEETINGS (kokousasiat)
// ============================================================

async function loadMeetings() {
  try {
    const res    = await fetch(PROXY_MEETINGS);
    const buffer = await res.arrayBuffer();
    let text     = new TextDecoder('windows-1252').decode(buffer);
    text         = text.replace(/encoding="[^"]+"/i, 'encoding="utf-8"');
    const xml    = new DOMParser().parseFromString(text, 'application/xml');
    const items  = xml.querySelectorAll('item');

    if (!items.length) return;

    document.getElementById('stat-paatokset').textContent = items.length;

    const list = document.getElementById('decisions-list');
    items.forEach(item => {
      const getTag = tag => {
        const el = item.querySelector(tag);
        return el ? (el.textContent || el.innerHTML || '').replace(/<!\[CDATA\[|\]\]>/g, '').trim() : '';
      };
      const title   = getTag('title') || '–';
      const desc    = getTag('description') || '';
      const link    = getTag('link') || '#';
      const pubDate = getTag('pubDate') || '';

      let dateStr = '';
      if (pubDate) { const d = new Date(pubDate); if (!isNaN(d)) dateStr = d.toLocaleDateString('fi-FI'); }

      let issuer = 'Kokkola', meetingTitle = title;
      if (title.includes(' / ')) {
        const parts = title.split(' / ');
        issuer = parts[0].trim();
        meetingTitle = parts.slice(1).join(' / ').trim();
      }

      const el = document.createElement('div');
      el.className      = 'decision-item';
      el.dataset.status = 'meeting';
      el.dataset.text   = (title + ' ' + desc).toLowerCase();
      const dmatch = title.match(/(\d{1,2})\.(\d{1,2})\.(\d{4})/);
      if (dmatch) {
        const md = new Date(parseInt(dmatch[3]), parseInt(dmatch[2]) - 1, parseInt(dmatch[1]));
        if (!isNaN(md.getTime())) el.dataset.date = md.toISOString();
      }
      el.innerHTML =
        '<div class="decision-dot" style="background:var(--cyan)"></div>' +
        '<div class="decision-content">' +
          '<div class="decision-title">' + meetingTitle + '</div>' +
          '<div class="decision-meta"><span>' + issuer + '</span>' + (dateStr ? '<span>' + dateStr + '</span>' : '') + '</div>' +
        '</div>' +
        '<div class="decision-status status-review">Kokous</div>';
      el.addEventListener('click', () => openModal(meetingTitle, desc || 'Ei kuvausta.', issuer + (dateStr ? ' – ' + dateStr : ''), link));
      list.appendChild(el);
    });

    // Update badge
    const badge = document.getElementById('decisions-count');
    const current = parseInt(badge.textContent) || 0;
    badge.textContent = (current + items.length) + ' kpl';
    applyFilters();
  } catch (e) {
    console.error('Virhe ladattaessa kokousasioita:', e);
  }
}

// ============================================================
// AGENDAS (kokoukset)
// ============================================================

function setMeetingFilter(filter, btn) {
  meetingFilter = filter;
  document.querySelectorAll('[data-mfilter]').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  renderAgendasTop();
}

function renderAgendasTop() {
  const list = document.getElementById('upcoming-meetings-list-top');
  if (!list) return;
  const now       = new Date();
  const searchVal = (document.getElementById('meeting-search')?.value || '').toLowerCase().trim();

  let filtered = allAgendaItems.filter(item => {
    const d    = item.date ? new Date(item.date) : null;
    const year = d ? d.getFullYear() : null;
    if (meetingFilter === 'tulevat') { if (!(!d || d >= now)) return false; }
    else if (meetingFilter === 'menneet') { if (!(d && d < now && year >= 2026)) return false; }
    else if (meetingFilter === 'kh') { if (!item.title.toLowerCase().includes('kaupunginhallitus')) return false; }
    if (searchVal && !item.title.toLowerCase().includes(searchVal)) return false;
    return true;
  });

  filtered.sort((a, b) =>
    meetingFilter === 'tulevat'
      ? (a.date || '') < (b.date || '') ? -1 : 1
      : (a.date || '') > (b.date || '') ? -1 : 1
  );
  filtered = filtered.slice(0, 8);

  if (!filtered.length) {
    list.innerHTML = '<div style="padding:16px;color:var(--text3);font-size:0.78rem;">Ei kokouksia</div>';
    return;
  }
  list.innerHTML = filtered.map(item =>
    '<a href="' + item.link + '" target="_blank" class="upcoming-item">' +
      (item.dateStr ? '<div class="upcoming-date">' + item.dateStr + '</div>' : '') +
      '<div class="upcoming-title">' + item.title + '</div>' +
      '<div class="upcoming-body">Avaa esityslista →</div>' +
    '</a>'
  ).join('');
}

async function loadAgendas() {
  const list = document.getElementById('upcoming-meetings-list-top');
  if (!list) return;

  try {
    const res    = await fetch(PROXY_AGENDAS);
    const buffer = await res.arrayBuffer();
    let text     = new TextDecoder('windows-1252').decode(buffer);
    text         = text.replace(/encoding="[^"]+"/i, 'encoding="utf-8"');
    const xml    = new DOMParser().parseFromString(text, 'application/xml');
    const items  = Array.from(xml.querySelectorAll('item'));

    allAgendaItems = items.map(item => {
      const fullTitle = item.querySelector('title')?.textContent || '–';
      const linkUrl   = item.querySelector('link')?.textContent || '#';
      const dateMatch = fullTitle.match(/(\d{1,2})\.(\d{1,2})\.(\d{4})/);
      let dateStr = '', date = null, title = fullTitle;
      if (dateMatch) {
        const [, day, mon, year] = dateMatch;
        const d = new Date(year, mon - 1, day);
        if (!isNaN(d.getTime())) {
          date    = d.toISOString();
          dateStr = d.toLocaleDateString('fi-FI', { weekday: 'short', day: 'numeric', month: 'numeric', year: 'numeric' });
        }
        title = fullTitle.replace(dateMatch[0], '').trim();
      }
      return { title, link: linkUrl, date, dateStr };
    });

    const now = new Date();
    allAgendaItems.sort((a, b) => {
      const da = a.date ? new Date(a.date) : now;
      const db = b.date ? new Date(b.date) : now;
      if (da >= now && db >= now) return da - db;
      if (da <  now && db <  now) return db - da;
      return 0;
    });

    renderAgendasTop();
    loadNews();
  } catch (e) {
    list.innerHTML = '<div style="padding:16px;color:var(--text3);font-size:0.78rem;">Virhe ladattaessa kokouksia</div>';
  }
}

// ============================================================
// FILTERS & SEARCH
// ============================================================

function setFilter(filter, btn) {
  activeFilter = filter;
  showAll      = false;
  document.querySelectorAll('[data-dfilter]').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  applyFilters();
}

function handleSearch(value) {
  activeQuery = value.trim().toLowerCase();
  document.getElementById('searchClear').style.display = activeQuery ? 'block' : 'none';
  applyFilters();
}

function clearSearch() {
  document.getElementById('searchInput').value = '';
  activeQuery = '';
  document.getElementById('searchClear').style.display = 'none';
  applyFilters();
  document.getElementById('searchInput').focus();
}

function applyFilters() {
  const now   = new Date();
  const items = document.querySelectorAll('#decisions-list .decision-item');
  let visible = 0;

  items.forEach(item => {
    const status   = item.dataset.status;
    const text     = (item.dataset.text + ' ' + item.innerText).toLowerCase();
    const itemDate = item.dataset.date ? new Date(item.dataset.date) : null;

    let matchFilter = false;
    if (activeFilter === 'all') {
      matchFilter = true;
    } else if (activeFilter === 'viranomais') {
      matchFilter = status === 'passed';
    } else if (activeFilter === 'paatokset') {
      matchFilter = status === 'passed' || (status === 'meeting' && itemDate && itemDate < now);
    } else if (activeFilter === 'esitykset') {
      matchFilter = status === 'meeting' && (!itemDate || itemDate >= now);
    } else {
      matchFilter = status === activeFilter;
    }

    const matchQuery = !activeQuery || text.includes(activeQuery);
    const show = matchFilter && matchQuery;
    item.style.display = show ? '' : 'none';

    if (show) {
      // Highlight search term
      const titleEl = item.querySelector('.decision-title');
      if (activeQuery && titleEl) {
        const orig = titleEl.textContent;
        const idx  = orig.toLowerCase().indexOf(activeQuery);
        if (idx >= 0) {
          titleEl.innerHTML =
            orig.slice(0, idx) +
            '<span class="search-highlight">' + orig.slice(idx, idx + activeQuery.length) + '</span>' +
            orig.slice(idx + activeQuery.length);
        }
      }
      visible++;
    }
  });

  // Limit to 15 unless showAll or search active
  if (!showAll && !activeQuery) {
    let shown = 0;
    items.forEach(item => {
      if (item.style.display !== 'none') {
        shown++;
        if (shown > 15) item.style.display = 'none';
      }
    });
    visible = Math.min(visible, 15);
  }

  document.getElementById('decisions-empty').style.display = visible === 0 ? 'block' : 'none';
  const showMoreBtn = document.getElementById('show-more-btn');
  if (showMoreBtn) showMoreBtn.style.display = (!showAll && !activeQuery && visible >= 15) ? 'block' : 'none';
}

// ============================================================
// NEWS
// ============================================================

function filterNews(aihe) {
  const query = (document.getElementById('search-' + aihe)?.value || '').toLowerCase().trim();
  const el    = document.getElementById('news-' + aihe);
  if (!el || !newsCache[aihe]) return;
  const filtered = query
    ? newsCache[aihe].filter(item => (item.otsikko + ' ' + (item.kuvaus || '')).toLowerCase().includes(query))
    : newsCache[aihe];
  renderNewsItems(el, filtered);
}

function renderNewsItems(el, items) {
  if (!items || !items.length) {
    el.innerHTML = '<div style="padding:16px;color:var(--text3);font-size:0.78rem;">Ei hakutuloksia</div>';
    return;
  }
  el.innerHTML = items.map(item =>
    '<a href="' + (item.url || '#') + '" target="_blank" class="news-item">' +
      '<div class="news-title">' + item.otsikko + '</div>' +
      (item.julkaistu ? '<div class="news-meta">' + item.julkaistu + '</div>' : '') +
      (item.kuvaus    ? '<div class="news-desc">'  + item.kuvaus    + '</div>' : '') +
    '</a>'
  ).join('');
}

async function loadNews() {
  for (const aihe of ['arctial', 'kokkola']) {
    const el = document.getElementById('news-' + aihe);
    if (!el) continue;
    try {
      const res  = await fetch(PROXY_BASE + '/news/' + aihe);
      let items  = await res.json();

      // Sort newest first
      items.sort((a, b) => {
        const parse = s => {
          if (!s) return 0;
          const m = s.match(/(\d{1,2})\.(\d{1,2})\.(\d{4})/);
          if (m) return new Date(m[3], m[2] - 1, m[1]).getTime();
          return new Date(s).getTime() || 0;
        };
        return parse(b.julkaistu) - parse(a.julkaistu);
      });

      if (!items.length) {
        el.innerHTML = '<div style="padding:16px;color:var(--text3);font-size:0.78rem;">Ei uutisia saatavilla</div>';
        continue;
      }
      newsCache[aihe] = items;
      renderNewsItems(el, items);
    } catch (e) {
      el.innerHTML = '<div style="padding:16px;color:var(--text3);font-size:0.78rem;">Virhe ladattaessa uutisia</div>';
    }
  }
}

// ============================================================
// MODAL
// ============================================================

function openModal(title, body, tag, link) {
  document.getElementById('modal-title').textContent = title;
  document.getElementById('modal-body').textContent  = body;
  document.getElementById('modal-tag').textContent   = tag;
  const btn = document.querySelector('.modal-footer .btn-primary');
  if (btn) btn.onclick = () => window.open(link, '_blank');
  const overlay = document.getElementById('modal');
  overlay.classList.add('open');
  overlay.removeAttribute('aria-hidden');
}

function closeModal(e) {
  if (e.target === document.getElementById('modal')) closeModalDirect();
}

function closeModalDirect() {
  const overlay = document.getElementById('modal');
  overlay.classList.remove('open');
  overlay.setAttribute('aria-hidden', 'true');
}

// ============================================================
// INIT
// ============================================================

document.addEventListener('DOMContentLoaded', () => {
  // Date
  const now = new Date();
  const dateEl = document.getElementById('dash-date');
  if (dateEl) {
    dateEl.textContent = now.toLocaleDateString('fi-FI', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  }

  // Kaikki data-view napit (nav + hero CTA)
  document.querySelectorAll('[data-view]').forEach(btn => {
    btn.addEventListener('click', () => showView(btn.dataset.view));
  });

  // Filter buttons (data-dfilter = decisions filter)
  document.querySelectorAll('[data-dfilter]').forEach(btn => {
    btn.addEventListener('click', () => setFilter(btn.dataset.dfilter, btn));
  });

  // Meeting filter buttons (data-mfilter)
  document.querySelectorAll('[data-mfilter]').forEach(btn => {
    btn.addEventListener('click', () => setMeetingFilter(btn.dataset.mfilter, btn));
  });

  // Search input
  const searchInput = document.getElementById('searchInput');
  if (searchInput) {
    searchInput.addEventListener('input', e => handleSearch(e.target.value));
    searchInput.addEventListener('keydown', e => { if (e.key === 'Escape') clearSearch(); });
  }
  const searchClear = document.getElementById('searchClear');
  if (searchClear) searchClear.addEventListener('click', clearSearch);

  // Show more
  const showMoreBtn = document.getElementById('show-more-btn');
  if (showMoreBtn) showMoreBtn.addEventListener('click', () => { showAll = true; applyFilters(); });

  // Modal close
  document.getElementById('modal')?.addEventListener('click', closeModal);
  document.getElementById('modal-close')?.addEventListener('click', closeModalDirect);

  // Meeting search
  document.getElementById('meeting-search')?.addEventListener('input', renderAgendasTop);

  // News search
  ['arctial', 'kokkola'].forEach(aihe => {
    document.getElementById('search-' + aihe)?.addEventListener('input', () => filterNews(aihe));
  });
});
