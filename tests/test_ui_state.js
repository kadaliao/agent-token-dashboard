"use strict";

const assert = require("node:assert/strict");
const state = require("../token_dashboard/static/state.js");

const fixture = {
  families: [
    {
      key: "execution",
      tools: [
        { label: "exec", calls: 970, periods: [{ period: "p", calls: 970 }] },
        { label: "tiny", calls: 5, periods: [{ period: "p", calls: 5 }] },
      ],
    },
    { key: "files", tools: [{ label: "Read", calls: 25, periods: [{ period: "p", calls: 25 }] }] },
  ],
};

assert.deepEqual(
  state.parse("?days=oops&view=%3Cscript%3E&metric=nope&grain=bad&family=x&tool=y"),
  { days: 30, view: "composition", metric: "share", grain: "day", family: "x", tool: "y" }
);
assert.equal(state.parse("?days=90").grain, "week");
assert.deepEqual(
  state.normalize(
    { days: 30, view: "snapshot", metric: "calls", grain: "day", family: "wrong", tool: "Read" },
    fixture
  ),
  { days: 30, view: "snapshot", metric: "calls", grain: "day", family: "files", tool: "Read" }
);
assert.equal(state.normalize(
  { days: 30, view: "composition", metric: "share", grain: "day", family: "execution", tool: "Read" },
  fixture
).tool, null);

const grouped = state.stableLongTail(fixture.families[0].tools, 1000);
assert.deepEqual(grouped.visible.map(item => item.label), ["exec", "Other tools (1)"]);
assert.equal(grouped.visible.reduce((sum, item) => sum + item.calls, 0), 975);
assert.equal(grouped.hidden[0].label, "tiny");

const serialized = state.serialize({
  days: 90, view: "hierarchy", metric: "calls", grain: "week",
  family: "files & more", tool: "<Read>",
});
assert.equal(serialized.includes("<"), false);
assert.equal(state.parse(serialized).tool, "<Read>");
console.log("ui state tests passed");
