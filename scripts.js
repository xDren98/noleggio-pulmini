/* Imbriani Noleggio – scripts.js
   
   ═══════════════════════════════════════════════════════════════════
   CHANGELOG - VERSIONI
   ═══════════════════════════════════════════════════════════════════
   
      📌 v5.3.8 - 28 Ottobre 2025
   ✅ Step 2.5 preventivo con campo destinazione
   ✅ Messaggio WhatsApp con date in formato italiano (dd/mm/yyyy)
   ✅ Campo destinazione passato al backend e salvato su sheet
   ✅ Autocompletamento cellulare per utenti loggati (FIX)
   ✅ Autocompletamento date (nascita, patente) con convertiDataPerInput()
   ✅ Sistema conferma prenotazioni (stato "Da confermare")
   ✅ Email automatica agli admin per nuove prenotazioni
   ✅ PDF generato solo dopo conferma admin
   ✅ Logica disponibilità con buffer orari 4 ore (v2.2)
   
   📌 v5.3.6 - 27 Ottobre 2025
   ✅ GET request per evitare CORS preflight (datiCliente, disponibilita, prenotazioni)
   ✅ POST form-encoded per manageBooking (no preflight)
   ✅ fetchJSON senza Content-Type header
   ✅ Form modifica con SELECT per orari
   ✅ Validazione età massima 90 anni
   ✅ Emoji riepilogo gestite via CSS (non hardcoded nel JS)
   
   📌 v5.3.5 - 26 Ottobre 2025
   ✅ Area personale con lista prenotazioni
   ✅ Modifica e cancellazione prenotazioni
   ✅ Validazione 7 giorni prima della partenza
   ✅ Sistema routing tra sezioni (homepage, area personale, wizard)
   ✅ Toast notifications per feedback utente
   
   📌 v5.3.0 - 25 Ottobre 2025
   ✅ Wizard prenotazione multi-step (4 step)
   ✅ Controllo disponibilità veicoli in tempo reale
   ✅ Form dati autisti multipli (max 3)
   ✅ Riepilogo prenotazione prima dell'invio
   ✅ Integrazione con Google Sheets via Apps Script
   
   📌 v5.2.0 - 24 Ottobre 2025
   ✅ Login con codice fiscale
   ✅ Cache locale per dati cliente
   ✅ Sistema di validazione form completo
   
   📌 v5.1.0 - 23 Ottobre 2025
   ✅ Interfaccia base con Material Icons
   ✅ Responsive design per mobile
   ✅ Loader overlay per caricamenti
   
   ═══════════════════════════════════════════════════════════════════
   ENDPOINT BACKEND
   ═══════════════════════════════════════════════════════════════════
   
   🔗 datiCliente.gs v2.2:
      https://script.google.com/.../AKfycbxnC-JSK4YXvV8GF6ED9uK3SSNYs3uAFAmyji6KB_eQ60QAqXIHbTM-18F7-Zu47bo/exec
      
   🔗 disponibilita.gs v2.1:
      https://script.google.com/.../AKfycbwhEK3IH-hLGYpGXHRjcYdUaW2e3He485XpgcRVr0GBSyE4v4-gSCp5vnSCbn5ocNI/exec
      
   🔗 prenotazioni.gs v2.1:
      https://script.google.com/.../AKfycbyMPuvESaAJ7bIraipTya9yUKnyV8eYbm-r8CX42KRvDQsX0f44QBsaqQOY8KVYFBE/exec
      
   🔗 manageBooking.gs v2.4:
      https://script.google.com/.../AKfycbxAKX12Sgc0ODvGtUEXCRoINheSeO9-SgDNGuY1QtrVKBENdY0SpMiDtzgoxIBRCuQ/exec
   
   ═══════════════════════════════════════════════════════════════════
   CONFIGURAZIONE
   ═══════════════════════════════════════════════════════════════════
   
   📦 Sheet ID: 1VAUJNVwxX8OLrkQVJP7IEGrqLIrDjJjrhfr7ABVqtns
   📄 Sheet Name: "Risposte del modulo 1"
   📧 Admin Email: configurata in manageBooking.gs
   
   ═══════════════════════════════════════════════════════════════════
*/

'use strict';

const APP_VERSION = '5.3.8';
const BUILD_DATE = '2025-10-28';
const ENVIRONMENT = 'production';

console.log(`%c🚐 Imbriani Noleggio v${APP_VERSION}`, 'font-size: 16px; font-weight: bold; color: #37b24d;');
console.log(`%c📅 Build: ${BUILD_DATE} | Env: ${ENVIRONMENT}`, 'color: #666;');
console.log(`%c✨ Sistema conferma prenotazioni + Step 2.5 preventivo attivo`, 'color: #37b24d;');

// ========== ENDPOINTS ==========
const SCRIPTS = {
  datiCliente: 'https://script.google.com/macros/s/AKfycbxnC-JSK4YXvV8GF6ED9uK3SSNYs3uAFAmyji6KB_eQ60QAqXIHbTM-18F7-Zu47bo/exec',
  disponibilita: 'https://script.google.com/macros/s/AKfycbwhEK3IH-hLGYpGXHRjcYdUaW2e3He485XpgcRVr0GBSyE4v4-gSCp5vnSCbn5ocNI/exec',
  prenotazioni: 'https://script.google.com/macros/s/AKfycbyMPuvESaAJ7bIraipTya9yUKnyV8eYbm-r8CX42KRvDQsX0f44QBsaqQOY8KVYFBE/exec',
  manageBooking: 'https://script.google.com/macros/s/AKfycbxAKX12Sgc0ODvGtUEXCRoINheSeO9-SgDNGuY1QtrVKBENdY0SpMiDtzgoxIBRCuQ/exec'
};

// ========== CATALOGO VEICOLI ==========
const pulmini = [
  { id: 'ducatolungo', nome: 'Fiat Ducato (Passo lungo)', targa: 'EC787NM', posti: 9 },
  { id: 'ducatocorto', nome: 'Fiat Ducato (Passo corto)', targa: 'DN391FW', posti: 9 },
  { id: 'peugeot', nome: 'Peugeot Expert Tepee', targa: 'DL291XZ', posti: 9 }
];

// ========== STATE ==========
let loggedCustomerData = null;
let pulminoSelezionato = null;
const prenotazioniMap = new Map();

// ========== UTILITY ==========
function qs(selector) {
  return document.getElementById(selector) || document.querySelector('#' + selector);
}

function showLoader(show = true) {
  const loader = qs('loading-overlay');
  if (loader) {
    loader.style.display = show ? 'flex' : 'none';
    loader.setAttribute('aria-busy', show);
  }
}

function showToast(message, type = 'info') {
  const container = qs('toast-container');
  if (!container) return;
  
  const toast = document.createElement('div');
  toast.className = type === 'error' ? 'error-banner' : 'success-banner';
  toast.innerHTML = `
    <span class="banner-ico">${type === 'error' ? '❌' : '✅'}</span>
    <span class="banner-msg">${message}</span>
  `;
  
  container.appendChild(toast);
  
  setTimeout(() => {
    toast.style.opacity = '0';
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

function routeTo(sectionId) {
  document.querySelectorAll('[data-section]').forEach(s => s.classList.add('hidden'));
  const target = qs(sectionId);
  if (target) {
    target.classList.remove('hidden');
  }
}

function showStep(stepId) {
  document.querySelectorAll('.step').forEach(s => s.classList.add('hidden'));
  const step = qs(stepId);
  if (step) {
    step.classList.remove('hidden');
  }
}

// ========== FETCH HELPERS (CORS-FREE) ==========
async function fetchJSON(url, params = {}) {
  const queryString = new URLSearchParams(params).toString();
  const fullURL = queryString ? `${url}?${queryString}` : url;
  
  const response = await fetch(fullURL, {
    method: 'GET',
    redirect: 'follow'
  });
  
  if (!response.ok) throw new Error('Network response error');
  return response.json();
}

async function postFormEncoded(url, data) {
  const params = new URLSearchParams();
  params.append('payload', JSON.stringify(data));
  
  const response = await fetch(url, {
    method: 'POST',
    body: params,
    redirect: 'follow'
  });
  
  if (!response.ok) throw new Error('Network response error');
  return response.json();
}

// ========== INVALIDAZIONE CACHE ==========
async function invalidateCacheDatiCliente(cf) {
  try {
    await fetchJSON(SCRIPTS.datiCliente, { cf: cf, invalidate: '1' });
    console.log('✅ Cache datiCliente invalidata');
  } catch (err) {
    console.warn('⚠️ Impossibile invalidare cache datiCliente:', err);
  }
}

async function invalidateCachePrenotazioni(cf) {
  try {
    await fetchJSON(SCRIPTS.prenotazioni, { cf: cf, invalidate: '1' });
    console.log('✅ Cache prenotazioni invalidata');
  } catch (err) {
    console.warn('⚠️ Impossibile invalidare cache prenotazioni:', err);
  }
}

// ========== SETUP ==========
function setupSiteTitle() {
  const title = qs('site-title');
  if (title) {
    title.onclick = () => {
      loggedCustomerData = null;
      prenotazioniMap.clear();
      sessionStorage.clear();
      routeTo('homepage');
      history.pushState({ view: 'homepage' }, '', '/home');
    };
  }
}

function setupLoginForm() {
  const form = qs('form-login');
  const inputCF = qs('cf-login');
  
  if (!form || !inputCF) return;
  
  inputCF.addEventListener('input', () => {
    inputCF.value = inputCF.value.toUpperCase();
  });
  
form.onsubmit = async (e) => {
  e.preventDefault();
  const cf = inputCF.value.trim().toUpperCase();
  
  if (!cf || cf.length !== 16) {
    showToast('Il codice fiscale deve essere di 16 caratteri', 'error');
    return;
  }
  
  showLoader(true);
  try {
    // ✅ CORRETTO: Una sola chiamata a datiCliente.gs che restituisce tutto
    const response = await fetchJSON(SCRIPTS.datiCliente, { cf: cf });
    
    if (response.success && response.cliente) {
      loggedCustomerData = response.cliente;
      
      // Le prenotazioni arrivano già da datiCliente.gs
      if (response.prenotazioni) {
        prenotazioniMap.clear();
        response.prenotazioni.forEach(p => {
          const id = p['ID prenotazione'] || p.idPrenotazione;
          if (id) prenotazioniMap.set(id, p);
        });
      }
      
      mostraAreaPersonale();
      routeTo('area-personale');
      showToast('Benvenuto!');
    } else {
      showToast('Nessun dato trovato per questo codice fiscale', 'error');
    }
  } catch (err) {
    console.error('Errore login:', err);
    showToast('Errore durante il caricamento dei dati', 'error');
  } finally {
    showLoader(false);
  }
};


function setupNewBooking() {
  const btn = qs('btnNewBooking');
  if (btn) {
    btn.onclick = () => {
      routeTo('mainbox');
      showStep('step1');
      resetWizard();
    };
  }
}

function setupWizard() {
  // === STEP 1: Date e disponibilità ===
  qs('btn-controlla-disponibilita').onclick = async () => {
    const dataRitiro = qs('data_ritiro').value;
    const dataArrivo = qs('data_arrivo').value;
    const oraRitiro = qs('ora_partenza').value;
    const oraArrivo = qs('ora_arrivo').value;
    
    if (!dataRitiro || !dataArrivo || !oraRitiro || !oraArrivo) {
      showToast('⚠️ Compila tutti i campi', 'error');
      return;
    }
    
    if (new Date(dataRitiro) >= new Date(dataArrivo)) {
      showToast('⚠️ La data di arrivo deve essere successiva alla data di ritiro', 'error');
      return;
    }
    
    showLoader(true);
    
    try {
      const resp = await fetchJSON(SCRIPTS.disponibilita, {
        dataInizio: dataRitiro,
        dataFine: dataArrivo,
        oraInizio: oraRitiro,    // ✅ AGGIUNTO
        oraFine: oraArrivo        // ✅ AGGIUNTO
      });
      
      if (resp.success && resp.disponibili && resp.disponibili.length > 0) {
        mostraListaPulmini(resp.disponibili);
        showStep('step2');
      } else {
        showToast('⚠️ Nessun veicolo disponibile per queste date', 'error');
      }
    } catch (err) {
      console.error('Errore disponibilità:', err);
      showToast('❌ Errore controllo disponibilità', 'error');
    } finally {
      showLoader(false);
    }
  };
  
  // === STEP 2: Selezione pulmino ===
  qs('btn-step2-continua').onclick = () => {
    const selezionato = pulminoSelezionato;
    if (!selezionato) {
      showToast('⚠️ Seleziona un pulmino', 'error');
      return;
    }
    showStep('step2-5');
  };
  
  // === STEP 2.5: Preventivo con destinazione ===
  const inputDestinazione = qs('destinazione-viaggio');
  const btnWhatsApp = qs('btn-whatsapp-preventivo');
  const checkboxPreventivo = qs('conferma-preventivo');
  const btnStep25 = qs('btn-step25-continua');

  if (inputDestinazione && btnWhatsApp) {
    // Abilita WhatsApp solo se destinazione inserita (min 3 caratteri)
    inputDestinazione.oninput = () => {
      const hasDestination = inputDestinazione.value.trim().length >= 3;
      btnWhatsApp.disabled = !hasDestination;
    };
    
    // Funzione per convertire data ISO a formato italiano
    function formatDataItaliana(dataISO) {
      if (!dataISO) return '';
      const [anno, mese, giorno] = dataISO.split('-');
      return `${giorno}/${mese}/${anno}`;
    }
    
    // WhatsApp con messaggio personalizzato e date italiane
    btnWhatsApp.onclick = () => {
      const destinazione = inputDestinazione.value.trim();
      if (!destinazione || destinazione.length < 3) {
        showToast('⚠️ Inserisci prima la destinazione del viaggio', 'error');
        inputDestinazione.focus();
        return;
      }
      
      const dataRitiroISO = qs('data_ritiro').value;
      const dataArrivoISO = qs('data_arrivo').value;
      const oraRitiro = qs('ora_partenza').value;
      const oraArrivo = qs('ora_arrivo').value;
      
      // Converti date in formato italiano
      const dataRitiro = formatDataItaliana(dataRitiroISO);
      const dataArrivo = formatDataItaliana(dataArrivoISO);
      
      const pulminoScelto = pulminoSelezionato;
      const nomePulmino = pulminoScelto ? pulminoScelto.nome : 'pulmino';
      
      const messaggio = `Ciao! Vorrei un preventivo per noleggio ${nomePulmino}.\n\n` +
                        `📍 Destinazione: ${destinazione}\n` +
                        `📅 Dal: ${dataRitiro} ore ${oraRitiro}\n` +
                        `📅 Al: ${dataArrivo} ore ${oraArrivo}\n\n` +
                        `Grazie!`;
      
      const whatsappURL = `https://wa.me/393286589618?text=${encodeURIComponent(messaggio)}`;
      window.open(whatsappURL, '_blank', 'noopener,noreferrer');
    };
  }

  if (checkboxPreventivo && btnStep25) {
    checkboxPreventivo.onchange = () => {
      btnStep25.disabled = !checkboxPreventivo.checked;
    };
    
    btnStep25.onclick = () => {
      if (!checkboxPreventivo.checked) {
        showToast('⚠️ Conferma di aver ricevuto il preventivo', 'error');
        return;
      }
      showStep('step3');
    };
  }
  
  // === STEP 3: Dati autisti ===
  qs('numero-autisti').onchange = function() {
    generaFormAutisti(parseInt(this.value, 10));
  };
  
  qs('btn-step3-continua').onclick = () => {
    if (!validaDatiAutisti()) {
      showToast('⚠️ Compila tutti i campi obbligatori', 'error');
      return;
    }
    mostraRiepilogo();
    showStep('step4');
  };
  
  // === STEP 4: Riepilogo e invio ===
  qs('btn-invia-prenotazione').onclick = inviaNuovaPrenotazione;
  
  // Genera form autista 1 all'inizio
  generaFormAutisti(1);
}
// ========== LISTA PULMINI ==========
function mostraListaPulmini(targheDisponibili) {
  const container = qs('lista-pulmini');
  if (!container) return;
  
  container.innerHTML = '';
  pulminoSelezionato = null;
  
  const disponibili = pulmini.filter(p => targheDisponibili.includes(p.targa));
  
  if (disponibili.length === 0) {
    container.innerHTML = '<p>Nessun veicolo disponibile</p>';
    return;
  }
  
  disponibili.forEach(pulmino => {
    const card = document.createElement('div');
    card.className = 'card-pulmino';
    card.setAttribute('role', 'button');
    card.setAttribute('tabindex', '0');
    card.innerHTML = `
      <div class="card-title">${pulmino.nome}</div>
      <div class="card-sub">${pulmino.posti} posti</div>
    `;
    
    card.onclick = () => {
      document.querySelectorAll('.card-pulmino').forEach(c => c.classList.remove('selected'));
      card.classList.add('selected');
      pulminoSelezionato = pulmino;
      qs('btn-step2-continua').disabled = false;
    };
    
    container.appendChild(card);
  });
}

// ========== FORM AUTISTI ==========
function generaFormAutisti(numAutisti) {
  const container = qs('autisti-container');
  if (!container) return;
  
  container.innerHTML = '';
  
  for (let i = 1; i <= numAutisti; i++) {
    const formDiv = document.createElement('div');
    formDiv.className = 'form-autista';
    formDiv.setAttribute('data-autista', i);
    
    const isLogged = (i === 1 && loggedCustomerData);
    
    formDiv.innerHTML = `
      <h4>Autista ${i}</h4>
      
      <label for="nome-${i}">Nome e Cognome</label>
      <input type="text" id="nome-${i}" placeholder="Mario Rossi" required 
             value="${isLogged ? loggedCustomerData.nomeCognome : ''}" />
      
      <label for="data-nascita-${i}">Data di nascita</label>
      <input type="date" id="data-nascita-${i}" required 
             value="${isLogged ? convertiDataPerInput(loggedCustomerData.dataNascita) : ''}" />
      
      <label for="luogo-nascita-${i}">Luogo di nascita</label>
      <input type="text" id="luogo-nascita-${i}" placeholder="Roma" required 
             value="${isLogged ? loggedCustomerData.luogoNascita : ''}" />
      
      <label for="cf-${i}">Codice fiscale</label>
      <input type="text" id="cf-${i}" placeholder="RSSMRA80A01H501X" required maxlength="16" 
             style="text-transform: uppercase;"
             value="${isLogged ? loggedCustomerData.codiceFiscale : ''}" />
      
      <label for="comune-res-${i}">Comune di residenza</label>
      <input type="text" id="comune-res-${i}" placeholder="Roma" required 
             value="${isLogged ? loggedCustomerData.comuneResidenza : ''}" />
      
      <label for="via-res-${i}">Via di residenza</label>
      <input type="text" id="via-res-${i}" placeholder="Via Roma" required 
             value="${isLogged ? loggedCustomerData.viaResidenza : ''}" />
      
      <label for="civico-res-${i}">Civico di residenza</label>
      <input type="text" id="civico-res-${i}" placeholder="10" 
             value="${isLogged ? loggedCustomerData.civicoResidenza : ''}" />
      
      <label for="numero-patente-${i}">Numero di patente</label>
      <input type="text" id="numero-patente-${i}" placeholder="AB1234567" required 
             value="${isLogged ? loggedCustomerData.numeroPatente : ''}" />
      
      <label for="inizio-patente-${i}">Data inizio validità patente</label>
      <input type="date" id="inizio-patente-${i}" required 
             value="${isLogged ? convertiDataPerInput(loggedCustomerData.dataInizioValiditaPatente) : ''}" />
      
      <label for="scadenza-patente-${i}">Scadenza patente</label>
      <input type="date" id="scadenza-patente-${i}" required 
             value="${isLogged ? convertiDataPerInput(loggedCustomerData.dataFineValiditaPatente) : ''}" />
    `;
    
    container.appendChild(formDiv);
    
    // Auto-uppercase per CF
    const cfInput = formDiv.querySelector(`#cf-${i}`);
    if (cfInput) {
      cfInput.addEventListener('input', () => {
        cfInput.value = cfInput.value.toUpperCase();
      });
    }
  }
    // Precompila cellulare se loggato
  if (loggedCustomerData && loggedCustomerData.cellulare) {
    const cellulareInput = qs('cellulare');
    if (cellulareInput) {
      cellulareInput.value = loggedCustomerData.cellulare;
    }
  }
}



function validaDatiAutisti() {
  const numAutisti = parseInt(qs('numero-autisti').value, 10);
  const cellulare = qs('cellulare').value.trim();
  
  if (!cellulare || cellulare.length < 9) {
    showToast('⚠️ Inserisci un numero di cellulare valido', 'error');
    return false;
  }
  
  for (let i = 1; i <= numAutisti; i++) {
    const nome = qs(`nome-${i}`).value.trim();
    const dataNascita = qs(`data-nascita-${i}`).value;
    const luogoNascita = qs(`luogo-nascita-${i}`).value.trim();
    const cf = qs(`cf-${i}`).value.trim();
    const comuneRes = qs(`comune-res-${i}`).value.trim();
    const viaRes = qs(`via-res-${i}`).value.trim();
    const numeroPatente = qs(`numero-patente-${i}`).value.trim();
    const inizioPatente = qs(`inizio-patente-${i}`).value;
    const scadenzaPatente = qs(`scadenza-patente-${i}`).value;
    
    if (!nome || nome.length < 5) {
      showToast(`⚠️ Nome e cognome autista ${i} troppo corto`, 'error');
      return false;
    }
    
    if (!dataNascita) {
      showToast(`⚠️ Data di nascita autista ${i} mancante`, 'error');
      return false;
    }
    
    // Validazione età (18-90 anni)
    const oggi = new Date();
    const nascita = new Date(dataNascita);
    const eta = oggi.getFullYear() - nascita.getFullYear();
    
    if (eta < 18) {
      showToast(`⚠️ Autista ${i} deve avere almeno 18 anni`, 'error');
      return false;
    }
    
    if (eta > 90) {
      showToast(`⚠️ Autista ${i}: età massima 90 anni`, 'error');
      return false;
    }
    
    if (!luogoNascita) {
      showToast(`⚠️ Luogo di nascita autista ${i} mancante`, 'error');
      return false;
    }
    
    if (!cf || cf.length !== 16) {
      showToast(`⚠️ Codice fiscale autista ${i} non valido`, 'error');
      return false;
    }
    
    if (!comuneRes || !viaRes) {
      showToast(`⚠️ Indirizzo residenza autista ${i} incompleto`, 'error');
      return false;
    }
    
    if (!numeroPatente) {
      showToast(`⚠️ Numero patente autista ${i} mancante`, 'error');
      return false;
    }
    
    if (!inizioPatente || !scadenzaPatente) {
      showToast(`⚠️ Date validità patente autista ${i} mancanti`, 'error');
      return false;
    }
    
    const scadenza = new Date(scadenzaPatente);
    if (scadenza < oggi) {
      showToast(`⚠️ Patente autista ${i} scaduta`, 'error');
      return false;
    }
  }
  
  return true;
}

// ========== RIEPILOGO ==========
function mostraRiepilogo() {
  const container = qs('riepilogo-content');
  if (!container) return;
  
  container.innerHTML = '';
  
  const dataRitiro = qs('data_ritiro').value;
  const dataArrivo = qs('data_arrivo').value;
  const oraRitiro = qs('ora_partenza').value;
  const oraArrivo = qs('ora_arrivo').value;
  const cellulare = qs('cellulare').value;
  const numAutisti = parseInt(qs('numero-autisti').value, 10);
  const destinazione = qs('destinazione-viaggio') ? qs('destinazione-viaggio').value.trim() : '';
  
  // Sezione periodo
  const periodoCard = document.createElement('div');
  periodoCard.className = 'card';
  periodoCard.innerHTML = `
    <h3>📅 Periodo noleggio</h3>
    <p><strong>Dal:</strong> ${formatDateIT(dataRitiro)} ore ${oraRitiro}</p>
    <p><strong>Al:</strong> ${formatDateIT(dataArrivo)} ore ${oraArrivo}</p>
    ${destinazione ? `<p><strong>Destinazione:</strong> ${destinazione}</p>` : ''}
  `;
  container.appendChild(periodoCard);
  
  // Sezione veicolo
  const veicoloCard = document.createElement('div');
  veicoloCard.className = 'card';
  veicoloCard.innerHTML = `
    <h3>🚐 Veicolo</h3>
    <p><strong>Modello:</strong> ${pulminoSelezionato.nome}</p>
    <p><strong>Targa:</strong> ${pulminoSelezionato.targa}</p>
    <p><strong>Posti:</strong> ${pulminoSelezionato.posti}</p>
  `;
  container.appendChild(veicoloCard);
  
  // Sezione contatto
  const contattoCard = document.createElement('div');
  contattoCard.className = 'card';
  contattoCard.innerHTML = `
    <h3>📞 Contatto</h3>
    <p><strong>Cellulare:</strong> ${cellulare}</p>
  `;
  container.appendChild(contattoCard);
  
  // Sezione autisti
  for (let i = 1; i <= numAutisti; i++) {
    const autistaCard = document.createElement('div');
    autistaCard.className = 'card';
    autistaCard.innerHTML = `
      <h3>👤 Autista ${i}</h3>
      <p><strong>Nome:</strong> ${qs(`nome-${i}`).value}</p>
      <p><strong>Data di nascita:</strong> ${formatDateIT(qs(`data-nascita-${i}`).value)}</p>
      <p><strong>Luogo di nascita:</strong> ${qs(`luogo-nascita-${i}`).value}</p>
      <p><strong>Codice fiscale:</strong> ${qs(`cf-${i}`).value}</p>
      <p><strong>Residenza:</strong> ${qs(`via-res-${i}`).value} ${qs(`civico-res-${i}`).value}, ${qs(`comune-res-${i}`).value}</p>
      <p><strong>Patente:</strong> ${qs(`numero-patente-${i}`).value}</p>
      <p><strong>Validità:</strong> dal ${formatDateIT(qs(`inizio-patente-${i}`).value)} al ${formatDateIT(qs(`scadenza-patente-${i}`).value)}</p>
    `;
    container.appendChild(autistaCard);
  }
}

function formatDateIT(dateStr) {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-');
  return `${d}/${m}/${y}`;
}

// ========== INVIO PRENOTAZIONE ==========
async function inviaNuovaPrenotazione() {
  showLoader(true);
  
  try {
    const dataRitiro = qs('data_ritiro').value;
    const dataArrivo = qs('data_arrivo').value;
    const oraRitiro = qs('ora_partenza').value;
    const oraArrivo = qs('ora_arrivo').value;
    const cellulare = qs('cellulare').value.trim();
    const numAutisti = parseInt(qs('numero-autisti').value, 10);
    
    const autistiArray = [];
    for (let i = 1; i <= numAutisti; i++) {
      autistiArray.push({
        nomeCognome: qs(`nome-${i}`).value.trim(),
        dataNascita: qs(`data-nascita-${i}`).value,
        luogoNascita: qs(`luogo-nascita-${i}`).value.trim(),
        codiceFiscale: qs(`cf-${i}`).value.trim().toUpperCase(),
        comuneResidenza: qs(`comune-res-${i}`).value.trim(),
        viaResidenza: qs(`via-res-${i}`).value.trim(),
        civicoResidenza: qs(`civico-res-${i}`).value.trim(),
        numeroPatente: qs(`numero-patente-${i}`).value.trim(),
        dataInizioValiditaPatente: qs(`inizio-patente-${i}`).value,
        dataFineValiditaPatente: qs(`scadenza-patente-${i}`).value
      });
    }
    
    const payload = {
      action: 'create',
      prenotazione: {
        dataRitiro: dataRitiro,
        oraRitiro: oraRitiro,
        dataArrivo: dataArrivo,
        oraArrivo: oraArrivo,
        destinazione: qs('destinazione-viaggio') ? qs('destinazione-viaggio').value.trim() : '',
        pulmino: {
          targa: pulminoSelezionato.targa
        },
        cellulare: cellulare,
        autisti: autistiArray
      }
    };
    
    const response = await postFormEncoded(SCRIPTS.manageBooking, payload);
    
    if (response.success) {
      showToast('✅ Prenotazione inviata con successo!');
      
      // Invalida cache per il primo autista
      const cfPrimoAutista = autistiArray[0].codiceFiscale;
      await Promise.all([
        invalidateCacheDatiCliente(cfPrimoAutista),
        invalidateCachePrenotazioni(cfPrimoAutista)
      ]);
      
      // Torna alla home
      setTimeout(() => {
        resetWizard();
        routeTo('homepage');
      }, 2000);
    } else {
      showToast('❌ ' + (response.error || 'Errore durante l\'invio'), 'error');
    }
  } catch (err) {
    console.error('Errore invio prenotazione:', err);
    showToast('❌ Errore durante l\'invio della prenotazione', 'error');
  } finally {
    showLoader(false);
  }
}

function resetWizard() {
  pulminoSelezionato = null;
  showStep('step1');
  
  // Reset form
  document.querySelectorAll('#mainbox input').forEach(input => {
    if (input.type !== 'button') input.value = '';
  });
  
  qs('numero-autisti').value = '1';
  generaFormAutisti(1);
}
// ========== AREA PERSONALE ==========
function mostraAreaPersonale() {
  const container = qs('area-personale-content');
  if (!container || !loggedCustomerData) return;
  
  container.innerHTML = '';
  
  // Card benvenuto
  const welcomeCard = document.createElement('div');
  welcomeCard.className = 'welcome-card';
  welcomeCard.innerHTML = `
    <h2>Benvenuto, ${loggedCustomerData.nomeCognome || 'Cliente'}!</h2>
    <p>Ecco le tue prenotazioni:</p>
  `;
  container.appendChild(welcomeCard);
  
  // Card prenotazioni
  const prenotazioniCard = document.createElement('div');
  prenotazioniCard.className = 'prenotazioni-card';
  
  if (prenotazioniMap.size === 0) {
    prenotazioniCard.innerHTML = '<p>Non hai ancora prenotazioni.</p>';
  } else {
    const lista = document.createElement('div');
    lista.className = 'prenotazioni-lista';
    
    prenotazioniMap.forEach((pren, id) => {
      const item = document.createElement('div');
      item.className = 'prenotazione-item';
      
      const stato = pren.stato || '';
      const statoLabel = stato ? `<span class="badge ${getBadgeClass(stato)}">${stato}</span>` : '';
      
      item.innerHTML = `
        <strong>ID: ${id} ${statoLabel}</strong>
        <p>📅 Dal: ${pren['Giorno inizio noleggio']} ore ${pren['Ora inizio noleggio']}</p>
        <p>📅 Al: ${pren['Giorno fine noleggio']} ore ${pren['Ora fine noleggio']}</p>
        <p>🚐 Veicolo: ${pren.targa || pren.Targa}</p>
        <button class="btn btn--sm btn--primary" onclick="apriModificaPrenotazione('${id}')">Modifica</button>
        <button class="btn btn--sm btn--danger" onclick="eliminaPrenotazione('${id}')">Elimina</button>
      `;
      
      lista.appendChild(item);
    });
    
    prenotazioniCard.appendChild(lista);
  }
  
  container.appendChild(prenotazioniCard);
  
  // Pulsante nuova prenotazione
  const btnNuova = document.createElement('button');
  btnNuova.className = 'btn btn--secondary';
  btnNuova.innerHTML = '<span class="material-icons">add_circle</span> Nuova prenotazione';
  btnNuova.onclick = () => {
    routeTo('mainbox');
    showStep('step1');
    resetWizard();
  };
  
  container.appendChild(btnNuova);
}

function getBadgeClass(stato) {
  if (stato === 'Completato') return 'success';
  if (stato === 'In corso') return 'warning';
  return 'info';
}

// ========== MODIFICA PRENOTAZIONE ==========
window.apriModificaPrenotazione = function(idPrenotazione) {
  const prenotazione = prenotazioniMap.get(idPrenotazione);
  if (!prenotazione) {
    showToast('⚠️ Prenotazione non trovata', 'error');
    return;
  }
  
  // Verifica se è modificabile (almeno 7 giorni prima)
  const dataInizio = prenotazione['Giorno inizio noleggio'];
  const diff = calcolaGiorniDifferenza(dataInizio);
  
  if (diff < 7) {
    showToast('⚠️ Non è possibile modificare prenotazioni con partenza entro 7 giorni', 'error');
    return;
  }
  
  const container = qs('modifica-form-content');
  if (!container) return;
  
  container.innerHTML = `
    <form id="form-modifica-prenotazione">
      <input type="hidden" id="mod-id-prenotazione" value="${idPrenotazione}" />
      
      <label for="mod-nome">Nome e Cognome</label>
      <input type="text" id="mod-nome" value="${prenotazione.Nome || ''}" required />
      
      <label for="mod-data-nascita">Data di nascita</label>
      <input type="date" id="mod-data-nascita" value="${convertiDataPerInput(prenotazione['Data di nascita'])}" required />
      
      <label for="mod-luogo-nascita">Luogo di nascita</label>
      <input type="text" id="mod-luogo-nascita" value="${prenotazione['Luogo di nascita'] || ''}" required />
      
      <label for="mod-cf">Codice fiscale</label>
      <input type="text" id="mod-cf" value="${prenotazione['Codice fiscale'] || ''}" required maxlength="16" style="text-transform: uppercase;" />
      
      <label for="mod-comune-res">Comune di residenza</label>
      <input type="text" id="mod-comune-res" value="${prenotazione['Comune di residenza'] || ''}" required />
      
      <label for="mod-via-res">Via di residenza</label>
      <input type="text" id="mod-via-res" value="${prenotazione['Via di residenza'] || ''}" required />
      
      <label for="mod-civico-res">Civico di residenza</label>
      <input type="text" id="mod-civico-res" value="${prenotazione['Civico di residenza'] || ''}" />
      
      <label for="mod-numero-patente">Numero di patente</label>
      <input type="text" id="mod-numero-patente" value="${prenotazione['Numero di patente'] || ''}" required />
      
      <label for="mod-inizio-patente">Data inizio validità patente</label>
      <input type="date" id="mod-inizio-patente" value="${convertiDataPerInput(prenotazione['Data inizio validità patente'])}" required />
      
      <label for="mod-scadenza-patente">Scadenza patente</label>
      <input type="date" id="mod-scadenza-patente" value="${convertiDataPerInput(prenotazione['Scadenza patente'])}" required />
      
      <label for="mod-targa">Targa</label>
      <input type="text" id="mod-targa" value="${prenotazione.targa || prenotazione.Targa || ''}" readonly />
      
      <label for="mod-ora-inizio">Ora inizio noleggio</label>
      <select id="mod-ora-inizio" required>
        <option value="08:00" ${prenotazione['Ora inizio noleggio'] === '08:00' ? 'selected' : ''}>08:00</option>
        <option value="12:00" ${prenotazione['Ora inizio noleggio'] === '12:00' ? 'selected' : ''}>12:00</option>
        <option value="16:00" ${prenotazione['Ora inizio noleggio'] === '16:00' ? 'selected' : ''}>16:00</option>
        <option value="20:00" ${prenotazione['Ora inizio noleggio'] === '20:00' ? 'selected' : ''}>20:00</option>
      </select>
      
      <label for="mod-ora-fine">Ora fine noleggio</label>
      <select id="mod-ora-fine" required>
        <option value="08:00" ${prenotazione['Ora fine noleggio'] === '08:00' ? 'selected' : ''}>08:00</option>
        <option value="12:00" ${prenotazione['Ora fine noleggio'] === '12:00' ? 'selected' : ''}>12:00</option>
        <option value="16:00" ${prenotazione['Ora fine noleggio'] === '16:00' ? 'selected' : ''}>16:00</option>
        <option value="20:00" ${prenotazione['Ora fine noleggio'] === '20:00' ? 'selected' : ''}>20:00</option>
      </select>
      
      <label for="mod-giorno-inizio">Giorno inizio noleggio</label>
      <input type="date" id="mod-giorno-inizio" value="${convertiDataPerInput(prenotazione['Giorno inizio noleggio'])}" required />
      
      <label for="mod-giorno-fine">Giorno fine noleggio</label>
      <input type="date" id="mod-giorno-fine" value="${convertiDataPerInput(prenotazione['Giorno fine noleggio'])}" required />
      
      <label for="mod-cellulare">Cellulare</label>
      <input type="tel" id="mod-cellulare" value="${prenotazione.Cellulare || ''}" required />
      
      <div class="actions">
        <button type="button" class="btn btn--secondary" onclick="routeTo('area-personale')">Annulla</button>
        <button type="submit" class="btn btn--primary">Salva modifiche</button>
      </div>
    </form>
  `;
  
  // Auto-uppercase CF
  const cfInput = qs('mod-cf');
  if (cfInput) {
    cfInput.addEventListener('input', () => {
      cfInput.value = cfInput.value.toUpperCase();
    });
  }
  
  // Submit form
  qs('form-modifica-prenotazione').onsubmit = async (e) => {
    e.preventDefault();
    await salvaModifichePrenotazione();
  };
  
  routeTo('modifica-prenotazione');
};

async function salvaModifichePrenotazione() {
  showLoader(true);
  
  try {
    const idPrenotazione = qs('mod-id-prenotazione').value;
    
    const payload = {
      action: 'update',
      idPrenotazione: idPrenotazione,
      'Nome': qs('mod-nome').value.trim(),
      'Data di nascita': qs('mod-data-nascita').value,
      'Luogo di nascita': qs('mod-luogo-nascita').value.trim(),
      'Codice fiscale': qs('mod-cf').value.trim().toUpperCase(),
      'Comune di residenza': qs('mod-comune-res').value.trim(),
      'Via di residenza': qs('mod-via-res').value.trim(),
      'Civico di residenza': qs('mod-civico-res').value.trim(),
      'Numero di patente': qs('mod-numero-patente').value.trim(),
      'Data inizio validità patente': qs('mod-inizio-patente').value,
      'Scadenza patente': qs('mod-scadenza-patente').value,
      'Ora inizio noleggio': qs('mod-ora-inizio').value,
      'Ora fine noleggio': qs('mod-ora-fine').value,
      'Giorno inizio noleggio': qs('mod-giorno-inizio').value,
      'Giorno fine noleggio': qs('mod-giorno-fine').value,
      'Cellulare': qs('mod-cellulare').value.trim()
    };
    
    const response = await postFormEncoded(SCRIPTS.manageBooking, payload);
    
    if (response.success) {
      showToast('✅ Prenotazione modificata con successo!');
      
      // Invalida cache
      const cf = payload['Codice fiscale'];
      await Promise.all([
        invalidateCacheDatiCliente(cf),
        invalidateCachePrenotazioni(cf)
      ]);
      
      // Ricarica prenotazioni
      const prenResp = await fetchJSON(SCRIPTS.prenotazioni, { cf: cf });
      if (prenResp.success && prenResp.prenotazioni) {
        prenotazioniMap.clear();
        prenResp.prenotazioni.forEach(p => {
          const id = p['ID prenotazione'];
          if (id) prenotazioniMap.set(id, p);
        });
      }
      
      mostraAreaPersonale();
      routeTo('area-personale');
    } else {
      showToast('❌ ' + (response.error || 'Errore durante la modifica'), 'error');
    }
  } catch (err) {
    console.error('Errore salvataggio modifiche:', err);
    showToast('❌ Errore durante il salvataggio', 'error');
  } finally {
    showLoader(false);
  }
}

// ========== ELIMINA PRENOTAZIONE ==========
window.eliminaPrenotazione = function(idPrenotazione) {
  const prenotazione = prenotazioniMap.get(idPrenotazione);
  if (!prenotazione) return;
  
  // Verifica se è eliminabile (almeno 7 giorni prima)
  const dataInizio = prenotazione['Giorno inizio noleggio'];
  const diff = calcolaGiorniDifferenza(dataInizio);
  
  if (diff < 7) {
    showToast('⚠️ Non è possibile eliminare prenotazioni con partenza entro 7 giorni', 'error');
    return;
  }
  
  if (!confirm(`Sei sicuro di voler eliminare la prenotazione ${idPrenotazione}?`)) {
    return;
  }
  
  eseguiEliminaPrenotazione(idPrenotazione);
};

async function eseguiEliminaPrenotazione(idPrenotazione) {
  showLoader(true);
  
  try {
    const payload = {
      action: 'delete',
      idPrenotazione: idPrenotazione
    };
    
    const response = await postFormEncoded(SCRIPTS.manageBooking, payload);
    
    if (response.success) {
      showToast('✅ Prenotazione eliminata con successo!');
      
      // Rimuovi dalla mappa locale
      prenotazioniMap.delete(idPrenotazione);
      
      // Invalida cache
      if (loggedCustomerData) {
        const cf = loggedCustomerData.codiceFiscale;
        await Promise.all([
          invalidateCacheDatiCliente(cf),
          invalidateCachePrenotazioni(cf)
        ]);
      }
      
      mostraAreaPersonale();
    } else {
      showToast('❌ ' + (response.error || 'Errore durante l\'eliminazione'), 'error');
    }
  } catch (err) {
    console.error('Errore eliminazione:', err);
    showToast('❌ Errore durante l\'eliminazione', 'error');
  } finally {
    showLoader(false);
  }
}

// ========== UTILITY DATE ==========
function convertiDataPerInput(dataIT) {
  if (!dataIT) return '';
  
  // Se già in formato ISO (yyyy-mm-dd)
  if (/^\d{4}-\d{2}-\d{2}$/.test(dataIT)) {
    return dataIT;
  }
  
  // Se in formato italiano (dd/mm/yyyy)
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(dataIT)) {
    const [d, m, y] = dataIT.split('/');
    return `${y}-${m}-${d}`;
  }
  
  return '';
}

function calcolaGiorniDifferenza(dataInizioBolla) {
  try {
    const dataInizio = convertiDataPerInput(dataInizioBolla);
    if (!dataInizio) return 999;
    
    const oggi = new Date();
    oggi.setHours(0, 0, 0, 0);
    
    const inizio = new Date(dataInizio);
    inizio.setHours(0, 0, 0, 0);
    
    const diffMs = inizio - oggi;
    const diffGiorni = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    return diffGiorni;
  } catch (e) {
    return 999;
  }
}
// ========== DIAGNOSTICA ==========
window.imbrianiDebug = function() {
  console.group('🔧 Diagnostica Imbriani Noleggio');
  console.log('Versione:', APP_VERSION);
  console.log('Build:', BUILD_DATE);
  console.log('Utente loggato:', !!loggedCustomerData);
  if (loggedCustomerData) {
    console.log('Nome:', loggedCustomerData.nomeCognome);
    console.log('CF:', loggedCustomerData.codiceFiscale);
    console.log('Cellulare:', loggedCustomerData.cellulare);
  }
  console.log('Prenotazioni caricate:', prenotazioniMap.size);
  console.log('Pulmino selezionato:', pulminoSelezionato?.nome || 'Nessuno');
  console.log('Endpoints:', SCRIPTS);
  console.groupEnd();
};

console.log('%c💡 Tip: Digita imbrianiDebug() nella console per info dettagliate', 'color: #999; font-style: italic;');

// ========== INIT ==========
document.addEventListener('DOMContentLoaded', () => {
  setupSiteTitle();
  setupLoginForm();
  setupNewBooking();
  setupWizard();
  
  // Gestione pulsanti indietro nei vari step
  document.querySelectorAll('.btn-back').forEach(btn => {
    btn.onclick = () => {
      const target = btn.getAttribute('data-target');
      if (target) {
        showStep(target);
      } else {
        routeTo('area-personale');
      }
    };
  });
  
  console.log('✅ Imbriani Noleggio v5.3.7 inizializzato');
});
