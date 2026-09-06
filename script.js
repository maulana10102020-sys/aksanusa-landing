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
   MODE LAYAR SENTUH (HP/iPad): scroll dibiarkan alami,
   tampilan tetap berubah mengikuti posisi scroll saat itu.
   ============================================================ */
if(isTouchDevice){
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

/* ---- animasi kartu tim: masuk bergantian dari kanan, lalu tampil bersamaan ---- */
(function(){
  const card1 = document.getElementById('team-card-1');
  const card2 = document.getElementById('team-card-2');
  const cardsWrap = document.querySelector('.team-cards');
  if(!card1 || !card2 || !cardsWrap) return;

  const SHIFT = 190;  // lebar kartu + gap, jarak kartu 1 pindah ke slot kartu 2
  const OFFSET = 220; // jarak tambahan di luar layar sebelah kanan

  [card1, card2].forEach((c) => {
    c.style.transition = 'transform .7s cubic-bezier(.22,.68,0,1.02), opacity .5s ease';
  });
  card1.style.transform = `translateX(${SHIFT + OFFSET}px)`;
  card1.style.opacity = '0';
  card2.style.transform = `translateX(${OFFSET}px)`;
  card2.style.opacity = '0';

  let played = false;
  function playSequence(){
    if(played) return;
    played = true;

    // 1) kartu orang pertama masuk dari kanan, berhenti di slot kanan
    requestAnimationFrame(() => {
      card1.style.transform = `translateX(${SHIFT}px)`;
      card1.style.opacity = '1';
    });

    // 2) kartu itu bergeser ke posisi aslinya (kiri), memberi ruang untuk orang ke-2
    window.setTimeout(() => {
      card1.style.transform = 'translateX(0)';
    }, 650);

    // 3) kartu orang ke-2 masuk dari kanan mengisi slot kanan
    window.setTimeout(() => {
      card2.style.transform = 'translateX(0)';
      card2.style.opacity = '1';
    }, 750);

    // 4) setelah keduanya di posisi, tampil bersamaan dengan efek highlight sinkron
    window.setTimeout(() => {
      card1.classList.add('duo-pulse');
      card2.classList.add('duo-pulse');
    }, 1500);
  }

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if(entry.isIntersecting){
        playSequence();
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.35 });
  observer.observe(cardsWrap);
})();
