const { chromium } = require('playwright'); const fs = require('fs');
(async () => {
  const b = await chromium.launch(process.env.HTTPS_PROXY ? { proxy: { server: process.env.HTTPS_PROXY }, args: ['--ignore-certificate-errors'] } : {});
  const p = await b.newPage(); await p.addInitScript(() => { window.__RENDER__ = true; window.__SCALE__ = 0.2; });
  p.on('pageerror', e => console.log('PAGEERROR', e.message));
  await p.goto('file://' + __dirname + '/film-local.html'); await p.evaluate(() => FILM.ready);
  const data = await p.evaluate(() => ({ cues: FILM.cues, scenes: FILM.scenes, duration: FILM.duration }));
  fs.writeFileSync('cues.json', JSON.stringify(data, null, 0)); await b.close();
  const types = {}; data.cues.forEach(c => types[c.type] = (types[c.type] || 0) + 1); console.log(data.cues.length, 'cues', JSON.stringify(types));
})();
