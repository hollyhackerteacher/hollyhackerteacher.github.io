// Reuse the site's existing Zoho form. Requests are stored by Zoho, never in this
// public repository or browser storage. The referrer distinguishes this list.
export const REQUEST_REFERRER = 'gummi-bears-special-run-ack-v1';
const FORM_ID = 'NaoV1gLlQOfG6ZZWhldfTg1MUe3XkddRGGMDCMdsx-8';
const FORM_ORIGIN = 'https://forms.zohopublic.com';
export const REQUEST_FORM_URL = `${FORM_ORIGIN}/davidbowmanfirebolt1/form/ContactUs/formperma/${FORM_ID}?zf_rszfm=1&referrername=${REQUEST_REFERRER}`;

export function initRequestForm() {
  const consentForm = document.getElementById('request-consent');
  const acknowledgement = document.getElementById('special-run-acknowledgement');
  const request = document.getElementById('request-form');
  const embed = document.getElementById('request-form-embed');
  const link = document.getElementById('request-form-link');
  const button = consentForm.querySelector('button');
  let iframe;

  // Always require a fresh acknowledgement, including on back/forward restores.
  function reset() {
    acknowledgement.checked = false;
    request.hidden = true;
    embed.replaceChildren();
    link.removeAttribute('href');
    button.setAttribute('aria-expanded', 'false');
    iframe = null;
  }
  reset();
  window.addEventListener('pageshow', reset);

  consentForm.addEventListener('submit', event => {
    event.preventDefault();
    if (!acknowledgement.checked || !consentForm.reportValidity()) return;
    if (!iframe) {
      iframe = document.createElement('iframe');
      iframe.title = 'Gummi Bears special-run request form';
      iframe.setAttribute('aria-describedby', 'request-instructions');
      iframe.src = REQUEST_FORM_URL;
      embed.append(iframe);
      link.href = REQUEST_FORM_URL;
    }
    request.hidden = false;
    button.setAttribute('aria-expanded', 'true');
    document.getElementById('request-form-heading').focus();
  });

  acknowledgement.addEventListener('change', () => {
    if (!acknowledgement.checked) reset();
  });

  // Accept resize messages only from this exact embedded form window and origin.
  window.addEventListener('message', event => {
    if (!iframe || event.source !== iframe.contentWindow ||
        event.origin !== FORM_ORIGIN || typeof event.data !== 'string') return;
    const [id, height] = event.data.split('|');
    const pixels = Number(height);
    if (id === FORM_ID && Number.isInteger(pixels) && pixels >= 300 && pixels <= 2000) {
      iframe.style.height = `${pixels + 20}px`;
    }
  });

  const year = document.getElementById('shop-year');
  if (year) year.textContent = new Date().getFullYear();
}

if (typeof document !== 'undefined') initRequestForm();
