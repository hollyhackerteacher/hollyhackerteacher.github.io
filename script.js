
// Smooth scroll
document.querySelectorAll('a[href^="#"]').forEach(a=>{
  a.addEventListener('click', (e)=>{
    const href=a.getAttribute('href');
    if(href && href.length>1){
      e.preventDefault();
      document.querySelector(href)?.scrollIntoView({behavior:'smooth'});
    }
  });
});

// Mobile menu
const toggle = document.querySelector('.menu-toggle');
if(toggle){
  toggle.addEventListener('click', ()=>{
    const links=document.querySelector('.nav__links');
    if(links) links.style.display = (links.style.display==='flex') ? 'none' : 'flex';
  });
}

// Gallery
fetch('./assets/gallery.json').then(r=>r.json()).then(items=>{
  // Gallery + Lightbox
const lightbox = document.getElementById('lightbox');
const lbImg = document.getElementById('lightbox-img');
const lbTitle = document.getElementById('lightbox-title');
const lbCaption = document.getElementById('lightbox-caption');

function openLightbox({ src, title, caption }) {
  if (!lightbox || !lbImg) return;
  lbImg.src = src;
  lbImg.alt = title || 'Gallery image';
  if (lbTitle) lbTitle.textContent = title || '';
  if (lbCaption) lbCaption.textContent = caption || '';
  lightbox.classList.add('is-open');
  lightbox.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';
}

function closeLightbox() {
  if (!lightbox) return;
  lightbox.classList.remove('is-open');
  lightbox.setAttribute('aria-hidden', 'true');
  document.body.style.overflow = '';
  if (lbImg) lbImg.src = '';
}

// Close actions
if (lightbox) {
  lightbox.addEventListener('click', (e) => {
    const t = e.target;
    if (t && t.dataset && t.dataset.close) closeLightbox();
  });
}
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && lightbox?.classList.contains('is-open')) closeLightbox();
});

fetch('./assets/gallery.json')
  .then(r => r.json())
  .then(items => {
    const grid = document.querySelector('.gallery');
    if (!grid) return;
    grid.innerHTML = '';

    items.filter(i => i.src).forEach(item => {
      const fig = document.createElement('figure');

      const img = document.createElement('img');
      img.src = item.src;
      img.alt = item.title || 'Minibadge photo';
      img.loading = "lazy";
      img.addEventListener('click', () => openLightbox(item));

      const cap = document.createElement('figcaption');
      cap.textContent = item.caption || '';

      fig.appendChild(img);
      fig.appendChild(cap);
      grid.appendChild(fig);
    });
  })
  .catch(() => {});


// Testimonials
fetch('./assets/testimonials.json').then(r=>r.json()).then(items=>{
  const wrap=document.querySelector('#references .cards');
  if(!wrap) return;
  wrap.innerHTML='';
  items.forEach(t=>{
    const card=document.createElement('div');
    card.className='card';
    const p=document.createElement('p');
    p.textContent='“'+t.quote+'”';
    const a=document.createElement('p');
    a.style.marginTop='.6rem';
    a.style.color='var(--muted)';
    a.textContent='— '+(t.author||'Client');
    card.appendChild(p); card.appendChild(a);
    wrap.appendChild(card);
  });
}).catch(()=>{});

// Contact protection + email reveal
(function(){
  const form=document.getElementById('contact-form');
  if(!form) return;
  const started=Date.now();
  const ts=document.getElementById('submitted_at');
  if(ts) ts.value=new Date().toISOString();
  form.addEventListener('submit',(e)=>{
    if(form.website && form.website.value){ e.preventDefault(); return false; }
    if(Date.now()-started < 4500){ e.preventDefault(); alert('Please take a moment to complete the form.'); return false; }
  });

  const btn=document.getElementById('reveal-email');
  const slot=document.getElementById('email-slot');
  if(btn && slot){
    // Replace with your real email before deploying:
    const reversed='moc.liamg@tluobretif'.split('').reverse().join('');
    btn.addEventListener('click', ()=>{
      slot.textContent=reversed;
      btn.style.display='none';
    });
  }
})();
