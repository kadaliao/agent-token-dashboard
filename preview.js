const { chromium } = require('playwright');
const fs = require('fs');
(async () => {
  const times = process.argv[2].split(',').map(Number);
  const out = process.argv[3] || 'sheet.png', cols = +(process.argv[4] || 6), scale = +(process.argv[5] || 0.3);
  const b = await chromium.launch(process.env.HTTPS_PROXY ? { proxy: { server: process.env.HTTPS_PROXY }, args: ['--ignore-certificate-errors'] } : {});
  const p = await b.newPage({ viewport: { width: 600, height: 900 } });
  p.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') console.log('console:', m.text()); });
  p.on('pageerror', e => console.log('PAGEERROR', e.message));
  await p.addInitScript(() => { window.__RENDER__ = true; });
  await p.goto('file://' + __dirname + '/film-local.html');
  await p.evaluate(() => FILM.ready);
  const url = await p.evaluate(([t, c, s]) => FILM.sheet(t, c, s), [times, cols, scale]);
  fs.writeFileSync(out, Buffer.from(url.split(',')[1], 'base64'));
  await b.close(); console.log('wrote', out);
})();
