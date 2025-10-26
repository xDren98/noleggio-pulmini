function salvaStatoTemporaneo(bookingData) {
  if (!bookingData || Object.keys(bookingData).length === 0) return;
  try {
    sessionStorage.setItem('bookingData', JSON.stringify(bookingData));
  } catch (e) {
    console.warn('Salvataggio stato temporaneo fallito', e);
  }
}

function caricaStatoTemporaneo() {
  try {
    const data = sessionStorage.getItem('bookingData');
    return data ? JSON.parse(data) : null;
  } catch (e) {
    console.warn('Caricamento stato temporaneo fallito', e);
    return null;
  }
}

function cancellaStatoTemporaneo() {
  try {
    sessionStorage.removeItem('bookingData');
  } catch (e) {
    console.warn('Cancellazione stato temporaneo fallita', e);
  }
}

export { salvaStatoTemporaneo, caricaStatoTemporaneo, cancellaStatoTemporaneo };
