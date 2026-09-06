/* ---- tombol scroll atas/bawah (layar sentuh): klik = 1 langkah, tekan lama = scroll berulang ---- */
(function(){
  const btnUp = document.getElementById('scroll-nav-up');
  const btnDown = document.getElementById('scroll-nav-down');
  if(!btnUp || !btnDown) return;

  let holdTimer = null;

  function doScroll(direction){
    const amount = window.innerHeight * 0.55 * direction; // 1=turun, -1=naik
    window.scrollBy({ top: amount, behavior:'smooth' });
  }

  function startHold(direction){
    doScroll(direction);
    holdTimer = window.setTimeout(function repeat(){
      doScroll(direction);
      holdTimer = window.setTimeout(repeat, 260);
    }, 420);
  }

  function stopHold(){
    window.clearTimeout(holdTimer);
    holdTimer = null;
  }

  btnUp.addEventListener('pointerdown', (e) => { e.preventDefault(); startHold(-1); });
  btnDown.addEventListener('pointerdown', (e) => { e.preventDefault(); startHold(1); });
  ['pointerup', 'pointerleave', 'pointercancel'].forEach((evt) => {
    btnUp.addEventListener(evt, stopHold);
    btnDown.addEventListener(evt, stopHold);
  });
})();

/* ---- gradien closing: muncul dari bawah saat scroll turun, masuk lagi saat scroll naik ---- */
(function(){
  const glow = document.getElementById('closing-glow');
  const closingSection = document.querySelector('.closing');
  if(!glow || !closingSection) return;

  let ticking = false;

  function update(){
    ticking = false;
    const rect = closingSection.getBoundingClientRect();
    const vh = window.innerHeight;
    // 0 saat section masih di bawah layar, mendekati 1 saat top section mencapai atas layar
    let progress = (vh - rect.top) / vh;
    progress = Math.min(1, Math.max(0, progress));

    const translateY = 160 * (1 - progress);
    const scale = 0.85 + 0.18 * progress;
    glow.style.transform = `translate(-50%, ${translateY}px) scale(${scale})`;
    glow.style.opacity = String(progress * 0.85);
  }

  window.addEventListener('scroll', () => {
    if(!ticking){
      ticking = true;
      requestAnimationFrame(update);
    }
  }, { passive:true });
  window.addEventListener('resize', update);
  update();
})();

/* ---- nav bereaksi saat discroll ---- */
(function(){
  const nav = document.querySelector('nav');
  if(!nav) return;
  function onNavScroll(){
    if(window.scrollY > 40){ nav.classList.add('scrolled'); }
    else { nav.classList.remove('scrolled'); }
  }
  window.addEventListener('scroll', onNavScroll, { passive:true });
  onNavScroll();
})();

/* ---- reveal-on-scroll generic (fade-up), replay tiap masuk area pandang ---- */
(function(){
  const revealEls = document.querySelectorAll('.reveal');
  if(!revealEls.length) return;
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if(entry.isIntersecting){
        entry.target.classList.add('in-view');
      } else {
        entry.target.classList.remove('in-view');
      }
    });
  }, { threshold: 0.2 });
  revealEls.forEach((el) => observer.observe(el));
})();

const phone = document.getElementById('phone');
const stage = document.querySelector('.stage');
const titleEl = document.getElementById('stage-title');
const descEl = document.getElementById('stage-desc');
const card = document.getElementById('step-card');

const steps = [
  { title: "Dari sketsa menjadi produk yang berjalan", desc: "Setiap aplikasi dimulai dari percakapan sederhana tentang masalah yang ingin diselesaikan, sebelum menjadi baris kode." },
  { title: "Antarmuka yang teruji, bukan sekadar indah", desc: "Setiap layar diuji dengan pengguna nyata untuk memastikan alur terasa wajar, bukan cuma cantik di mockup." },
  { title: "Rilis dengan tenang, tumbuh bersama", desc: "Kami mendampingi hingga aplikasi berjalan stabil di tangan pengguna pertama, dan siap dikembangkan lebih jauh." }
];

const phoneStates = [
  { rotate:-16, y:40,  scale:0.92 },
  { rotate:0,   y:-6,  scale:1.03 },
  { rotate:16,  y:-42, scale:0.92 }
];

// Perangkat layar sentuh (HP/iPad) dibedakan dari mouse/trackpad,
// supaya scroll di layar sentuh dibiarkan alami (tidak dikunci/di-hijack).
const isTouchDevice = window.matchMedia('(hover: none) and (pointer: coarse)').matches;

let currentIndex = 0;
let isAnimating = false;

function applyPhone(index){
  const s = phoneStates[index];
  phone.style.transform = `translateY(${s.y}px) rotate(${s.rotate}deg) scale(${s.scale})`;
}

function applyCard(index, animate){
  const update = () => {
    titleEl.textContent = steps[index].title;
    descEl.textContent = steps[index].desc;
    card.classList.remove('light', 'dark');
    card.classList.add(index === 1 ? 'dark' : 'light');
  };
  if(!animate){ update(); return; }
  card.classList.add('leaving');
  window.setTimeout(() => {
    update();
    void card.offsetWidth;
    card.classList.remove('leaving');
  }, 260);
}

applyPhone(0);
applyCard(0, false);

function getStageBounds(){
  const rect = stage.getBoundingClientRect();
  const top = window.scrollY + rect.top;
  const bottom = top + stage.offsetHeight - window.innerHeight;
  return { top, bottom };
}

function snapPositions(){
  const { top, bottom } = getStageBounds();
  const n = steps.length - 1;
  return steps.map((_, i) => top + (i * (bottom - top)) / n);
}

/* ============================================================
   MODE DESKTOP (mouse / trackpad): scroll dikunci per 3 langkah
   ============================================================ */
function animateScrollTo(target, duration){
  const startY = window.scrollY;
  const delta = target - startY;
  const startTime = performance.now();
  function frame(now){
    const t = Math.min(1, (now - startTime) / duration);
    const eased = 1 - Math.pow(1 - t, 3);
    window.scrollTo(0, startY + delta * eased);
    if(t < 1){
      requestAnimationFrame(frame);
    } else {
      isAnimating = false;
    }
  }
  requestAnimationFrame(frame);
}

function goToStep(newIndex){
  newIndex = Math.min(steps.length - 1, Math.max(0, newIndex));
  if(newIndex === currentIndex){ isAnimating = false; return; }
  currentIndex = newIndex;
  isAnimating = true;
  animateScrollTo(snapPositions()[currentIndex], 550);
  applyPhone(currentIndex);
  applyCard(currentIndex, true);
}

function handleTick(direction, e){
  const { top, bottom } = getStageBounds();
  if(bottom <= top) return;
  const y = window.scrollY;
  const insideRange = y >= top - 1 && y <= bottom + 1;
  if(!insideRange) return;

  if(isAnimating){ e.preventDefault(); return; }

  const goingDown = direction > 0;
  if(goingDown && currentIndex === steps.length - 1) return; // lanjut ke section berikutnya
  if(!goingDown && currentIndex === 0) return;                // kembali ke section sebelumnya

  e.preventDefault();
  goToStep(currentIndex + (goingDown ? 1 : -1));
}

if(!isTouchDevice){
  window.addEventListener('wheel', (e) => handleTick(e.deltaY, e), { passive:false });

  window.addEventListener('keydown', (e) => {
    const map = { ArrowDown:1, PageDown:1, ArrowUp:-1, PageUp:-1 };
    if(map[e.key] === undefined) return;
    const { top, bottom } = getStageBounds();
    const y = window.scrollY;
    if(y < top - 1 || y > bottom + 1) return;
    handleTick(map[e.key], e);
  });
}

/* ============================================================
   MODE LAYAR SENTUH (HP/iPad): pakai native CSS scroll-snap
   (scroll-snap-stop:always) supaya 1 swipe = 1 langkah, jauh
   lebih stabil daripada menahan scroll manual lewat JS.
   ============================================================ */
if(isTouchDevice){
  const markers = document.querySelectorAll('.snap-marker');

  function positionMarkers(){
    const travel = stage.offsetHeight - window.innerHeight;
    markers.forEach((m) => {
      const n = parseInt(m.dataset.marker, 10);
      m.style.top = `${(travel * n) / 2}px`;
    });
  }
  positionMarkers();

  let resizeTimer;
  window.addEventListener('resize', () => {
    window.clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(positionMarkers, 150);
  });
  window.addEventListener('orientationchange', () => {
    window.setTimeout(positionMarkers, 200);
  });

  let ticking = false;

  function updateFromScroll(){
    ticking = false;
    const { top, bottom } = getStageBounds();
    if(bottom <= top) return;
    const y = window.scrollY;
    const raw = (y - top) / (bottom - top);
    const progress = Math.min(1, Math.max(0, raw));
    const nearest = Math.round(progress * (steps.length - 1));

    if(nearest !== currentIndex){
      currentIndex = nearest;
      applyPhone(currentIndex);
      applyCard(currentIndex, true);
    }
  }

  window.addEventListener('scroll', () => {
    if(!ticking){
      ticking = true;
      requestAnimationFrame(updateFromScroll);
    }
  }, { passive:true });
}

/* ---- animasi kartu tim: masuk bergantian dari kanan, retract & replay saat keluar-masuk viewport ---- */
(function(){
  const cardsWrap = document.querySelector('.team-cards');
  if(!cardsWrap) return;
  const cards = Array.from(cardsWrap.querySelectorAll('.team-card'));
  if(!cards.length) return;

  const OFFSET = 260;      // jarak awal di luar layar sebelah kanan
  const STAGGER = 140;     // jeda antar kartu saat masuk bergantian
  const ENTER_DURATION = 700;

  cards.forEach((c) => {
    c.style.transition = 'transform .7s cubic-bezier(.22,.68,0,1.02), opacity .5s ease';
  });

  function resetCards(){
    cards.forEach((c) => {
      c.classList.remove('duo-pulse');
      c.style.transform = `translateX(${OFFSET}px)`;
      c.style.opacity = '0';
    });
  }
  resetCards();

  let playing = false;
  let played = false;
  let timers = [];

  function clearTimers(){
    timers.forEach((t) => window.clearTimeout(t));
    timers = [];
  }

  function playSequence(){
    if(played || playing) return;
    playing = true;

    cards.forEach((c, i) => {
      timers.push(window.setTimeout(() => {
        c.style.transform = 'translateX(0)';
        c.style.opacity = '1';
      }, i * STAGGER));
    });

    const finishAt = (cards.length - 1) * STAGGER + ENTER_DURATION + 150;
    timers.push(window.setTimeout(() => {
      cards.forEach((c) => c.classList.add('duo-pulse'));
      playing = false;
      played = true;
    }, finishAt));
  }

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if(entry.isIntersecting && entry.intersectionRatio >= 0.35){
        playSequence();
      } else if(!entry.isIntersecting){
        // section keluar dari layar (scroll ke atas maupun ke bawah) -> reset untuk diputar ulang
        clearTimers();
        playing = false;
        played = false;
        resetCards();
      }
    });
  }, { threshold: [0, 0.35] });
  observer.observe(cardsWrap);
})();
