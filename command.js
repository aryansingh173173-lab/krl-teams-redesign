(function () {
  "use strict";
  const D = window.KRL;
  const app = document.getElementById("app");
  const crumbEl = document.getElementById("crumb");
  const overlay = document.getElementById("search-overlay");
  const searchInput = document.getElementById("search-input");
  const searchResults = document.getElementById("search-results");
  const PAGE = 24;
  const MEDIA_CONNECT = "https://krl-media-connect.vercel.app/";

  const I18N = {
    en: {
      notice: "Known records only. Programme targets are published ambitions, not live enrolment.",
      find: "Find farmer, farm, AC, team",
      command: "Overview",
      geography: "Geography",
      teams: "Teams",
      agents: "Agents",
      farmers: "Farmers",
      farms: "Farms",
      activity: "Activity",
      media: "Media",
      reports: "Reports",
      product: "KRL Teams",
      know_more: "Know more",
    },
    bn: {
      notice: "কেবল যা জানা. কর্মসূচির লক্ষ্যমাত্রা প্রকাশিত উচ্চাকাঙ্ক্ষা, চালু তালিকা নয়.",
      find: "কৃষক, খামার, কেন্দ্র, দল খুঁজুন",
      command: "পরিচিতি",
      geography: "ভূগোল",
      teams: "দল",
      agents: "এজেন্ট",
      farmers: "কৃষক",
      farms: "খামার",
      activity: "কাজ",
      media: "মিডিয়া",
      reports: "প্রতিবেদন",
      product: "কেআরএল টিমস",
      know_more: "আরও জানুন",
    },
  };

  function lang() {
    try { return localStorage.getItem("krl-lang") || "en"; } catch (_) { return "en"; }
  }

  function t(key) {
    return (I18N[lang()] || I18N.en)[key] || I18N.en[key] || key;
  }

  function applyLang() {
    const L = lang();
    document.documentElement.lang = L;
    document.querySelectorAll("[data-i18n]").forEach((el) => {
      const key = el.getAttribute("data-i18n");
      if (I18N[L] && I18N[L][key]) el.textContent = I18N[L][key];
    });
    document.querySelectorAll(".lang button").forEach((b) => {
      b.setAttribute("aria-pressed", b.dataset.lang === L ? "true" : "false");
    });
  }

  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function href(path, params) {
    const q = params && Object.keys(params).length
      ? "?" + new URLSearchParams(params).toString()
      : "";
    return "#/" + path.replace(/^\//, "") + q;
  }

  function parse() {
    const raw = (location.hash || "#/").replace(/^#/, "");
    const [path, qs] = raw.split("?");
    const parts = path.split("/").filter(Boolean);
    const params = Object.fromEntries(new URLSearchParams(qs || ""));
    return { parts, params };
  }

  function nameOf(type, id) {
    if (type === "district") return (D.byId(D.DISTRICTS, id) || {}).name || id;
    if (type === "ac") return (D.byId(D.ACS, id) || {}).name || id;
    if (type === "team") return (D.byId(D.TEAMS, id) || {}).name || id;
    if (type === "agent") return (D.byId(D.AGENTS, id) || {}).code || id;
    if (type === "farmer") return (D.byId(D.FARMERS, id) || {}).name || id;
    if (type === "farm") return (D.byId(D.FARMS, id) || {}).name || id;
    return id;
  }

  function crumb(items) {
    crumbEl.innerHTML = items.map((it, i) => {
      const last = i === items.length - 1;
      return last
        ? `<span aria-current="page">${esc(it.label)}</span>`
        : `<a href="${it.href}">${esc(it.label)}</a><span aria-hidden="true">/</span>`;
    }).join("");
  }

  function stageLabel(id) {
    const s = D.STAGES.find((x) => x.id === id);
    return s ? (lang() === "bn" ? s.bn : s.label) : id;
  }

  function statusBadge(status) {
    const map = { attention: "warn", completed: "ok", in_progress: "hold", blocked: "warn" };
    const cls = map[status] || "";
    const label = (D.STATUSES.find((s) => s.id === status) || { label: status }).label;
    return `<span class="badge ${cls}">${esc(label)}</span>`;
  }

  function teamRegion(team) {
    return (team.districts || []).map((id) => nameOf("district", id)).join(", ");
  }


  function teamArtwork(team) {
    return team.logo;
  }

  function goldIcon(name) {
    return `<svg class="gold-icon" viewBox="0 0 120 120" aria-hidden="true"><use href="images/gold/icons.svg#${name}"></use></svg>`;
  }

  function teamIdentity(team, extra) {
    if (!team || team.placeholder || !team.logo) return "";
    return '<span class="tid"><img src="' + esc(teamArtwork(team)) + '" alt="' + esc(team.name) + ' official logo"><span><b>' + esc(team.name) + "</b><small>" + esc(extra || teamRegion(team)) + "</small></span></span>";
  }

  function teamMark(team) {
    if (!team || team.placeholder || !team.logo) return "";
    return '<img src="' + esc(teamArtwork(team)) + '" alt="' + esc(team.name) + ' official logo">';
  }

  function supportPeople(farm) {
    return (farm.support || []).filter((p) => p.name && !/not assigned|pending/i.test(p.name));
  }

  function socialChannels(farm) {
    return ((farm.social && farm.social.channels) || []).filter((c) => c.url);
  }

  function smartRows(farm) {
    if (!farm.smart) return [];
    return D.SMART_CATS.filter((c) => {
      const row = farm.smart[c.id];
      return row && row.status !== "not_started" && row.pct > 0;
    }).map((c) => Object.assign({ cat: c }, farm.smart[c.id]));
  }

  function hasAuthoredJourney(farm) {
    return !!(farm.journey && farm.journey.some((j) => j.date && j.note && j.note !== "Prototype milestone."));
  }

  function farmAvailableTabs(farm) {
    const tabs = [["overview", "Overview"]];
    if (hasAuthoredJourney(farm)) tabs.push(["journey", "Farm journey"]);
    if (smartRows(farm).length) tabs.push(["smart", "Smart farming"]);
    if (farm.lastVisit || (farm.plots && farm.plots.length)) tabs.push(["monitor", "Monitoring"]);
    if ((farm.evidence || []).length) tabs.push(["media", "Media"]);
    if (supportPeople(farm).length) tabs.push(["people", "People and support"]);
    if (socialChannels(farm).length) tabs.push(["social", "Social presence"]);
    return tabs;
  }

  function mediaConnectCta() {
    const cta = D.mediaWhere("cta")[0];
    return `<aside class="know-more">
      ${cta ? `<figure><img src="${esc(cta.src)}" alt="${esc(cta.caption)}"></figure>` : ""}
      <div>
        <p class="sec-k">KRL Media Connect</p>
        <h2>Explore more stories, photographs, event coverage and media.</h2>
        <p>KRL Media Connect remains a separate product. This command centre stays here.</p>
        <a class="know-more-link" href="${MEDIA_CONNECT}" target="_blank" rel="noopener noreferrer">
          <span>Know more</span>
          <span lang="bn">আরও জানুন</span>
        </a>
      </div>
    </aside>`;
  }

  function captionFor(kind, title) {
    const map = {
      irrigation: "Irrigation planning",
      soil: "Soil preparation",
      crop: "Crop development",
      pond: "Water management",
      visit: "Farm visit",
      training: "Training",
      photo: "Field activity",
      video: "Field walk-through",
    };
    return map[kind] || title || "Field activity";
  }

  function leagueBoard() {
    const rows = D.TEAMS.map(function (t) {
      const st = D.teamStats(t.id);
      const known = [];
      if (st.farmers) known.push(st.farmers + (st.farmers === 1 ? " farmer" : " farmers"));
      if (st.farms) known.push(st.farms + (st.farms === 1 ? " farm" : " farms"));
      if (st.agents) known.push(st.agents + (st.agents === 1 ? " agent" : " agents"));
      return '<a class="reg-team" href="' + href("team/" + t.id) + '">' +
        teamMark(t) +
        "<div><strong>" + esc(t.name) + "</strong><span>" + esc(teamRegion(t)) + "</span></div>" +
        "<span>" + st.acs + " assembly seats</span>" +
        "<span>" + (known.length ? known.join(" · ") : "Geography assigned") + "</span></a>";
    }).join("");
    return '<section class="league"><header class="sec-head"><p class="sec-k">Team network</p><h2>Team Register</h2>' +
      "<p>Fifteen official identities. Field counts appear only where a record exists.</p></header>" +
      '<div class="register-list">' + rows + "</div></section>";
  }

  function setNav(active) {
    document.querySelectorAll(".subnav a").forEach((a) => {
      const on = a.dataset.nav === active;
      if (on) a.setAttribute("aria-current", "page");
      else a.removeAttribute("aria-current");
    });
  }

  function pageSlice(list, page) {
    const p = Math.max(1, parseInt(page || "1", 10) || 1);
    const start = (p - 1) * PAGE;
    return { page: p, total: list.length, pages: Math.max(1, Math.ceil(list.length / PAGE)), rows: list.slice(start, start + PAGE) };
  }

  function pager(base, pageInfo, params) {
    if (pageInfo.pages <= 1) return "";
    const prev = Object.assign({}, params, { page: String(pageInfo.page - 1) });
    const next = Object.assign({}, params, { page: String(pageInfo.page + 1) });
    return `<div class="pager">
      <span>${pageInfo.total} records · page ${pageInfo.page} of ${pageInfo.pages}</span>
      <div>
        <button type="button" ${pageInfo.page <= 1 ? "disabled" : ""} data-go="${href(base, prev)}">Previous</button>
        <button type="button" ${pageInfo.page >= pageInfo.pages ? "disabled" : ""} data-go="${href(base, next)}">Next</button>
      </div>
    </div>`;
  }

  function filtersBar(params, extras) {
    const districts = D.DISTRICTS.map((d) => `<option value="${d.id}" ${params.district === d.id ? "selected" : ""}>${esc(d.name)}</option>`).join("");
    const teams = D.TEAMS.map((t) => `<option value="${t.id}" ${params.team === t.id ? "selected" : ""}>${esc(t.name)}</option>`).join("");
    const stages = D.STAGES.map((s) => `<option value="${s.id}" ${params.stage === s.id ? "selected" : ""}>${esc(s.label)}</option>`).join("");
    return `<form class="filters" data-filter>
      <label>District <select name="district"><option value="">All</option>${districts}</select></label>
      <label>Team <select name="team"><option value="">All</option>${teams}</select></label>
      <label>Stage <select name="stage"><option value="">All</option>${stages}</select></label>
      ${extras || ""}
      <label>Search <input name="q" value="${esc(params.q || "")}" placeholder="Name or code"></label>
    </form>`;
  }

  function empty(title, body) {
    return `<div class="state"><h2>${esc(title)}</h2><p>${esc(body)}</p></div>`;
  }

  function notFound(kind, id) {
    crumb([{ href: "#/", label: "West Bengal" }, { label: "Not found" }]);
    return empty(kind + " not found", "No known record matches “" + id + "”. Return to the command centre and try another path.");
  }

  const TEAM_REGIONS = {
    all: ["himalayan-giants", "terai-tuskers", "cooch-behar-royals", "nadia-warriors", "ganga-gladiators", "sundarban-strikers"],
    north: ["himalayan-giants", "terai-tuskers", "cooch-behar-royals", "dinajpur-defenders", "malda-kings"],
    central: ["murshidabad-nawabs", "nadia-warriors", "bardhaman-bigha-kings", "hooghly-harits", "birbhum-blasters"],
    south: ["bankura-bulls", "purulia-panthers", "medinipur-mavericks", "ganga-gladiators", "sundarban-strikers"],
  };

  function homeTeamCards(region = "all") {
    return TEAM_REGIONS[region].map((id) => {
      const team = D.byId(D.TEAMS, id);
      const st = D.teamStats(id);
      return `<a class="team-tile" href="${href("team/" + id)}">
        <div class="team-card-top"><span class="team-number">BENGAL / ${String(D.TEAMS.indexOf(team) + 1).padStart(2, "0")}</span><span class="team-open" aria-hidden="true">↗</span></div>
        <img src="${teamArtwork(team)}" alt="${esc(team.name)} official logo" width="108" height="125" loading="lazy">
        <h3>${esc(team.name)}</h3><p>${esc(teamRegion(team))}</p>
        <span class="team-card-bottom"><span>${st.acs} assembly seats</span><span>Meet the team →</span></span>
      </a>`;
    }).join("");
  }

  function viewCommand() {
    setNav("command");
    crumb([{ href: "#/", label: "West Bengal" }, { label: "Overview" }]);
    const s = D.programmeStats();
    const latest = D.ACTIVITIES[0];
    const flag = D.byId(D.FARMS, "maa-ganga");
    const flagTeam = flag ? D.byId(D.TEAMS, flag.teamId) : null;
    const bn = lang() === "bn";
    return `
      <header class="home-hero">
        <img class="hero-landscape" src="images/gold/bengal-sunset.png" alt="Illustrative Bengal paddy fields glowing in the light of a golden sunset" width="1536" height="1024" fetchpriority="high">
        <div class="hero-ornament" aria-hidden="true"></div>
        <button class="motion-toggle" type="button" data-motion aria-pressed="false">Pause motion Ⅱ</button>
        <p class="hero-topline">${bn ? "কৃষি রত্ন লীগ · পশ্চিমবঙ্গ" : "Krishi Ratna League · West Bengal"}</p>
        <h1><span class="hero-phrase">${bn ? "বাংলার মাটি।" : "Bengal’s soil."}</span> <span class="hero-phrase">${bn ? "বাংলার মানুষ।" : "Bengal’s people."}</span><em>${bn ? "একসঙ্গে এগিয়ে চলা।" : "A future we grow together."}</em></h1>
        <p class="hero-description">${bn ? "একটি রাজ্য। পনেরোটি দল। কৃষক, খামার ও মাঠের কাজকে যুক্ত করার একটি উদ্যোগ।" : "One state. Fifteen teams. A shared ambition to bring farmers, field teams and smarter farming together — one farm at a time."}</p>
        <div class="hero-actions">
          <a class="button-gold" href="${href("teams")}">${bn ? "দলগুলি দেখুন" : "Meet the teams"} <span aria-hidden="true">↗</span></a>
          <a class="button-outline" href="${href("farm/maa-ganga")}">${bn ? "একটি খামারের গল্প" : "Step inside a farm"} <span aria-hidden="true">→</span></a>
        </div>
        <div class="hero-bottom"><a class="hero-scroll" href="#programme" data-scroll="programme"><span class="scroll-circle" aria-hidden="true">↓</span>${bn ? "উদ্যোগটি জানুন" : "Discover the programme"}</a><p class="hero-coordinate">West Bengal · Krishi Ratna League<br>AI-created landscape · programme illustration</p></div>
      </header>
      <dl class="home-stats" id="programme">
        <a href="${href("farmers")}">${goldIcon("wheat")}<dt>Our ambition</dt><dd>${s.targetFarmers.toLocaleString("en-IN")}</dd><small>Farmers · programme target</small><span class="stat-arrow" aria-hidden="true">↗</span></a>
        <a href="${href("geo")}">${goldIcon("sun")}<dt>The state canvas</dt><dd>${s.acs}</dd><small>Assembly constituencies</small><span class="stat-arrow" aria-hidden="true">↗</span></a>
        <a href="${href("teams")}">${goldIcon("shield")}<dt>The collective</dt><dd>${String(s.teams).padStart(2, "0")}</dd><small>Official team identities</small><span class="stat-arrow" aria-hidden="true">↗</span></a>
        <a href="${href("geo")}">${goldIcon("leaf")}<dt>Rooted across</dt><dd>${s.districts}</dd><small>Districts of West Bengal</small><span class="stat-arrow" aria-hidden="true">↗</span></a>
      </dl>
      <p class="home-record-note"><span>THE RECORD TODAY</span> ${s.knownFarmers} farmer · ${s.knownFarms} farm · ${s.agents} agent. Programme targets describe our ambition; field records show what is known.</p>
      <section class="home-section home-network" aria-labelledby="network-title">
        <div class="section-heading"><div><p class="eyebrow">01 / The people behind the programme</p><h2 id="network-title">Different roots.<br><em>One shared purpose.</em></h2></div><p>From the Himalayan foothills to the Sundarbans, fifteen regional identities connect the league to the places it calls home.</p></div>
        <div class="region-selector" role="group" aria-label="Explore teams by region"><button type="button" data-region="all" aria-pressed="true">Across Bengal</button><button type="button" data-region="north" aria-pressed="false">The North</button><button type="button" data-region="central" aria-pressed="false">Central Bengal</button><button type="button" data-region="south" aria-pressed="false">The South & West</button></div>
        <p class="sr-only" id="team-region-status" role="status">Six featured teams from across Bengal.</p>
        <div class="team-preview" id="home-teams">${homeTeamCards()}</div>
        <div class="section-foot"><p>15 official teams. One connected field network.</p><a class="text-link" href="${href("teams")}">Explore all teams <span aria-hidden="true">→</span></a></div>
      </section>
      <section class="home-section home-geography" aria-labelledby="geography-title">
        <div class="section-intro"><p class="eyebrow">02 / Across Bengal</p><h2 id="geography-title">A whole state.<br><em>A local connection.</em></h2><p>Every farm belongs to a place. Follow the programme from West Bengal into a district, an assembly constituency, and the people working on the ground.</p><ol class="network-path"><li>State</li><li>District</li><li>Constituency</li><li>Team</li><li>Agent</li><li>Farmer</li><li>Farm</li></ol><a class="text-link" href="${href("geo")}">Explore the geography <span aria-hidden="true">→</span></a></div>
        <div class="home-map"><div class="map-top"><p class="eyebrow">West Bengal</p><span>${s.districts} districts / ${s.acs} seats</span></div>${wbMap(false)}<span class="map-foot">From the hills to the delta</span></div>
      </section>
      ${flag ? `<section class="home-feature" aria-labelledby="flagship-title"><div class="home-section">
        <figure class="farm-feature-photo"><img src="images/gold/integrated-farm.png" alt="Conceptual miniature of an integrated farm with a pond, paddy and vegetable beds" width="1536" height="1024" loading="lazy"><span class="photo-label">The integrated farming idea</span><figcaption>AI-created concept illustration · not a depiction of Maa Ganga Farm.</figcaption></figure>
        <div class="farm-feature-copy"><p class="eyebrow">03 / From ambition to the ground</p><h2 id="flagship-title">${esc(flag.name)}</h2><p>A pond, vegetable beds and a plan to make them work together. Follow the recorded journey of one farm in Maynaguri.</p>
        <div class="farm-feature-meta"><div><small>Place</small>Maynaguri, Jalpaiguri</div><div><small>Team</small>${esc(flagTeam.name)}</div><div><small>Holding</small>${flag.sizeAcres} acres</div></div>
        <div class="feature-progress"><div><span>Implementation progress · not yield</span><strong>${flag.progress}%</strong></div><div class="progress-track" role="meter" aria-label="Implementation progress" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${flag.progress}"><i style="width:${flag.progress}%"></i></div></div>
        <a class="button-gold" href="${href("farm/" + flag.id)}">Explore Farm 360 <span aria-hidden="true">↗</span></a></div>
      </div></section>` : ""}
      <section class="home-section" aria-labelledby="journal-title">
        <div class="section-heading"><div><p class="eyebrow">04 / The field journal</p><h2 id="journal-title">The work, as it happens.</h2></div><a class="text-link" href="${href("activity")}">All field activity <span aria-hidden="true">→</span></a></div>
        ${latest ? `<a class="journal-row" href="${href("farm/" + latest.farmId + "/journey")}"><time datetime="${esc(latest.date)}">${esc(new Date(latest.date + "T12:00:00").toLocaleDateString("en-GB", {day:"2-digit",month:"short",year:"numeric"}))}</time><div><h3>${esc(latest.title)}</h3><p>${esc(nameOf("farm", latest.farmId))} · ${esc(latest.note)}</p></div><span class="journal-arrow" aria-hidden="true">↗</span></a>` : `<p class="mute">Field updates will appear here as they are recorded.</p>`}
        <div class="programme-story"><figure><img src="images/hero.jpg" alt="The Krishi Ratna League programme launch, viewed from the stage" width="1280" height="960" loading="lazy"><figcaption>Programme launch · 14 September 2026</figcaption></figure><div><p class="eyebrow">A programme with people at its heart</p><h2>Every field has a story.<br><em>This is where we listen.</em></h2><p>Meet the programme through its launch, its people and its field context. A growing collection of photographs and film, with a clear account of what each record shows.</p><a class="text-link" href="${href("media")}">View photographs & film <span aria-hidden="true">→</span></a></div></div>
      </section>`;
  }


  function districtTone(st) {
    if (st.farmers >= 8) return "active";
    if (st.farmers > 0) return "indicated";
    return "upcoming";
  }

  function wbMap(withList) {
    const max = Math.max.apply(null, D.DISTRICTS.map((d) => D.districtStats(d.id).farmers)) || 1;
    const marks = D.DISTRICTS.map((d) => {
      const st = D.districtStats(d.id);
      if (!st.farmers) return "";
      const left = ((d.x - 8) / 64) * 100;
      const top = ((d.y - 2) / 82) * 100;
      return `<a class="geo-dot ${districtTone(st)}" href="${href("district/" + d.id)}" style="left:${left}%;top:${top}%" title="${esc(d.name)}" aria-label="${esc(d.name)}"></a>`;
    }).join("");
    const rows = D.DISTRICTS.map((d) => {
      const st = D.districtStats(d.id);
      const pct = Math.round((st.farmers / max) * 100);
      return `<a href="${href("district/" + d.id)}"><strong>${esc(d.name)}</strong><em>${st.farmers ? st.farmers + (st.farmers === 1 ? " farmer" : " farmers") : st.acs + " ACs"}</em>${st.farmers ? `<span class="dens" aria-hidden="true"><i style="width:${pct}%"></i></span>` : ""}</a>`;
    }).join("");
    return `<div class="geo-frame">
      <div class="geo-stage">
        <img class="wb-base" src="images/wb-outline.svg" alt="West Bengal programme geographic view">
        <div class="geo-marks">${marks}</div>
      </div>
      <p class="geo-legend"><span><b class="l-a"></b>Known farm record</span></p>
      <p class="geo-note">Programme Geographic View. Not a cadastral map.</p>
    </div>
    ${withList === false ? "" : `<aside class="geo-register"><h2 class="sec-title" style="margin-top:0">District register</h2><div class="geo-list" role="list">${rows}</div></aside>`}`;
  }

  function viewGeo(params) {
    setNav("geo");
    crumb([{ href: "#/", label: "West Bengal" }, { label: "Geography" }]);
    return `<section class="ident"><div>
      <p class="mast-k">Programme Geographic View</p>
      <h1>Geography</h1>
      <p>West Bengal to district to assembly constituency to the field network. This is a programme geographic view, not a cadastral map.</p>
    </div></section>
      <div class="geo-page">${wbMap(true)}</div>`;
  }

  function viewDistrict(id) {
    setNav("geo");
    const d = D.byId(D.DISTRICTS, id);
    if (!d) return notFound("District", id);
    const st = D.districtStats(id);
    crumb([{ href: "#/", label: "West Bengal" }, { href: href("geo"), label: "Geography" }, { label: d.name }]);
    const team = D.TEAMS.find((t) => t.districts.includes(id));
    const list = D.ACS.filter((a) => a.districtId === id).map((a) => {
      const as = D.acStats(a.id);
      const known = as.farmers ? as.farmers + (as.farmers === 1 ? " farmer" : " farmers") + " · " + as.farms + (as.farms === 1 ? " farm" : " farms") : "In the state frame";
      return `<a class="reg-row" href="${href("ac/" + a.id)}"><b>${esc(a.name)}</b><span>${known}</span><em>${as.progress ? as.progress + "%" : ""}</em><em></em></a>`;
    }).join("");
    return `<section class="ident"><div>
      <p class="mast-k">District</p>
      <h1>${esc(d.name)}</h1>
      ${team ? teamIdentity(team) : ""}
      <p>${d.acs.length} assembly constituencies in the state frame</p>
    </div></section>
    <dl class="ledger">
      <div><dt>Farmers</dt><dd>${st.farmers}</dd></div>
      <div><dt>Farms</dt><dd>${st.farms}</dd></div>
      <div><dt>Teams</dt><dd>${st.teams}</dd></div>
      <div><dt>Agents</dt><dd>${st.agents}</dd></div>
      <div><dt>ACs in frame</dt><dd>${st.acs}</dd></div>
    </dl>
    <section class="register">
      <h2 class="sec-title">Assembly constituencies</h2>
      ${list}
    </section>`;
  }

  function viewAc(id) {
    setNav("geo");
    const ac = D.byId(D.ACS, id);
    if (!ac) return notFound("Assembly constituency", id);
    const d = D.byId(D.DISTRICTS, ac.districtId);
    const team = D.byId(D.TEAMS, ac.teamId);
    const st = D.acStats(id);
    crumb([
      { href: "#/", label: "West Bengal" },
      { href: href("district/" + ac.districtId), label: d.name },
      { label: ac.name },
    ]);
    const people = D.FARMERS.filter((f) => f.acId === id);
    const rows = people.slice(0, 40).map((f) => {
      const farm = D.byId(D.FARMS, f.farmIds[0]);
      return `<tr><td><a href="${href("farmer/" + f.id)}">${esc(f.name)}</a></td><td><a href="${href("farm/" + (farm ? farm.id : ""))}">${esc(farm ? farm.name : "—")}</a></td><td>${esc(stageLabel(f.stage))}</td><td>${f.progress}%</td></tr>`;
    }).join("");
    return `<section class="ident"><div>
      <p class="mast-k">Assembly constituency</p>
      <h1>${esc(ac.name)}</h1>
      ${teamIdentity(team)}
      <p>${esc(d.name)} · target ${D.META.targetPerAc} farms at full book</p>
    </div></section>
    <dl class="ledger">
      <div><dt>Farmers</dt><dd>${st.farmers}</dd></div>
      <div><dt>Farms</dt><dd>${st.farms}</dd></div>
      <div><dt>Teams</dt><dd>${st.teams}</dd></div>
      <div><dt>Agents</dt><dd>${st.agents}</dd></div>
    </dl>
    ${people.length ? `<div class="table-wrap" style="margin-top:18px"><table class="data"><thead><tr><th>Farmer</th><th>Farm</th><th>Stage</th><th>Progress</th></tr></thead><tbody>${rows}</tbody></table></div>` : ""}`;
  }

  function viewTeams() {
    setNav("teams");
    crumb([{ href: "#/", label: "West Bengal" }, { label: "Teams" }]);
    return `<section class="ident"><div>
      <p class="mast-k">Organisation</p>
      <h1>Teams</h1>
      <p>Fifteen official identities in the current Knowledge Base.</p>
    </div></section>${leagueBoard()}`;
  }

  function viewTeam(id) {
    setNav("teams");
    const team = D.byId(D.TEAMS, id);
    if (!team || team.placeholder) return notFound("Team", id);
    crumb([{ href: "#/", label: "West Bengal" }, { href: href("teams"), label: "Teams" }, { label: team.name }]);
    const st = D.teamStats(id);
    const teamAgents = D.AGENTS.filter((a) => a.teamId === id);
    const agentRows = teamAgents.map((a) => {
      const as = D.agentStats(a.id);
      return `<a class="reg-row" href="${href("agent/" + a.id)}"><b>${esc(a.code)}</b><span>${esc(a.name)}</span><em>${as.farmers ? as.farmers + (as.farmers === 1 ? " farmer" : " farmers") : ""}</em><em>${as.farms ? as.farms + (as.farms === 1 ? " farm" : " farms") : ""}</em></a>`;
    }).join("");
    const acts = D.ACTIVITIES.filter((a) => a.teamId === id);
    const actRows = acts.map((a) => {
      const farm = D.byId(D.FARMS, a.farmId);
      return `<a class="ops-line" href="${href("farm/" + a.farmId)}"><time>${esc(a.date)}</time><div><strong>${esc(a.title)}</strong><p>${esc(farm ? farm.name : "")}${a.note ? " · " + esc(a.note) : ""}</p></div></a>`;
    }).join("");
    const districts = team.districts.map((did) => `<a href="${href("district/" + did)}">${esc(nameOf("district", did))}</a>`).join(" · ");
    const acList = D.ACS.filter((a) => a.teamId === id).map((a) => `<a class="reg-row" href="${href("ac/" + a.id)}"><b>${esc(a.name)}</b><span>${esc(nameOf("district", a.districtId))}</span><em></em><em></em></a>`).join("");
    return `<section class="ident ident-row">${teamMark(team)}<div>
      <p class="mast-k">Team operations</p>
      <h1>${esc(team.name)}</h1>
      <p>${districts}</p>
    </div></section>
    <dl class="ledger">
      <div><dt>Farmers</dt><dd>${st.farmers}</dd></div>
      <div><dt>Farms</dt><dd>${st.farms}</dd></div>
      <div><dt>Agents</dt><dd>${st.agents}</dd></div>
      <div><dt>ACs</dt><dd>${st.acs}</dd></div>
      <div><dt>Districts</dt><dd>${team.districts.length}</dd></div>
    </dl>
    ${teamAgents.length ? `<section>
      <h2 class="sec-title">Agents</h2>
      <div class="register">${agentRows}</div>
    </section>` : ""}
    ${actRows ? `<section>
      <h2 class="sec-title">Recorded activity</h2>
      ${actRows}
    </section>` : ""}
    <section class="register">
      <h2 class="sec-title">Assembly constituencies</h2>
      ${acList}
    </section>`;
  }

  function viewAgents(params) {
    setNav("agents");
    crumb([{ href: "#/", label: "West Bengal" }, { label: "Agents" }]);
    let list = D.AGENTS.slice();
    if (params.team) list = list.filter((a) => a.teamId === params.team);
    const slice = pageSlice(list, params.page);
    const rows = slice.rows.map((a) => {
      const st = D.agentStats(a.id);
      return `<tr><td><a href="${href("agent/" + a.id)}">${esc(a.code)}</a></td><td>${esc(a.name)}</td><td><a href="${href("team/" + a.teamId)}">${teamIdentity(D.byId(D.TEAMS, a.teamId))}</a></td><td>${st.farmers}</td><td>${st.farms}</td></tr>`;
    }).join("");
    return `<section class="ident"><div>
      <p class="mast-k">Field roster</p>
      <h1>Agents</h1>
      <p>${list.length} ${list.length === 1 ? "known agent" : "known agents"}.</p>
    </div></section>
      ${filtersBar(params)}
      <div class="table-wrap"><table class="data"><thead><tr><th>Code</th><th>Name</th><th>Team</th><th>Farmers</th><th>Farms</th></tr></thead><tbody>${rows}</tbody></table></div>
      ${pager("agents", slice, params)}`;
  }

  function viewAgent(id) {
    setNav("agents");
    const agent = D.byId(D.AGENTS, id);
    if (!agent) return notFound("Agent", id);
    const st = D.agentStats(id);
    const team = D.byId(D.TEAMS, agent.teamId);
    crumb([{ href: "#/", label: "West Bengal" }, { href: href("agents"), label: "Agents" }, { label: agent.code }]);
    const mine = D.FARMERS.filter((f) => f.agentId === id);
    const rows = mine.map((f) => {
      const farm = D.byId(D.FARMS, f.farmIds[0]);
      return `<tr>
        <td><a href="${href("farmer/" + f.id)}">${esc(f.name)}</a></td>
        <td><a href="${href("farm/" + (farm ? farm.id : ""))}">${esc(farm ? farm.name : "—")}</a></td>
        <td>${esc(team.name)}</td>
        <td>${esc(stageLabel(f.stage))}</td>
        <td>${f.progress}%</td>
        <td>${esc(farm ? farm.lastVisit : "")}</td>
      </tr>`;
    }).join("");
    return `<section class="ident ident-row">${teamMark(team)}<div>
      <p class="mast-k">Field agent</p>
      <h1>${esc(agent.code)}</h1>
      <p>${esc(agent.name)} · ${esc(nameOf("district", agent.districtId))}</p>
    </div></section>
    <dl class="ledger">
      <div><dt>Assigned farmers</dt><dd>${st.farmers}</dd></div>
      <div><dt>Farms</dt><dd>${st.farms}</dd></div>
      <div><dt>Visits</dt><dd>${st.visits}</dd></div>
    </dl>
    ${mine.length ? `<h2 style="margin:22px 0 12px;font-size:20px">Farmers</h2>
    <div class="table-wrap"><table class="data"><thead><tr><th>Farmer</th><th>Farm</th><th>Team</th><th>Stage</th><th>Progress</th><th>Last visit</th></tr></thead><tbody>${rows}</tbody></table></div>` : ""}`;
  }

  function viewFarmers(params) {
    setNav("farmers");
    crumb([{ href: "#/", label: "West Bengal" }, { label: "Farmers" }]);
    let list = D.filterFarms(params).reduce((acc, farm) => {
      if (!acc.find((f) => f.id === farm.farmerId)) acc.push(D.byId(D.FARMERS, farm.farmerId));
      return acc;
    }, []);
    if (params.q) {
      const q = params.q.toLowerCase();
      list = D.FARMERS.filter((f) => f.name.toLowerCase().includes(q) || f.code.toLowerCase().includes(q) || f.village.toLowerCase().includes(q));
    }
    if (params.team) list = list.filter((f) => f.teamId === params.team);
    if (params.district) list = list.filter((f) => f.districtId === params.district);
    if (params.stage) list = list.filter((f) => f.stage === params.stage);
    const slice = pageSlice(list, params.page);
    const rows = slice.rows.map((f) => `<tr>
      <td><a href="${href("farmer/" + f.id)}">${esc(f.name)}</a></td>
      <td>${esc(f.code)}</td>
      <td>${esc(f.village)}</td>
      <td><a href="${href("district/" + f.districtId)}">${esc(nameOf("district", f.districtId))}</a></td>
      <td><a href="${href("team/" + f.teamId)}">${teamIdentity(D.byId(D.TEAMS, f.teamId))}</a></td>
      <td>${f.farmIds.length}</td>
      <td>${esc(stageLabel(f.stage))}</td>
    </tr>`).join("");
    return `<section class="ident"><div>
      <p class="mast-k">People</p>
      <h1>Farmers</h1>
      <p>${list.length} ${list.length === 1 ? "known farmer" : "known farmers"}. A farmer may hold more than one farm.</p>
    </div></section>
      ${filtersBar(params)}
      ${list.length ? `<div class="table-wrap"><table class="data"><thead><tr><th>Farmer</th><th>ID</th><th>Village</th><th>District</th><th>Team</th><th>Farms</th><th>Stage</th></tr></thead><tbody>${rows}</tbody></table></div>${pager("farmers", slice, params)}` : empty("No farmers match", "Change filters or clear search.")}`;
  }

  function viewFarmer(id) {
    setNav("farmers");
    const f = D.byId(D.FARMERS, id);
    if (!f) return notFound("Farmer", id);
    const team = D.byId(D.TEAMS, f.teamId);
    const agent = D.byId(D.AGENTS, f.agentId);
    crumb([
      { href: "#/", label: "West Bengal" },
      { href: href("district/" + f.districtId), label: nameOf("district", f.districtId) },
      { href: href("ac/" + f.acId), label: nameOf("ac", f.acId) },
      { label: f.name },
    ]);
    const farmRows = f.farmIds.map((fid) => {
      const farm = D.byId(D.FARMS, fid);
      return `<a class="reg-row" href="${href("farm/" + fid)}"><b>${esc(farm.name)}</b><span>${farm.sizeAcres} acres · ${esc(farm.crop)}</span><em>${esc(stageLabel(farm.stage))}</em><em>${farm.progress}%</em></a>`;
    }).join("");
    return `<section class="ident ident-row">${teamMark(team)}<div>
      <p class="mast-k">Farmer</p>
      <h1>${esc(f.name)}</h1>
      <p>${esc(f.code)} · ${esc(f.village)} · no phone, identity number or private contact is shown</p>
    </div></section>
    <dl class="ledger">
      <div><dt>District</dt><dd style="font-size:16px"><a href="${href("district/" + f.districtId)}">${esc(nameOf("district", f.districtId))}</a></dd></div>
      <div><dt>Assembly seat</dt><dd style="font-size:16px"><a href="${href("ac/" + f.acId)}">${esc(nameOf("ac", f.acId))}</a></dd></div>
      <div><dt>Team</dt><dd style="font-size:16px"><a href="${href("team/" + f.teamId)}">${esc(team.name)}</a></dd></div>
      <div><dt>Agent</dt><dd style="font-size:16px"><a href="${href("agent/" + f.agentId)}">${esc(agent.code)}</a></dd></div>
      <div><dt>Stage</dt><dd style="font-size:16px">${esc(stageLabel(f.stage))}</dd></div>
      <div><dt>Farms</dt><dd>${f.farmIds.length}</dd></div>
    </dl>
    <ol class="spine">
      ${f.voice ? `<li><h3>Voice</h3><p>${esc(f.voice)}</p></li>` : ""}
      ${f.goal && f.goal !== "Complete onboarding and first training." ? `<li><h3>Why</h3><p>${esc(f.goal)}</p></li>` : ""}
      ${f.challenge && f.challenge !== "Awaiting verification visit." ? `<li><h3>Constraint</h3><p>${esc(f.challenge)}</p></li>` : ""}
      ${f.achievement ? `<li><h3>Recorded so far</h3><p>${esc(f.achievement)}</p></li>` : ""}
    </ol>
    <section class="register">
      <h2 class="sec-title">Farms</h2>
      ${farmRows}
    </section>`;
  }

  function viewFarms(params) {
    setNav("farms");
    crumb([{ href: "#/", label: "West Bengal" }, { label: "Farms" }]);
    let list = D.filterFarms(params);
    if (params.q) {
      const q = params.q.toLowerCase();
      list = list.filter((f) => f.name.toLowerCase().includes(q) || f.id.includes(q));
    }
    const slice = pageSlice(list, params.page);
    const rows = slice.rows.map((f) => `<tr>
      <td><a href="${href("farm/" + f.id)}">${esc(f.name)}</a></td>
      <td><a href="${href("farmer/" + f.farmerId)}">${esc(nameOf("farmer", f.farmerId))}</a></td>
      <td>${esc(nameOf("district", f.districtId))}</td>
      <td><a href="${href("team/" + f.teamId)}">${teamIdentity(D.byId(D.TEAMS, f.teamId))}</a></td>
      <td>${esc(stageLabel(f.stage))}</td>
      <td>${f.progress}%</td>
    </tr>`).join("");
    return `<section class="ident"><div>
      <p class="mast-k">Holdings</p>
      <h1>Farms</h1>
      <p>${list.length} ${list.length === 1 ? "known farm" : "known farms"}. Distinct from the farmer who holds them.</p>
    </div></section>
      ${filtersBar(params)}
      ${list.length ? `<div class="table-wrap"><table class="data"><thead><tr><th>Farm</th><th>Farmer</th><th>District</th><th>Team</th><th>Stage</th><th>Progress</th></tr></thead><tbody>${rows}</tbody></table></div>${pager("farms", slice, params)}` : empty("No farms match", "Change filters or clear search.")}`;
  }

  function farmTabs(farm, tab) {
    const tabs = farmAvailableTabs(farm);
    return `<nav class="tabs" aria-label="Farm sections">${tabs.map(([id, label]) =>
      `<a href="${href("farm/" + farm.id + "/" + id)}" ${tab === id ? 'aria-current="page"' : ""}>${label}</a>`
    ).join("")}</nav>`;
  }

  function farmHeader(farm) {
    const farmer = D.byId(D.FARMERS, farm.farmerId);
    const team = D.byId(D.TEAMS, farm.teamId);
    const agent = D.byId(D.AGENTS, farm.agentId);
    crumb([
      { href: "#/", label: "West Bengal" },
      { href: href("district/" + farm.districtId), label: nameOf("district", farm.districtId) },
      { href: href("ac/" + farm.acId), label: nameOf("ac", farm.acId) },
      { href: href("farmer/" + farm.farmerId), label: farmer.name },
      { label: farm.name },
    ]);
    const visual = farm.contextualMediaId ? D.mediaById(farm.contextualMediaId) : null;
    return `<section class="dossier${visual ? "" : " dossier-plain"}">
      ${visual ? `<figure class="dossier-visual"><img src="images/gold/integrated-farm.png" alt="Concept model of an integrated farm with a pond, paddy and vegetable beds"><figcaption>AI-created farming concept · not a depiction of this holding.</figcaption></figure>` : ""}
      <div>
        <p class="dossier-k">${farm.id === "maa-ganga" ? "Farm 360 · Flagship record" : "Farm 360"}</p>
        <h1>${esc(farm.name)}</h1>
        <p class="dossier-place">${esc(nameOf("district", farm.districtId))} · ${esc(nameOf("ac", farm.acId))}</p>
        ${teamIdentity(team)}
        <dl class="dossier-meta">
          <div><dt>Who</dt><dd><a href="${href("farmer/" + farmer.id)}">${esc(farmer.name)}</a></dd></div>
          <div><dt>Where</dt><dd>${esc(farm.village)}</dd></div>
          <div><dt>What</dt><dd>${farm.sizeAcres} acres · ${esc(farm.crop)}</dd></div>
          <div><dt>Agent</dt><dd><a href="${href("agent/" + agent.id)}">${esc(agent.code)}</a></dd></div>
        </dl>
      </div>
      <div class="dossier-prog">
        ${team && team.logo ? `<img class="dossier-crest" src="${esc(teamArtwork(team))}" alt="${esc(team.name)} official logo">` : ""}
        <b>${farm.progress}</b>
        <span>${esc(stageLabel(farm.stage))}<br>Path share, not yield</span>
      </div>
    </section>`;
  }

  function viewFarm(id, tab) {
    setNav("farms");
    const farm = D.byId(D.FARMS, id);
    if (!farm) return notFound("Farm", id);
    const farmer = D.byId(D.FARMERS, farm.farmerId);
    const agent = D.byId(D.AGENTS, farm.agentId);
    const allowed = farmAvailableTabs(farm).map((x) => x[0]);
    const current = allowed.includes(tab) ? tab : "overview";
    const head = farmHeader(farm) + farmTabs(farm, current);

    if (current === "journey") {
      const items = (farm.journey || []).filter((j) => j.date).map((j) => `<li data-status="${esc(j.status)}">
        <time>${esc(j.date)}</time><i></i>
        <div><h3>${esc(j.title)}</h3><p>${esc(j.note)} · ${esc(agent.code)}</p></div>
      </li>`).join("");
      return head + `<ol class="journey">${items}</ol>`;
    }

    if (current === "smart") {
      const cards = smartRows(farm).map((row) => `<article>
          <h3>${esc(row.cat.label)}</h3>
          <div class="progress"><span class="bar" aria-hidden="true"><i style="width:${row.pct}%"></i></span><strong>${row.pct}%</strong></div>
          <p>${statusBadge(row.status)}${row.updated ? " · " + esc(row.updated) : ""} · ${esc(agent.code)}</p>
          <p>${esc(row.note)}</p>
        </article>`).join("");
      return head + `<div class="smart">${cards}</div>`;
    }

    if (current === "monitor") {
      const latest = D.ACTIVITIES.find((a) => a.farmId === farm.id);
      return head + `<dl class="ledger">
        <div><dt>Current stage</dt><dd style="font-size:16px">${esc(stageLabel(farm.stage))}</dd></div>
        ${farm.lastVisit ? `<div><dt>Last visit</dt><dd style="font-size:16px">${esc(farm.lastVisit)}</dd></div>` : ""}
        <div><dt>Agent</dt><dd style="font-size:16px">${esc(agent.code)}</dd></div>
        ${latest ? `<div><dt>Latest activity</dt><dd style="font-size:16px">${esc(latest.title)}</dd></div>` : ""}
        <div><dt>Plots</dt><dd>${farm.plots.length}</dd></div>
      </dl>
      ${farm.plots.length ? `<section class="register">
        <h2 class="sec-title">Plots</h2>
        ${farm.plots.map((p) => `<div class="reg-row"><b>${esc(p.name)}</b><span>${esc(p.crop)}</span><em>${esc(p.size)}</em><em></em></div>`).join("")}
      </section>` : ""}`;
    }

    if (current === "media") {
      const ev = farm.evidence || [];
      const gal = ev.map((e, i) => {
        const media = e.type === "video"
          ? `<video controls playsinline preload="metadata" poster="${esc(e.poster || "images/g-krl-mark.jpg")}"><source src="${esc(e.src)}" type="video/mp4"></video>`
          : `<img src="${esc(e.src)}" alt="${esc(e.title)}">`;
        return `<figure class="${i === 0 ? "wide" : ""}">${media}<figcaption>${esc(captionFor(e.type, e.title))} · ${esc(farm.name)} · ${esc(e.date)}</figcaption></figure>`;
      }).join("");
      const ba = farm.beforeAfter
        ? `<h2 style="margin:22px 0 12px;font-size:18px">Field sequence</h2><div class="ba">
            <figure><img src="${esc(farm.beforeAfter.before.src)}" alt=""><figcaption>Irrigation planning</figcaption></figure>
            <figure><img src="${esc(farm.beforeAfter.after.src)}" alt=""><figcaption>Smart farming implementation</figcaption></figure>
          </div>`
        : "";
      return head + `<div class="gallery">${gal}</div>${ba}${mediaConnectCta()}`;
    }

    if (current === "people") {
      const people = supportPeople(farm).map((p) => {
        const link = p.id && p.role === "Farmer" ? href("farmer/" + p.id)
          : p.id && p.role === "Agent" ? href("agent/" + p.id)
          : p.id && p.role === "Team" ? href("team/" + p.id)
          : null;
        return `<article><small>${esc(p.role)}</small><strong>${link ? `<a href="${link}">${esc(p.name)}</a>` : esc(p.name)}</strong></article>`;
      }).join("");
      return head + `<div class="people" style="margin-top:14px">${people}</div>`;
    }

    if (current === "social") {
      const rows = socialChannels(farm).map((c) => `<article>
        <small>${esc(c.network)}</small>
        <strong><a href="${esc(c.url)}" rel="noopener noreferrer" target="_blank">${esc(c.handle)}</a></strong>
      </article>`).join("");
      return head + `<p>${esc((farm.social && farm.social.note) || "")}</p><div class="people" style="margin-top:14px">${rows}</div>`;
    }

    const latest = D.ACTIVITIES.find((a) => a.farmId === farm.id);
    const plan = farm.id === "maa-ganga"
      ? "Integrated crop management with monitored irrigation, soil practices and seasonal field activities."
      : "";
    const why = farmer.challenge && farmer.challenge !== "Awaiting verification visit." ? farmer.challenge : "";
    return head + `<div class="narrative">
      <ol class="spine">
        <li><h3>Who</h3><p><a href="${href("farmer/" + farmer.id)}">${esc(farmer.name)}</a> · ${esc(farmer.code)}</p></li>
        <li><h3>Where</h3><p>${esc([...new Set([nameOf("district", farm.districtId), nameOf("ac", farm.acId), farm.village])].join(" · "))}</p></li>
        ${why ? `<li><h3>Why</h3><p>${esc(why)}</p></li>` : ""}
        <li><h3>What</h3><p>${farm.sizeAcres} acres · ${esc(farm.crop)}</p></li>
        ${plan ? `<li><h3>How</h3><p>${esc(plan)}</p></li>` : ""}
        <li><h3>Progress</h3><p>${farm.progress}% · ${esc(stageLabel(farm.stage))}${farmer.achievement ? ". " + esc(farmer.achievement) : ""}</p></li>
        <li><h3>People</h3><p><a href="${href("agent/" + agent.id)}">${esc(agent.code)}</a> · <a href="${href("team/" + farm.teamId)}">${esc(nameOf("team", farm.teamId))}</a>${allowed.includes("people") ? ` · <a href="${href("farm/" + farm.id + "/people")}">Support network</a>` : ""}</p></li>
      </ol>
      <aside>
        ${latest ? `<h2 class="sec-title">Now on the farm</h2><p class="now">${esc(latest.title)} · ${esc(latest.date)}${latest.note ? ". " + esc(latest.note) : ""}</p>` : ""}
        ${farmer.voice ? `<blockquote class="voice">${esc(farmer.voice)}</blockquote>` : ""}
      </aside>
    </div>`;
  }

  function viewActivity(params) {
    setNav("activity");
    crumb([{ href: "#/", label: "West Bengal" }, { label: "Activity" }]);
    let list = D.ACTIVITIES.slice();
    if (params.team) list = list.filter((a) => a.teamId === params.team);
    if (params.district) list = list.filter((a) => a.districtId === params.district);
    const slice = pageSlice(list, params.page);
    const rows = slice.rows.map((a) => {
      const farm = D.byId(D.FARMS, a.farmId);
      const agent = D.byId(D.AGENTS, a.agentId);
      return `<tr>
        <td>${esc(a.date)}</td>
        <td><a href="${href("farm/" + a.farmId)}">${esc(a.title)}</a></td>
        <td>${esc(farm ? farm.name : "—")}</td>
        <td>${esc(agent ? agent.code : "—")}</td>
        <td>${esc(nameOf("ac", a.acId))}</td>
        <td>${statusBadge(a.status)}</td>
      </tr>`;
    }).join("");
    return `<section class="ident"><div>
      <p class="mast-k">Field book</p>
      <h1>Activity</h1>
      <p>${list.length} ${list.length === 1 ? "recorded activity" : "recorded activities"}.</p>
    </div></section>
      ${filtersBar(params)}
      ${rows ? `<div class="table-wrap"><table class="data"><thead><tr><th>Date</th><th>Activity</th><th>Farm</th><th>Agent</th><th>AC</th><th>Status</th></tr></thead><tbody>${rows}</tbody></table></div>` : ""}
      ${pager("activity", slice, params)}`;
  }

  function viewMedia() {
    setNav("media");
    crumb([{ href: "#/", label: "West Bengal" }, { label: "Media" }]);
    const featured = D.uniqueMedia(D.mediaWhere("featured"));
    const supporting = D.uniqueMedia(D.mediaWhere("supporting"));
    const field = D.uniqueMedia(D.mediaWhere("field"));
    const session = D.mediaWhere("link")[0];
    const feat = featured[0];
    return `<section class="ident"><div>
      <p class="mast-k">Archive</p>
      <h1>Media</h1>
      <p>Editorially curated stills. Each photograph appears once, in its own context.</p>
    </div></section>
      ${feat ? `<section class="media-feature">
        <p class="sec-k">Featured media</p>
        <figure>
          <img src="${esc(feat.src)}" alt="${esc(feat.caption)}">
          <figcaption>${esc(feat.caption)} · ${esc(feat.context)}${feat.date ? " · " + esc(feat.date) : ""}</figcaption>
        </figure>
      </section>` : ""}
      ${supporting.length ? `<section>
        <p class="sec-k" style="margin-top:28px">Supporting media</p>
        <div class="media-support">${supporting.map((m) => `<figure>
          <img src="${esc(m.src)}" alt="${esc(m.caption)}">
          <figcaption>${esc(m.caption)} · ${esc(m.context)}</figcaption>
        </figure>`).join("")}</div>
      </section>` : ""}
      ${field.length ? `<section>
        <p class="sec-k" style="margin-top:28px">Field context</p>
        <p class="media-note">Editorial agriculture photographs. Not verified farm evidence.</p>
        <div class="media-support">${field.map((m) => `<figure>
          <img src="${esc(m.src)}" alt="${esc(m.caption)}">
          <figcaption>${esc(m.caption)} · ${esc(m.context)}</figcaption>
        </figure>`).join("")}</div>
      </section>` : ""}
      ${session ? `<p class="session-link">Programme session film · <a href="${esc(session.src)}" target="_blank" rel="noopener noreferrer">${esc(session.caption)}</a></p>` : ""}
      ${mediaConnectCta()}`;
  }

  function viewReports() {
    setNav("reports");
    crumb([{ href: "#/", label: "West Bengal" }, { label: "Reports" }]);
    const s = D.programmeStats();
    const teamRows = D.TEAMS.map((t) => {
      const st = D.teamStats(t.id);
      return `<tr><td><a href="${href("team/" + t.id)}">${teamIdentity(t)}</a></td><td>${st.farmers}</td><td>${st.farms}</td><td>${st.acsCovered}/${st.acs}</td><td>${st.agents}</td></tr>`;
    }).join("");
    return `<section class="ident"><div>
      <p class="mast-k">Operations</p>
      <h1>Reports</h1>
      <p>Known records and published programme targets. Not a published league table.</p>
    </div></section>
      <dl class="ledger">
        <div><dt>Known farmers</dt><dd>${s.knownFarmers}</dd></div>
        <div><dt>Known farms</dt><dd>${s.knownFarms}</dd></div>
        <div><dt>Known agents</dt><dd>${s.agents}</dd></div>
        <div><dt>Official teams</dt><dd>${s.teams}</dd></div>
        <div><dt>ACs in frame</dt><dd>${s.acs}</dd></div>
        <div><dt>Programme target</dt><dd>${s.targetFarmers.toLocaleString("en-IN")}</dd></div>
      </dl>
      <div class="table-wrap" style="margin-top:18px"><table class="data"><thead><tr><th>Team</th><th>Farmers</th><th>Farms</th><th>ACs</th><th>Agents</th></tr></thead><tbody>${teamRows}</tbody></table></div>`;
  }

  function resolveAcId(id) {
    if (D.byId(D.ACS, id)) return id;
    const hits = D.ACS.filter((a) => a.id.endsWith("-" + id));
    return hits.length === 1 ? hits[0].id : id;
  }

  function resolveFarmTab(tab) {
    if (!tab || tab === "overview") return "overview";
    if (tab === "support") return "people";
    return tab;
  }

  let revealObserver;
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  let motionPaused = reducedMotion.matches;
  try { motionPaused = motionPaused || localStorage.getItem("krl-motion") === "paused"; } catch (_) {}

  function applyMotion() {
    const paused = motionPaused || reducedMotion.matches;
    document.body.classList.toggle("motion-off", paused);
    document.body.classList.toggle("motion-enabled", !paused && "IntersectionObserver" in window);
    app.querySelectorAll("[data-motion]").forEach((button) => {
      button.setAttribute("aria-pressed", String(paused));
      button.textContent = paused ? "Play motion ▷" : "Pause motion Ⅱ";
    });
  }

  function revealSections() {
    if (revealObserver) revealObserver.disconnect();
    applyMotion();
    if (motionPaused || reducedMotion.matches || !("IntersectionObserver" in window)) return;
    revealObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          revealObserver.unobserve(entry.target);
        }
      });
    }, { threshold: .06, rootMargin: "0px 0px 50px 0px" });
    app.querySelectorAll(".home-section,.home-map,.programme-story").forEach((section) => {
      section.classList.add("reveal-card");
      revealObserver.observe(section);
    });
  }
  reducedMotion.addEventListener("change", revealSections);

  function render() {
    applyLang();
    const { parts, params } = parse();
    const root = parts[0] || "";
    document.body.dataset.page = root ? "detail" : "home";
    document.getElementById("primary-nav").classList.remove("is-open");
    document.getElementById("menu-toggle").setAttribute("aria-expanded", "false");
    let html = "";
    if (!root) html = viewCommand();
    else if (root === "geo" || root === "geography") html = viewGeo(params);
    else if (root === "district" && parts[1]) html = viewDistrict(parts[1]);
    else if (root === "ac" && parts[1]) html = viewAc(resolveAcId(parts[1]));
    else if (root === "teams") html = viewTeams();
    else if (root === "team" && parts[1]) html = viewTeam(parts[1]);
    else if (root === "agents") html = viewAgents(params);
    else if (root === "agent" && parts[1]) html = viewAgent(parts[1]);
    else if (root === "farmers") html = viewFarmers(params);
    else if (root === "farmer" && parts[1]) html = viewFarmer(parts[1]);
    else if (root === "farms") html = viewFarms(params);
    else if (root === "farm" && parts[1]) html = viewFarm(parts[1], resolveFarmTab(parts[2]));
    else if (root === "activity") html = viewActivity(params);
    else if (root === "media") html = viewMedia();
    else if (root === "reports") html = viewReports();
    else html = notFound("Page", parts.join("/"));
    app.innerHTML = html;
    revealSections();
    const h = app.querySelector("h1");
    if (h) h.setAttribute("tabindex", "-1");
    if (h && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) h.focus({ preventScroll: true });
  }

  let searchReturnFocus = null;
  function openSearch() {
    searchReturnFocus = document.activeElement;
    overlay.hidden = false;
    document.body.style.overflow = "hidden";
    searchInput.value = "";
    searchResults.innerHTML = `<li class="empty">Try “Maa Ganga”, “Terai” or a district name.</li>`;
    searchInput.focus();
  }
  function closeSearch() {
    if (overlay.hidden) return;
    overlay.hidden = true;
    document.body.style.overflow = "";
    if (searchReturnFocus && searchReturnFocus.isConnected) searchReturnFocus.focus({ preventScroll: true });
  }
  function runSearch() {
    const hits = D.search(searchInput.value);
    if (!hits.length) {
      searchResults.innerHTML = `<li class="empty">No matches</li>`;
      return;
    }
    const route = { district: "district", ac: "ac", team: "team", agent: "agent", farmer: "farmer", farm: "farm" };
    searchResults.innerHTML = hits.map((h) => `<li><a href="${href(route[h.type] + "/" + h.id)}"><small>${esc(h.type)}</small>${esc(h.label)}</a></li>`).join("");
  }

  document.querySelectorAll(".lang button").forEach((b) => {
    b.addEventListener("click", () => {
      try { localStorage.setItem("krl-lang", b.dataset.lang); } catch (_) {}
      render();
    });
  });
  document.getElementById("open-search").addEventListener("click", openSearch);
  document.getElementById("close-search").addEventListener("click", closeSearch);
  const menuToggle = document.getElementById("menu-toggle");
  document.querySelector(".skip").addEventListener("click", (e) => {
    e.preventDefault();
    app.focus({ preventScroll: true });
    app.scrollIntoView({ behavior: "instant" });
  });
  menuToggle.addEventListener("click", () => {
    const open = menuToggle.getAttribute("aria-expanded") !== "true";
    menuToggle.setAttribute("aria-expanded", String(open));
    document.getElementById("primary-nav").classList.toggle("is-open", open);
  });
  document.getElementById("primary-nav").addEventListener("click", (e) => {
    if (e.target.closest("a")) {
      menuToggle.setAttribute("aria-expanded", "false");
      document.getElementById("primary-nav").classList.remove("is-open");
    }
  });
  overlay.addEventListener("click", (e) => { if (e.target === overlay) closeSearch(); });
  searchInput.addEventListener("input", runSearch);
  searchResults.addEventListener("click", (e) => {
    if (e.target.closest("a")) closeSearch();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "/" && !e.ctrlKey && !e.metaKey && !e.altKey && !document.activeElement.matches("input,select,textarea,[contenteditable=true]")) {
      e.preventDefault();
      openSearch();
    }
    if (e.key === "Escape") {
      closeSearch();
      if (menuToggle.getAttribute("aria-expanded") === "true") {
        menuToggle.setAttribute("aria-expanded", "false");
        document.getElementById("primary-nav").classList.remove("is-open");
        menuToggle.focus();
      }
    }
    if (e.key === "Tab" && !overlay.hidden) {
      const targets = Array.from(overlay.querySelectorAll("button,input,a[href]"));
      const first = targets[0], last = targets[targets.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  });
  app.addEventListener("change", (e) => {
    const form = e.target.closest("[data-filter]");
    if (!form) return;
    const data = Object.fromEntries(new FormData(form).entries());
    Object.keys(data).forEach((k) => { if (!data[k]) delete data[k]; });
    const { parts } = parse();
    location.hash = href(parts.join("/") || "", data);
  });
  app.addEventListener("submit", (e) => {
    if (e.target.matches("[data-filter]")) {
      e.preventDefault();
      const data = Object.fromEntries(new FormData(e.target).entries());
      Object.keys(data).forEach((k) => { if (!data[k]) delete data[k]; });
      const { parts } = parse();
      location.hash = href(parts.join("/") || "", data);
    }
  });
  app.addEventListener("click", (e) => {
    const regionButton = e.target.closest("[data-region]");
    if (regionButton && TEAM_REGIONS[regionButton.dataset.region]) {
      const region = regionButton.dataset.region;
      app.querySelectorAll("[data-region]").forEach((button) => button.setAttribute("aria-pressed", String(button === regionButton)));
      document.getElementById("home-teams").innerHTML = homeTeamCards(region);
      document.getElementById("team-region-status").textContent = `${TEAM_REGIONS[region].length} teams shown: ${regionButton.textContent}.`;
    }
    const motionButton = e.target.closest("[data-motion]");
    if (motionButton) {
      motionPaused = !motionPaused;
      try { localStorage.setItem("krl-motion", motionPaused ? "paused" : "playing"); } catch (_) {}
      applyMotion();
    }
    const scrollLink = e.target.closest("[data-scroll]");
    if (scrollLink) {
      e.preventDefault();
      const target = document.getElementById(scrollLink.dataset.scroll);
      if (target) target.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth" });
    }
    const go = e.target.closest("[data-go]");
    if (go) location.hash = go.getAttribute("data-go");
  });
  window.addEventListener("hashchange", () => {
    closeSearch();
    render();
    window.scrollTo({ top: 0, behavior: "instant" });
  });
  applyLang();
  render();
})();
