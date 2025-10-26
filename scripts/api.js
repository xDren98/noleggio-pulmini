const SCRIPTS = {
  proxy: 'https://proxy-cors-google-apps.onrender.com/',
  prenotazioni: 'https://script.google.com/macros/s/AKfycbyMPuvESaAJ7bIraipTya9yUKnyV8eYbm-r8CX42KRvDQsX0f44QBsaqQOY8KVYFBE/exec',
  datiCliente: 'https://script.google.com/macros/s/AKfycbxnC-JSK4YXvV8GF6ED9uK3SSNYs3uAFAmyji6KB_eQ60QAqXIHbTM-18F7-Zu47bo/exec',
  disponibilita: 'https://script.google.com/macros/s/AKfycbwhEK3IH-hLGYpGXHRjcYdUaW2e3He485XpgcRVr0GBSyE4v4-gSCp5vnSCbn5ocNI/exec',
  salvaPrenotazione: 'https://script.google.com/macros/s/AKfycbwy7ZO3hCMcjhPuOMFyJoJl_IRyDr_wfhALadDhFt__Yjg3FBFWqt7wbCjIm0iim9Ya/exec'
};

async function fetchPrenotazioni(params) {
  let url = SCRIPTS.proxy + SCRIPTS.prenotazioni + '?' + new URLSearchParams(params).toString();
  const res = await fetch(url);
  if (!res.ok) throw new Error('Fetch prenotazioni fallito.');
  return await res.json();
}

async function salvaPrenotazione(dati) {
  let url = SCRIPTS.proxy + SCRIPTS.salvaPrenotazione + '?' + new URLSearchParams(dati).toString();
  const res = await fetch(url);
  if (!res.ok) throw new Error('Salvataggio prenotazione fallito.');
  return await res.json();
}

// altri fetch simili qui...

export { SCRIPTS, fetchPrenotazioni, salvaPrenotazione };
