const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const hasGsap = typeof gsap !== 'undefined';
if (hasGsap) gsap.registerPlugin(ScrollTrigger);

/* ---------- smooth scroll (Lenis) ---------- */
let lenis = null;
if (!reduce && typeof Lenis !== 'undefined') {
  lenis = new Lenis({ lerp: 0.09, smoothWheel: true });
  (function raf(t){ lenis.raf(t); requestAnimationFrame(raf); })();
  if (hasGsap) lenis.on('scroll', ScrollTrigger.update);
}
document.querySelectorAll('a[href^="#"]').forEach(a => {
  a.addEventListener('click', e => {
    const t = document.querySelector(a.getAttribute('href'));
    if (!t) return;
    e.preventDefault();
    lenis ? lenis.scrollTo(t, { duration: 1.4 }) : t.scrollIntoView({ behavior: 'smooth' });
  });
});
document.getElementById('top-btn').addEventListener('click', () => {
  lenis ? lenis.scrollTo(0, { duration: 1.4 }) : window.scrollTo({ top: 0, behavior: 'smooth' });
});

/* ---------- scroll progress line ---------- */
(function(){
  const bar = document.querySelector('#progress span');
  function upd(){
    const h = document.documentElement;
    bar.style.transform = `scaleY(${h.scrollTop / (h.scrollHeight - h.clientHeight || 1)})`;
  }
  window.addEventListener('scroll', upd, { passive: true });
  if (lenis) lenis.on('scroll', upd);
  upd();
})();

/* ---------- split hero name into letters ---------- */
document.querySelectorAll('h1 .split').forEach(el => {
  el.outerHTML = [...el.textContent].map(ch =>
    `<span class="ltr">${ch === ' ' ? '&nbsp;' : ch}</span>`
  ).join('');
});

/* ---------- split section titles into words ----------
   Each word gets wrapped in a mask (.tw) with an inner span,
   so it can rise + fade in word-by-word on scroll. */
function splitTitle(h2){
  const frag = document.createDocumentFragment();
  [...h2.childNodes].forEach(node => {
    if (node.nodeType === 3) {                       // plain text
      node.textContent.split(/(\s+)/).forEach(part => {
        if (/^\s+$/.test(part)) frag.appendChild(document.createTextNode(' '));
        else if (part) frag.appendChild(makeWord(part, ''));
      });
    } else if (node.nodeType === 1) {
      if (node.tagName === 'BR') { frag.appendChild(document.createElement('br')); return; }
      const cls = node.className;                    // e.g. serif-i — keep its styling per word
      node.textContent.split(/(\s+)/).forEach(part => {
        if (/^\s+$/.test(part)) frag.appendChild(document.createTextNode(' '));
        else if (part) frag.appendChild(makeWord(part, cls));
      });
    }
  });
  h2.innerHTML = '';
  h2.appendChild(frag);
  h2.classList.add('is-armed');
}
function makeWord(text, innerClass){
  const w = document.createElement('span'); w.className = 'tw';
  const s = document.createElement('span'); s.textContent = text;
  if (innerClass) s.className = innerClass;
  w.appendChild(s);
  return w;
}

/* ---------- preloader ---------- */
(function(){
  const loader = document.getElementById('loader');
  const count = document.getElementById('count');
  if (reduce){ loader.remove(); heroIn(); return; }
  let n = 0;
  const iv = setInterval(() => {
    n += Math.floor(Math.random() * 9) + 3;
    if (n >= 100){
      n = 100; clearInterval(iv);
      setTimeout(() => {
        loader.classList.add('done');
        heroIn();
        setTimeout(() => loader.remove(), 1100);
      }, 350);
    }
    count.textContent = String(n).padStart(3, '0');
  }, 55);
})();

/* ---------- hero entrance (letter stagger) ---------- */
function heroIn(){
  if (!hasGsap || reduce){
    document.querySelectorAll('.hero .mask > *, h1 .ltr').forEach(el => el.style.transform = 'none');
    document.querySelectorAll('.hero .fade').forEach(el => { el.style.opacity = 1; el.style.transform = 'none'; });
    return;
  }
  gsap.to('.hero-role span', { y: 0, duration: 1,   ease: 'power4.out', delay: 0.1 });
  gsap.to('h1 .ltr',         { y: 0, duration: 1.2, ease: 'power4.out', stagger: 0.035, delay: 0.2 });
  gsap.to('h1 .serif-i',     { y: 0, duration: 1.2, ease: 'power4.out', delay: 0.75 });
  gsap.to('.hero-foot',      { opacity: 1, y: 0, duration: 1, ease: 'power3.out', delay: 0.85 });
}

/* ---------- scroll-triggered animations ---------- */
if (hasGsap && !reduce){

  // section titles: word-by-word rise + fade on scroll
  document.querySelectorAll('.title-split').forEach(h2 => {
    splitTitle(h2);
    gsap.to(h2.querySelectorAll('.tw > span'), {
      y: 0, opacity: 1, duration: 1, ease: 'power4.out', stagger: 0.08,
      scrollTrigger: { trigger: h2, start: 'top 86%' }
    });
  });

  // generic fade-ups
  document.querySelectorAll('section .fade').forEach(el => {
    gsap.to(el, { opacity: 1, y: 0, duration: 1, ease: 'power3.out',
      scrollTrigger: { trigger: el, start: 'top 90%' } });
  });

  // about statement: word-by-word lit, scrubbed to scroll
  const st = document.getElementById('statement');
  (function splitStatement(el){
    const frag = document.createDocumentFragment();
    [...el.childNodes].forEach(node => {
      const isEl = node.nodeType === 1;
      const text = node.textContent;
      text.split(/(\s+)/).forEach(part => {
        if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(' ')); return; }
        if (!part) return;
        const w = document.createElement('span');
        w.className = 'w';
        if (isEl) {                       // keep <em> styling per word, no broken tags
          const inner = document.createElement(node.tagName.toLowerCase());
          inner.textContent = part;
          w.appendChild(inner);
        } else {
          w.textContent = part;
        }
        frag.appendChild(w);
      });
    });
    el.innerHTML = '';
    el.appendChild(frag);
  })(st);
  const words = st.querySelectorAll('.w');
  ScrollTrigger.create({
    trigger: st, start: 'top 85%', end: 'top 35%', scrub: 0.4,
    onUpdate(self){
      const k = Math.floor(self.progress * words.length);
      words.forEach((w, i) => w.classList.toggle('lit', i <= k));
    },
    onLeave(){ words.forEach(w => w.classList.add('lit')); }   // safety net: never stuck half-lit
  });

  // marquee: drifts forever, speeds up with scroll velocity
  const mq = document.getElementById('mq');
  const tween = gsap.to(mq, { xPercent: -50, ease: 'none', duration: 24, repeat: -1 });
  ScrollTrigger.create({
    onUpdate(self){
      const v = Math.abs(self.getVelocity()) / 2200;
      gsap.to(tween, { timeScale: 1 + Math.min(v, 3.5), duration: 0.4, overwrite: true });
    }
  });

  // hero drifts up + fades slightly as you scroll past it
  gsap.to('.hero-top', { yPercent: -14, opacity: 0.25, ease: 'none',
    scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } });

} else {
  // no GSAP / reduced motion: show everything immediately
  document.querySelectorAll('.mask > *, h1 .ltr').forEach(el => el.style.transform = 'none');
  document.querySelectorAll('.fade').forEach(el => { el.style.opacity = 1; el.style.transform = 'none'; });
  document.querySelectorAll('.about-state .w').forEach(w => w.classList.add('lit'));
}

/* ---------- custom cursor ---------- */
(function(){
  if (window.matchMedia('(hover: none)').matches) return;
  const dot = document.querySelector('.cursor');
  const ring = document.querySelector('.cursor-ring');
  let mx = -100, my = -100, rx = -100, ry = -100;
  window.addEventListener('mousemove', e => { mx = e.clientX; my = e.clientY; });
  (function loop(){
    rx += (mx - rx) * 0.16; ry += (my - ry) * 0.16;
    dot.style.transform = `translate(${mx}px,${my}px)`;
    ring.style.transform = `translate(${rx}px,${ry}px)`;
    requestAnimationFrame(loop);
  })();
  document.querySelectorAll('a, button, [data-l]').forEach(el => {
    el.addEventListener('mouseenter', () => ring.classList.add('is-link'));
    el.addEventListener('mouseleave', () => ring.classList.remove('is-link'));
  });
})();

/* ---------- magnetic buttons ---------- */
(function(){
  if (reduce || window.matchMedia('(hover: none)').matches) return;
  document.querySelectorAll('.mail-btn').forEach(btn => {
    btn.addEventListener('mousemove', e => {
      const r = btn.getBoundingClientRect();
      btn.style.transform = `translate(${(e.clientX - r.left - r.width/2) * 0.18}px,${(e.clientY - r.top - r.height/2) * 0.3}px)`;
    });
    btn.addEventListener('mouseleave', () => {
      btn.style.transition = 'transform .5s cubic-bezier(.2,.8,.2,1)';
      btn.style.transform = '';
      setTimeout(() => btn.style.transition = '', 500);
    });
  });
})();
/* ---------- live Calgary clock ---------- */
(function(){
  const el = document.getElementById('clock');
  function tick(){
    el.textContent = new Date().toLocaleTimeString('en-CA',
      { hour: '2-digit', minute: '2-digit', timeZone: 'America/Edmonton' }) + ' MT';
  }
  tick(); setInterval(tick, 30000);
})();

/* ============ v5 additions ============ */

/* ---------- click-to-copy email ---------- */
(function(){
  const btn = document.getElementById('copy-email');
  if (!btn) return;
  btn.addEventListener('click', () => {
    navigator.clipboard.writeText('meherarush@gmail.com').then(() => {
      btn.textContent = '[ copied ✓ ]';
      btn.classList.add('copied');
      setTimeout(() => { btn.textContent = '[ copy ]'; btn.classList.remove('copied'); }, 1600);
    });
  });
})();

/* ---------- console easter egg ---------- */
console.log('%cMB.', 'color:#d9a441;font-size:42px;font-weight:bold;font-family:monospace');
console.log(
  '%cYou opened the console. Respect.\nCode lives at github.com/meherb0 — meherarush@gmail.com if you want to talk.',
  'color:#eae7e0;font-size:12px;font-family:monospace'
);