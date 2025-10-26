// validation.js - funzioni di validazione form
const VERSION_VALIDATION = "2.9.0";
console.log(`[validation.js] Versione codice: ${VERSION_VALIDATION}`);

function validaCodiceFiscale(cf) {
  if (!cf) return false;
  const regex = /^[A-Z0-9]{16}$/i;
  return regex.test(cf);
}

function validaTelefono(tel) {
  if (!tel) return false;
  const regex = /^[0-9\+\-\s]{7,15}$/;
  return regex.test(tel);
}

function validaNomeCognome(nome) {
  if (!nome) return false;
  return nome.length > 2;
}

export { validaCodiceFiscale, validaTelefono, validaNomeCognome };
