// =====================================================================
// Imbriani Noleggio - Scripts Unificato v2.7.2
// Funzioni Globali: Loader, Validazione, API GAS, Responsive Events
// Unifica scripts.js + admin.js per no duplicazioni
// =====================================================================

// Config Globali
const CONFIG = {
  SHEET_ID: '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms', // Esempio ID Google Sheet
  API_URL: 'https://script.google.com/macros/s/AKfycby.../exec', // Sostituisci con tuo GAS URL
  ADMIN_CREDENTIALS: { user: 'admin', pass: 'secret' }, // Hash in prod
  VEHICLES: {
    'EC787NM': { name: 'Ducato Lungo', price: 80, seats: 9 },
    'DN391FW': { name: 'Ducato Corto', price: 60, seats: 6 },
    'DL291XZ': { name: 'Peugeot Expert', price: 50, seats: 5 }
  }
};

// Utility Globali
function showLoader(show = true) {
  const loader = document.getElementById('loader');
  if (loader) loader.classList.toggle('active', show);
}

function showAlert(containerId, message, type = 'error') {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.innerHTML = `<div class="alert ${type}">${message}</div>`;
  setTimeout(() => container.innerHTML = '', 5000);
}

function scrollToSection(id) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
}

// Event Delegation per Responsive (Mobile-First)
document.addEventListener('click', function(e) {
  if (e.target.matches('.vehicle-radio + label')) {
    e.target.parentElement.querySelector('.vehicle-radio').checked = true;
    updateSelectedVehicle();
  }
  if (e.target.matches('.btn-icon')) {
    handleAction(e.target.dataset.action, e.target.dataset.id);
  }
});

// =====================================================================
// Funzioni Index (Prenotazioni Utente)
// =====================================================================
function initIndex() {
  // Listener Date Change
  document.getElementById('dataInizio')?.addEventListener('change', function() {
    const fine = document.getElementById('dataFine');
    if (this.value) fine.min = this.value;
  });

  // Validazione Veicolo
  document.querySelectorAll('input[name="veicolo"]').forEach(radio => {
    radio.addEventListener('change', updateFormState);
  });

  // Validazione Form
  document.getElementById('formPrenotazione')?.addEventListener('input', updateFormState);
  updateFormState(); // Init
}

function controllaDisponibilita() {
  const inizio = document.getElementById('dataInizio').value;
  const fine = document.getElementById('dataFine').value;
  if (!inizio || !fine || new Date(inizio) >= new Date(fine)) {
    showAlert('alertContainer', 'Seleziona date valide.', 'error');
    return;
  }

  showLoader(true);
  fetch(`${CONFIG.API_URL}?action=checkAvailability&start=${inizio}&end=${fine}`)
    .then(res => res.json())
    .then(data => {
      showLoader(false);
      const risultato = document.getElementById('risultatoDisponibilita');
      if (data.available) {
        risultato.innerHTML = `<p class="success-banner">Veicoli disponibili: ${data.vehicles.join(', ')}.</p>`;
        document.querySelectorAll('.vehicle-card').forEach(card => {
          if (data.vehicles.includes(card.querySelector('input').value)) {
            card.style.display = 'block';
          } else {
            card.style.display = 'none';
          }
        });
      } else {
        risultato.innerHTML = `<p class="error-banner">Nessun veicolo disponibile.</p>`;
        document.querySelectorAll('.vehicle-card').forEach(card => card.style.display = 'none');
      }
    })
    .catch(err => {
      showLoader(false);
      showAlert('alertContainer', 'Errore controllo disponibilità.', 'error');
    });
}

function updateSelectedVehicle() {
  const selected = document.querySelector('input[name="veicolo"]:checked');
  if (selected) {
    const vehicle = CONFIG.VEHICLES[selected.value];
    // Aggiorna UI se necessario, es. prezzo dinamico
    console.log(`Veicolo selezionato: ${vehicle.name}`);
  }
}

function updateFormState() {
  const form = document.getElementById('formPrenotazione');
  const veicolo = document.querySelector('input[name="veicolo"]:checked');
  const termini = document.getElementById('accettaTermini').checked;
  const fields = form.querySelectorAll('input[required], textarea[required]');
  const allFilled = Array.from(fields).every(field => field.value.trim());

  document.getElementById('btnSubmit').disabled = !(veicolo && termini && allFilled);
}

function salvaPrenotazione() {
  const formData = new FormData(document.getElementById('formPrenotazione'));
  const data = Object.fromEntries(formData);
  data.veicolo = document.querySelector('input[name="veicolo"]:checked')?.value;
  data.dataInizio = document.getElementById('dataInizio').value;
  data.dataFine = document.getElementById('dataFine').value;

  if (!data.veicolo) {
    showAlert('alertContainer', 'Seleziona un veicolo.', 'error');
    return;
  }

  showLoader(true);
  fetch(CONFIG.API_URL, {
    method: 'POST',
    body: JSON.stringify({ action: 'saveBooking', ...data }),
    headers: { 'Content-Type': 'application/json' }
  })
  .then(res => res.json())
  .then(result => {
    showLoader(false);
    if (result.success) {
      showAlert('alertContainer', 'Prenotazione salvata! ID: ' + result.id, 'success');
      document.getElementById('formPrenotazione').reset();
      updateFormState();
    } else {
      showAlert('alertContainer', result.error || 'Errore salvataggio.', 'error');
    }
  })
  .catch(err => {
    showLoader(false);
    showAlert('alertContainer', 'Errore connessione.', 'error');
  });
}

// =====================================================================
// Funzioni Admin (Dashboard)
// =====================================================================
function initAdmin() {
  showLoader(true);
  Promise.all([
    caricaPrenotazioni(),
    caricaStatistiche(),
    aggiornaDisponibilitaAdmin()
  ]).then(() => showLoader(false)).catch(() => showLoader(false));
}

function switchSection(sectionId) {
  document.querySelectorAll('[data-section]').forEach(sec => sec.classList.add('hidden'));
  document.getElementById(sectionId).classList.remove('hidden');
  document.getElementById('globalFilters').style.display = sectionId === 'prenotazioni' ? 'flex' : 'none';

  if (sectionId === 'prenotazioni') caricaPrenotazioni();
  if (sectionId === 'statistiche') caricaStatistiche();
}

function loginAdmin() {
  const user = document.getElementById('adminUser').value;
  const pass = document.getElementById('adminPass').value;
  if (user === CONFIG.ADMIN_CREDENTIALS.user && pass === CONFIG.ADMIN_CREDENTIALS.pass) {
    sessionStorage.setItem('adminLoggedIn', 'true');
    document.getElementById('loginOverlay').classList.remove('active');
    initAdmin();
  } else {
    showAlert('alertLogin', 'Credenziali errate.', 'error');
  }
}

function logoutAdmin() {
  sessionStorage.removeItem('adminLoggedIn');
  document.getElementById('loginOverlay').classList.add('active');
  document.getElementById('loginAdmin').reset();
}

function caricaPrenotazioni() {
  showLoader(true);
  fetch(`${CONFIG.API_URL}?action=getBookings`)
    .then(res => res.json())
    .then(data => {
      showLoader(false);
      const tbody = document.getElementById('tbodyPrenotazioni');
      tbody.innerHTML = data.map(booking => `
        <tr>
          <td>${booking.id}</td>
          <td>${booking.cliente}</td>
          <td>${booking.veicolo}</td>
          <td>${booking.dataInizio} - ${booking.dataFine}</td>
          <td><span class="badge ${booking.stato.toLowerCase()}">${booking.stato}</span></td>
          <td>
            <button class="btn-icon" data-action="dettagli" data-id="${booking.id}" title="Dettagli">
              <span class="material-icons">visibility</span>
            </button>
            <button class="btn-icon" data-action="modifica" data-id="${booking.id}" title="Modifica">
              <span class="material-icons">edit</span>
            </button>
            <button class="btn-icon btn--danger" data-action="elimina" data-id="${booking.id}" title="Elimina">
              <span class="material-icons">delete</span>
            </button>
          </td>
        </tr>
      `).join('');
    })
    .catch(err => {
      showLoader(false);
      showAlert('alertAdmin', 'Errore caricamento prenotazioni.', 'error');
    });
}

function handleAction(action, id) {
  switch (action) {
    case 'dettagli':
      apriModaleDettagli(id);
      break;
    case 'modifica':
      modificaPrenotazione(id);
      break;
    case 'elimina':
      if (confirm('Confermi eliminazione?')) cancellaPrenotazione(id);
      break;
  }
}

function apriModaleDettagli(id) {
  showLoader(true);
  fetch(`${CONFIG.API_URL}?action=getBookingDetails&id=${id}`)
    .then(res => res.json())
    .then(data => {
      showLoader(false);
      document.getElementById('contenutoModale').innerHTML = `
        <div class="dettagli-box">
          <p><strong>ID:</strong> ${data.id}</p>
          <p><strong>Cliente:</strong> ${data.cliente} (${data.cellulare})</p>
          <p><strong>Veicolo:</strong> ${data.veicolo}</p>
          <p><strong>Date:</strong> ${data.dataInizio} - ${data.dataFine}</p>
          <p><strong>Stato:</strong> ${data.stato}</p>
          <p><strong>Note:</strong> ${data.note || 'Nessuna'}</p>
        </div>
      `;
      document.getElementById('modalDettagli').classList.add('active');
    })
    .catch(() => showLoader(false));
}

function confermaPrenotazione() {
  const id = document.querySelector('#modalDettagli [data-id]')?.dataset.id || '';
  if (!id) return;
  fetch(CONFIG.API_URL, {
    method: 'POST',
    body: JSON.stringify({ action: 'confirmBooking', id }),
    headers: { 'Content-Type': 'application/json' }
  }).then(() => {
    chiudiModale();
    caricaPrenotazioni();
    caricaStatistiche();
    showAlert('alertAdmin', 'Prenotazione confermata.', 'success');
  });
}

function cancellaPrenotazione(id) {
  fetch(CONFIG.API_URL, {
    method: 'POST',
    body: JSON.stringify({ action: 'deleteBooking', id }),
    headers: { 'Content-Type': 'application/json' }
  }).then(() => {
    chiudiModale();
    caricaPrenotazioni();
    caricaStatistiche();
    showAlert('alertAdmin', 'Prenotazione cancellata.', 'success');
  });
}

function modificaPrenotazione(id) {
  // Apri form modifica (implementa modale simile a dettagli)
  alert('Funzione modifica: implementa form update.'); // Placeholder
}

function chiudiModale() {
  document.getElementById('modalDettagli').classList.remove('active');
}

function caricaStatistiche() {
  fetch(`${CONFIG.API_URL}?action=getStats`)
    .then(res => res.json())
    .then(data => {
      document.getElementById('totPrenotazioni').textContent = data.total;
      document.getElementById('confermate').textContent = data.confermate;
      document.getElementById('inAttesa').textContent = data.inAttesa;
      document.getElementById('totVeicoli').textContent = data.veicoli;
      document.getElementById('totRicavi').textContent = `€${data.ricavi}`;
    });
}

function aggiornaDisponibilitaAdmin() {
  const inizio = document.getElementById('adminDataInizio')?.value;
  const fine = document.getElementById('adminDataFine')?.value;
  fetch(`${CONFIG.API_URL}?action=adminAvailability${inizio ? `&start=${inizio}` : ''}${fine ? `&end=${fine}` : ''}`)
    .then(res => res.json())
    .then(data => {
      document.getElementById('risultatoDisponibilitaAdmin').innerHTML = `
        <p>Disponibili: ${data.available.join(', ')}</p>
        <p>Occupati: ${data.occupied.join(', ') || 'Nessuno'}</p>
      `;
    });
}

// Filtri e Sort
let sortDirection = 1;
function sortTable(col) {
  const table = document.getElementById('tabellaPrenotazioni');
  const tbody = table.tBodies[0];
  const rows = Array.from(tbody.rows);
  rows.sort((a, b) => {
    const aVal = a.cells[col].textContent.trim();
    const bVal = b.cells[col].textContent.trim();
    return aVal.localeCompare(bVal, 'it', { numeric: true }) * sortDirection;
  });
  sortDirection *= -1;
  rows.forEach(row => tbody.appendChild(row));
}

function applicaFiltri() {
  const inizio = document.getElementById('filtroDataInizio').value;
  const fine = document.getElementById('filtroDataFine').value;
  const stato = document.getElementById('filtroStato').value;
  const cliente = document.getElementById('filtroCliente').value.toLowerCase();

  // Filtra tabella client-side (per demo; usa API per grandi dataset)
  const rows = document.querySelectorAll('#tbodyPrenotazioni tr');
  rows.forEach(row => {
    const dataCell = row.cells[3].textContent;
    const statoCell = row.cells[4].textContent.toLowerCase();
    const clienteCell = row.cells[1].textContent.toLowerCase();
    const match = (!inizio || dataCell.includes(inizio)) &&
                  (!fine || dataCell.includes(fine)) &&
                  (!stato || statoCell.includes(stato.toLowerCase())) &&
                  (!cliente || clienteCell.includes(cliente));
    row.style.display = match ? '' : 'none';
  });
}

function resetFiltri() {
  document.getElementById('filtroDataInizio').value = '';
  document.getElementById('filtroDataFine').value = '';
  document.getElementById('filtroStato').value = '';
  document.getElementById('filtroCliente').value = '';
  caricaPrenotazioni(); // Ricarica senza filtri
}

// =====================================================================
// Responsive Enhancements (2025 Best Practices)
// =====================================================================
function initResponsive() {
  // Touch Gestures per Tabelle
  const tables = document.querySelectorAll('.table-responsive');
  tables.forEach(table => {
    let startX = 0;
    table.addEventListener('touchstart', e => startX = e.touches[0].clientX);
    table.addEventListener('touchend', e => {
      const endX = e.changedTouches[0].clientX;
      if (Math.abs(endX - startX) > 50) {
        table.scrollLeft += (startX > endX ? -100 : 100); // Swipe scroll
      }
    });
  });

  // Resize Observer per Grids
  const observer = new ResizeObserver(entries => {
    entries.forEach(entry => {
      const grid = entry.target;
      if (window.innerWidth < 600) {
        grid.style.gridTemplateColumns = '1fr';
      } else if (window.innerWidth < 768) {
        grid.style.gridTemplateColumns = 'repeat(2, 1fr)';
      } else {
        grid.style.gridTemplateColumns = 'repeat(auto-fit, minmax(250px, 1fr))';
      }
    });
  });
  document.querySelectorAll('.vehicles-grid, .stats-grid, .pulmini-grid').forEach(grid => observer.observe(grid));
}

document.addEventListener('DOMContentLoaded', initResponsive);
window.addEventListener('resize', initResponsive);

// Error Handling Globale
window.addEventListener('error', e => {
  console.error('JS Error:', e.error);
  showAlert('alertContainer' || 'alertAdmin', 'Errore interno. Ricarica pagina.', 'error');
});

// Init Finale
if (document.body.classList.contains('admin-page')) {
  // Admin-specific
} else {
  initIndex();
}
