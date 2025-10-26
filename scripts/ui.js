function mostraErrore(msg) {
  const box = document.getElementById('banner_errore');
  box.textContent = msg;
  box.classList.add('show');
  setTimeout(() => box.classList.remove('show'), 5000);
}

function mostraSuccesso(msg) {
  const box = document.getElementById('banner_successo');
  box.textContent = msg;
  box.classList.add('show');
  setTimeout(() => box.classList.remove('show'), 5000);
}

function mostraLoading() {
  const box = document.getElementById('loader');
  if (box) box.style.display = 'block';
}

function nascondiLoading() {
  const box = document.getElementById('loader');
  if (box) box.style.display = 'none';
}

// Altre funzioni di UI qui...

export {
  mostraErrore,
  mostraSuccesso,
  mostraLoading,
  nascondiLoading,
};
