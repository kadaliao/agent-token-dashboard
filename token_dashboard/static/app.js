const state = { days: 30, dashboard: null };
const TOOL_COLORS = { codex: "#F59E42", claude: "#E56B5D" };

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
  const cost = Number(summary.estimated_cost).toLocaleString(undefined, {
    style: "currency", currency: "USD", minimumFractionDigits: 2, maximumFractionDigits: 2
  });
  if (coverage >= .9999) return { text: `~${cost} estimated`, known: true };
  return { text: `~${cost} · ${(coverage * 100).toFixed(coverage > .99 ? 2 : 0)}% priced`, known: true };
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
    card.querySelector(".metric-cost").textContent = formatCost(summary).text;
    card.querySelector(".coverage").textContent = summary.sessions
      ? `${summary.sessions} sessions`
      : "No usage";
  }
}

function hexToRgba(hex, alpha) {
  const value = Number.parseInt(hex.slice(1), 16);
  return `rgba(${value >> 16}, ${(value >> 8) & 255}, ${value & 255}, ${alpha})`;
}

function heatDateLabel(date, index, count) {
  const parsed = new Date(`${date}T00:00:00`);
  const interval = count <= 7 ? 1 : count <= 30 ? 5 : 14;
  if (index === 0 || index === count - 1 || parsed.getDate() === 1 || index % interval === 0) {
    return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }).format(parsed);
  }
  return "";
}

function renderHeatmap(data) {
  const target = document.getElementById("heatmap");
  target.replaceChildren();
  const { dates, max_tokens: maxTokens, tools } = data;
  target.style.gridTemplateColumns = `minmax(190px, 240px) repeat(${dates.length}, 28px)`;
  target.setAttribute("aria-rowcount", String(tools.length + 1));
  target.setAttribute("aria-colcount", String(dates.length + 1));

  const corner = make("div", "heat-corner", "Tool total / share");
  corner.setAttribute("role", "columnheader");
  target.append(corner);
  dates.forEach((date, index) => {
    const header = make("div", "heat-date", heatDateLabel(date, index, dates.length));
    header.setAttribute("role", "columnheader");
    header.setAttribute("aria-label", date);
    header.title = date;
    target.append(header);
  });

  for (const tool of tools) {
    const color = TOOL_COLORS[tool.key] || "#59B8A8";
    const rowHeader = make("div", "tool-row-header");
    rowHeader.setAttribute("role", "rowheader");
    rowHeader.style.setProperty("--tool-color", color);
    const identity = make("span", "tool-identity");
    identity.append(make("span", "tool-swatch"), make("strong", "", tool.label));
    const share = tool.availability === "unavailable"
      ? "Unavailable"
      : `${formatTokens(tool.total_tokens)} tokens · ${(tool.share * 100).toFixed(tool.share >= .1 ? 1 : 2)}%`;
    rowHeader.append(identity, make("span", "tool-share", share));
    target.append(rowHeader);

    for (const cell of tool.cells) {
      const node = make("div", "heat-cell");
      node.setAttribute("role", "gridcell");
      node.tabIndex = 0;
      const exact = cell.tokens === null ? "usage unavailable" : `${cell.tokens.toLocaleString()} tokens`;
      const label = `${tool.label}, ${cell.date}: ${exact}`;
      node.setAttribute("aria-label", label);
      node.title = label;
      if (cell.status === "unknown") {
        node.classList.add("unknown-cell");
      } else if (cell.tokens === 0) {
        node.classList.add("zero-cell");
      } else {
        const intensity = maxTokens ? Math.log1p(cell.tokens) / Math.log1p(maxTokens) : 0;
        node.style.backgroundColor = hexToRgba(color, .14 + intensity * .86);
      }
      if (cell.status === "partial") node.classList.add("partial-cell");
      target.append(node);
    }
  }
  document.getElementById("legend-max").textContent = formatTokens(maxTokens);
  document.getElementById("heatmap-total").textContent = `${formatTokens(state.dashboard.range.total_tokens)} tokens · ${tools.length} tools · ${dates.length} local days`;
}

function renderTape(summary) {
  const tape = document.getElementById("token-tape");
  tape.replaceChildren();
  const input = summary.input_tokens || 0;
  const cached = Math.min(summary.cached_input_tokens || 0, input);
  const writes = Math.min(summary.cache_write_input_tokens || 0, Math.max(input - cached, 0));
  const output = summary.output_tokens || 0;
  const total = Math.max(input + output, 1);
  const parts = [
    ["uncached", Math.max(input - cached - writes, 0), "Uncached input"],
    ["cached", cached, "Cached input"],
    ["write", writes, "Cache writes"],
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
    ["Output", "output_tokens", "output", "includes reasoning where known"],
    ["Reasoning", "reasoning_output_tokens", "reasoning", "unknown for Claude Code"]
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

function renderRanking(targetId, items) {
  const target = document.getElementById(targetId);
  target.replaceChildren();
  const max = Math.max(...items.map(item => item.total_tokens), 1);
  for (const item of items) {
    const row = make("div", "rank-row");
    row.append(make("span", "rank-label", item.label), make("span", "rank-value", formatTokens(item.total_tokens)));
    const track = make("div", "rank-track");
    const fill = make("span", "rank-fill");
    fill.style.width = `${item.total_tokens / max * 100}%`;
    track.append(fill);
    row.append(track);
    target.append(row);
  }
  if (!items.length) target.append(make("p", "unknown", "No usage in this range"));
}

function appendCell(row, text, className = "") { row.append(make("td", className, text)); }

function renderSessions(items) {
  const body = document.getElementById("session-table");
  body.replaceChildren();
  for (const item of items) {
    const row = document.createElement("tr");
    row.tabIndex = 0;
    row.dataset.id = item.id;
    appendCell(row, item.short_id, "numeric");
    appendCell(row, item.tool);
    appendCell(row, item.project);
    appendCell(row, item.model);
    appendCell(row, item.turns.toLocaleString(), "numeric");
    appendCell(row, formatTokens(item.total_tokens), "numeric");
    appendCell(row, formatCost(item).text, item.pricing_coverage ? "numeric" : "unknown");
    appendCell(row, formatDate(item.ended_at));
    row.addEventListener("click", () => openSession(item.id));
    row.addEventListener("keydown", event => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        openSession(item.id);
      }
    });
    body.append(row);
  }
  if (!items.length) {
    const row = document.createElement("tr");
    const cell = make("td", "unknown", "No sessions in this range");
    cell.colSpan = 8;
    row.append(cell);
    body.append(row);
  }
}

function renderProvenance(data) {
  const list = document.getElementById("provenance");
  list.replaceChildren();
  const labels = { adapters: "Adapters", source: "Sources", precision: "Precision", privacy: "Privacy", dimensions: "Dimensions", cost: "Cost" };
  for (const [key, value] of Object.entries(data)) {
    list.append(make("dt", "", labels[key] || key), make("dd", "", value));
  }
}

async function openSession(id) {
  const detail = await api(`/api/sessions/${encodeURIComponent(id)}`);
  document.getElementById("dialog-title").textContent = `${detail.project} · ${detail.short_id}`;
  document.getElementById("dialog-meta").textContent = `${detail.tool} · ${detail.model} · ${detail.precision}${detail.parse_errors ? ` · ${detail.parse_errors} parse errors` : ""}`;
  const summary = document.getElementById("session-summary");
  summary.replaceChildren();
  const stats = [
    ["Tokens", formatTokens(detail.summary.total_tokens)],
    ["Input", formatTokens(detail.summary.input_tokens)],
    ["Output", formatTokens(detail.summary.output_tokens)],
    ["Estimated cost", formatCost(detail.summary).text]
  ];
  for (const [label, value] of stats) {
    const node = make("div", "dialog-stat");
    node.append(make("span", "", label), make("strong", "", value));
    summary.append(node);
  }
  const body = document.getElementById("turn-table");
  body.replaceChildren();
  for (const turn of detail.turns) {
    const row = document.createElement("tr");
    appendCell(row, `#${turn.sequence}`, "numeric");
    appendCell(row, formatDate(turn.started_at));
    appendCell(row, formatTokens(turn.input_tokens), turn.input_tokens === null ? "unknown" : "numeric");
    appendCell(row, formatTokens(turn.cached_input_tokens), turn.cached_input_tokens === null ? "unknown" : "numeric");
    appendCell(row, formatTokens(turn.cache_write_input_tokens), turn.cache_write_input_tokens === null ? "unknown" : "numeric");
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
  renderHeatmap(data.heatmap);
  renderWindows(data.windows);
  renderTape(data.range);
  renderRanking("model-ranking", data.rankings.models);
  renderRanking("project-ranking", data.rankings.projects);
  renderSessions(data.rankings.sessions);
  renderProvenance(data.provenance);
  document.getElementById("empty-state").hidden = data.windows["30d"].turns !== 0 || data.heatmap.tools.length !== 0;
}

async function refresh() {
  const [dashboard, status] = await Promise.all([
    api(`/api/dashboard?days=${state.days}`), api("/api/status")
  ]);
  render(dashboard);
  const last = status.last_scan ? formatDate(status.last_scan) : "Not scanned";
  document.getElementById("scan-status").textContent = `${status.sources.toLocaleString()} files · ${status.sessions.toLocaleString()} sessions · ${last}`;
  document.getElementById("status-dot").className = `status-dot ${status.failed_sources ? "error" : "ready"}`;
}

async function scanNow() {
  const button = document.getElementById("scan-button");
  button.disabled = true;
  button.textContent = "Scanning...";
  document.getElementById("scan-status").textContent = "Reading changed native usage metadata";
  try {
    const report = await api("/api/scan", { method: "POST" });
    await refresh();
    document.getElementById("scan-status").textContent = `${report.imported} updated · ${report.skipped} unchanged · ${report.duration_seconds}s`;
  } catch {
    document.getElementById("scan-status").textContent = "Scan failed; a source or price table is unavailable";
    document.getElementById("status-dot").className = "status-dot error";
  } finally {
    button.disabled = false;
    button.textContent = "Scan now";
  }
}

document.getElementById("scan-button").addEventListener("click", scanNow);
document.querySelector("#empty-state button").addEventListener("click", scanNow);
document.getElementById("dialog-close").addEventListener("click", () => document.getElementById("session-dialog").close());
document.querySelectorAll("[data-days]").forEach(button => button.addEventListener("click", async () => {
  state.days = Number(button.dataset.days);
  document.querySelectorAll("[data-days]").forEach(item => {
    const active = item === button;
    item.classList.toggle("active", active);
    item.setAttribute("aria-pressed", String(active));
  });
  render(await api(`/api/dashboard?days=${state.days}`));
}));

refresh().catch(() => {
  document.getElementById("scan-status").textContent = "Local index unavailable";
  document.getElementById("status-dot").className = "status-dot error";
});
