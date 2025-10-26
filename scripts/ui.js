// ui.js - funzioni per la gestione messaggi e loader UI
const VERSION_UI = "2.9.0";
console.log(`[ui.js] Versione codice: ${VERSION_UI}`);

function mostraErrore(msg) {
  const box = document.getElementById('banner_errore');
  if (!box) return;
  box.textContent = msg;
  box.classList.add('show');
  setTimeout(() => box.classList.remove('show'), 5000);
}

function mostraSuccesso(msg) {
  const box = document.getElementById('banner_successo');
  if (!box) return;
  box.textContent = msg;
  box.classList.add('show');
  setTimeout(() => box.classList.remove('show'), 5000);
}

function mostraLoading() {
  const loader = document.getElementById('loader');
  if (loader) loader.style.display = 'block';
}

function nascondiLoading() {
  const loader = document.getElementById('loader');
  if (loader) loader.style.display = 'none';
}

export {
  mostraErrore,
  mostraSuccesso,
  mostraLoading,
  nascondiLoading,
};
