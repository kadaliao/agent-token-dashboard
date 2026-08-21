"use strict";

const initialParams = new URLSearchParams(window.location.search);
const state = {
  ...DashboardState.parse(window.location.search),
  grainExplicit: initialParams.has("grain"),
  dashboard: null,
};
const SVG_NS = "http://www.w3.org/2000/svg";

const formatTokens = (value) => {
  if (value === null || value === undefined) return "Unknown";
  const number = Number(value);
  const units = [[1e12, "T"], [1e9, "B"], [1e6, "M"], [1e3, "K"]];
  for (const [size, suffix] of units) {
    if (Math.abs(number) >= size) return `${(number / size).toFixed(number >= size * 100 ? 0 : 1)}${suffix}`;
  }
  return number.toLocaleString();
};

const formatPercent = value => `${(Number(value || 0) * 100).toFixed(value >= .1 ? 1 : 2)}%`;

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

const formatPeriod = (value, grain) => {
  if (grain === "week") return `Week of ${formatDate(`${value}T00:00:00`, true)}`;
  return formatDate(`${value}T00:00:00`, true);
};

const make = (tag, className, text) => {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
};

const svgNode = (tag, attributes = {}) => {
  const node = document.createElementNS(SVG_NS, tag);
  for (const [key, value] of Object.entries(attributes)) node.setAttribute(key, String(value));
  return node;
};

async function api(path, options) {
  const response = await fetch(path, options);
  if (!response.ok) throw new Error(`${response.status}`);
  return response.json();
}

function composition() {
  return state.dashboard.tool_composition;
}

function terms() {
  return state.dimension === "commands"
    ? { singular: "command", plural: "commands", native: "native command invocations" }
    : { singular: "agent tool", plural: "agent tools", native: "native agent tool calls" };
}

function stableLongTail(items, total) {
  const grouped = DashboardState.stableLongTail(items, total);
  if (state.dimension === "commands") {
    grouped.visible.forEach(item => {
      if (item.aggregate) item.label = item.label.replace("Other tools", "Other commands");
    });
  }
  return grouped;
}

function familyByKey(key) {
  return composition().families.find(family => family.key === key);
}

function toolByName(name) {
  for (const family of composition().families) {
    const tool = family.tools.find(item => item.label === name);
    if (tool) return { family, tool };
  }
  return null;
}

function writeUrl() {
  window.history.replaceState(null, "", DashboardState.serialize(state));
}

function syncControls() {
  document.querySelectorAll("[data-dimension]").forEach(button => {
    const active = button.dataset.dimension === state.dimension;
    button.classList.toggle("active", active);
    button.setAttribute("aria-pressed", String(active));
  });
  document.querySelectorAll("[data-days]").forEach(button => {
    const active = Number(button.dataset.days) === state.days;
    button.classList.toggle("active", active);
    button.setAttribute("aria-pressed", String(active));
  });
  document.querySelectorAll("[data-view]").forEach(button => {
    const active = button.dataset.view === state.view;
    button.classList.toggle("active", active);
    button.setAttribute("aria-selected", String(active));
    button.tabIndex = active ? 0 : -1;
  });
  document.querySelectorAll("[data-metric]").forEach(button => {
    const active = button.dataset.metric === state.metric;
    button.classList.toggle("active", active);
    button.setAttribute("aria-pressed", String(active));
  });
  document.querySelectorAll("[data-grain]").forEach(button => {
    const active = button.dataset.grain === state.grain;
    button.classList.toggle("active", active);
    button.setAttribute("aria-pressed", String(active));
  });
  const timeControls = state.view === "composition";
  document.querySelector(".metric-switch").hidden = !timeControls;
  document.querySelector(".grain-switch").hidden = !timeControls;

  const bar = document.getElementById("filter-bar");
  bar.hidden = !state.family;
  if (state.family) {
    const family = familyByKey(state.family);
    const familyButton = document.getElementById("family-filter");
    familyButton.textContent = family?.label || "All families";
    familyButton.style.setProperty("--filter-color", family?.color || "#CBD2CC");
    const separator = document.getElementById("filter-separator");
    const toolButton = document.getElementById("tool-filter");
    separator.hidden = !state.tool;
    toolButton.hidden = !state.tool;
    toolButton.textContent = state.tool || "";
  }
}

function setFamily(key) {
  state.family = key;
  state.tool = null;
  writeUrl();
  renderExplorer();
}

function setTool(family, tool) {
  state.family = family;
  state.tool = tool;
  writeUrl();
  renderExplorer();
}

function stepBack() {
  if (state.tool) state.tool = null;
  else state.family = null;
  writeUrl();
  renderExplorer();
}

function selectionRows() {
  if (state.tool) {
    const match = toolByName(state.tool);
    return match ? [{ ...match.tool, color: match.family.color, family: match.family.key }] : [];
  }
  if (state.family) {
    const family = familyByKey(state.family);
    if (!family) return [];
    return stableLongTail(family.tools, composition().total_calls).visible.map((tool, index) => ({
      ...tool,
      color: tool.aggregate ? "#8F9891" : family.color,
      opacity: tool.aggregate ? 1 : Math.max(.38, 1 - index * .07),
      family: family.key,
    }));
  }
  return composition().families.filter(family => family.calls > 0).map(family => ({
    ...family, color: family.color, family: family.key
  }));
}

function markLabel(row, period, calls, total, visualTotal = total) {
  const share = total ? calls / total : 0;
  const context = visualTotal !== total ? `; ${formatPercent(visualTotal ? calls / visualTotal : 0)} within selection` : "";
  return `${row.label}, ${formatPeriod(period.label, composition().grain)}: ${calls.toLocaleString()} ${terms().native}, ${formatPercent(share)} of ${total.toLocaleString()} period calls${context}; ${terms().singular} tokens unknown`;
}

function activateRow(row) {
  if (row.aggregate) {
    document.getElementById("chart-focus").textContent = `${row.label}: ${row.calls.toLocaleString()} calls. Complete ${terms().plural} remain available in the exact ranking.`;
  } else if (state.family || row.family !== row.key) {
    setTool(row.family, row.label);
  } else {
    setFamily(row.key);
  }
}

function renderComposition() {
  const root = document.getElementById("chart-root");
  root.replaceChildren();
  const data = composition();
  const rows = selectionRows();
  const periods = data.totals_by_period;
  const plotWidth = Math.max(680, periods.length * (data.grain === "week" ? 66 : 28));
  const width = plotWidth + 84;
  const height = 430;
  const left = 54;
  const top = 28;
  const plotHeight = 270;
  const miniTop = 340;
  const miniHeight = 42;
  const periodWidth = plotWidth / Math.max(periods.length, 1);
  const svg = svgNode("svg", {
    class: "composition-chart", viewBox: `0 0 ${width} ${height}`, width,
    height, role: "group", "aria-label": `${terms().singular} composition by ${data.grain}`
  });
  root.append(svg);

  const selectedPeriodTotals = periods.map((_, index) =>
    rows.reduce((sum, row) => sum + (row.periods[index]?.calls || 0), 0)
  );
  const callsMax = Math.max(...selectedPeriodTotals, 1);
  const absoluteMax = Math.max(...periods.map(period => period.calls), 1);
  [0, .25, .5, .75, 1].forEach(tick => {
    const y = top + plotHeight * (1 - tick);
    svg.append(svgNode("line", { x1: left, y1: y, x2: left + plotWidth, y2: y, class: "chart-gridline" }));
    const label = svgNode("text", { x: left - 8, y: y + 4, class: "chart-axis", "text-anchor": "end" });
    label.textContent = state.metric === "share" ? `${tick * 100}%` : formatTokens(callsMax * tick);
    svg.append(label);
  });

  const marks = [];
  periods.forEach((period, periodIndex) => {
    let cumulative = 0;
    const visualTotal = selectedPeriodTotals[periodIndex];
    rows.forEach((row, rowIndex) => {
      const calls = row.periods[periodIndex]?.calls || 0;
      const normalized = state.metric === "share"
        ? (visualTotal ? calls / visualTotal : 0)
        : calls / callsMax;
      const y = top + plotHeight * (1 - cumulative - normalized);
      const rect = svgNode("rect", {
        x: left + periodIndex * periodWidth + 1,
        y,
        width: Math.max(periodWidth - 2, 1),
        height: Math.max(plotHeight * normalized, 0),
        fill: row.color,
        "fill-opacity": row.opacity || 1,
        class: `chart-mark composition-mark${state.tool === row.label || state.family === row.key ? " selected" : ""}`,
        "data-mark-index": marks.length,
        "aria-label": markLabel(row, period, calls, period.calls, visualTotal),
      });
      if (calls) {
        rect.setAttribute("role", "button");
        rect.setAttribute("tabindex", "0");
        const reveal = () => { document.getElementById("chart-focus").textContent = rect.getAttribute("aria-label"); };
        rect.addEventListener("focus", reveal);
        rect.addEventListener("mouseenter", reveal);
        rect.addEventListener("click", () => activateRow(row));
        rect.addEventListener("keydown", event => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            activateRow(row);
          } else if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)) {
            event.preventDefault();
            const delta = event.key === "ArrowLeft" || event.key === "ArrowUp" ? -1 : 1;
            marks[(marks.indexOf(rect) + delta + marks.length) % marks.length]?.focus();
          } else if (event.key === "Escape") {
            event.preventDefault();
            stepBack();
          }
        });
        marks.push(rect);
      }
      svg.append(rect);
      cumulative += normalized;
    });
    const totalHeight = period.calls / absoluteMax * miniHeight;
    svg.append(svgNode("rect", {
      x: left + periodIndex * periodWidth + Math.max(2, periodWidth * .18),
      y: miniTop + miniHeight - totalHeight,
      width: Math.max(periodWidth * .64, 3),
      height: totalHeight,
      class: "volume-bar"
    }));
    const label = svgNode("text", {
      x: left + (periodIndex + .5) * periodWidth, y: miniTop + miniHeight + 20,
      class: "chart-axis", "text-anchor": "middle"
    });
    label.textContent = periods.length > 14 && periodIndex % 5 ? "" : formatDate(`${period.label}T00:00:00`, true);
    svg.append(label);
  });
  const miniLabel = svgNode("text", { x: left - 8, y: miniTop + 12, class: "chart-axis", "text-anchor": "end" });
  miniLabel.textContent = "Volume";
  svg.append(miniLabel);
  renderLegend(root, rows);
}

function renderLegend(root, rows) {
  const legend = make("div", "chart-legend");
  for (const row of rows) {
    const item = make("button", "legend-item");
    item.type = "button";
    item.style.setProperty("--legend-color", row.color);
    item.append(make("span", "legend-swatch"), make("span", "", row.label));
    item.addEventListener("click", () => activateRow(row));
    legend.append(item);
  }
  root.append(legend);
}

function layoutSlice(items, x, y, width, height, vertical) {
  const total = items.reduce((sum, item) => sum + item.calls, 0) || 1;
  let cursor = vertical ? x : y;
  return items.map(item => {
    const fraction = item.calls / total;
    const rect = vertical
      ? { x: cursor, y, width: width * fraction, height }
      : { x, y: cursor, width, height: height * fraction };
    cursor += vertical ? rect.width : rect.height;
    return { item, ...rect };
  });
}

function renderTreemap() {
  const root = document.getElementById("chart-root");
  root.replaceChildren();
  const mobile = window.matchMedia("(max-width: 719px)").matches;
  const width = 900;
  const height = 470;
  const svg = svgNode("svg", {
    class: "treemap-chart", viewBox: `0 0 ${width} ${height}`,
    role: "group", "aria-label": `Nested treemap of ${terms().native}`
  });
  root.append(svg);
  let topItems;
  if (state.family) {
    const family = familyByKey(state.family);
    topItems = family ? stableLongTail(family.tools, composition().total_calls).visible
      .map(tool => ({ ...tool, family: family.key, color: tool.aggregate ? "#8F9891" : family.color })) : [];
  } else {
    topItems = composition().families.filter(item => item.calls > 0).map(family => ({ ...family, family: family.key }));
  }
  const topRects = layoutSlice(topItems, 0, 0, width, height, width >= height);
  topRects.forEach((entry, index) => {
    const row = entry.item;
    const inset = state.family ? 2 : 4;
    const group = svgNode("g");
    const outer = svgNode("rect", {
      x: entry.x + inset, y: entry.y + inset,
      width: Math.max(entry.width - inset * 2, 0), height: Math.max(entry.height - inset * 2, 0),
      fill: row.color || "#8F9891", "fill-opacity": state.family ? Math.max(.35, 1 - index * .05) : .25,
      class: `chart-mark${state.tool === row.label || state.family === row.key ? " selected" : ""}`,
      role: "button", tabindex: 0,
      "aria-label": `${row.label}: ${row.calls.toLocaleString()} ${terms().native}, ${formatPercent(row.calls / composition().total_calls)} of selected range; ${terms().singular} tokens unknown`
    });
    const activate = () => row.aggregate
      ? document.getElementById("chart-focus").textContent = `${row.label}: ${row.calls.toLocaleString()} calls. Complete ${terms().plural} are listed alongside the chart.`
      : state.family ? setTool(state.family, row.label) : setFamily(row.key);
    bindMark(outer, activate);
    group.append(outer);
    const canNest = !mobile && !state.family && row.tools?.length && entry.width > 120 && entry.height > 90;
    if (canNest) {
      const childRows = stableLongTail(row.tools, composition().total_calls).visible;
      const children = layoutSlice(childRows, entry.x + 8, entry.y + 31, Math.max(entry.width - 16, 0), Math.max(entry.height - 39, 0), entry.height > entry.width);
      children.forEach((child, childIndex) => {
        const childRect = svgNode("rect", {
          x: child.x + 1, y: child.y + 1, width: Math.max(child.width - 2, 0), height: Math.max(child.height - 2, 0),
          fill: row.color, "fill-opacity": Math.max(.35, .92 - childIndex * .06),
          class: "chart-mark", role: "button", tabindex: 0,
          "aria-label": `${child.item.label}, ${row.label}: ${child.item.calls.toLocaleString()} ${terms().native}, ${formatPercent(child.item.share)} of selected range; ${terms().singular} tokens unknown`
        });
        bindMark(childRect, () => child.item.aggregate
          ? document.getElementById("chart-focus").textContent = `${child.item.label}: ${child.item.calls.toLocaleString()} calls. Complete ${terms().plural} are listed alongside the chart.`
          : setTool(row.key, child.item.label));
        group.append(childRect);
        if (child.width > 92 && child.height > 34) {
          const label = svgNode("text", { x: child.x + 7, y: child.y + 18, class: "tile-label" });
          label.textContent = child.item.label;
          group.append(label);
        }
      });
    }
    if (entry.width > 78 && entry.height > 32) {
      const label = svgNode("text", { x: entry.x + 11, y: entry.y + 22, class: "tile-label strong" });
      label.textContent = row.label;
      group.append(label);
    }
    svg.append(group);
  });
}

function bindMark(node, activate) {
  const reveal = () => { document.getElementById("chart-focus").textContent = node.getAttribute("aria-label"); };
  node.addEventListener("focus", reveal);
  node.addEventListener("mouseenter", reveal);
  node.addEventListener("click", activate);
  node.addEventListener("keydown", event => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      activate();
    } else if (event.key === "Escape") {
      event.preventDefault();
      stepBack();
    }
  });
}

function polar(cx, cy, radius, angle) {
  return { x: cx + radius * Math.cos(angle), y: cy + radius * Math.sin(angle) };
}

function arcPath(cx, cy, inner, outer, start, end) {
  const p1 = polar(cx, cy, outer, start);
  const p2 = polar(cx, cy, outer, end);
  const p3 = polar(cx, cy, inner, end);
  const p4 = polar(cx, cy, inner, start);
  const large = end - start > Math.PI ? 1 : 0;
  return `M ${p1.x} ${p1.y} A ${outer} ${outer} 0 ${large} 1 ${p2.x} ${p2.y} L ${p3.x} ${p3.y} A ${inner} ${inner} 0 ${large} 0 ${p4.x} ${p4.y} Z`;
}

function renderSunburst() {
  const root = document.getElementById("chart-root");
  root.replaceChildren();
  const mobile = window.matchMedia("(max-width: 719px)").matches;
  const width = 720;
  const height = 470;
  const cx = 310;
  const cy = 235;
  const svg = svgNode("svg", {
    class: "sunburst-chart", viewBox: `0 0 ${width} ${height}`,
    role: "group", "aria-label": `${terms().singular} family hierarchy by native call share`
  });
  root.append(svg);
  let ringItems;
  if (state.family) {
    const family = familyByKey(state.family);
    ringItems = stableLongTail(family?.tools || [], composition().total_calls).visible
      .map(tool => ({ ...tool, family: state.family, color: tool.aggregate ? "#8F9891" : family.color }));
  } else {
    ringItems = composition().families.filter(item => item.calls > 0).map(family => ({ ...family, family: family.key }));
  }
  const total = ringItems.reduce((sum, item) => sum + item.calls, 0) || 1;
  let angle = -Math.PI / 2;
  ringItems.forEach((row, index) => {
    const end = angle + row.calls / total * Math.PI * 2;
    const path = svgNode("path", {
      d: arcPath(cx, cy, 76, mobile ? 164 : 142, angle + .006, end - .006),
      fill: row.color || "#8F9891", "fill-opacity": state.family ? Math.max(.38, 1 - index * .045) : .9,
      class: `chart-mark${state.tool === row.label || state.family === row.key ? " selected" : ""}`,
      role: "button", tabindex: 0,
      "aria-label": `${row.label}: ${row.calls.toLocaleString()} ${terms().native}, ${formatPercent(row.calls / composition().total_calls)} of selected range; ${terms().singular} tokens unknown`
    });
    bindMark(path, () => row.aggregate
      ? document.getElementById("chart-focus").textContent = `${row.label}: ${row.calls.toLocaleString()} calls. Complete ${terms().plural} are listed in the tree.`
      : state.family ? setTool(state.family, row.label) : setFamily(row.key));
    svg.append(path);
    if (!mobile && !state.family && row.tools?.length) {
      let childAngle = angle;
      stableLongTail(row.tools, composition().total_calls).visible.forEach((tool, childIndex) => {
        const childEnd = childAngle + (end - angle) * (tool.calls / row.calls);
        if (childEnd - childAngle > .007) {
          const child = svgNode("path", {
            d: arcPath(cx, cy, 147, 208, childAngle + .004, childEnd - .004),
            fill: row.color, "fill-opacity": Math.max(.3, .86 - childIndex * .045),
            class: `chart-mark${state.tool === tool.label ? " selected" : ""}`,
            role: "button", tabindex: 0,
            "aria-label": `${tool.label}, ${row.label}: ${tool.calls.toLocaleString()} ${terms().native}, ${formatPercent(tool.share)} of selected range; ${terms().singular} tokens unknown`
          });
          bindMark(child, () => tool.aggregate
            ? document.getElementById("chart-focus").textContent = `${tool.label}: ${tool.calls.toLocaleString()} calls. Complete ${terms().plural} are listed in the tree.`
            : setTool(row.key, tool.label));
          svg.append(child);
        }
        childAngle = childEnd;
      });
    }
    angle = end;
  });
  const center = svgNode("g", {
    class: `sunburst-center${state.family ? " interactive" : ""}`,
    role: state.family ? "button" : "group", tabindex: state.family ? 0 : -1,
    "aria-label": state.family ? "Return to all tool families" : "All tool families"
  });
  center.append(svgNode("circle", { cx, cy, r: 67 }));
  const title = svgNode("text", { x: cx, y: cy - 4, "text-anchor": "middle", class: "center-title" });
  title.textContent = state.tool || familyByKey(state.family)?.label || "All tools";
  const value = svgNode("text", { x: cx, y: cy + 20, "text-anchor": "middle", class: "center-value" });
  const current = state.tool ? toolByName(state.tool)?.tool.calls : state.family ? familyByKey(state.family)?.calls : composition().total_calls;
  value.textContent = `${formatTokens(current || 0)} calls`;
  center.append(title, value);
  if (state.family) bindMark(center, stepBack);
  svg.append(center);
}

function renderActivity() {
  const root = document.getElementById("chart-root");
  root.replaceChildren();
  const source = state.dashboard.heatmap;
  const family = state.family ? familyByKey(state.family) : null;
  const allowed = family ? new Set(family.tools.map(tool => tool.label)) : null;
  const tools = source.tools.filter(tool => (!allowed || allowed.has(tool.label)) && (!state.tool || tool.label === state.tool));
  const target = make("div", "heatmap");
  target.setAttribute("role", "grid");
  target.style.gridTemplateColumns = `minmax(190px, 240px) repeat(${source.dates.length}, 28px)`;
  target.setAttribute("aria-rowcount", String(tools.length + 1));
  target.setAttribute("aria-colcount", String(source.dates.length + 1));
  const corner = make("div", "heat-corner", `Calls / share / ${terms().singular} tokens`);
  corner.setAttribute("role", "columnheader");
  target.append(corner);
  source.dates.forEach((date, index) => {
    const header = make("div", "heat-date", heatDateLabel(date, index, source.dates.length));
    header.setAttribute("role", "columnheader");
    header.setAttribute("aria-label", date);
    target.append(header);
  });
  tools.forEach(tool => {
    const match = toolByName(tool.label);
    const color = match?.family.color || "#8F9891";
    const rowHeader = make("button", "tool-row-header");
    rowHeader.type = "button";
    rowHeader.setAttribute("role", "rowheader");
    rowHeader.style.setProperty("--tool-color", color);
    const identity = make("span", "tool-identity");
    identity.append(make("span", "tool-swatch"), make("strong", "", tool.label));
    rowHeader.append(identity, make("span", "tool-share", `${tool.calls.toLocaleString()} calls · ${formatPercent(tool.share)} · token unknown`));
    rowHeader.addEventListener("click", () => setTool(match?.family.key || "unmapped", tool.label));
    target.append(rowHeader);
    tool.cells.forEach(cell => {
      const node = make("div", "heat-cell");
      node.setAttribute("role", "gridcell");
      node.tabIndex = 0;
      const label = `${tool.label}, ${cell.date}: ${cell.calls.toLocaleString()} ${terms().native}; ${terms().singular} token attribution unknown`;
      node.setAttribute("aria-label", label);
      node.title = label;
      node.addEventListener("focus", () => { document.getElementById("chart-focus").textContent = label; });
      if (cell.calls === 0) node.classList.add("zero-cell");
      else {
        const intensity = source.max_calls ? Math.log1p(cell.calls) / Math.log1p(source.max_calls) : 0;
        node.style.backgroundColor = hexToRgba(color, .14 + intensity * .86);
      }
      target.append(node);
    });
  });
  root.append(target);
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

function rankingItems() {
  if (state.family) return familyByKey(state.family)?.tools || [];
  return composition().families.filter(family => family.calls > 0);
}

function renderToolRanking() {
  const target = document.getElementById("tool-ranking");
  target.replaceChildren();
  if (state.view === "hierarchy") target.setAttribute("role", "tree");
  else target.removeAttribute("role");
  const items = rankingItems();
  const max = Math.max(...items.map(item => item.calls), 1);
  document.getElementById("tool-ranking-title").textContent = state.family ? `Exact ${terms().plural}` : `${terms().singular[0].toUpperCase()}${terms().singular.slice(1)} families`;
  items.forEach(item => {
    const isTool = Boolean(state.family);
    const row = make("button", `rank-row tool-rank${state.tool === item.label || state.family === item.key ? " selected" : ""}`);
    row.type = "button";
    if (state.view === "hierarchy") {
      row.setAttribute("role", "treeitem");
      row.setAttribute("aria-level", isTool ? "2" : "1");
    }
    row.setAttribute("aria-pressed", String(isTool ? state.tool === item.label : state.family === item.key));
    const color = isTool ? familyByKey(state.family).color : item.color;
    row.style.setProperty("--rank-color", color);
    row.append(make("span", "rank-label", item.label));
    row.append(make("span", "rank-value", `${item.calls.toLocaleString()} · ${formatPercent(item.calls / composition().total_calls)}`));
    row.append(make("span", "rank-token", "token unknown"));
    const track = make("span", "rank-track");
    const fill = make("span", "rank-fill");
    fill.style.width = `${item.calls / max * 100}%`;
    track.append(fill);
    row.append(track);
    row.addEventListener("click", () => isTool ? setTool(state.family, item.label) : setFamily(item.key));
    target.append(row);
  });
  if (!items.length) target.append(make("p", "unknown", `No ${terms().native} in this range`));
}

function renderCompositionTable() {
  const table = document.getElementById("composition-table");
  table.replaceChildren();
  const data = composition();
  let rows;
  if (state.tool) {
    const match = toolByName(state.tool);
    rows = match ? [match.tool] : [];
  } else if (state.family) {
    rows = [familyByKey(state.family)].filter(Boolean);
  } else {
    rows = data.families.filter(family => family.calls > 0);
  }
  const head = document.createElement("thead");
  const headRow = document.createElement("tr");
  headRow.append(make("th", "", state.tool ? terms().singular : "Family"));
  data.totals_by_period.forEach(period => headRow.append(make("th", "", formatPeriod(period.label, data.grain))));
  headRow.append(make("th", "", "Range total"));
  head.append(headRow);
  const body = document.createElement("tbody");
  rows.forEach(row => {
    const tr = document.createElement("tr");
    tr.append(make("th", "row-heading", row.label));
    row.periods.forEach((period, index) => {
      const total = data.totals_by_period[index].calls;
      tr.append(make("td", "numeric", `${period.calls.toLocaleString()} / ${formatPercent(total ? period.calls / total : 0)}`));
    });
    tr.append(make("td", "numeric", row.calls.toLocaleString()));
    body.append(tr);
  });
  table.append(head, body);
}

function renderExplorer() {
  if (!state.dashboard) return;
  syncControls();
  document.getElementById("chart-focus").textContent = "Focus a chart mark for exact calls and share.";
  const titles = {
    composition: [`${terms().singular[0].toUpperCase()}${terms().singular.slice(1)} composition`, "100% structure over time, with aligned absolute call volume"],
    snapshot: ["Usage snapshot", `Nested area shows family and exact ${terms().singular} share for the selected range`],
    hierarchy: [`${terms().singular[0].toUpperCase()}${terms().singular.slice(1)} hierarchy`, `Family to exact ${terms().singular} structure; use the center or Escape to return`],
    activity: [`${terms().singular[0].toUpperCase()}${terms().singular.slice(1)} activity`, `Exact ${terms().singular} x local day on a shared absolute log scale`],
  };
  document.getElementById("explorer-kicker").textContent = `${terms().native} · ${terms().singular} tokens unknown`;
  document.getElementById("explorer-title").textContent = titles[state.view][0];
  document.getElementById("explorer-total").textContent =
    `${composition().total_calls.toLocaleString()} ${terms().native} · ${state.dashboard.heatmap.tools.length} exact ${terms().plural} · ${titles[state.view][1]}`;
  const coverage = composition().coverage;
  document.getElementById("command-coverage").textContent = coverage
    ? `${coverage.parsed_invocations.toLocaleString()} parsed invocations · ${coverage.unknown_invocations.toLocaleString()} unknown · ${coverage.shell_calls.toLocaleString()} shell calls`
    : "Each event is one deduplicated native agent tool call.";
  document.getElementById("taxonomy-version").textContent = composition().taxonomy_version;
  document.getElementById("chart-root").className = `chart-root ${state.view}`;
  if (state.view === "composition") renderComposition();
  else if (state.view === "snapshot") renderTreemap();
  else if (state.view === "hierarchy") renderSunburst();
  else renderActivity();
  renderToolRanking();
  renderCompositionTable();
}

function renderWindows(windows) {
  for (const [key, summary] of Object.entries(windows)) {
    const card = document.querySelector(`[data-window="${key}"]`);
    card.querySelector(".metric-tokens").textContent = formatTokens(summary.total_tokens);
    card.querySelector(".metric-cost").textContent = formatCost(summary).text;
    card.querySelector(".coverage").textContent = summary.sessions ? `${summary.sessions} sessions` : "No usage";
  }
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
  Object.assign(state, DashboardState.normalize(state, data.tool_composition));
  writeUrl();
  renderExplorer();
  renderWindows(data.windows);
  renderTape(data.range);
  renderRanking("model-ranking", data.rankings.models);
  renderRanking("project-ranking", data.rankings.projects);
  renderSessions(data.rankings.sessions);
  renderProvenance(data.provenance);
  document.getElementById("empty-state").hidden = data.windows["30d"].turns !== 0 || data.heatmap.tools.length !== 0;
}

async function refresh() {
  const query = new URLSearchParams({ days: String(state.days), grain: state.grain, dimension: state.dimension });
  const [dashboard, status] = await Promise.all([
    api(`/api/dashboard?${query}`), api("/api/status")
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
document.getElementById("clear-filter").addEventListener("click", () => {
  state.family = null;
  state.tool = null;
  writeUrl();
  renderExplorer();
});
document.getElementById("family-filter").addEventListener("click", () => {
  state.tool = null;
  writeUrl();
  renderExplorer();
});
document.getElementById("tool-filter").addEventListener("click", stepBack);
document.querySelectorAll("[data-dimension]").forEach(button => button.addEventListener("click", async () => {
  if (button.dataset.dimension === state.dimension) return;
  state.dimension = button.dataset.dimension;
  state.family = null;
  state.tool = null;
  writeUrl();
  await refresh();
}));
document.querySelectorAll("[data-view]").forEach(button => button.addEventListener("click", () => {
  state.view = button.dataset.view;
  writeUrl();
  renderExplorer();
}));
document.querySelectorAll("[data-view]").forEach(button => button.addEventListener("keydown", event => {
  if (!["ArrowLeft", "ArrowRight"].includes(event.key)) return;
  event.preventDefault();
  const buttons = [...document.querySelectorAll("[data-view]")];
  const delta = event.key === "ArrowLeft" ? -1 : 1;
  const next = buttons[(buttons.indexOf(button) + delta + buttons.length) % buttons.length];
  next.click();
  next.focus();
}));
document.querySelectorAll("[data-metric]").forEach(button => button.addEventListener("click", () => {
  state.metric = button.dataset.metric;
  writeUrl();
  renderExplorer();
}));
document.querySelectorAll("[data-grain]").forEach(button => button.addEventListener("click", async () => {
  state.grain = button.dataset.grain;
  state.grainExplicit = true;
  writeUrl();
  await refresh();
}));
document.querySelectorAll("[data-days]").forEach(button => button.addEventListener("click", async () => {
  state.days = Number(button.dataset.days);
  if (!state.grainExplicit) state.grain = state.days === 90 ? "week" : "day";
  state.family = null;
  state.tool = null;
  writeUrl();
  await refresh();
}));
document.addEventListener("keydown", event => {
  const dialogOpen = document.getElementById("session-dialog").open;
  if (DashboardState.shouldHandleEscape({
    key: event.key,
    hasSelection: state.family,
    dialogOpen,
    defaultPrevented: event.defaultPrevented,
  })) {
    event.preventDefault();
    stepBack();
  }
});
window.addEventListener("popstate", async () => {
  const next = DashboardState.parse(window.location.search);
  const reload = next.days !== state.days || next.grain !== state.grain || next.dimension !== state.dimension;
  Object.assign(state, next);
  state.grainExplicit = new URLSearchParams(window.location.search).has("grain");
  if (reload) await refresh();
  else {
    Object.assign(state, DashboardState.normalize(state, composition()));
    renderExplorer();
  }
});

refresh().catch(() => {
  document.getElementById("scan-status").textContent = "Local index unavailable";
  document.getElementById("status-dot").className = "status-dot error";
});
