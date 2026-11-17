// Общие DOM/утилиты для Player.html и Dm.html (подключать до app.js / dm.js).
const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
const d = sides => Math.floor(Math.random()*sides)+1;
const now = () => new Date().toLocaleTimeString(
  (typeof localeTag === 'function' ? localeTag() : (typeof I18N !== 'undefined' ? I18N.localeTag() : 'ru-RU')),
  {hour:'2-digit', minute:'2-digit'}
);
const isBlank = value => value === undefined || value === null || String(value).trim() === '';
const num = value => Number(value) || 0;
const withSign = value => `${value < 0 ? '−' : '+'}${Math.abs(Number(value) || 0)}`;
