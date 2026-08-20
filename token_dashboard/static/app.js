const state = { days: 30, dashboard: null };

const formatTokens = (value) => {
  if (value === null || value === undefined) return "Unknown";
  const number = Number(value);
  const units = [[1e12, "T"], [1e9, "B"], [1e6, "M"], [1e3, "K"]];
  for (const [size, suffix] of units) {
    if (Math.abs(number) >= size) return `${(number / size).toFixed(number >= size * 100 ? 0 : 1)}${suffix}`;
  }
  return number.toLocaleString();
};

const formatCost = (summary) => {
  const coverage = summary.pricing_coverage;
  if (coverage === null || coverage === 0) return { text: "Cost unknown", known: false };
  const cost = Number(summary.estimated_cost).toLocaleString(undefined, { style: "currency", currency: "USD", minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const priced = coverage > .9999 ? "<100% priced" : `${(coverage * 100).toFixed(coverage > .99 ? 2 : 0)}% priced`;
  return { text: coverage < 1 ? `~${cost} · ${priced}` : `~${cost} estimated`, known: true };
};

const formatDate = (value, compact = false) => {
  if (!value) return "Unknown";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unknown";
  return new Intl.DateTimeFormat(undefined, compact
    ? { month: "short", day: "numeric" }
    : { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }).format(date);
};

const make = (tag, className, text) => {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
};

async function api(path, options) {
  const response = await fetch(path, options);
  if (!response.ok) throw new Error(`${response.status}`);
  return response.json();
}

function renderWindows(windows) {
  for (const [key, summary] of Object.entries(windows)) {
    const card = document.querySelector(`[data-window="${key}"]`);
    card.querySelector(".metric-tokens").textContent = formatTokens(summary.total_tokens);
    const cost = formatCost(summary);
    card.querySelector(".metric-cost").textContent = cost.text;
    const coverage = card.querySelector(".coverage");
    coverage.textContent = summary.sessions ? `${summary.sessions} sessions` : "No usage";
  }
}

function renderTape(summary) {
  const tape = document.getElementById("token-tape");
  tape.replaceChildren();
  const input = summary.input_tokens || 0;
  const cached = Math.min(summary.cached_input_tokens || 0, input);
  const output = summary.output_tokens || 0;
  const total = Math.max(input + output, 1);
  const parts = [
    ["uncached", Math.max(input - cached, 0), "Uncached input"],
    ["cached", cached, "Cached input"],
    ["output", output, "Output"]
  ];
  for (const [className, value, label] of parts) {
    const segment = make("span", className);
    segment.style.width = `${value / total * 100}%`;
    segment.title = `${label}: ${value.toLocaleString()}`;
    tape.append(segment);
  }

  const dimensions = [
    ["Input", "input_tokens", "", "includes cache"],
    ["Cached input", "cached_input_tokens", "cached", "input subset"],
    ["Cache writes", "cache_write_input_tokens", "write", "input subset"],
    ["Output", "output_tokens", "output", "includes reasoning"],
    ["Reasoning", "reasoning_output_tokens", "reasoning", "output subset"]
  ];
  const grid = document.getElementById("dimension-grid");
  grid.replaceChildren();
  for (const [label, key, swatchClass, note] of dimensions) {
    const item = make("div", "dimension");
    const heading = make("div", "dimension-label");
    heading.append(make("span", `swatch ${swatchClass}`), document.createTextNode(label));
    const coverage = summary.dimension_coverage[key];
    item.append(heading, make("strong", "", coverage === 0 ? "Unknown" : formatTokens(summary[key])));
    item.append(make("small", "", `${coverage === null ? "No records" : `${Math.round(coverage * 100)}% native`} · ${note}`));
    grid.append(item);
  }
}

function renderTrend(data) {
  const chart = document.getElementById("trend-chart");
  chart.replaceChildren();
  if (!data.length) {
    chart.append(make("p", "unknown", "No usage in this range"));
    return;
  }
  const width = 760, height = 250, left = 46, bottom = 30, top = 12;
  const plotWidth = width - left - 8, plotHeight = height - bottom - top;
  const max = Math.max(...data.map(item => item.total_tokens), 1);
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
  svg.setAttribute("aria-hidden", "true");
  for (let i = 0; i <= 3; i += 1) {
    const y = top + plotHeight * i / 3;
    const line = document.createElementNS(svg.namespaceURI, "line");
    line.setAttribute("class", "grid-line");
    line.setAttribute("x1", left); line.setAttribute("x2", width); line.setAttribute("y1", y); line.setAttribute("y2", y);
    svg.append(line);
    const label = document.createElementNS(svg.namespaceURI, "text");
    label.setAttribute("x", 0); label.setAttribute("y", y + 4);
    label.textContent = formatTokens(max * (1 - i / 3));
    svg.append(label);
  }
  const slot = plotWidth / data.length;
  data.forEach((item, index) => {
    const barHeight = Math.max(item.total_tokens / max * plotHeight, 1);
    const rect = document.createElementNS(svg.namespaceURI, "rect");
    rect.setAttribute("class", "bar");
    rect.setAttribute("x", left + index * slot + slot * .15);
    rect.setAttribute("y", top + plotHeight - barHeight);
    rect.setAttribute("width", Math.max(slot * .7, 1));
    rect.setAttribute("height", barHeight);
    const title = document.createElementNS(svg.namespaceURI, "title");
    title.textContent = `${item.date}: ${item.total_tokens.toLocaleString()} tokens`;
    rect.append(title); svg.append(rect);
    if (data.length <= 14 || index % Math.ceil(data.length / 8) === 0 || index === data.length - 1) {
      const label = document.createElementNS(svg.namespaceURI, "text");
      label.setAttribute("x", left + index * slot + slot / 2);
      label.setAttribute("y", height - 8); label.setAttribute("text-anchor", "middle");
      label.textContent = formatDate(`${item.date}T00:00:00`, true);
      svg.append(label);
    }
  });
  chart.append(svg);
}

function renderRanking(targetId, items) {
  const target = document.getElementById(targetId);
  target.replaceChildren();
  const max = Math.max(...items.map(item => item.total_tokens), 1);
  for (const item of items) {
    const row = make("div", "rank-row");
    row.append(make("span", "rank-label", item.label), make("span", "rank-value", formatTokens(item.total_tokens)));
    const track = make("div", "rank-track");
    const fill = make("span", "rank-fill"); fill.style.width = `${item.total_tokens / max * 100}%`;
    track.append(fill); row.append(track); target.append(row);
  }
  if (!items.length) target.append(make("p", "unknown", "No usage in this range"));
}

function renderProjects(items) {
  const target = document.getElementById("project-ranking"); target.replaceChildren();
  for (const item of items.slice(0, 8)) {
    const node = make("div", "project-item");
    node.append(make("div", "project-name", item.label));
    node.append(make("span", "project-tokens", formatTokens(item.total_tokens)));
    node.append(make("span", "project-meta", `${item.sessions} sessions · ${formatCost(item).text}`));
    target.append(node);
  }
  if (!items.length) target.append(make("p", "project-item unknown", "No projects in this range"));
}

function appendCell(row, text, className = "") { row.append(make("td", className, text)); }

function renderSessions(items) {
  const body = document.getElementById("session-table"); body.replaceChildren();
  for (const item of items) {
    const row = document.createElement("tr"); row.tabIndex = 0; row.dataset.id = item.id;
    appendCell(row, item.short_id, "numeric"); appendCell(row, item.project); appendCell(row, item.model);
    appendCell(row, item.turns.toLocaleString(), "numeric"); appendCell(row, formatTokens(item.total_tokens), "numeric");
    appendCell(row, formatCost(item).text, item.pricing_coverage ? "numeric" : "unknown"); appendCell(row, formatDate(item.ended_at));
    row.addEventListener("click", () => openSession(item.id));
    row.addEventListener("keydown", event => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); openSession(item.id); } });
    body.append(row);
  }
  if (!items.length) { const row = document.createElement("tr"); const cell = make("td", "unknown", "No sessions in this range"); cell.colSpan = 7; row.append(cell); body.append(row); }
}

function renderProvenance(data) {
  const list = document.getElementById("provenance"); list.replaceChildren();
  const labels = { agent: "Adapter", source: "Source", precision: "Precision", privacy: "Privacy", cost: "Cost" };
  for (const [key, value] of Object.entries(data)) list.append(make("dt", "", labels[key] || key), make("dd", "", value));
}

async function openSession(id) {
  const detail = await api(`/api/sessions/${encodeURIComponent(id)}`);
  document.getElementById("dialog-title").textContent = `${detail.project} · ${detail.short_id}`;
  document.getElementById("dialog-meta").textContent = `${detail.agent} · ${detail.model} · ${detail.precision}${detail.parse_errors ? ` · ${detail.parse_errors} parse errors` : ""}`;
  const summary = document.getElementById("session-summary"); summary.replaceChildren();
  const stats = [["Tokens", formatTokens(detail.summary.total_tokens)], ["Input", formatTokens(detail.summary.input_tokens)], ["Output", formatTokens(detail.summary.output_tokens)], ["Estimated cost", formatCost(detail.summary).text]];
  for (const [label, value] of stats) { const node = make("div", "dialog-stat"); node.append(make("span", "", label), make("strong", "", value)); summary.append(node); }
  const body = document.getElementById("turn-table"); body.replaceChildren();
  for (const turn of detail.turns) {
    const row = document.createElement("tr");
    appendCell(row, `#${turn.sequence}`, "numeric"); appendCell(row, formatDate(turn.started_at));
    appendCell(row, formatTokens(turn.input_tokens), turn.input_tokens === null ? "unknown" : "numeric");
    appendCell(row, formatTokens(turn.cached_input_tokens), turn.cached_input_tokens === null ? "unknown" : "numeric");
    appendCell(row, formatTokens(turn.output_tokens), turn.output_tokens === null ? "unknown" : "numeric");
    appendCell(row, formatTokens(turn.reasoning_output_tokens), turn.reasoning_output_tokens === null ? "unknown" : "numeric");
    appendCell(row, formatTokens(turn.total_tokens), "numeric");
    appendCell(row, turn.estimated_cost === null ? "Unknown" : `~$${turn.estimated_cost.toFixed(4)}`, turn.estimated_cost === null ? "unknown" : "numeric");
    body.append(row);
  }
  document.getElementById("session-dialog").showModal();
}

function render(data) {
  state.dashboard = data;
  renderWindows(data.windows); renderTape(data.range); renderTrend(data.trend);
  renderRanking("model-ranking", data.rankings.models); renderProjects(data.rankings.projects);
  renderSessions(data.rankings.sessions); renderProvenance(data.provenance);
  document.getElementById("trend-total").textContent = `${formatTokens(data.range.total_tokens)} tokens · ${data.range.sessions} sessions`;
  document.getElementById("empty-state").hidden = data.windows["30d"].turns !== 0;
}

async function refresh() {
  const [dashboard, status] = await Promise.all([api(`/api/dashboard?days=${state.days}`), api("/api/status")]);
  render(dashboard);
  const last = status.last_scan ? formatDate(status.last_scan) : "Not scanned";
  document.getElementById("scan-status").textContent = `${status.sources.toLocaleString()} files · ${status.sessions.toLocaleString()} sessions · ${last}`;
  document.getElementById("status-dot").className = `status-dot ${status.failed_sources ? "error" : "ready"}`;
}

async function scanNow() {
  const button = document.getElementById("scan-button"); button.disabled = true; button.textContent = "Scanning...";
  document.getElementById("scan-status").textContent = "Reading changed Codex logs";
  try { const report = await api("/api/scan", { method: "POST" }); await refresh(); document.getElementById("scan-status").textContent = `${report.imported} updated · ${report.skipped} unchanged · ${report.duration_seconds}s`; }
  catch { document.getElementById("scan-status").textContent = "Scan failed; source or price table is unavailable"; document.getElementById("status-dot").className = "status-dot error"; }
  finally { button.disabled = false; button.textContent = "Scan now"; }
}

document.getElementById("scan-button").addEventListener("click", scanNow);
document.querySelector("#empty-state button").addEventListener("click", scanNow);
document.getElementById("dialog-close").addEventListener("click", () => document.getElementById("session-dialog").close());
document.querySelectorAll("[data-days]").forEach(button => button.addEventListener("click", async () => {
  state.days = Number(button.dataset.days);
  document.querySelectorAll("[data-days]").forEach(item => { const active = item === button; item.classList.toggle("active", active); item.setAttribute("aria-pressed", String(active)); });
  render(await api(`/api/dashboard?days=${state.days}`));
}));

refresh().catch(() => { document.getElementById("scan-status").textContent = "Local index unavailable"; document.getElementById("status-dot").className = "status-dot error"; });
