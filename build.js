const fs = require('fs');
const files = ['engine.js', 'scenes1.js', 'scenes2.js', 'scenes3.js'].filter(f => fs.existsSync('src/' + f));
const film = files.map(f => fs.readFileSync('src/' + f, 'utf8')).join('\n');
const player = fs.readFileSync('src/player.js', 'utf8');
let html = fs.readFileSync('src/shell.html', 'utf8');
html = html.replace('/*FILM*/', () => film).replace('/*PLAYER*/', () => player);
fs.writeFileSync('film.html', html);
// a standalone wrapper for local browser preview
fs.writeFileSync('film-local.html', '<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><style>body{margin:0}</style></head><body>' + html + '</body></html>');
console.log('built', files.join(', '), (html.length / 1024).toFixed(0) + 'KB');
