/* ============================================================
   AksanusA — interaction layer
   Perbaikan utama:
   - tidak lagi mengandalkan scroll-snap global untuk semua section
   - desktop hanya mengunci scroll ketika benar-benar berada di stage
   - posisi step selalu disinkronkan dengan posisi scroll aktual
   - animasi scroll tidak bertabrakan dengan CSS scroll-behavior
   - tombol sentuh memakai posisi step yang sama dengan stage
   ============================================================ */

/* ---- cache batas stage bersama: dihitung ulang hanya saat resize/orientation
   sungguhan, bukan tiap event scroll. Ini mencegah drift saat address bar
   browser mobile collapse/expand di tengah gesture scroll, yang sebelumnya
   bikin index step "lompat" mendadak (teks berkedip, layout tersentak). ---- */
const AksanusaStage = (function(){
  const STEP_COUNT = 3; // harus sama dengan panjang array `steps` di bawah
  let cache = null;

  function recalc(){
    const stage = document.querySelector('.stage');
    if(!stage){ cache = null; return; }
    const rect = stage.getBoundingClientRect();
    const top = window.scrollY + rect.top;
    const bottom = top + stage.offsetHeight - window.innerHeight;
    cache = { top, bottom };
  }

  function getBounds(){
    if(!cache) recalc();
    return cache;
  }

  let resizeTimer = null;
  function scheduleRecalc(){
    window.clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(recalc, 150);
  }

  window.addEventListener('resize', scheduleRecalc);
  window.addEventListener('orientationchange', () => window.setTimeout(recalc, 200));
  window.addEventListener('load', () => window.setTimeout(recalc, 50));
  recalc();

  return { getBounds, recalc, STEP_COUNT };
})();

/* ---- tombol scroll atas/bawah (layar sentuh): klik = 1 langkah, tekan lama = scroll berulang ---- */
(function(){
  const nav = document.getElementById('scroll-nav');
  if(!nav) return;
  const touchQuery = window.matchMedia('(hover: none) and (pointer: coarse)');

  /* Paksa tampil/sembunyi lewat JS juga, jangan cuma andalkan CSS media query —
     jaga-jaga kalau ada race condition saat render pertama kali. */
  function syncVisibility(){
    nav.style.display = touchQuery.matches ? 'flex' : 'none';
  }
  syncVisibility();
  window.addEventListener('load', syncVisibility);
  if(touchQuery.addEventListener){
    touchQuery.addEventListener('change', syncVisibility);
  }
})();

(function(){
  const btnUp = document.getElementById('scroll-nav-up');
  const btnDown = document.getElementById('scroll-nav-down');
  if(!btnUp || !btnDown) return;

  let holdTimer = null;
  let repeatTimer = null;

  function stopHold(){
    window.clearTimeout(holdTimer);
    window.clearTimeout(repeatTimer);
    holdTimer = null;
    repeatTimer = null;
  }

  /* Generic: scroll setengah tinggi layar. Sengaja tidak lagi terikat ke
     posisi step .stage — di layar sentuh, proses kerja kini pakai blok stack
     biasa (.stage-mobile) yang discroll natural, jadi tombol ini cukup
     membantu navigasi halaman secara umum. */
  function scrollOne(direction){
    window.scrollBy({ top: window.innerHeight * 0.7 * direction, behavior:'smooth' });
  }

  function startHold(direction, e){
    e.preventDefault();
    stopHold();
    scrollOne(direction);
    holdTimer = window.setTimeout(function(){
      repeatTimer = window.setInterval(() => scrollOne(direction), 550);
    }, 480);
  }

  btnUp.addEventListener('pointerdown', (e) => startHold(-1, e));
  btnDown.addEventListener('pointerdown', (e) => startHold(1, e));
  ['pointerup','pointerleave','pointercancel','lostpointercapture'].forEach((evt) => {
    btnUp.addEventListener(evt, stopHold);
    btnDown.addEventListener(evt, stopHold);
  });
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

  function snapPositions(){
    const { top, bottom } = AksanusaStage.getBounds();
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
    const { top, bottom } = AksanusaStage.getBounds();
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

      const { top, bottom } = AksanusaStage.getBounds();
      const y = window.scrollY;
      if(y < top - 2 || y > bottom + 2) return;

      handleWheel({
        deltaY: map[e.key],
        preventDefault: () => e.preventDefault()
      });
    });
  }

  /* Catatan: mode layar sentuh untuk "proses kerja" sudah tidak memakai
     .stage (sticky-pin) sama sekali — digantikan .stage-mobile (3 blok stack
     + reveal-on-scroll biasa) yang dirender lewat CSS media query dan
     dianimasikan oleh observer generic ".reveal" di bawah. Ini menghilangkan
     ketergantungan pada svh presisi yang jadi akar masalah di HP nyata. */
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
