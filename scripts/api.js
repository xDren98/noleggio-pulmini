// api.js - chiamate API Google Apps Script con POST JSON
const VERSION = "2.9.0";
console.log(`[api.js] Versione codice: ${VERSION}`);

const SCRIPTS = {
  proxy: 'https://proxy-cors-google-apps.onrender.com/',
  prenotazioni: 'https://script.google.com/macros/s/AKfycbyMPuvESaAJ7bIraipTya9yUKnyV8eYbm-r8CX42KRvDQsX0f44QBsaqQOY8KVYFBE/exec',
  datiCliente: 'https://script.google.com/macros/s/AKfycbxnC-JSK4YXvV8GF6ED9uK3SSNYs3uAFAmyji6KB_eQ60QAqXIHbTM-18F7-Zu47bo/exec',
  disponibilita: 'https://script.google.com/macros/s/AKfycbwhEK3IH-hLGYpGXHRjcYdUaW2e3He485XpgcRVr0GBSyE4v4-gSCp5vnSCbn5ocNI/exec',
  salvaPrenotazione: 'https://script.google.com/macros/s/AKfycbwy7ZO3hCMcjhPuOMFyJoJl_IRyDr_wfhALadDhFt__Yjg3FBFWqt7wbCjIm0iim9Ya/exec'
};

async function fetchJsonPost(url, params) {
  const response = await fetch(`${SCRIPTS.proxy}${url}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params)
  });
  if (!response.ok) {
    const text = await response.text();
    console.error('Errore fetchJsonPost:', text);
    throw new Error(`Errore fetch API: ${response.status} ${response.statusText}`);
  }
  return response.json();
}

async function fetchPrenotazioni(params) {
  return fetchJsonPost(SCRIPTS.prenotazioni, params);
}

async function fetchDatiCliente(params) {
  return fetchJsonPost(SCRIPTS.datiCliente, params);
}

async function fetchDisponibilita(params) {
  return fetchJsonPost(SCRIPTS.disponibilita, params);
}

async function salvaPrenotazione(params) {
  return fetchJsonPost(SCRIPTS.salvaPrenotazione, params);
}

export {
  fetchPrenotazioni,
  fetchDatiCliente,
  fetchDisponibilita,
  salvaPrenotazione
};
