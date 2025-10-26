// ui.js - gestione messaggi e visualizzazione UI
const VERSION = "2.9.0";
console.log(`[ui.js] Versione codice: ${VERSION}`);

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

// Funzione per mostrare le card prenotazioni
function mostraPrenotazioni(prenotazioni) {
  const container = document.getElementById('prenotazioni_container');
  if (!container) return;
  container.innerHTML = ''; // pulisco

  prenotazioni.forEach(p => {
    const card = document.createElement('div');
    card.className = 'prenotazione-card';

    const statoClass = p.stato ? p.stato.toLowerCase().replace(/\s/g, '-') : '';

    card.innerHTML = `
      <h3 class="prenotazione-nome">${p.nomeCliente || 'Cliente'}</h3>
      <p><strong>Dal:</strong> ${p.dal || 'N/D'}</p>
      <p><strong>Al:</strong> ${p.al || 'N/D'}</p>
      <p><strong>Veicolo:</strong> ${p.targa || 'N/D'}</p>
      <p class="stato-prenotazione ${statoClass}"><strong>Stato:</strong> ${p.stato || 'N/D'}</p>
    `;

    container.appendChild(card);
  });
}

export { mostraErrore, mostraSuccesso, mostraLoading, nascondiLoading, mostraPrenotazioni };
