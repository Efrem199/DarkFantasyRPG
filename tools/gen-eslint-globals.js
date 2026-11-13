#!/usr/bin/env node
/*
 * Генерирует eslint.config.mjs для проекта без модулей.
 *
 * Вся игра живёт в одной глобальной области (это нужно для file://), а ESLint
 * разбирает каждый файл отдельно — поэтому все имена верхнего уровня надо
 * объявить как globale. Скрипт собирает их из исходников: после добавления
 * новой функции достаточно перезапустить его.
 *
 * Запуск: node tools/gen-eslint-globals.js
 */
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name);
    return e.isDirectory() ? walk(p) : (p.endsWith('.js') ? [p] : []);
  });
}

const names = new Set();
const NAME = /^[A-Za-z_$][\w$]*$/;

for (const file of walk(path.join(ROOT, 'js'))) {
  const src = fs.readFileSync(file, 'utf8');

  // function foo(
  for (const m of src.matchAll(/^function\s+([A-Za-z_$][\w$]*)/gm)) names.add(m[1]);

  // const/let/var a = ..., b = ..., c;
  for (const m of src.matchAll(/\b(?:const|let|var)\s+([^;\n]+)/g)) {
    for (const part of m[1].split(',')) {
      const name = part.trim().split('=')[0].trim();
      if (NAME.test(name)) names.add(name);
    }
  }
}

const BROWSER = [
  'window', 'document', 'localStorage', 'navigator', 'location', 'performance',
  'requestAnimationFrame', 'cancelAnimationFrame', 'setTimeout', 'setInterval',
  'clearTimeout', 'clearInterval', 'innerWidth', 'innerHeight', 'addEventListener',
  'AudioContext', 'btoa', 'atob', 'escape', 'unescape', 'console', 'matchMedia',
  'devicePixelRatio', 'Image', 'PointerEvent', 'history'
];

const globals = {};
for (const n of [...names].sort()) globals[n] = 'writable';
for (const b of BROWSER) globals[b] = 'readonly';

const config = `// СГЕНЕРИРОВАНО tools/gen-eslint-globals.js — не правьте руками.
// Перезапустите скрипт после добавления новых функций верхнего уровня.
export default [{
  files: ['js/**/*.js'],
  languageOptions: {
    ecmaVersion: 2022,
    sourceType: 'script',
    globals: ${JSON.stringify(globals, null, 4)}
  },
  rules: {
    'no-undef': 'error',
    'no-const-assign': 'error',
    'no-dupe-keys': 'error',
    'no-duplicate-case': 'error',
    'no-fallthrough': 'error',
    'no-unreachable': 'error'
    /* no-redeclare / no-unused-vars намеренно выключены: ESLint анализирует
       файлы по отдельности, а наши функции используются из соседних файлов. */
  }
}];
`;

fs.writeFileSync(path.join(ROOT, 'eslint.config.mjs'), config);
console.log(`eslint.config.mjs: ${Object.keys(globals).length} globale`);
