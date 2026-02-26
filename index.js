<!DOCTYPE html>
<html lang="fi">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>PäätösTuki — Paikallinen demokratia</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Mono:wght@300;400;500&family=Syne:wght@400;600;800&display=swap" rel="stylesheet">
<style>
  :root {
    --bg: #0a0c0f;
    --bg2: #10141a;
    --bg3: #161c24;
    --border: #1e2830;
    --border2: #2a3540;
    --text: #e8edf2;
    --text2: #8a9ab0;
    --text3: #4a5a6a;
    --accent: #3b82f6;
    --accent2: #1d4ed8;
    --green: #22c55e;
    --red: #ef4444;
    --amber: #f59e0b;
    --cyan: #06b6d4;
  }

  * { margin: 0; padding: 0; box-sizing: border-box; }

  body {
    background: var(--bg);
    color: var(--text);
    font-family: 'DM Mono', monospace;
    min-height: 100vh;
    overflow-x: hidden;
  }

  /* NAV */
  nav {
    position: fixed; top: 0; left: 0; right: 0; z-index: 100;
    display: flex; align-items: center; justify-content: space-between;
    padding: 16px 32px;
    background: rgba(10,12,15,0.85);
    backdrop-filter: blur(20px);
    border-bottom: 1px solid var(--border);
  }

  .nav-logo {
    font-family: 'Syne', sans-serif;
    font-weight: 800;
    font-size: 1.1rem;
    letter-spacing: -0.02em;
    color: var(--text);
  }
  .nav-logo span { color: var(--accent); }

  .nav-links { display: flex; gap: 4px; }
  .nav-btn {
    padding: 7px 16px;
    border-radius: 6px;
    border: none;
    background: transparent;
    color: var(--text2);
    font-family: 'DM Mono', monospace;
    font-size: 0.78rem;
    cursor: pointer;
    transition: all 0.15s;
    letter-spacing: 0.03em;
  }
  .nav-btn:hover { background: var(--bg3); color: var(--text); }
  .nav-btn.active { background: var(--bg3); color: var(--text); }
  .nav-btn.cta {
    background: var(--accent);
    color: #fff;
  }
  .nav-btn.cta:hover { background: var(--accent2); }

  /* VIEWS */
  .view { display: none; padding-top: 64px; }
  .view.active { display: block; }

  /* ====== LANDING ====== */
  .landing {
    min-height: 100vh;
    display: grid;
    grid-template-rows: 1fr auto;
  }

  .hero {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: calc(100vh - 64px);
    text-align: center;
    padding: 60px 32px;
    position: relative;
    overflow: hidden;
  }

  .hero::before {
    content: '';
    position: absolute;
    width: 600px; height: 600px;
    background: radial-gradient(circle, rgba(59,130,246,0.08) 0%, transparent 70%);
    top: 50%; left: 50%;
    transform: translate(-50%, -50%);
    pointer-events: none;
  }

  .hero-tag {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 5px 14px;
    background: rgba(59,130,246,0.1);
    border: 1px solid rgba(59,130,246,0.25);
    border-radius: 100px;
    font-size: 0.72rem;
    color: var(--accent);
    letter-spacing: 0.1em;
    text-transform: uppercase;
    margin-bottom: 32px;
    animation: fadeUp 0.6s ease both;
  }

  .hero-tag::before {
    content: '';
    width: 6px; height: 6px;
    background: var(--accent);
    border-radius: 50%;
    animation: pulse 2s infinite;
  }

  @keyframes pulse {
    0%,100% { opacity: 1; transform: scale(1); }
    50% { opacity: 0.5; transform: scale(0.8); }
  }

  .hero h1 {
    font-family: 'DM Serif Display', serif;
    font-size: clamp(3rem, 8vw, 6rem);
    line-height: 1.0;
    letter-spacing: -0.02em;
    max-width: 900px;
    margin-bottom: 24px;
    animation: fadeUp 0.6s 0.1s ease both;
  }

  .hero h1 em {
    font-style: italic;
    color: var(--accent);
  }

  .hero p {
    font-size: 1rem;
    color: var(--text2);
    max-width: 520px;
    line-height: 1.7;
    margin-bottom: 48px;
    animation: fadeUp 0.6s 0.2s ease both;
    font-family: 'DM Mono', monospace;
    font-weight: 300;
  }

  .hero-cta {
    display: flex;
    gap: 12px;
    animation: fadeUp 0.6s 0.3s ease both;
  }

  .btn-primary {
    padding: 13px 28px;
    background: var(--accent);
    color: #fff;
    border: none;
    border-radius: 8px;
    font-family: 'DM Mono', monospace;
    font-size: 0.85rem;
    cursor: pointer;
    transition: all 0.2s;
    letter-spacing: 0.02em;
  }
  .btn-primary:hover { background: var(--accent2); transform: translateY(-1px); }

  .btn-secondary {
    padding: 13px 28px;
    background: transparent;
    color: var(--text2);
    border: 1px solid var(--border2);
    border-radius: 8px;
    font-family: 'DM Mono', monospace;
    font-size: 0.85rem;
    cursor: pointer;
    transition: all 0.2s;
  }
  .btn-secondary:hover { border-color: var(--text3); color: var(--text); }

  .features {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 1px;
    background: var(--border);
    border-top: 1px solid var(--border);
    animation: fadeUp 0.6s 0.4s ease both;
  }

  .feature {
    background: var(--bg);
    padding: 40px 32px;
    transition: background 0.2s;
  }
  .feature:hover { background: var(--bg2); }

  .feature-icon {
    font-size: 1.5rem;
    margin-bottom: 16px;
  }

  .feature h3 {
    font-family: 'Syne', sans-serif;
    font-size: 0.95rem;
    font-weight: 600;
    margin-bottom: 8px;
    color: var(--text);
  }

  .feature p {
    font-size: 0.78rem;
    color: var(--text2);
    line-height: 1.7;
    font-weight: 300;
  }

  @keyframes fadeUp {
    from { opacity: 0; transform: translateY(20px); }
    to { opacity: 1; transform: translateY(0); }
  }

  /* ====== DASHBOARD ====== */
  .dashboard {
    padding: 32px;
    max-width: 1400px;
    margin: 0 auto;
    display: grid;
    gap: 24px;
  }

  .dash-header {
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    animation: fadeUp 0.4s ease both;
  }

  .dash-title {
    font-family: 'DM Serif Display', serif;
    font-size: 2rem;
    line-height: 1.1;
  }
  .dash-title span { color: var(--text2); font-size: 1rem; font-family: 'DM Mono'; font-weight: 300; display: block; margin-bottom: 4px; }

  .dash-date {
    font-size: 0.75rem;
    color: var(--text3);
    letter-spacing: 0.06em;
    text-transform: uppercase;
  }

  /* STATS ROW */
  .stats-row {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 16px;
    animation: fadeUp 0.4s 0.1s ease both;
  }

  .stat-card {
    background: var(--bg2);
    border: 1px solid var(--border);
    border-radius: 12px;
    padding: 20px 24px;
    transition: border-color 0.2s;
    position: relative;
    overflow: hidden;
  }
  .stat-card::before {
    content: '';
    position: absolute;
    top: 0; left: 0; right: 0;
    height: 2px;
    background: var(--accent-color, var(--accent));
    opacity: 0.6;
  }
  .stat-card:hover { border-color: var(--border2); }

  .stat-label {
    font-size: 0.7rem;
    color: var(--text3);
    letter-spacing: 0.08em;
    text-transform: uppercase;
    margin-bottom: 10px;
  }

  .stat-value {
    font-family: 'Syne', sans-serif;
    font-size: 2rem;
    font-weight: 800;
    line-height: 1;
    margin-bottom: 6px;
  }

  .stat-change {
    font-size: 0.72rem;
    display: flex;
    align-items: center;
    gap: 4px;
  }
  .stat-change.up { color: var(--green); }
  .stat-change.down { color: var(--red); }
  .stat-change.neutral { color: var(--text3); }

  /* MAIN GRID */
  .main-grid {
    display: grid;
    grid-template-columns: 1fr;
    gap: 16px;
    animation: fadeUp 0.4s 0.2s ease both;
  }

  .card {
    background: var(--bg2);
    border: 1px solid var(--border);
    border-radius: 12px;
    overflow: hidden;
  }

  .card-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 18px 24px;
    border-bottom: 1px solid var(--border);
  }

  .card-title {
    font-family: 'Syne', sans-serif;
    font-size: 0.85rem;
    font-weight: 600;
    letter-spacing: 0.02em;
  }

  .card-badge {
    font-size: 0.65rem;
    padding: 3px 10px;
    border-radius: 100px;
    background: rgba(59,130,246,0.1);
    border: 1px solid rgba(59,130,246,0.2);
    color: var(--accent);
    letter-spacing: 0.04em;
  }

  /* DECISIONS LIST */
  .decision-item {
    padding: 18px 24px;
    border-bottom: 1px solid var(--border);
    cursor: pointer;
    transition: background 0.15s;
    display: grid;
    grid-template-columns: auto 1fr auto;
    gap: 14px;
    align-items: start;
  }
  .decision-item:last-child { border-bottom: none; }
  .decision-item:hover { background: var(--bg3); }

  .decision-dot {
    width: 8px; height: 8px;
    border-radius: 50%;
    margin-top: 5px;
    flex-shrink: 0;
  }

  .decision-content {}
  .decision-title {
    font-size: 0.82rem;
    color: var(--text);
    margin-bottom: 4px;
    line-height: 1.4;
    word-break: break-word;
  }

  .decision-meta {
    font-size: 0.68rem;
    color: var(--text3);
    display: flex;
    gap: 10px;
  }

  .decision-status {
    font-size: 0.65rem;
    padding: 3px 10px;
    border-radius: 6px;
    white-space: nowrap;
    align-self: start;
    letter-spacing: 0.04em;
  }

  .status-upcoming { background: rgba(245,158,11,0.1); color: var(--amber); border: 1px solid rgba(245,158,11,0.2); }
  .status-passed { background: rgba(34,197,94,0.1); color: var(--green); border: 1px solid rgba(34,197,94,0.2); }
  .status-rejected { background: rgba(239,68,68,0.1); color: var(--red); border: 1px solid rgba(239,68,68,0.2); }
  .status-review { background: rgba(6,182,212,0.1); color: var(--cyan); border: 1px solid rgba(6,182,212,0.2); }

  /* CHART AREA */
  .chart-area {
    padding: 24px;
  }

  .chart-bars {
    display: flex;
    align-items: flex-end;
    gap: 8px;
    height: 120px;
    margin-bottom: 8px;
  }

  .bar-group {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
    height: 100%;
    justify-content: flex-end;
  }

  .bar {
    width: 100%;
    border-radius: 3px 3px 0 0;
    background: var(--accent);
    opacity: 0.7;
    transition: opacity 0.2s;
    min-height: 4px;
  }
  .bar:hover { opacity: 1; }

  .bar-label {
    font-size: 0.6rem;
    color: var(--text3);
    letter-spacing: 0.04em;
  }

  /* SIDE PANEL */
  .side-panel { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }

  .mini-card {
    background: var(--bg2);
    border: 1px solid var(--border);
    border-radius: 12px;
    overflow: hidden;
  }

  .upcoming-item {
    padding: 14px 18px;
    border-bottom: 1px solid var(--border);
    cursor: pointer;
    transition: background 0.15s;
  }
  .upcoming-item:last-child { border-bottom: none; }
  .upcoming-item:hover { background: var(--bg3); }
  .upcoming-item a { text-decoration: none; color: inherit; display: block; }
  .upcoming-item a:hover .upcoming-title { color: var(--accent); }

  .upcoming-date {
    font-size: 0.65rem;
    color: var(--amber);
    letter-spacing: 0.06em;
    text-transform: uppercase;
    margin-bottom: 4px;
  }

  .upcoming-title {
    font-size: 0.78rem;
    color: var(--text);
    line-height: 1.4;
  }

  .upcoming-body {
    font-size: 0.65rem;
    color: var(--text2);
    letter-spacing: 0.04em;
    margin-top: 4px;
  }

  /* BOTTOM GRID */
  .bottom-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 16px;
    animation: fadeUp 0.4s 0.3s ease both;
  }
  @media (max-width: 1100px) {
    .bottom-grid { grid-template-columns: 1fr 1fr; }
    .side-panel { grid-template-columns: 1fr; }
  }

  .trend-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px 20px;
    border-bottom: 1px solid var(--border);
    font-size: 0.78rem;
  }
  .trend-row:last-child { border-bottom: none; }

  .trend-label { color: var(--text2); font-size: 0.72rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 160px; }
  .trend-value { font-family: 'Syne', sans-serif; font-weight: 600; white-space: nowrap; }
  .trend-bar-container {
    padding: 14px 20px 16px;
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
  .trend-bar-row { display: flex; flex-direction: column; gap: 4px; }
  .trend-bar-info { display: flex; justify-content: space-between; font-size: 0.68rem; color: var(--text2); }
  .trend-bar-track { height: 4px; background: var(--border2); border-radius: 2px; overflow: hidden; }
  .trend-bar-fill { height: 100%; border-radius: 2px; transition: width 1s ease; }

  /* MODAL */
  .modal-overlay {
    position: fixed; inset: 0; z-index: 200;
    background: rgba(0,0,0,0.7);
    backdrop-filter: blur(4px);
    display: flex; align-items: center; justify-content: center;
    opacity: 0; pointer-events: none;
    transition: opacity 0.2s;
  }
  .modal-overlay.open { opacity: 1; pointer-events: all; }

  .modal {
    background: var(--bg2);
    border: 1px solid var(--border2);
    border-radius: 16px;
    padding: 32px;
    max-width: 520px; width: 90%;
    transform: translateY(16px);
    transition: transform 0.2s;
  }
  .modal-overlay.open .modal { transform: translateY(0); }

  .modal-tag {
    font-size: 0.65rem;
    color: var(--text3);
    letter-spacing: 0.1em;
    text-transform: uppercase;
    margin-bottom: 10px;
  }

  .modal-title {
    font-family: 'DM Serif Display', serif;
    font-size: 1.5rem;
    margin-bottom: 16px;
    line-height: 1.3;
  }

  .modal-body {
    font-size: 0.8rem;
    color: var(--text2);
    line-height: 1.8;
    margin-bottom: 24px;
    font-weight: 300;
  }

  .modal-footer {
    display: flex;
    gap: 10px;
  }

  .modal-close {
    padding: 10px 20px;
    background: transparent;
    border: 1px solid var(--border2);
    color: var(--text2);
    border-radius: 8px;
    font-family: 'DM Mono', monospace;
    font-size: 0.78rem;
    cursor: pointer;
    transition: all 0.15s;
  }
  .modal-close:hover { background: var(--bg3); color: var(--text); }

  /* SEARCH */
  .search-wrap {
    position: relative;
    display: flex;
    align-items: center;
  }
  .search-icon {
    position: absolute;
    left: 12px;
    color: var(--text3);
    font-size: 0.85rem;
    pointer-events: none;
  }
  .search-input {
    background: var(--bg3);
    border: 1px solid var(--border2);
    border-radius: 8px;
    padding: 7px 14px 7px 34px;
    color: var(--text);
    font-family: 'DM Mono', monospace;
    font-size: 0.78rem;
    width: 220px;
    transition: all 0.2s;
    outline: none;
  }
  .search-input::placeholder { color: var(--text3); }
  .search-input:focus {
    border-color: var(--accent);
    width: 280px;
    background: var(--bg2);
    box-shadow: 0 0 0 3px rgba(59,130,246,0.1);
  }
  .search-clear {
    position: absolute;
    right: 10px;
    background: none;
    border: none;
    color: var(--text3);
    cursor: pointer;
    font-size: 0.85rem;
    padding: 2px 4px;
    display: none;
    line-height: 1;
  }
  .search-clear:hover { color: var(--text); }

  /* FILTERS */
  .filter-row {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 12px 24px;
    border-bottom: 1px solid var(--border);
    flex-wrap: wrap;
  }
  .filter-label {
    font-size: 0.65rem;
    color: var(--text3);
    letter-spacing: 0.08em;
    text-transform: uppercase;
    margin-right: 4px;
  }
  .filter-btn {
    padding: 4px 12px;
    border-radius: 100px;
    border: 1px solid var(--border2);
    background: transparent;
    color: var(--text2);
    font-family: 'DM Mono', monospace;
    font-size: 0.68rem;
    cursor: pointer;
    transition: all 0.15s;
    letter-spacing: 0.03em;
  }
  .filter-btn:hover { border-color: var(--text3); color: var(--text); }
  .filter-btn.active {
    background: var(--accent);
    border-color: var(--accent);
    color: #fff;
  }
  .filter-btn.f-passed.active { background: var(--green); border-color: var(--green); }
  .filter-btn.f-rejected.active { background: var(--red); border-color: var(--red); }
  .filter-btn.f-upcoming.active { background: var(--amber); border-color: var(--amber); color: #000; }
  .filter-btn.f-review.active { background: var(--cyan); border-color: var(--cyan); color: #000; }
  .filter-btn.f-meeting.active { background: var(--cyan); border-color: var(--cyan); color: #000; }

  /* SEARCH EMPTY STATE */
  .search-empty {
    padding: 40px 24px;
    text-align: center;
    display: none;
  }
  .search-empty-icon { font-size: 2rem; margin-bottom: 10px; }
  .search-empty-text { font-size: 0.78rem; color: var(--text3); }
  .search-highlight {
    background: rgba(59,130,246,0.2);
    color: var(--accent);
    border-radius: 2px;
    padding: 0 2px;
  }

  /* SCROLLBAR */
  ::-webkit-scrollbar { width: 4px; }
  ::-webkit-scrollbar-track { background: var(--bg); }
  ::-webkit-scrollbar-thumb { background: var(--border2); border-radius: 2px; }

  /* ====== MOBIILI ====== */
  @media (max-width: 768px) {

    /* Nav */
    nav {
      padding: 12px 16px;
      flex-wrap: wrap;
      gap: 8px;
    }
    .nav-links { gap: 2px; }
    .nav-btn { padding: 6px 10px; font-size: 0.7rem; }
    #nav-search { order: 3; width: 100%; }
    .search-input { width: 100% !important; }

    /* Dashboard */
    .dashboard { padding: 16px; gap: 16px; }

    /* Header */
    .dash-header {
      flex-direction: column !important;
      align-items: flex-start !important;
      gap: 4px;
    }
    .dash-title {
      font-size: 1.6rem !important;
    }
    .dash-title span {
      font-size: 0.75rem !important;
    }
    .dash-date { font-size: 0.65rem; }
    .dash-title { font-size: 1.5rem; }

    /* Stats — 2x2 ruudukko */
    .stats-row {
      grid-template-columns: 1fr 1fr !important;
    }
    .stat-value { font-size: 1.4rem; }
    .stat-label { font-size: 0.65rem; }
    .stat-change { font-size: 0.65rem; }

    /* Main grid */
    .main-grid { grid-template-columns: 1fr; }

    /* Side panel */
    .side-panel { grid-template-columns: 1fr; }

    /* Bottom grid */
    .bottom-grid { grid-template-columns: 1fr; }

    /* Filter row */
    .filter-row { gap: 6px; padding: 10px 16px; flex-wrap: wrap; }
    .filter-btn { font-size: 0.65rem; padding: 3px 8px; }

    /* Decision items */
    .decision-item { padding: 14px 16px; gap: 10px; }
    .decision-title { font-size: 0.78rem; }
    .decision-meta { font-size: 0.63rem; }
    .decision-status { font-size: 0.6rem; padding: 2px 7px; }

    /* Cards */
    .card-header { padding: 14px 16px; }
    .card-title { font-size: 0.8rem; }
    .trend-row { padding: 10px 16px; }

    /* Hero */
    .hero h1 { font-size: 2.5rem; }
    .features { grid-template-columns: 1fr; }

    /* Modal */
    .modal { padding: 24px 20px; }
    .modal-title { font-size: 1.2rem; }
  }

  @media (max-width: 480px) {
    .stats-row { grid-template-columns: 1fr 1fr; }
    .stat-value { font-size: 1.2rem; }
    nav .nav-btn.cta { display: none; }
  }
</style>
</head>
<body>

<!-- NAV -->
<nav>
  <div class="nav-logo">Päätös<span>Tuki</span></div>
  <div class="search-wrap" id="nav-search" style="display:none">
    <span class="search-icon">🔍</span>
    <input class="search-input" id="searchInput" type="text" placeholder="Hae päätöksiä..." oninput="handleSearch(this.value)" onkeydown="if(event.key==='Escape'){clearSearch()}">
    <button class="search-clear" id="searchClear" onclick="clearSearch()">✕</button>
  </div>
  <div class="nav-links">
    <button class="nav-btn active" onclick="showView('landing')">Etusivu</button>
    <button class="nav-btn" onclick="showView('dashboard')">Dashboard</button>
    <button class="nav-btn cta" onclick="showView('dashboard')">Kirjaudu sisään →</button>
  </div>
</nav>

<!-- LANDING VIEW -->
<div class="view active" id="view-landing">
  <div class="landing">
    <div class="hero">
      <div class="hero-tag">Paikallinen demokratia</div>
      <h1>Parempia päätöksiä<br><em>datalla tuettuna.</em></h1>
      <p>Seuraa kaupunkisi päätöksentekoa reaaliajassa. Tulevat kokoukset, tärkeät äänestykset ja tuoreimmat tilastotiedot — yhdessä paikassa.</p>
      <div class="hero-cta">
        <button class="btn-primary" onclick="showView('dashboard')">Avaa dashboard →</button>
        <button class="btn-secondary">Lue lisää</button>
      </div>
    </div>
    <div class="features">
      <div class="feature">
        <div class="feature-icon">🏛️</div>
        <h3>Päätökset & kokoukset</h3>
        <p>Tulevat valtuuston kokoukset, äänestystulokset ja päätösten historiatiedot helposti selattavissa.</p>
      </div>
      <div class="feature">
        <div class="feature-icon">📊</div>
        <h3>Talous & tilastot</h3>
        <p>Kunnan taloustilanne, budjetin toteutuminen, väestökehitys ja työttömyystilastot päivitettynä.</p>
      </div>
      <div class="feature">
        <div class="feature-icon">🔔</div>
        <h3>Ilmoitukset</h3>
        <p>Saat ilmoituksen kun seuraamiisi aiheisiin liittyviä päätöksiä on tulossa tai tehty.</p>
      </div>
    </div>
  </div>
</div>

<!-- DASHBOARD VIEW -->
<div class="view" id="view-dashboard">
  <div class="dashboard">

    <!-- Header -->
    <div class="dash-header">
      <div class="dash-title">
        <span>Kokkola — Päätöstuki</span>
        Dashboard
      </div>
      <div class="dash-date" id="dash-date">Tiistai 25. helmikuuta 2026</div>
    </div>

    <!-- Stats -->
    <div class="stats-row">
      <div class="stat-card" style="--accent-color: #06b6d4">
        <div class="stat-label">Asukasluku</div>
        <div class="stat-value" id="stat-vaesto">⏳</div>
        <div class="stat-change" id="stat-vaesto-change">ladataan...</div>
      </div>
      <div class="stat-card" style="--accent-color: #ef4444">
        <div class="stat-label">Työttömyys</div>
        <div class="stat-value" id="stat-tyottomyys">⏳</div>
        <div class="stat-change" id="stat-tyottomyys-change">ladataan...</div>
      </div>
      <div class="stat-card" style="--accent-color: #22c55e">
        <div class="stat-label">Alle 18-vuotiaat</div>
        <div class="stat-value" id="stat-nuoret">⏳</div>
        <div class="stat-change" id="stat-nuoret-change">ladataan...</div>
      </div>
      <div class="stat-card" style="--accent-color: #f59e0b">
        <div class="stat-label">Tulevia päätöksiä</div>
        <div class="stat-value" id="stat-paatokset">—</div>
        <div class="stat-change neutral">seuraavat 30 pv</div>
      </div>
    </div>

    <!-- Main Grid -->
    <div class="main-grid">
      <!-- Decisions -->
      <div class="card">
        <div class="card-header">
          <div class="card-title">Viimeisimmät & tulevat päätökset</div>
          <div class="card-badge">14 kpl</div>
        </div>
        <div class="filter-row">
          <span class="filter-label">Suodata:</span>
          <button class="filter-btn active" onclick="setFilter('all', this)">Kaikki</button>
          <button class="filter-btn f-upcoming" onclick="setFilter('upcoming', this)">Tulevat</button>
          <button class="filter-btn f-passed" onclick="setFilter('passed', this)">Hyväksytyt</button>
          <button class="filter-btn f-rejected" onclick="setFilter('rejected', this)">Hylätyt</button>
          <button class="filter-btn f-review" onclick="setFilter('review', this)">Lausunto</button>
          <button class="filter-btn f-meeting" onclick="setFilter('meeting', this)">Kokous</button>
        </div>

        <div id="decisions-list">
          <div style="padding: 32px 24px; text-align:center; color: var(--text3); font-size:0.8rem;">
            ⏳ Ladataan päätöksiä...
          </div>
        </div>
        <div class="search-empty" id="search-empty">
          <div class="search-empty-icon">🔍</div>
          <div class="search-empty-text">Ei hakutuloksia</div>
        </div>


      </div>
    </div>

    <!-- Kokoukset & kaavio -->
    <div class="side-panel">

        <div class="mini-card">
          <div class="card-header">
            <div class="card-title">Seuraavat kokoukset</div>
          </div>
          <div id="upcoming-meetings-list">
            <div style="padding:16px;text-align:center;color:var(--text3);font-size:0.78rem;">⏳ Ladataan...</div>
          </div>
        </div>

        <!-- Bar chart: kuukausipäätökset -->
        <div class="mini-card">
          <div class="card-header">
            <div class="card-title">Päätöksiä / kk</div>
          </div>
          <div class="chart-area">
            <div class="chart-bars">
              <div class="bar-group"><div class="bar" style="height:55%"></div><div class="bar-label">ELO</div></div>
              <div class="bar-group"><div class="bar" style="height:70%"></div><div class="bar-label">SYY</div></div>
              <div class="bar-group"><div class="bar" style="height:45%"></div><div class="bar-label">LOK</div></div>
              <div class="bar-group"><div class="bar" style="height:85%"></div><div class="bar-label">MAR</div></div>
              <div class="bar-group"><div class="bar" style="height:60%"></div><div class="bar-label">JOU</div></div>
              <div class="bar-group"><div class="bar" style="height:30%"></div><div class="bar-label">TAM</div></div>
              <div class="bar-group"><div class="bar" style="height:48%; background: var(--amber)"></div><div class="bar-label">HEL</div></div>
            </div>
          </div>
        </div>

      </div>

    <!-- Bottom Grid -->
    <div class="bottom-grid">

      <!-- Taloustilanne -->
      <div class="card">
        <div class="card-header">
          <div class="card-title">Taloustilanne</div>
          <div class="card-badge">2026</div>
        </div>
        <div class="trend-row">
          <span class="trend-label">Vuosikate</span>
          <span class="trend-value" style="color: var(--green)">+8,4 M€</span>
        </div>
        <div class="trend-row">
          <span class="trend-label">Lainakanta / asukas</span>
          <span class="trend-value">3 842 €</span>
        </div>
        <div class="trend-row">
          <span class="trend-label">Toimintakate</span>
          <span class="trend-value" style="color: var(--red)">−122 M€</span>
        </div>
        <div class="trend-row">
          <span class="trend-label">Investointibudjetti</span>
          <span class="trend-value">22,1 M€</span>
        </div>
      </div>

      <!-- Väestö -->
      <div class="card">
        <div class="card-header">
          <div class="card-title">Väestökehitys</div>
        </div>
        <div class="trend-bar-container">
          <div class="trend-bar-row">
            <div class="trend-bar-info"><span>0–17 v</span><span>19.2%</span></div>
            <div class="trend-bar-track"><div class="trend-bar-fill" style="width:19.2%; background: var(--cyan)"></div></div>
          </div>
          <div class="trend-bar-row">
            <div class="trend-bar-info"><span>18–64 v</span><span>57.4%</span></div>
            <div class="trend-bar-track"><div class="trend-bar-fill" style="width:57.4%; background: var(--accent)"></div></div>
          </div>
          <div class="trend-bar-row">
            <div class="trend-bar-info"><span>65+ v</span><span>23.4%</span></div>
            <div class="trend-bar-track"><div class="trend-bar-fill" style="width:23.4%; background: var(--amber)"></div></div>
          </div>
          <div class="trend-bar-row">
            <div class="trend-bar-info"><span>Syntyvyys (‰)</span><span>7.2 ‰</span></div>
            <div class="trend-bar-track"><div class="trend-bar-fill" style="width:36%; background: var(--green)"></div></div>
          </div>
          <div class="trend-bar-row">
            <div class="trend-bar-info"><span>Nettomuutto</span><span>−124 hlö</span></div>
            <div class="trend-bar-track"><div class="trend-bar-fill" style="width:62%; background: var(--red)"></div></div>
          </div>
        </div>
      </div>

      <!-- Työllisyys -->
      <div class="card">
        <div class="card-header">
          <div class="card-title">Työllisyys</div>
        </div>
        <div class="trend-row">
          <span class="trend-label">Työttömyysaste</span>
          <span class="trend-value" style="color: var(--amber)">9.2%</span>
        </div>
        <div class="trend-row">
          <span class="trend-label">Nuorisotyöttömyys</span>
          <span class="trend-value" style="color: var(--red)">14.8%</span>
        </div>
        <div class="trend-row">
          <span class="trend-label">Pitkäaikaistyöttömät</span>
          <span class="trend-value">682 hlö</span>
        </div>
        <div class="trend-row">
          <span class="trend-label">Avoimet työpaikat</span>
          <span class="trend-value" style="color: var(--green)">341</span>
        </div>
      </div>

    </div>

  </div>
</div>

<!-- MODAL -->
<div class="modal-overlay" id="modal" onclick="closeModal(event)">
  <div class="modal">
    <div class="modal-tag" id="modal-tag">Päätös</div>
    <div class="modal-title" id="modal-title"></div>
    <div class="modal-body" id="modal-body"></div>
    <div class="modal-footer">
      <button class="btn-primary">Avaa täydet tiedot →</button>
      <button class="modal-close" onclick="closeModalDirect()">Sulje</button>
    </div>
  </div>
</div>

<script>
  const PROXY_URL = 'https://kaupunki.onrender.com/decisions';
  const PROXY_MEETINGS_URL = 'https://kaupunki.onrender.com/meetings';

  // Tilastokeskus PxWeb API
  const STAT_URL = 'https://pxdata.stat.fi/PxWeb/api/v1/fi/StatFin/vaerak/statfin_vaerak_pxt_11ra.px';

  async function fetchStat(tiedot, vuosi) {
    const body = {
      query: [
        { code: 'Alue',   selection: { filter: 'item', values: ['KU272'] } },
        { code: 'Tiedot', selection: { filter: 'item', values: [tiedot]  } },
        { code: 'Vuosi',  selection: { filter: 'item', values: [vuosi]   } }
      ],
      response: { format: 'json' }
    };
    const res = await fetch(STAT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    const data = await res.json();
    return parseFloat(data.data[0]?.values[0]);
  }

  async function loadStats() {
    const stats = [
      { tiedot: 'vaesto',        elValue: 'stat-vaesto',     elChange: 'stat-vaesto-change',     format: v => Math.round(v).toLocaleString('fi-FI'), unit: 'hlö' },
      { tiedot: 'vaesto_alle15_p', elValue: 'stat-nuoret',   elChange: 'stat-nuoret-change',     format: v => v.toFixed(1) + '%', unit: '%' },
    ];

    const years = ['2024', '2023'];

    for (const s of stats) {
      try {
        const [v2024, v2023] = await Promise.all([
          fetchStat(s.tiedot, years[0]),
          fetchStat(s.tiedot, years[1])
        ]);

        document.getElementById(s.elValue).textContent = s.format(v2024);

        const diff = v2024 - v2023;
        const sign = diff >= 0 ? '+' : '';
        const changeEl = document.getElementById(s.elChange);
        changeEl.textContent = `${sign}${s.unit === '%' ? diff.toFixed(1) + '%' : Math.round(diff).toLocaleString('fi-FI') + ' hlö'} (2024 vs 2023)`;
        changeEl.className = 'stat-change ' + (diff > 0 ? 'up' : diff < 0 ? 'down' : 'neutral');
      } catch (e) {
        document.getElementById(s.elValue).textContent = '–';
        document.getElementById(s.elChange).textContent = 'virhe';
      }
    }

    // Työttömyysaste haetaan Tilastokeskukselta - Kokkola (KU272), kuukausitaso
    try {
      const tyoUrl = 'https://pxdata.stat.fi/PxWeb/api/v1/fi/StatFin/tyonv/statfin_tyonv_pxt_12tf.px';

      // Hae metadata viimeisimmät kuukaudet
      const metaRes = await fetch(tyoUrl);
      const meta = await metaRes.json();
      const kuukaudet = meta.variables.find(v => v.code === 'Kuukausi').values;
      const uusinKk = kuukaudet[kuukaudet.length - 1];
      const edellinenKk = kuukaudet[kuukaudet.length - 13]; // vuosi sitten

      const tyoBody = {
        query: [
          { code: 'Alue',     selection: { filter: 'item', values: ['KU272'] } },
          { code: 'Kuukausi', selection: { filter: 'item', values: [uusinKk, edellinenKk] } },
          { code: 'Tiedot',   selection: { filter: 'item', values: ['TYOTOSUUS'] } }
        ],
        response: { format: 'json' }
      };

      const tyoRes = await fetch(tyoUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(tyoBody)
      });
      const tyoData = await tyoRes.json();

      const uusinArvo = parseFloat(tyoData.data[0]?.values[0]);
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
    } catch(e) {
      document.getElementById('stat-tyottomyys').textContent = '–';
      document.getElementById('stat-tyottomyys-change').textContent = 'ei dataa';
    }
  }

  let activeFilter = 'all';
  let activeQuery = '';

  function showView(name) {
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    document.getElementById('view-' + name).classList.add('active');
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    if (name === 'landing') document.querySelectorAll('.nav-btn')[0].classList.add('active');
    if (name === 'dashboard') {
      document.querySelectorAll('.nav-btn')[1].classList.add('active');
      loadDecisions();
      loadStats();
      loadMeetings();
      loadAgendas();
    }
    document.getElementById('nav-search').style.display = name === 'dashboard' ? 'flex' : 'none';
  }

  async function loadDecisions() {
    const list = document.getElementById('decisions-list');
    list.innerHTML = '<div style="padding:32px 24px;text-align:center;color:var(--text3);font-size:0.8rem;">⏳ Ladataan päätöksiä Kokkolasta...</div>';

    try {
      const res = await fetch(PROXY_URL);
      const buffer = await res.arrayBuffer();
      let text = new TextDecoder("windows-1252").decode(buffer);
      text = text.replace(/encoding="[^"]+"/i, 'encoding="utf-8"');
      const parser = new DOMParser();
      const xml = parser.parseFromString(text, "application/xml");
      const items = xml.querySelectorAll("item");

      if (!items.length) {
        list.innerHTML = '<div style="padding:32px 24px;text-align:center;color:var(--text3);font-size:0.8rem;">⚠️ Ei päätöksiä saatavilla</div>';
        return;
      }

      list.innerHTML = '';
      items.forEach(item => {
        const title = item.querySelector('title')?.textContent || '–';
        const desc  = item.querySelector('description')?.textContent || '';
        const link  = item.querySelector('link')?.textContent || '#';
        const pubDate = item.querySelector('pubDate')?.textContent || '';

        // Format date
        let dateStr = '';
        if (pubDate) {
          const d = new Date(pubDate);
          if (!isNaN(d)) dateStr = d.toLocaleDateString('fi-FI');
        }

        // Try to extract issuer from title (format: "Issuer / Decision title")
        let issuer = 'Kokkola';
        let decisionTitle = title;
        if (title.includes(' / ')) {
          const parts = title.split(' / ');
          issuer = parts[0].trim();
          decisionTitle = parts.slice(1).join(' / ').trim();
        }

        const el = document.createElement('div');
        el.className = 'decision-item';
        el.dataset.status = 'passed';
        el.dataset.text = (title + ' ' + desc).toLowerCase();
        el.innerHTML = `
          <div class="decision-dot" style="background: var(--green)"></div>
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

      // Update badge count
      document.querySelector('.card-badge').textContent = items.length + ' kpl';
      applyFilters();

    } catch (e) {
      list.innerHTML = '<div style="padding:32px 24px;text-align:center;color:var(--red);font-size:0.8rem;">⚠️ Virhe ladattaessa päätöksiä. Kokeile hetken kuluttua uudelleen.</div>';
    }
  }

  async function loadMeetings() {
    const list = document.getElementById('decisions-list');

    try {
      const res = await fetch('https://kaupunki.onrender.com/meetings');
      const buffer = await res.arrayBuffer();
      let text = new TextDecoder('windows-1252').decode(buffer);
      text = text.replace(/encoding="[^"]+"/i, 'encoding="utf-8"');
      const parser = new DOMParser();
      const xml = parser.parseFromString(text, 'application/xml');
      const items = xml.querySelectorAll('item');

      if (!items.length) return;

      // Update 'tulevia päätöksiä' counter with meeting count
      document.getElementById('stat-paatokset').textContent = items.length;

      // Fill 'Seuraavat kokoukset' is handled separately by loadAgendas()

      // Update decisions badge
      const current = parseInt(document.querySelector('.card-badge').textContent) || 0;
      document.querySelector('.card-badge').textContent = (current + items.length) + ' kpl';

      items.forEach(item => {
        const title   = item.querySelector('title')?.textContent || '–';
        const desc    = item.querySelector('description')?.textContent || '';
        const link    = item.querySelector('link')?.textContent || '#';
        const pubDate = item.querySelector('pubDate')?.textContent || '';

        let dateStr = '';
        if (pubDate) {
          const d = new Date(pubDate);
          if (!isNaN(d)) dateStr = d.toLocaleDateString('fi-FI');
        }

        let issuer = 'Kokkola';
        let meetingTitle = title;
        if (title.includes(' / ')) {
          const parts = title.split(' / ');
          issuer = parts[0].trim();
          meetingTitle = parts.slice(1).join(' / ').trim();
        }

        const el = document.createElement('div');
        el.className = 'decision-item';
        el.dataset.status = 'meeting';
        el.dataset.text = (title + ' ' + desc).toLowerCase();
        el.innerHTML =
          '<div class="decision-dot" style="background: var(--cyan)"></div>' +
          '<div class="decision-content">' +
            '<div class="decision-title">' + meetingTitle + '</div>' +
            '<div class="decision-meta">' +
              '<span>' + issuer + '</span>' +
              (dateStr ? '<span>' + dateStr + '</span>' : '') +
            '</div>' +
          '</div>' +
          '<div class="decision-status status-review">Kokous</div>';
        el.addEventListener('click', () => openModal(meetingTitle, desc || 'Ei kuvausta.', issuer + (dateStr ? ' - ' + dateStr : ''), link));
        list.appendChild(el);
      });

    } catch(e) {
      console.error('Virhe ladattaessa kokousasioita:', e);
    }
  }

  async function loadAgendas() {
    const list = document.getElementById('upcoming-meetings-list');
    if (!list) return;

    try {
      const res = await fetch('https://kaupunki.onrender.com/agendas');
      const buffer = await res.arrayBuffer();
      let text = new TextDecoder('windows-1252').decode(buffer);
      text = text.replace(/encoding="[^"]+"/i, 'encoding="utf-8"');
      const parser = new DOMParser();
      const xml = parser.parseFromString(text, 'application/xml');
      const items = Array.from(xml.querySelectorAll('item'));

      const now = new Date();
      // Filter only future meetings and sort by date
      const future = items.filter(item => {
        const pubDate = item.querySelector('pubDate')?.textContent || '';
        if (!pubDate) return true;
        const d = new Date(pubDate);
        return isNaN(d) || d >= now;
      }).slice(0, 5);

      list.innerHTML = '';

      if (!future.length) {
        list.innerHTML = '<div style="padding:16px;color:var(--text3);font-size:0.78rem;">Ei tulevia kokouksia</div>';
        return;
      }

      future.forEach(item => {
        const title   = item.querySelector('title')?.textContent || '–';
        const linkUrl = item.querySelector('link')?.textContent || '#';
        const pubDate = item.querySelector('pubDate')?.textContent || '';

        let dateStr = '';
        if (pubDate) {
          const d = new Date(pubDate);
          if (!isNaN(d)) dateStr = d.toLocaleDateString('fi-FI', {weekday:'short', day:'numeric', month:'numeric', year:'numeric'});
        }

        const el = document.createElement('div');
        el.className = 'upcoming-item';
        el.innerHTML = '<a href="' + linkUrl + '" target="_blank">' +
          (dateStr ? '<div class="upcoming-date">' + dateStr + '</div>' : '') +
          '<div class="upcoming-title">' + title + '</div>' +
          '<div class="upcoming-body">Avaa esityslista →</div>' +
          '</a>';
        list.appendChild(el);
      });

    } catch(e) {
      list.innerHTML = '<div style="padding:16px;color:var(--text3);font-size:0.78rem;">Virhe ladattaessa kokouksia</div>';
    }
  }

  function setFilter(filter, btn) {
    activeFilter = filter;
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
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
    const items = document.querySelectorAll('#decisions-list .decision-item');
    let visible = 0;
    items.forEach(item => {
      const status = item.dataset.status;
      const text = (item.dataset.text + ' ' + item.innerText).toLowerCase();
      const matchFilter = activeFilter === 'all' || status === activeFilter;
      const matchQuery = !activeQuery || text.includes(activeQuery);
      const show = matchFilter && matchQuery;
      item.style.display = show ? '' : 'none';
      if (show) {
        const titleEl = item.querySelector('.decision-title');
        if (activeQuery && titleEl) {
          const orig = titleEl.textContent;
          const idx = orig.toLowerCase().indexOf(activeQuery);
          if (idx >= 0) {
            titleEl.innerHTML = orig.slice(0, idx)
              + '<span class="search-highlight">' + orig.slice(idx, idx + activeQuery.length) + '</span>'
              + orig.slice(idx + activeQuery.length);
          }
        }
        visible++;
      }
    });
    document.getElementById('search-empty').style.display = visible === 0 ? 'block' : 'none';
  }

  function openModal(title, body, tag, link) {
    document.getElementById('modal-title').textContent = title;
    document.getElementById('modal-body').textContent = body;
    document.getElementById('modal-tag').textContent = tag;
    // Update the "Avaa täydet tiedot" button link
    const btn = document.querySelector('.modal-footer .btn-primary');
    btn.onclick = () => window.open(link, '_blank');
    document.getElementById('modal').classList.add('open');
  }

  function closeModal(e) {
    if (e.target === document.getElementById('modal')) {
      document.getElementById('modal').classList.remove('open');
    }
  }

  function closeModalDirect() {
    document.getElementById('modal').classList.remove('open');
  }
</script>
</body>
</html>
