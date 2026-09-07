/* ============================================================
   AksanusA — interaction layer
   Perbaikan utama:
   - tidak lagi mengandalkan scroll-snap global untuk semua section
   - desktop hanya mengunci scroll ketika benar-benar berada di stage
   - posisi step selalu disinkronkan dengan posisi scroll aktual
   - animasi scroll tidak bertabrakan dengan CSS scroll-behavior
   - tombol sentuh memakai posisi step yang sama dengan stage
   ============================================================ */

/* ---- tombol scroll atas/bawah (layar sentuh): klik = 1 langkah, tekan lama = scroll berulang ---- */
(function(){
  const btnUp = document.getElementById('scroll-nav-up');
  const btnDown = document.getElementById('scroll-nav-down');
  const stage = document.querySelector('.stage');
  if(!btnUp || !btnDown || !stage) return;

  let holdTimer = null;
  let repeatTimer = null;

  function stopHold(){
    window.clearTimeout(holdTimer);
    window.clearTimeout(repeatTimer);
    holdTimer = null;
    repeatTimer = null;
  }

  function getStageBounds(){
    const rect = stage.getBoundingClientRect();
    const top = window.scrollY + rect.top;
    const bottom = top + stage.offsetHeight - window.innerHeight;
    return { top, bottom };
  }

  function getStageStepPositions(count){
    const { top, bottom } = getStageBounds();
    const last = Math.max(1, count - 1);
    return Array.from({length: count}, (_, i) => top + ((bottom - top) * i) / last);
  }

  function scrollOne(direction){
    const positions = getStageStepPositions(3);
    const y = window.scrollY;
    const nearest = positions.reduce((best, pos, i) =>
      Math.abs(pos - y) < Math.abs(positions[best] - y) ? i : best, 0
    );
    const targetIndex = Math.max(0, Math.min(positions.length - 1, nearest + direction));
    const target = positions[targetIndex];

    if(direction < 0 && y <= positions[0] + 2){
      window.scrollBy({ top: -window.innerHeight * 0.82, behavior:'smooth' });
      return;
    }
    if(direction > 0 && y >= positions[positions.length - 1] - 2){
      window.scrollBy({ top: window.innerHeight * 0.82, behavior:'smooth' });
      return;
    }

    window.scrollTo({ top: target, behavior:'smooth' });
  }

  function startHold(direction, e){
    e.preventDefault();
    stopHold();
    scrollOne(direction);
    holdTimer = window.setTimeout(function(){
      repeatTimer = window.setInterval(() => scrollOne(direction), 620);
    }, 520);
  }

  btnUp.addEventListener('pointerdown', (e) => startHold(-1, e));
  btnDown.addEventListener('pointerdown', (e) => startHold(1, e));
  ['pointerup','pointerleave','pointercancel','lostpointercapture'].forEach((evt) => {
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
    nav.classList.toggle('scrolled', window.scrollY > 40);
  }
  window.addEventListener('scroll', onNavScroll, { passive:true });
  onNavScroll();
})();

/* ---- reveal-on-scroll generic (fade-up), replay tiap masuk area pandang ---- */
(function(){
  const revealEls = document.querySelectorAll('.reveal');
  if(!revealEls.length || !('IntersectionObserver' in window)){
    revealEls.forEach(el => el.classList.add('in-view'));
    return;
  }

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      entry.target.classList.toggle('in-view', entry.isIntersecting);
    });
  }, { threshold: 0.2 });

  revealEls.forEach((el) => observer.observe(el));
})();

const phone = document.getElementById('phone');
const stage = document.querySelector('.stage');
const titleEl = document.getElementById('stage-title');
const descEl = document.getElementById('stage-desc');
const card = document.getElementById('step-card');

if(phone && stage && titleEl && descEl && card){
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

  const touchQuery = window.matchMedia('(hover: none) and (pointer: coarse)');
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const isTouchDevice = touchQuery.matches;

  let currentIndex = 0;
  let isAnimating = false;
  let cardTimer = null;
  let scrollAnimationFrame = null;

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

    window.clearTimeout(cardTimer);

    if(!animate || prefersReducedMotion.matches){
      card.classList.remove('leaving');
      update();
      return;
    }

    card.classList.add('leaving');
    cardTimer = window.setTimeout(() => {
      update();
      void card.offsetWidth;
      card.classList.remove('leaving');
    }, 260);
  }

  function getStageBounds(){
    const rect = stage.getBoundingClientRect();
    const top = window.scrollY + rect.top;
    const bottom = top + stage.offsetHeight - window.innerHeight;
    return { top, bottom };
  }

  function snapPositions(){
    const { top, bottom } = getStageBounds();
    const last = Math.max(1, steps.length - 1);
    return steps.map((_, i) => top + ((bottom - top) * i) / last);
  }

  function syncIndexFromScroll(){
    const positions = snapPositions();
    const y = window.scrollY;
    let nearest = 0;
    let nearestDistance = Infinity;

    positions.forEach((pos, i) => {
      const distance = Math.abs(pos - y);
      if(distance < nearestDistance){
        nearest = i;
        nearestDistance = distance;
      }
    });

    if(nearest !== currentIndex){
      currentIndex = nearest;
      applyPhone(currentIndex);
      applyCard(currentIndex, !isTouchDevice);
    }
    return nearest;
  }

  applyPhone(0);
  applyCard(0, false);

  /* ============================================================
     MODE DESKTOP: 1 wheel = 1 step ketika berada di stage.
     Tidak ada CSS smooth scroll yang ikut campur dengan animasi JS.
     ============================================================ */
  function animateScrollTo(target, duration){
    if(scrollAnimationFrame){
      cancelAnimationFrame(scrollAnimationFrame);
      scrollAnimationFrame = null;
    }

    if(prefersReducedMotion.matches){
      window.scrollTo({ top: target, behavior:'auto' });
      isAnimating = false;
      return;
    }

    const startY = window.scrollY;
    const delta = target - startY;
    const startTime = performance.now();

    function frame(now){
      const t = Math.min(1, (now - startTime) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      window.scrollTo({ top:startY + delta * eased, behavior:'auto' });

      if(t < 1){
        scrollAnimationFrame = requestAnimationFrame(frame);
      }else{
        scrollAnimationFrame = null;
        isAnimating = false;
        syncIndexFromScroll();
      }
    }

    scrollAnimationFrame = requestAnimationFrame(frame);
  }

  function goToStep(newIndex){
    const positions = snapPositions();
    newIndex = Math.min(steps.length - 1, Math.max(0, newIndex));

    if(newIndex === currentIndex){
      isAnimating = false;
      return;
    }

    currentIndex = newIndex;
    isAnimating = true;
    applyPhone(currentIndex);
    applyCard(currentIndex, true);
    animateScrollTo(positions[currentIndex], 550);
  }

  function handleWheel(e){
    const { top, bottom } = getStageBounds();
    if(bottom <= top) return;

    const y = window.scrollY;
    const insideRange = y >= top - 2 && y <= bottom + 2;
    if(!insideRange) return;

    if(isAnimating){
      e.preventDefault();
      return;
    }

    const direction = e.deltaY > 0 ? 1 : -1;
    const nearest = syncIndexFromScroll();

    if(direction > 0 && nearest >= steps.length - 1) return;
    if(direction < 0 && nearest <= 0) return;

    e.preventDefault();
    goToStep(nearest + direction);
  }

  if(!isTouchDevice){
    window.addEventListener('wheel', handleWheel, { passive:false });

    window.addEventListener('keydown', (e) => {
      const map = { ArrowDown:1, PageDown:1, ArrowUp:-1, PageUp:-1 };
      if(map[e.key] === undefined) return;

      const { top, bottom } = getStageBounds();
      const y = window.scrollY;
      if(y < top - 2 || y > bottom + 2) return;

      handleWheel({
        deltaY: map[e.key],
        preventDefault: () => e.preventDefault()
      });
    });
  }

  /* ============================================================
     MODE LAYAR SENTUH: native scroll + marker.
     Marker mengikuti posisi step yang sama dengan desktop.
     ============================================================ */
  if(isTouchDevice){
    const markers = document.querySelectorAll('.snap-marker');

    function positionMarkers(){
      const { top, bottom } = getStageBounds();
      const travel = Math.max(0, bottom - top);
      const last = Math.max(1, steps.length - 1);
      markers.forEach((marker) => {
        const n = Number.parseInt(marker.dataset.marker, 10);
        marker.style.top = `${(travel * n) / last}px`;
      });
    }

    positionMarkers();

    let resizeTimer = null;
    function scheduleMarkerUpdate(){
      window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(positionMarkers, 120);
    }

    window.addEventListener('resize', scheduleMarkerUpdate);
    window.addEventListener('orientationchange', () => window.setTimeout(positionMarkers, 200));

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
}

/* ---- animasi kartu tim: masuk bergantian dari kanan, retract & replay saat keluar-masuk viewport ---- */
(function(){
  const cardsWrap = document.querySelector('.team-cards');
  if(!cardsWrap) return;
  const cards = Array.from(cardsWrap.querySelectorAll('.team-card'));
  if(!cards.length) return;

  const OFFSET = 260;
  const STAGGER = 140;
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

  if('IntersectionObserver' in window){
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if(entry.isIntersecting && entry.intersectionRatio >= 0.35){
          playSequence();
        }else if(!entry.isIntersecting){
          clearTimers();
          playing = false;
          played = false;
          resetCards();
        }
      });
    }, { threshold:[0,0.35] });

    observer.observe(cardsWrap);
  }else{
    cards.forEach((c) => {
      c.style.transform = 'translateX(0)';
      c.style.opacity = '1';
    });
  }
})();
