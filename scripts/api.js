// api.js - gestione chiamate API Google Apps Script e proxy
const VERSION_API = "2.9.1";
console.log(`[api.js] Versione codice: ${VERSION_API}`);

const SCRIPTS = {
  proxy: 'https://proxy-cors-google-apps.onrender.com/',
  prenotazioni: 'https://script.google.com/macros/s/AKfycbyMPuvESaAJ7bIraipTya9yUKnyV8eYbm-r8CX42KRvDQsX0f44QBsaqQOY8KVYFBE/exec',
  datiCliente: 'https://script.google.com/macros/s/AKfycbxnC-JSK4YXvV8GF6ED9uK3SSNYs3uAFAmyji6KB_eQ60QAqXIHbTM-18F7-Zu47bo/exec',
  disponibilita: 'https://script.google.com/macros/s/AKfycbwhEK3IH-hLGYpGXHRjcYdUaW2e3He485XpgcRVr0GBSyE4v4-gSCp5vnSCbn5ocNI/exec',
  salvaPrenotazione: 'https://script.google.com/macros/s/AKfycbwy7ZO3hCMcjhPuOMFyJoJl_IRyDr_wfhALadDhFt__Yjg3FBFWqt7wbCjIm0iim9Ya/exec'
};

async function fetchPrenotazioni(params) {
  const url = `${SCRIPTS.proxy}${SCRIPTS.prenotazioni}`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params)
  });

  if (!response.ok) throw new Error('Errore fetch prenotazioni');

  return await response.json();
}

async function fetchDatiCliente(params) {
  const url = `${SCRIPTS.proxy}${SCRIPTS.datiCliente}?${new URLSearchParams(params)}`;
  const response = await fetch(url);
  if (!response.ok) throw new Error('Errore fetch dati cliente');
  return response.json();
}

async function fetchDisponibilita(params) {
  const url = `${SCRIPTS.proxy}${SCRIPTS.disponibilita}?${new URLSearchParams(params)}`;
  const response = await fetch(url);
  if (!response.ok) throw new Error('Errore fetch disponibilità');
  return response.json();
}

async function salvaPrenotazione(params) {
  const url = `${SCRIPTS.proxy}${SCRIPTS.salvaPrenotazione}?${new URLSearchParams(params)}`;
  const response = await fetch(url);
  if (!response.ok) throw new Error('Errore salvataggio prenotazione');
  return response.json();
}

export { fetchPrenotazioni, fetchDatiCliente, fetchDisponibilita, salvaPrenotazione };
