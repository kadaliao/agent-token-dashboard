(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.DashboardState = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const VALID_DAYS = new Set([7, 30, 90]);
  const VALID_VIEWS = new Set(["composition", "snapshot", "hierarchy", "activity"]);
  const VALID_METRICS = new Set(["share", "calls"]);
  const VALID_GRAINS = new Set(["day", "week"]);

  function cleanValue(value) {
    return typeof value === "string" && value.length <= 160 ? value : null;
  }

  function parse(search) {
    const params = new URLSearchParams(search || "");
    const requestedDays = Number(params.get("days"));
    const days = VALID_DAYS.has(requestedDays) ? requestedDays : 30;
    const requestedView = params.get("view");
    const requestedMetric = params.get("metric");
    const requestedGrain = params.get("grain");
    return {
      days,
      view: VALID_VIEWS.has(requestedView) ? requestedView : "composition",
      metric: VALID_METRICS.has(requestedMetric) ? requestedMetric : "share",
      grain: VALID_GRAINS.has(requestedGrain) ? requestedGrain : (days === 90 ? "week" : "day"),
      family: cleanValue(params.get("family")),
      tool: cleanValue(params.get("tool")),
    };
  }

  function normalize(input, composition) {
    const base = parse(serialize(input));
    const families = new Map((composition?.families || []).map(family => [family.key, family]));
    let family = families.has(base.family) ? base.family : null;
    let tool = null;
    if (base.tool) {
      const matches = [];
      for (const candidate of families.values()) {
        if (candidate.tools.some(item => item.label === base.tool)) matches.push(candidate.key);
      }
      if (matches.length === 1 && (!family || family === matches[0])) {
        family = matches[0];
        tool = base.tool;
      }
    }
    return { ...base, family, tool };
  }

  function serialize(value) {
    const params = new URLSearchParams();
    params.set("days", String(VALID_DAYS.has(Number(value.days)) ? Number(value.days) : 30));
    params.set("view", VALID_VIEWS.has(value.view) ? value.view : "composition");
    params.set("metric", VALID_METRICS.has(value.metric) ? value.metric : "share");
    params.set("grain", VALID_GRAINS.has(value.grain) ? value.grain : (Number(value.days) === 90 ? "week" : "day"));
    if (cleanValue(value.family)) params.set("family", value.family);
    if (cleanValue(value.tool)) params.set("tool", value.tool);
    return `?${params.toString()}`;
  }

  function stableLongTail(tools, rangeTotal, threshold = 0.01) {
    const sorted = [...(tools || [])].sort((a, b) => b.calls - a.calls || a.label.localeCompare(b.label));
    const visible = [];
    const hidden = [];
    for (const tool of sorted) {
      if (rangeTotal && tool.calls / rangeTotal < threshold) hidden.push(tool);
      else visible.push(tool);
    }
    if (hidden.length) {
      visible.push({
        key: "other-tools",
        label: `Other tools (${hidden.length})`,
        calls: hidden.reduce((sum, tool) => sum + tool.calls, 0),
        share: rangeTotal ? hidden.reduce((sum, tool) => sum + tool.calls, 0) / rangeTotal : 0,
        periods: (tools[0]?.periods || []).map((period, index) => ({
          period: period.period,
          calls: hidden.reduce((sum, tool) => sum + (tool.periods[index]?.calls || 0), 0),
        })),
        tools: hidden,
        aggregate: true,
      });
    }
    return { visible, hidden };
  }

  function shouldHandleEscape({ key, hasSelection, dialogOpen, defaultPrevented }) {
    return key === "Escape" && Boolean(hasSelection) && !dialogOpen && !defaultPrevented;
  }

  return { parse, normalize, serialize, stableLongTail, shouldHandleEscape };
});
