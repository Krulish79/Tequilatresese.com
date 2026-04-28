(() => {
  // Header shadow on scroll
  const header = document.getElementById('siteHeader');
  const onScroll = () => {
    header.classList.toggle('is-scrolled', window.scrollY > 40);
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  // Mobile menu
  const toggle = document.getElementById('menuToggle');
  const nav = document.querySelector('.primary-nav');
  toggle?.addEventListener('click', () => {
    const open = nav.classList.toggle('is-open');
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
  });
  nav?.querySelectorAll('a').forEach(a => {
    a.addEventListener('click', () => {
      nav.classList.remove('is-open');
      toggle?.setAttribute('aria-expanded', 'false');
    });
  });

  // Language toggle (visual only)
  document.querySelectorAll('.lang-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.lang-btn').forEach(b => b.classList.remove('is-active'));
      btn.classList.add('is-active');
    });
  });

  // Reveal-on-scroll
  const revealables = document.querySelectorAll('.section-head, .bottle-card, .story-copy, .step, .product, .ribbon-grid > div, .contact-copy, .contact-form');
  revealables.forEach(el => el.classList.add('reveal'));

  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          e.target.classList.add('is-in');
          io.unobserve(e.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
    revealables.forEach(el => io.observe(el));
  } else {
    revealables.forEach(el => el.classList.add('is-in'));
  }

  // Contact form (stub)
  const form = document.getElementById('contactForm');
  form?.addEventListener('submit', (e) => {
    e.preventDefault();
    const status = form.querySelector('.form-status');
    if (!form.checkValidity()) {
      status.textContent = 'Please complete the required fields.';
      return;
    }
    status.textContent = 'Gracias. Your message has been sent.';
    form.reset();
  });

  // Store buttons (stub)
  document.querySelectorAll('[data-buy]').forEach(b => {
    b.addEventListener('click', () => {
      const original = b.textContent;
      b.textContent = 'Added ✓';
      b.disabled = true;
      setTimeout(() => { b.textContent = original; b.disabled = false; }, 1600);
    });
  });

  // Year in footer
  const y = document.getElementById('year');
  if (y) y.textContent = new Date().getFullYear();

  // Gallery lightbox
  const galleryGrid = document.getElementById('galleryGrid');
  const lightbox = document.getElementById('lightbox');
  if (galleryGrid && lightbox) {
    const items = Array.from(galleryGrid.querySelectorAll('.gallery-item'));
    const urls = items.map(it => it.querySelector('img')?.src || '').filter(Boolean);
    const lbImg = lightbox.querySelector('.lightbox-img');
    const lbCounter = lightbox.querySelector('.lightbox-counter');
    const lbPrev = lightbox.querySelector('.lightbox-nav--prev');
    const lbNext = lightbox.querySelector('.lightbox-nav--next');
    const lbClose = lightbox.querySelector('.lightbox-close');
    let lbIndex = 0;

    const showAt = (i) => {
      lbIndex = ((i % urls.length) + urls.length) % urls.length;
      lightbox.classList.add('is-loading');
      lbImg.onload = () => lightbox.classList.remove('is-loading');
      lbImg.src = urls[lbIndex];
      lbCounter.textContent = `${lbIndex + 1} / ${urls.length}`;
    };
    const open = (i) => {
      lightbox.hidden = false;
      requestAnimationFrame(() => lightbox.classList.add('is-open'));
      document.body.classList.add('lightbox-open');
      showAt(i);
    };
    const close = () => {
      lightbox.classList.remove('is-open');
      document.body.classList.remove('lightbox-open');
      setTimeout(() => { lightbox.hidden = true; lbImg.src = ''; }, 300);
    };

    items.forEach((it, i) => {
      it.tabIndex = 0;
      it.setAttribute('role', 'button');
      it.addEventListener('click', () => open(i));
      it.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(i); }
      });
    });

    lbPrev.addEventListener('click', (e) => { e.stopPropagation(); showAt(lbIndex - 1); });
    lbNext.addEventListener('click', (e) => { e.stopPropagation(); showAt(lbIndex + 1); });
    lbClose.addEventListener('click', close);

    // Click anywhere on the dim backdrop closes (but not on the image itself)
    lightbox.addEventListener('click', (e) => {
      if (e.target === lightbox || e.target.classList.contains('lightbox-stage')) close();
    });

    document.addEventListener('keydown', (e) => {
      if (lightbox.hidden) return;
      if (e.key === 'Escape') close();
      else if (e.key === 'ArrowLeft') showAt(lbIndex - 1);
      else if (e.key === 'ArrowRight') showAt(lbIndex + 1);
    });
  }

  // Simple slideshow engine — all slides rendered inline, one .is-active at a time
  const isVideo = (url) => /\.(mp4|webm|mov)(\?|$)/i.test(url);

  const initSlideshow = (container, opts = {}) => {
    const slideClass = opts.slideClass || 'slide';
    const HOLD = opts.hold ?? 3000;

    let urls = [];
    try { urls = JSON.parse(container.dataset.slides || '[]'); }
    catch (err) { console.warn('slides JSON parse error', err); return; }
    if (!urls.length) return;

    // Nuke any previous children (except controls we want to keep)
    const controls = [];
    Array.from(container.children).forEach(c => {
      if (c.matches('[data-dir], .story-dots, .story-nav-btn')) controls.push(c);
      c.remove();
    });

    // Create every slide as a real DOM node — images and videos
    const slides = urls.map((url, i) => {
      let el;
      if (isVideo(url)) {
        el = document.createElement('video');
        el.src = url;
        el.muted = true;
        el.playsInline = true;
        el.setAttribute('playsinline', '');
        el.preload = 'metadata';
      } else {
        el = document.createElement('img');
        el.src = url;
        el.alt = '';
        el.loading = i === 0 ? 'eager' : 'lazy';
      }
      el.classList.add(slideClass);
      if (i === 0) el.classList.add('is-active');
      container.appendChild(el);
      return el;
    });

    // Re-attach controls on top
    controls.forEach(c => container.appendChild(c));

    const dotsHost = container.querySelector('.story-dots');
    const dots = dotsHost ? urls.map((_, i) => {
      const d = document.createElement('button');
      d.type = 'button';
      d.className = 'story-dot' + (i === 0 ? ' is-current' : '');
      d.setAttribute('aria-label', `Go to slide ${i + 1}`);
      d.addEventListener('click', (e) => { e.stopPropagation(); go(i, true); });
      dotsHost.appendChild(d);
      return d;
    }) : [];

    let current = 0;
    let paused = false;
    let tick = null;

    const playSlide = (el) => {
      if (el.tagName === 'VIDEO') {
        el.currentTime = 0;
        el.play().catch(() => {});
      }
    };
    const pauseSlide = (el) => {
      if (el.tagName === 'VIDEO') el.pause();
    };

    const schedule = () => {
      clearTimeout(tick);
      if (paused) return;
      const el = slides[current];
      if (el.tagName === 'VIDEO') {
        // Video drives its own advance via 'ended'
        return;
      }
      tick = setTimeout(() => go(current + 1), HOLD);
    };

    const go = (i, manual = false) => {
      if (paused && !manual) return;
      const next = ((i % slides.length) + slides.length) % slides.length;
      if (next === current) return;
      pauseSlide(slides[current]);
      slides[current].classList.remove('is-active');
      current = next;
      slides[current].classList.add('is-active');
      dots.forEach((d, k) => d.classList.toggle('is-current', k === current));
      playSlide(slides[current]);
      schedule();
    };

    slides.forEach(s => {
      if (s.tagName === 'VIDEO') {
        s.addEventListener('ended', () => { if (!paused) go(current + 1); });
      }
    });

    const start = () => { paused = false; playSlide(slides[current]); schedule(); };
    const stop  = () => { paused = true; clearTimeout(tick); pauseSlide(slides[current]); };

    container.addEventListener('mouseenter', stop);
    container.addEventListener('mouseleave', start);
    container.addEventListener('focusin',    stop);
    container.addEventListener('focusout',   start);
    document.addEventListener('visibilitychange', () => { document.hidden ? stop() : start(); });

    container.querySelectorAll('[data-dir]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        go(current + (btn.dataset.dir === 'next' ? 1 : -1), true);
      });
    });

    start();
  };

  // Initialise the Our Story slideshow (with dots + arrows)
  const storySlideshow = document.getElementById('storySlideshow');
  if (storySlideshow) initSlideshow(storySlideshow, { slideClass: 'story-slide', hold: 3000 });

  // Initialise any mini-slideshows inside process steps
  document.querySelectorAll('.step-media--slideshow').forEach(el => {
    initSlideshow(el, { slideClass: 'step-slide', hold: 3500 });
  });

  // Craft Film — click-to-play with sound
  const filmPlayer = document.getElementById('filmPlayer');
  const filmVideo = document.getElementById('filmVideo');
  if (filmPlayer && filmVideo) {
    const play = () => {
      filmVideo.controls = true;
      filmVideo.muted = false;
      filmVideo.play().catch(() => {});
      filmPlayer.classList.add('is-playing');
    };
    filmPlayer.addEventListener('click', (e) => {
      if (filmPlayer.classList.contains('is-playing')) return;
      e.preventDefault();
      play();
    });
    filmVideo.addEventListener('pause', () => filmPlayer.classList.remove('is-playing'));
    filmVideo.addEventListener('ended', () => filmPlayer.classList.remove('is-playing'));
  }

  // Pause process-step videos when they leave the viewport (save bandwidth/CPU)
  const stepVideos = document.querySelectorAll('.step-media video');
  if (stepVideos.length && 'IntersectionObserver' in window) {
    const vo = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        const v = e.target;
        if (e.isIntersecting) v.play?.().catch(() => {});
        else v.pause?.();
      });
    }, { threshold: 0.1 });
    stepVideos.forEach(v => vo.observe(v));
  }

  // Scroll pager — jump to previous/next section
  const pager = document.getElementById('scrollPager');
  if (pager) {
    const sections = Array.from(document.querySelectorAll('section[id]'));
    const headerOffset = 80;
    const currentIndex = () => {
      const y = window.scrollY + headerOffset + 10;
      let idx = 0;
      sections.forEach((s, i) => { if (s.offsetTop <= y) idx = i; });
      return idx;
    };
    const scrollToIndex = (i) => {
      const s = sections[Math.max(0, Math.min(sections.length - 1, i))];
      if (!s) return;
      window.scrollTo({ top: s.offsetTop - headerOffset + 2, behavior: 'smooth' });
    };
    pager.querySelectorAll('.scroll-pager-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const i = currentIndex();
        scrollToIndex(btn.dataset.dir === 'down' ? i + 1 : i - 1);
      });
    });
    // Update edge state (top/bottom) so arrows dim when there's nowhere to go
    const updateEdges = () => {
      const atTop = window.scrollY < 50;
      const atBottom = (window.innerHeight + window.scrollY) >= document.documentElement.scrollHeight - 4;
      pager.dataset.at = atTop ? 'top' : (atBottom ? 'bottom' : '');
    };
    window.addEventListener('scroll', updateEdges, { passive: true });
    updateEdges();
  }
})();
