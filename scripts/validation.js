export function validaCodiceFiscale(cf) {
  const regex = /^[A-Z]{6}[0-9]{2}[A-Z][0-9]{2}[A-Z][0-9]{3}[A-Z]$/;
  return regex.test(cf.toUpperCase());
}

export function validaTelefono(tel) {
  const regex = /^[0-9]{10}$/;
  return regex.test(tel.replace(/\s/g, ''));
}

export function validaNomeCognome(nomeCognome) {
  const regex = /^[A-Za-zÀ-ÿ'\-\s]{2,}\s[A-Za-zÀ-ÿ'\-\s]{2,}$/;
  if (!regex.test(nomeCognome.trim())) {
    return { valid: false, error: "Inserisci nome e cognome validi (min 2 caratteri ciascuno)" };
  }
  return { valid: true };
}

export function validaCivico(civico) {
  const regex = /^\d{1,4}(\/[A-Za-z]|[A-Za-z]|\s?(bis|ter))?$/i;
  return regex.test(civico.trim());
}

export function validaDataReale(gg, mm, aa) {
  const giorniMese = [
    31,
    (aa % 4 === 0 && (aa % 100 !== 0 || aa % 400 === 0)) ? 29 : 28,
    31, 30, 31, 30, 31, 31, 30, 31, 30, 31
  ];
  if (gg < 1 || gg > giorniMese[mm - 1]) {
    return { valid: false, error: "Giorno non valido per questo mese" };
  }
  return { valid: true };
}

export function verificaDuplicatiCF(numAutisti, getCF) {
  const cfList = [];
  for (let i = 1; i <= numAutisti; i++) {
    const cf = getCF(i);
    if (cf && cfList.includes(cf)) {
      return { valid: false, duplicato: cf };
    }
    if (cf) cfList.push(cf);
  }
  return { valid: true };
}
