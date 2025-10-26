// api.js

export const SCRIPTS = {
  proxy: 'https://proxy-cors-google-apps.onrender.com/',
  prenotazioni: 'https://script.google.com/macros/s/AKfycbyMPuvESaAJ7bIraipTya9yUKnyV8eYbm-r8CX42KRvDQsX0f44QBsaqQOY8KVYFBE/exec',
  datiCliente: 'https://script.google.com/macros/s/AKfycbxnC-JSK4YXvV8GF6ED9uK3SSNYs3uAFAmyji6KB_eQ60QAqXIHbTM-18F7-Zu47bo/exec',
  disponibilita: 'https://script.google.com/macros/s/AKfycbwhEK3IH-hLGYpGXHRjcYdUaW2e3He485XpgcRVr0GBSyE4v4-gSCp5vnSCbn5ocNI/exec',
  salvaPrenotazione: 'https://script.google.com/macros/s/AKfycbwy7ZO3hCMcjhPuOMFyJoJl_IRyDr_wfhALadDhFt__Yjg3FBFWqt7wbCjIm0iim9Ya/exec'
};

export async function fetchPrenotazioni(cf) {
  const response = await fetch(SCRIPTS.proxy + SCRIPTS.prenotazioni, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ cf })
  });
  return response.json();
}

export async function fetchDatiCliente(cf) {
  const response = await fetch(SCRIPTS.proxy + SCRIPTS.datiCliente, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ cf })
  });
  return response.json();
}

export async function fetchDisponibilita() {
  const response = await fetch(SCRIPTS.proxy + SCRIPTS.disponibilita, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'getPrenotazioni' })
  });
  return response.json();
}

export async function salvaPrenotazioneApi(prenotazioneData) {
  const response = await fetch(SCRIPTS.proxy + SCRIPTS.salvaPrenotazione, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(prenotazioneData)
  });
  return response.json();
}
