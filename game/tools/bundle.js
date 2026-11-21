'use strict';
// Собирает игру в один файл dist/ShatteredDawn.html (открывается двойным щелчком, без папок)
const fs = require('fs'), path = require('path');
const ROOT = path.resolve(__dirname, '..');
let html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
html = html.replace(/<script src="([^"]+)"><\/script>/g, (_, src) => '<script>\n' + fs.readFileSync(path.join(ROOT, src), 'utf8').replace(/<\/script/gi, '<\\/script') + '\n</script>');
fs.mkdirSync(path.join(ROOT, 'dist'), { recursive: true });
fs.writeFileSync(path.join(ROOT, 'dist', 'ShatteredDawn.html'), html);
console.log('dist/ShatteredDawn.html', (html.length / 1024 / 1024).toFixed(2), 'MB');
