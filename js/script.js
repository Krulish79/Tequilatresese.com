(() => {
  // Hero video — on mobile, swap it out for a plain <img> using the same
  // poster. Mobile browsers don't autoplay reliably and the user can't even
  // tap to play (video is aria-hidden and behind overlays). Replacing the
  // element entirely also avoids the video downloading on phones.
  const heroVid = document.querySelector('video.hero-bg');
  if (heroVid && window.matchMedia('(max-width: 960px)').matches) {
    const poster = heroVid.getAttribute('poster') || 'images/hero-cellar.jpg';
    const img = document.createElement('img');
    img.className = heroVid.className;          // keep .hero-bg styling
    img.src = poster;
    img.alt = '';
    img.setAttribute('aria-hidden', 'true');
    img.decoding = 'async';
    heroVid.replaceWith(img);
  }

  // Lock the hero to the viewport height captured at page load on mobile.
  // iOS / Android browsers shrink/grow the address bar on scroll, which
  // changes 100vh AND (on some devices) 100svh — making the cover-scaled
  // image visibly grow. Locking to a pixel value prevents that.
  const lockHeroHeight = () => {
    if (!window.matchMedia('(max-width: 960px)').matches) return;
    const h = window.innerHeight;
    document.documentElement.style.setProperty('--hero-h', h + 'px');
  };
  lockHeroHeight();
  // Only re-lock on orientation change — NOT on resize, because address-bar
  // collapse fires resize too, and we want to ignore that.
  window.addEventListener('orientationchange', () => {
    // Re-measure after the rotation completes
    setTimeout(lockHeroHeight, 250);
  });

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

  // Contact form — POSTs directly to Web3Forms which delivers to the right inbox
  // EN/ES → cmir@tequilatresese.com   ZH → g.marchand@tequilatresese.com
  const form = document.getElementById('contactForm');
  form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const status = form.querySelector('.form-status');
    const submitBtn = form.querySelector('button[type="submit"]');
    const lang = (document.documentElement.lang || 'en').toLowerCase();

    // Localised UI strings
    const t = lang.startsWith('zh') ? {
      missing: '请填写所有必填字段。',
      sending: '发送中…',
      success: '感谢。您的留言已送达。',
      error: '发送出错,请稍后再试。',
      subject: 'Tequila Tres Ese — 来自网站的留言',
      labels: { first: '姓名', last: '姓氏', email: '邮箱', message: '留言' }
    } : lang.startsWith('es') ? {
      missing: 'Por favor completa los campos requeridos.',
      sending: 'Enviando…',
      success: 'Gracias. Tu mensaje ha sido enviado.',
      error: 'Hubo un error al enviar. Inténtalo de nuevo más tarde.',
      subject: 'Tequila Tres Ese — Mensaje desde el sitio web',
      labels: { first: 'Nombre', last: 'Apellido', email: 'Correo', message: 'Mensaje' }
    } : {
      missing: 'Please complete the required fields.',
      sending: 'Sending…',
      success: 'Gracias. Your message has been sent.',
      error: 'There was an error sending. Please try again later.',
      subject: 'Tequila Tres Ese — Message from the website',
      labels: { first: 'First name', last: 'Last name', email: 'Email', message: 'Message' }
    };

    // Web3Forms access key per recipient
    const accessKey = lang.startsWith('zh')
      ? '5b32331f-6329-4f6b-be5c-5c057b41b9f7'   // → g.marchand@tequilatresese.com
      : '0fab7455-334d-4466-8263-a0ecf7e9492e';  // → cmir@tequilatresese.com

    if (!form.checkValidity()) {
      status.textContent = t.missing;
      return;
    }

    const data = new FormData(form);
    const fullName = `${data.get('first') || ''} ${data.get('last') || ''}`.trim();

    // Build the payload Web3Forms expects
    const payload = new FormData();
    payload.append('access_key', accessKey);
    payload.append('subject', t.subject);
    payload.append('from_name', 'Tequila Tres Ese — Website');
    payload.append('name', fullName);
    payload.append('email', data.get('email') || '');
    // Plain-readable message body — keeps the email easy to read in the inbox
    payload.append('message',
      `${t.labels.first}: ${data.get('first') || ''}\n` +
      `${t.labels.last}: ${data.get('last') || ''}\n` +
      `${t.labels.email}: ${data.get('email') || ''}\n` +
      `${t.labels.message}:\n${data.get('message') || ''}\n`
    );
    // Honeypot — Web3Forms drops spam if this is filled
    payload.append('botcheck', '');

    status.textContent = t.sending;
    if (submitBtn) submitBtn.disabled = true;

    try {
      const res = await fetch('https://api.web3forms.com/submit', {
        method: 'POST',
        body: payload
      });
      const result = await res.json();
      if (result && result.success) {
        status.textContent = t.success;
        form.reset();
      } else {
        status.textContent = t.error;
      }
    } catch (err) {
      status.textContent = t.error;
    } finally {
      if (submitBtn) submitBtn.disabled = false;
    }
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
        // No loop — each clip plays through once, then we crossfade to the next.
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

    // Single-video case (e.g. a pre-stitched clip): just loop it forever.
    // No timers, no crossfade, no nav controls — the video plays start to
    // finish and seamlessly repeats.
    if (slides.length === 1 && slides[0].tagName === 'VIDEO') {
      const v = slides[0];
      v.loop = true;
      v.preload = 'auto';
      v.classList.add('is-active');
      controls.forEach(c => { if (c.matches('[data-dir], .story-dots')) c.style.display = 'none'; });
      const playOne = () => v.play().catch(() => {});
      playOne();
      container.addEventListener('mouseenter', () => v.pause());
      container.addEventListener('mouseleave', playOne);
      document.addEventListener('visibilitychange', () => {
        document.hidden ? v.pause() : playOne();
      });
      return; // skip the multi-slide machinery entirely
    }

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
    let endTick = null;

    const clearTicks = () => {
      clearTimeout(tick); tick = null;
      clearTimeout(endTick); endTick = null;
    };

    // Always restart the clip from frame 0 when it becomes the active slide,
    // so the viewer sees the WHOLE video from the beginning.
    const playSlide = (el) => {
      if (el.tagName === 'VIDEO') {
        try { el.currentTime = 0; } catch(_){}
        el.play().catch(() => {});
      }
    };
    // Keep the outgoing video playing/visible through the crossfade, then
    // pause+reset it after the fade is fully done (1.5s fade + margin).
    const pauseSlide = (el) => {
      if (el.tagName === 'VIDEO') {
        setTimeout(() => { try { el.pause(); el.currentTime = 0; } catch(_){} }, 1700);
      }
    };

    // Video advance is driven by the 'ended' event so every clip plays its
    // FULL length. The timer here is ONLY a stall safety-net: it fires well
    // past the clip's real duration (duration + 6s grace) so it never cuts a
    // video short. If duration isn't known yet, fall back generously and
    // reschedule the moment metadata arrives. Images use the fixed HOLD.
    const schedule = () => {
      clearTicks();
      if (paused) return;
      const el = slides[current];
      if (el.tagName !== 'VIDEO') {
        tick = setTimeout(() => go(current + 1), HOLD);
        return;
      }
      const d = el.duration;
      if (d && isFinite(d) && d > 0) {
        tick = setTimeout(() => go(current + 1), (d + 6) * 1000);
      } else {
        tick = setTimeout(() => go(current + 1), 60000);
        el.addEventListener('loadedmetadata', () => {
          if (slides[current] === el) schedule();
        }, { once: true });
      }
    };

    // Sequenced fade-away / fade-in:
    //   1. Current slide fades OUT to the dark backdrop (~0.85s)
    //   2. A short dark beat
    //   3. Next slide starts from frame 0 and fades IN (~0.85s)
    // This reads as "fade away from one video, fade into the next" rather
    // than an overlapping cross-dissolve.
    const FADE_MS = 850;     // must match CSS transition on .story-slide/.step-slide
    const DARK_BEAT_MS = 220; // brief darkness between clips
    let transitioning = false;
    const go = (i, manual = false) => {
      if (paused && !manual) return;
      if (transitioning) return;
      const next = ((i % slides.length) + slides.length) % slides.length;
      if (next === current) return;
      transitioning = true;
      clearTicks();

      const outgoing = slides[current];
      const incoming = slides[next];

      // 1. Fade the current slide away
      outgoing.classList.remove('is-active');
      pauseSlide(outgoing);

      // 2. After it's gone (+ a beat of dark), bring the next one in
      endTick = setTimeout(() => {
        current = next;
        dots.forEach((d, k) => d.classList.toggle('is-current', k === current));
        playSlide(incoming);                 // starts from frame 0
        incoming.classList.add('is-active'); // fades in
        transitioning = false;
        schedule();
      }, FADE_MS + DARK_BEAT_MS);
    };

    // Buffer the NEXT clip as soon as the current one starts playing so it's
    // ready to start instantly (and play smoothly through the crossfade) the
    // moment the current clip ends. We do NOT pre-roll it early — the current
    // video must play its full length, fully visible, before we advance.
    let buffered = -1;
    const preloadNext = () => {
      const nextIdx = (current + 1) % slides.length;
      const nx = slides[nextIdx];
      if (nx && nx.tagName === 'VIDEO' && buffered !== nextIdx) {
        buffered = nextIdx;
        nx.preload = 'auto';
        try { nx.load(); } catch(_){}
      }
    };
    slides.forEach(s => {
      if (s.tagName !== 'VIDEO') return;
      s.addEventListener('play', () => { if (slides[current] === s) preloadNext(); });
      // Advance only when the current video has played its FULL duration.
      s.addEventListener('ended', () => {
        if (paused || endTick) return;
        if (slides[current] !== s) return;
        endTick = setTimeout(() => go(current + 1), 0);
      });
    });

    const start = () => {
      paused = false;
      transitioning = false;
      // Make sure the current slide is visible & playing (a transition may
      // have been interrupted mid-fade).
      slides.forEach((s, k) => s.classList.toggle('is-active', k === current));
      playSlide(slides[current]);
      schedule();
    };
    const stop  = () => {
      paused = true;
      transitioning = false;
      clearTicks();
      pauseSlide(slides[current]);
    };

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

  // Initialise the Our Story slideshow (with dots + arrows). Hold tuned so
  // short looping videos get enough time on screen between fades.
  const storySlideshow = document.getElementById('storySlideshow');
  if (storySlideshow) initSlideshow(storySlideshow, { slideClass: 'story-slide', hold: 8000 });

  // Initialise any mini-slideshows inside process steps
  document.querySelectorAll('.step-media--slideshow').forEach(el => {
    initSlideshow(el, { slideClass: 'step-slide', hold: 9000 });
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
