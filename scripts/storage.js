// storage.js

export function salvaStatoTemporaneo(bookingData) {
  if (!bookingData || Object.keys(bookingData).length === 0) return;
  try {
    sessionStorage.setItem('imbriani_booking_temp', JSON.stringify(bookingData));
    console.log('💾 Dati salvati temporaneamente');
  } catch (e) {
    console.error('Errore salvataggio temporaneo:', e);
  }
}

export function caricaStatoTemporaneo() {
  try {
    const saved = sessionStorage.getItem('imbriani_booking_temp');
    if (saved) {
      const dati = JSON.parse(saved);
      console.log('📂 Dati temporanei caricati');
      return dati;
    }
  } catch (e) {
    console.error('Errore caricamento temporaneo:', e);
  }
  return null;
}

export function cancellaStatoTemporaneo() {
  try {
    sessionStorage.removeItem('imbriani_booking_temp');
    console.log('🗑️ Dati temporanei cancellati');
  } catch (e) {
    console.error('Errore cancellazione temporanea:', e);
  }
}
