// ui.js

const CONTATTO_PROPRIETARIO = '328 658 9618';

export function mostraErrore(messaggio) {
  const errorDiv = document.createElement('div');
  errorDiv.style.cssText = `position: fixed; top: 80px; right: 24px; padding: 16px 20px; background: rgba(255, 230, 230, 0.95); color: #c00; border: 1px solid rgba(192, 0, 0, 0.3); border-left: 4px solid #c00; border-radius: 12px; box-shadow: 0 10px 25px rgba(0,0,0,0.2); z-index: 10000; font-size: 14px; font-weight: 500; max-width: 420px; display: flex; align-items: center; gap: 12px; animation: slideInRight 0.3s ease-out;`;
  errorDiv.innerHTML = `<span style="font-size: 24px;">⚠️</span><span>${messaggio}</span>`;
  document.body.prepend(errorDiv);
  setTimeout(() => {
    errorDiv.style.transition = 'all 0.3s ease-out';
    errorDiv.style.transform = 'translateX(450px)';
    errorDiv.style.opacity = '0';
    setTimeout(() => errorDiv.remove(), 300);
  }, 4000);
}

export function mostraSuccesso(messaggio) {
  const successDiv = document.createElement('div');
  successDiv.style.cssText = `position: fixed; top: 80px; right: 24px; padding: 16px 20px; background: rgba(230, 255, 230, 0.95); color: #0a0; border: 1px solid rgba(0, 170, 0, 0.3); border-left: 4px solid #0a0; border-radius: 12px; box-shadow: 0 10px 25px rgba(0,0,0,0.2); z-index: 10000; font-size: 14px; font-weight: 500; max-width: 420px; display: flex; align-items: center; gap: 12px; animation: slideInRight 0.3s ease-out;`;
  successDiv.innerHTML = `<span style="font-size: 24px;">✅</span><span>${messaggio}</span>`;
  document.body.prepend(successDiv);
  setTimeout(() => {
    successDiv.style.transition = 'all 0.3s ease-out';
    successDiv.style.transform = 'translateX(450px)';
    successDiv.style.opacity = '0';
    setTimeout(() => successDiv.remove(), 300);
  }, 4000);
}

export function mostraLoading(show = true) {
  let loader = document.getElementById('globalLoader');
  if (show) {
    if (!loader) {
      loader = document.createElement('div');
      loader.id = 'globalLoader';
      loader.style.cssText = `position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0, 0, 0, 0.7); display: flex; align-items: center; justify-content: center; z-index: 9999; backdrop-filter: blur(4px);`;
      loader.innerHTML = `<div style="text-align: center; color: white;"><div style="border: 4px solid rgba(255, 255, 255, 0.3); border-top: 4px solid #fff; border-radius: 50%; width: 56px; height: 56px; animation: spin 0.8s linear infinite; margin: 0 auto 20px;"></div><p style="font-size: 16px; font-weight: 500;">Caricamento in corso...</p></div>`;
      document.body.appendChild(loader);
      if (!document.getElementById('spinAnimation')) {
        const style = document.createElement('style');
        style.id = 'spinAnimation';
        style.textContent = `
          @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
          @keyframes slideInRight { from { transform: translateX(450px); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
          @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
          @keyframes fadeOut { from { opacity: 1; } to { opacity: 0; } }
        `;
        document.head.appendChild(style);
      }
    }
    loader.style.display = 'flex';
  } else {
    if (loader) loader.style.display = 'none';
  }
}

export function aggiornaIndicatoreProgresso(stepCorrente) {
  let progressBar = document.getElementById('progress-indicator');
  if (!progressBar) {
    progressBar = document.createElement('div');
    progressBar.id = 'progress-indicator';
    progressBar.style.cssText = `
      position: fixed;
      top: 0; left: 0;
      width: 100%;
      background: var(--color-surface);
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      z-index: 1000;
      padding: 12px 20px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      font-size: 14px;
      font-weight: 500;
    `;
    document.body.prepend(progressBar);
  }

  const stepNames = {
    'step1': 'Date e Orari',
    'step2': 'Selezione Pulmino',
    'step3': 'Dati Autisti',
    'step4': 'Conferma'
  };

  const stepNumbers = {
    'step1': 1,
    'step2': 2,
    'step3': 3,
    'step4': 4
  };

  const currentNum = stepNumbers[stepCorrente] || 1;
  const currentName = stepNames[stepCorrente] || '';
  const percentage = (currentNum / 4) * 100;

  progressBar.innerHTML = `
    <div style="flex: 1;">
      <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 8px;">
        <span style="color: var(--color-primary); font-weight: 600;">Step ${currentNum} di 4</span>
        <span style="color: var(--color-text-secondary);">${currentName}</span>
      </div>
      <div style="height: 4px; background: var(--color-secondary); border-radius: 4px; overflow: hidden;">
        <div style="height: 100%; background: var(--color-primary); width: ${percentage}%; transition: width 0.3s ease;"></div>
      </div>
    </div>
  `;
}

export function nascondiIndicatoreProgresso() {
  const progressBar = document.getElementById('progress-indicator');
  if (progressBar) progressBar.style.display = 'none';
}

export function mostraIndicatoreProgresso() {
  const progressBar = document.getElementById('progress-indicator');
  if (progressBar) progressBar.style.display = 'flex';
}

export function mostraAvvisoContatto() {
  const existingBanner = document.getElementById('contact-banner');
  if (existingBanner) existingBanner.remove();

  const banner = document.createElement('div');
  banner.id = 'contact-banner';
  banner.style.cssText = `background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 12px; margin: 20px 0; box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2); animation: slideInRight 0.3s ease-out;`;
  banner.innerHTML = `
    <div style="display: flex; align-items: center; gap: 16px;">
      <span style="font-size: 48px;">📞</span>
      <div style="flex: 1;">
        <h3 style="margin: 0 0 8px 0; font-size: 18px; font-weight: 600;">Prima di continuare</h3>
        <p style="margin: 0 0 12px 0; font-size: 14px; opacity: 0.9;">Contatta il proprietario per concordare il prezzo del noleggio</p>
        <a href="tel:${CONTATTO_PROPRIETARIO.replace(/\s/g, '')}" style="display: inline-flex; align-items: center; gap: 8px; background: white; color: #667eea; padding: 10px 20px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px; transition: transform 0.2s;">
          <span class="material-icons" style="font-size: 20px;">phone</span>${CONTATTO_PROPRIETARIO}
        </a>
      </div>
    </div>
  `;

  const step2 = document.getElementById('step2');
  const selectContainer = step2.querySelector('#scelta_pulmino').parentElement;
  selectContainer.parentNode.insertBefore(banner, selectContainer.nextSibling);
}

export function showStep(stepId) {
  const steps = document.querySelectorAll('.step');
  steps.forEach(step => {
    step.style.display = (step.id === stepId) ? 'block' : 'none';
  });
}
