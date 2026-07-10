/* ============================================================
   JAYABHERI THE PINNACLE — interactions
   ============================================================ */
import Lenis from "./vendor/lenis.mjs";

(() => {
  "use strict";

  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];
  const clamp = (v, a, b) => Math.min(Math.max(v, a), b);
  const lerp = (a, b, t) => a + (b - a) * t;
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- inertial scroll: weighted, gliding wheel response ---------- */
  if (!reduced) {
    const lenis = new Lenis({
      lerp: 0.075,          // low lerp = heavier, longer glide
      wheelMultiplier: 0.9, // slightly damped wheel input
      touchMultiplier: 1.4,
    });
    const rafLoop = (time) => { lenis.raf(time); requestAnimationFrame(rafLoop); };
    requestAnimationFrame(rafLoop);

    // modals/drawer lock the page via body overflow — pause Lenis with them
    new MutationObserver(() => {
      if (document.body.style.overflow === "hidden") lenis.stop();
      else lenis.start();
    }).observe(document.body, { attributes: true, attributeFilter: ["style"] });

    // in-page anchors glide too (Lenis honours the sticky-nav scroll-padding-top)
    document.addEventListener("click", (e) => {
      const a = e.target.closest('a[href^="#"]');
      if (!a || a.getAttribute("href").length < 2) return;
      const target = document.querySelector(a.getAttribute("href"));
      if (!target) return;
      e.preventDefault();
      lenis.scrollTo(target, { duration: 1.4 });
    });
  }

  /* ---------- mobile drawer ---------- */
  const burger = $("#navBurger");
  const drawer = $("#drawer");
  const setDrawer = (open) => {
    drawer.classList.toggle("is-open", open);
    burger.classList.toggle("is-open", open);
    burger.setAttribute("aria-expanded", String(open));
    drawer.setAttribute("aria-hidden", String(!open));
    document.body.style.overflow = open ? "hidden" : "";
  };
  burger.addEventListener("click", () => setDrawer(!drawer.classList.contains("is-open")));
  $$(".drawer a, .drawer button").forEach((el) => el.addEventListener("click", () => setDrawer(false)));

  /* ---------- navbar: shrink logo, frost & adaptive light/dark ---------- */
  const nav = $("#nav");
  const SHRINK_RANGE = 150;
  const themedSections = $$("[data-nav-theme]").filter((el) => el !== nav);
  let navTicking = false;
  const updateNavState = () => {
    navTicking = false;
    if (!nav) return;
    const y = window.scrollY;
    nav.style.setProperty("--nav-shrink", clamp(y / SHRINK_RANGE, 0, 1).toFixed(3));
    nav.classList.toggle("is-scrolled", y > 4);
    // the section crossing just below the bar decides the nav's colour theme
    const probe = (nav.offsetHeight || 64) * 0.5;
    let theme = "dark";
    for (const sec of themedSections) {
      const r = sec.getBoundingClientRect();
      if (r.top <= probe && r.bottom > probe) { theme = sec.dataset.navTheme || "dark"; break; }
    }
    if (nav.dataset.navTheme !== theme) nav.dataset.navTheme = theme;
  };
  window.addEventListener("scroll", () => {
    if (!navTicking) {
      window.requestAnimationFrame(updateNavState);
      navTicking = true;
    }
  }, { passive: true });
  window.addEventListener("resize", () => window.requestAnimationFrame(updateNavState), { passive: true });
  updateNavState();

  /* ---------- hero: static elevation still (Ken Burns drift via CSS) ---------- */

  /* ---------- per-frame scroll handlers run only while their section is near the viewport ---------- */
  const bindScrollWhileVisible = (el, onScroll) => {
    let bound = false;
    new IntersectionObserver((entries) => entries.forEach((e) => {
      if (e.isIntersecting && !bound) {
        bound = true;
        window.addEventListener("scroll", onScroll, { passive: true });
        onScroll();
      } else if (!e.isIntersecting && bound) {
        bound = false;
        window.removeEventListener("scroll", onScroll);
      }
    }), { rootMargin: "35% 0px 35% 0px" }).observe(el);
  };

  /* ---------- blur-up placeholders: drop the LQIP once the real image is in ---------- */
  $$("img[data-lqip]").forEach((img) => {
    const clear = () => { img.style.backgroundImage = "none"; };
    if (img.complete && img.naturalWidth) clear();
    else img.addEventListener("load", clear, { once: true });
  });

  /* ---------- reveal on scroll ---------- */
  const io = new IntersectionObserver(
    (entries) => entries.forEach((e) => {
      if (e.isIntersecting) { e.target.classList.add("in-view"); io.unobserve(e.target); }
    }),
    { threshold: 0.12, rootMargin: "0px 0px -6% 0px" }
  );
  $$(".reveal").forEach((el) => io.observe(el));

  /* ---------- intro: cinematic scroll choreography ---------- */
  (() => {
    const section = $(".intro");
    if (!section) return;
    const pin = $(".intro__pin", section);
    const eyebrow = $(".intro__eyebrow-line", section);
    const titleLines = $$(".intro__title-line", section);
    const towerClip = $(".intro__tower-clip", section);
    const towerImg = $(".intro__tower img", section);
    const shine = $(".intro__shine", section);
    const glow = $(".intro__glow", section);
    const leftStats = $$(".intro__stats--left .intro-stat", section);
    const rightStats = $$(".intro__stats--right .intro-stat", section);
    const numEls = $$("[data-num]", section);
    const fxEls = $$(".intro__fx", section);

    const fmt = (n, dec, pad) => {
      let s = dec ? n.toFixed(dec) : Math.round(n).toString();
      if (pad) s = s.padStart(pad, "0");
      const parts = s.split(".");
      parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
      return parts.join(".");
    };
    const setNum = (el, v) => {
      const s = fmt(v, parseInt(el.dataset.decimals || "0", 10), parseInt(el.dataset.pad || "0", 10));
      if (el.textContent !== s) el.textContent = s; // identical writes still force style/layout work
    };
    const sub = (v, a, b) => clamp((v - a) / (b - a), 0, 1);
    const eo = (t) => 1 - Math.pow(1 - t, 3);
    const eio = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

    const cinematic = !reduced && window.matchMedia("(min-width: 1081px)").matches;

    if (cinematic) {
      section.classList.add("is-cinematic");
      fxEls.forEach((el) => el.classList.remove("intro__fx"));
      const nums = numEls.map((el, i) => ({
        el,
        target: parseFloat(el.dataset.num),
        a: 0.25 + (i % 4) * 0.05,
        b: 0.85 + (i % 4) * 0.05,
      }));

      let ticking = false;
      const render = () => {
        ticking = false;
        const rect = pin.getBoundingClientRect();
        const range = rect.height - window.innerHeight;

        // Calculate progress continuously: p starts at 0 before pinning (60% entry)
        // reaches exactly 0.75 when pinning starts, and completes 100% by 35% of the pinned scroll length.
        let p = 0;
        if (rect.top > 0) {
          const entranceStart = window.innerHeight * 0.6;
          p = clamp(1 - rect.top / entranceStart, 0, 1) * 0.75;
        } else {
          p = 0.75 + clamp(-rect.top / (range || 1), 0, 1) * 0.25;
        }

        // heading — line masks rise into view
        eyebrow.style.transform = `translateY(${(1 - eo(sub(p, 0.05, 0.60))) * 120}%)`;
        titleLines.forEach((ln, i) => {
          ln.style.transform = `translateY(${(1 - eo(sub(p, 0.10 + i * 0.04, 0.80 + i * 0.04))) * 120}%)`;
        });

        // image — clip-path rise + corner-radius morph + inner scale & parallax
        const ip = eo(sub(p, 0.15, 0.85));
        towerClip.style.clipPath =
          `inset(${(1 - ip) * 100}% 0% 0% 0% round ${lerp(200, 74, ip)}px ${lerp(200, 0, ip)}px 0 0)`;
        const drift = sub(p, 0.15, 0.90);
        towerImg.style.transform = `scale(${lerp(1.18, 1.08, ip)}) translateY(${lerp(1.5, -1, drift)}%)`;

        // light sweep across the towers
        const shp = sub(p, 0.40, 0.80);
        shine.style.opacity = shp > 0.02 && shp < 0.98 ? 0.9 : 0;
        shine.style.transform = `translateX(${lerp(-170, 340, shp)}%) rotate(8deg)`;

        // stats — slide in from the sides, staggered, with a settling blur
        const doStat = (st, i, dir) => {
          const sp = eo(sub(p, 0.25 + i * 0.05, 0.90 + i * 0.05));
          st.style.opacity = sp;
          st.style.transform = `translateX(${(1 - sp) * dir * 46}px)`;
          st.style.filter = sp < 0.985 ? `blur(${(1 - sp) * 6}px)` : "none";
        };
        leftStats.forEach((st, i) => doStat(st, i, -1));
        rightStats.forEach((st, i) => doStat(st, i, 1));

        // numbers climb as you scroll
        nums.forEach((c) => setNum(c.el, c.target * eio(sub(p, c.a, c.b))));

        // ambience — gold glow blooms, ascent lines draw down
        glow.style.opacity = eo(sub(p, 0.10, 0.80)) * 0.95;
        glow.style.transform = `translate(-50%, -50%) scale(${lerp(0.78, 1.1, p)})`;
      };
      const onScroll = () => {
        if (!ticking) { ticking = true; requestAnimationFrame(render); }
      };
      bindScrollWhileVisible(pin, onScroll);
      window.addEventListener("resize", onScroll);
      render();
    } else {
      // tablet / mobile / reduced-motion — graceful staggered fade + count on view
      const io = new IntersectionObserver(
        (entries) =>
          entries.forEach((e) => {
            if (!e.isIntersecting) return;
            e.target.classList.add("is-in");
            io.unobserve(e.target);
          }),
        { threshold: 0.16, rootMargin: "0px 0px -8% 0px" }
      );
      fxEls.forEach((el, i) => { el.style.transitionDelay = `${i * 0.09}s`; io.observe(el); });

      if (!reduced) {
        const cIO = new IntersectionObserver(
          (entries) =>
            entries.forEach((e) => {
              if (!e.isIntersecting) return;
              const el = e.target, target = parseFloat(el.dataset.num), t0 = performance.now();
              const tick = (now) => {
                const q = clamp((now - t0) / 1500, 0, 1);
                setNum(el, target * (1 - Math.pow(1 - q, 3)));
                if (q < 1) requestAnimationFrame(tick);
              };
              requestAnimationFrame(tick);
              cIO.unobserve(el);
            }),
          { threshold: 0.5 }
        );
        numEls.forEach((el) => { setNum(el, 0); cIO.observe(el); });
      }
    }
  })();

  /* ---------- the club: card flows in edge-to-edge on scroll ---------- */
  (() => {
    const section = $(".club");
    if (!section || reduced) return;
    const card = $(".club__card", section);
    const building = $(".club__building", section);
    const words = $$(".club__word", section);
    const subCopy = $(".club__sub", section);
    const linkWrap = $(".club__link-wrap", section);
    const sub = (v, a, b) => clamp((v - a) / (b - a), 0, 1);
    const eo = (t) => 1 - Math.pow(1 - t, 3);

    let ticking = false;
    const render = () => {
      ticking = false;
      const vh = window.innerHeight;
      const rect = section.getBoundingClientRect();
      // entrance progress: 0 as the section's top enters at the viewport bottom,
      // 1 as it settles at the top
      const q = clamp((vh - rect.top) / (vh * 0.9), 0, 1);

      // the dark card expands from a rounded inset card to full edge-to-edge
      const ce = eo(sub(q, 0.04, 0.82));
      const insV = lerp(4.5, 0, ce), insH = lerp(4, 0, ce), rad = lerp(60, 0, ce);
      card.style.clipPath = `inset(${insV}vh ${insH}vw ${insV}vh ${insH}vw round ${rad}px)`;

      // the clubhouse slides in from right to left
      const bp = eo(sub(q, 0.2, 0.92));
      building.style.opacity = bp;
      building.style.transform = `translateX(${(1 - bp) * 140}px) translateY(${(1 - bp) * 40}px) scale(${lerp(1.04, 1, bp)})`;

      // wordmark rises out of its mask, letter-group by letter-group
      words.forEach((w, i) => {
        const wp = eo(sub(q, 0.34 + i * 0.09, 0.78 + i * 0.09));
        w.style.transform = `translateY(${(1 - wp) * 106}%)`;
      });

      // sub-copy slides in from left to right with a stagger
      const sp = eo(sub(q, 0.48, 0.86));
      subCopy.style.opacity = sp;
      subCopy.style.transform = `translateX(${(1 - sp) * -40}px) translateY(${(1 - sp) * 15}px)`;

      // explore link wrapper enters last, sliding up and scaling
      const lp = eo(sub(q, 0.58, 0.94));
      linkWrap.style.opacity = lp;
      linkWrap.style.transform = `translateY(${(1 - lp) * 40}px) scale(${lerp(0.92, 1, lp)})`;
    };
    const onScroll = () => {
      if (!ticking) { ticking = true; requestAnimationFrame(render); }
    };
    bindScrollWhileVisible(section, onScroll);
    window.addEventListener("resize", onScroll);
    render();
  })();

  /* ---------- active nav link ---------- */
  const navLinks = $$(".nav__links a");
  const sectionIO = new IntersectionObserver(
    (entries) => entries.forEach((e) => {
      if (!e.isIntersecting) return;
      const id = e.target.id;
      navLinks.forEach((a) => a.classList.toggle("is-active", a.getAttribute("href") === `#${id}`));
    }),
    { rootMargin: "-35% 0px -55% 0px" }
  );
  $$("main section[id]").forEach((s) => sectionIO.observe(s));

  /* ---------- discover video ---------- */
  const dCard = $("#discoverCard");
  const dVideo = $("#discoverVideo");
  const dPlay = $("#discoverPlay");
  const dPause = $("#discoverPause");
  const dPlayer = $("#discoverPlayer");
  const dPlayerVideo = $("#discoverPlayerVideo");
  const dPlayerClose = $("#discoverPlayerClose");
  const setPreviewPauseIcon = (isPaused) => {
    dPause.querySelector("svg").innerHTML = isPaused
      ? '<path d="M8 5v14l11-7z" fill="currentColor"/>'
      : '<path d="M7 5h4v14H7zM13 5h4v14h-4z" fill="currentColor"/>';
  };
  const openDiscoverPlayer = () => {
    dVideo.pause();
    dVideo.muted = true;
    setPreviewPauseIcon(true);
    dPlayer.classList.add("is-open");
    dPlayer.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
    dPlayerVideo.currentTime = 0;
    dPlayerVideo.muted = false;
    dPlayerVideo.play().catch(() => {});
    dPlayerClose.focus();
  };
  const closeDiscoverPlayer = () => {
    if (!dPlayer?.classList.contains("is-open")) return;
    dPlayer.classList.remove("is-open");
    dPlayer.setAttribute("aria-hidden", "true");
    dPlayerVideo.pause();
    dPlayerVideo.currentTime = 0;
    document.body.style.overflow = "";
    dVideo.muted = true;
    dVideo.play().then(() => setPreviewPauseIcon(false)).catch(() => {});
  };
  if (dCard && dVideo && dPlayer) {
    // The card loops silently; clicking the card opens a full player with controls.
    dCard.addEventListener("click", () => {
      openDiscoverPlayer();
    });
    dPause.addEventListener("click", (e) => {
      e.stopPropagation();
      if (dVideo.paused) { dVideo.play(); setPreviewPauseIcon(false); }
      else { dVideo.pause(); setPreviewPauseIcon(true); }
    });
    dPlayerClose.addEventListener("click", closeDiscoverPlayer);
    dPlayer.addEventListener("click", (e) => { if (e.target === dPlayer) closeDiscoverPlayer(); });
    // autoplay silently when it scrolls into view, pause when it leaves —
    // an offscreen video otherwise keeps decoding and competes with scroll work
    new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) {
          dVideo.play().then(() => setPreviewPauseIcon(false)).catch(() => {});
          dPause.hidden = false;
        } else if (!dVideo.paused) {
          dVideo.pause();
          setPreviewPauseIcon(true);
        }
      });
    }, { threshold: 0.45 }).observe(dVideo);
  }

  /* ---------- ambient loops: stream & decode only while near the viewport ---------- */
  $$("video[data-autoplay-visible]").forEach((v) => {
    new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) v.play().catch(() => {});
        else if (!v.paused) v.pause();
      });
    }, { rootMargin: "200px 0px" }).observe(v);
  });

  /* ---------- sliders (carousel + progress line) ---------- */
  const setupSlider = (trackSel, prevSel, nextSel, progressSel) => {
    const track = $(trackSel);
    if (!track) return;
    const step = () => {
      const item = track.querySelector(".slider__item");
      return item ? item.getBoundingClientRect().width + 18 : 480;
    };
    $(prevSel)?.addEventListener("click", () => track.scrollBy({ left: -step(), behavior: "smooth" }));
    $(nextSel)?.addEventListener("click", () => track.scrollBy({ left: step(), behavior: "smooth" }));
    const bar = $(progressSel);
    if (bar) {
      const update = () => {
        const max = track.scrollWidth - track.clientWidth;
        const p = max > 0 ? track.scrollLeft / max : 0;
        bar.style.width = `${lerp(12, 100, p)}%`;
      };
      track.addEventListener("scroll", update, { passive: true });
      update();
    }
  };
  /* ---------- custom gallery tabs & slider ---------- */
  const initGallery = () => {
    const tabs = $$(".gallery__tab");
    const tracks = $$(".gallery__track");
    const dotsContainer = $("#galleryDots");
    const thumbsContainer = $("#galleryThumbnails");
    const prevBtn = $("#galleryPrev");
    const nextBtn = $("#galleryNext");
    
    if (!tabs.length || !tracks.length || !dotsContainer || !prevBtn || !nextBtn || !thumbsContainer) return;
    
    let activeCategory = "exterior"; // "exterior" or "interior"
    let currentIndex = 0;
    
    const getActiveTrack = () => {
      return $(`#galleryTrack${activeCategory.charAt(0).toUpperCase() + activeCategory.slice(1)}`);
    };
    
    const getSlides = (track) => {
      return $$(".gallery__slide", track);
    };
    
    const renderControls = () => {
      const activeTrack = getActiveTrack();
      if (!activeTrack) return;
      
      const slides = getSlides(activeTrack);
      
      dotsContainer.innerHTML = "";
      thumbsContainer.innerHTML = "";
      
      slides.forEach((slide, idx) => {
        // 1. Dot Indicators
        const dot = document.createElement("button");
        dot.className = `gallery__dot ${idx === currentIndex ? "active" : ""}`;
        dot.type = "button";
        dot.setAttribute("aria-label", `Go to slide ${idx + 1}`);
        dot.addEventListener("click", () => showSlide(idx));
        dotsContainer.appendChild(dot);
        
        // 2. Thumbnails
        const thumb = document.createElement("div");
        thumb.className = `gallery__thumb ${idx === currentIndex ? "active" : ""}`;
        
        const img = document.createElement("img");
        const slideImg = slide.querySelector("img");
        // thumbnails render ~100px wide — use the smallest variant, never the full-size source
        img.loading = "lazy"; // must be set before src or the fetch starts immediately
        img.src = slideImg ? (slideImg.dataset.thumb || slideImg.src) : "";
        img.alt = slideImg ? slideImg.alt : "";
        
        thumb.appendChild(img);
        thumb.addEventListener("click", () => showSlide(idx));
        thumbsContainer.appendChild(thumb);
      });
    };
    
    const showSlide = (index) => {
      const activeTrack = getActiveTrack();
      if (!activeTrack) return;
      
      const slides = getSlides(activeTrack);
      if (!slides.length) return;
      
      if (index >= slides.length) index = 0;
      if (index < 0) index = slides.length - 1;
      
      currentIndex = index;
      
      slides.forEach((slide, idx) => {
        slide.classList.toggle("active", idx === currentIndex);
      });
      
      const dots = $$(".gallery__dot", dotsContainer);
      dots.forEach((dot, idx) => {
        dot.classList.toggle("active", idx === currentIndex);
      });
      
      const thumbs = $$(".gallery__thumb", thumbsContainer);
      thumbs.forEach((thumb, idx) => {
        const isActive = idx === currentIndex;
        thumb.classList.toggle("active", isActive);
        if (isActive) {
          thumb.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
        }
      });
    };
    
    tabs.forEach((tab) => {
      tab.addEventListener("click", () => {
        const category = tab.dataset.galleryTab;
        if (category === activeCategory) return;
        
        activeCategory = category;
        currentIndex = 0;
        
        tabs.forEach((t) => t.classList.toggle("active", t === tab));
        
        tracks.forEach((track) => {
          const trackId = `galleryTrack${category.charAt(0).toUpperCase() + category.slice(1)}`;
          if (track.id === trackId) {
            track.classList.add("active");
            const slides = getSlides(track);
            slides.forEach((s, idx) => s.classList.toggle("active", idx === 0));
          } else {
            track.classList.remove("active");
          }
        });
        
        renderControls();
      });
    });
    
    prevBtn.addEventListener("click", () => showSlide(currentIndex - 1));
    nextBtn.addEventListener("click", () => showSlide(currentIndex + 1));
    
    // Dynamic image scaling: cover if wider than viewport, contain if taller/narrower (leaves side bars)
    const fitGalleryImages = () => {
      $$(".gallery__slide img").forEach((img) => {
        const checkFit = () => {
          const container = img.closest(".gallery__slide");
          if (!container) return;
          const imgAR = img.naturalWidth / img.naturalHeight;
          const containerAR = container.clientWidth / (container.clientHeight || 1);
          
          if (imgAR > containerAR) {
            img.style.objectFit = "cover";
            img.style.width = "100%";
            img.style.height = "100%";
          } else {
            img.style.objectFit = "contain";
            img.style.width = "auto";
            img.style.height = "auto";
            img.style.maxWidth = "100%";
            img.style.maxHeight = "100%";
          }
        };
        if (img.complete) {
          checkFit();
        } else {
          img.onload = checkFit;
        }
      });
    };

    window.addEventListener("resize", fitGalleryImages);
    fitGalleryImages();

    renderControls();
  };
  
  initGallery();



  /* ---------- amenities carousel (one slide per category, 1:1) ---------- */
  const amSlides = $$(".amenities__slide");
  const amButtons = $$("#amenityButtons li");
  const amPrevBtn = $("#amenitiesPrev");
  const amNextBtn = $("#amenitiesNext");
  const amDotsContainer = $("#amenitiesDots");
  const amCounter = $("#amenitiesCounter");
  const amRail = $("#amenityButtons");

  if (amSlides.length > 0) {
    const N = amSlides.length;
    let amIndex = 0;
    const pad = (n) => String(n).padStart(2, "0");

    amSlides.forEach((_, i) => {
      const dot = document.createElement("button");
      dot.type = "button";
      dot.setAttribute("aria-label", `Go to amenity ${i + 1}`);
      if (i === 0) dot.className = "is-active";
      dot.addEventListener("click", () => amGoTo(i));
      amDotsContainer.appendChild(dot);
    });
    const amDots = $$("button", amDotsContainer);
    if (amCounter) { const t = amCounter.querySelector("span"); if (t) t.textContent = `/ ${pad(N)}`; }

    const amGoTo = (index) => {
      amSlides[amIndex].classList.remove("is-active");
      amDots[amIndex]?.classList.remove("is-active");
      amButtons[amIndex]?.classList.remove("is-active");

      amIndex = (index + N) % N;

      amSlides[amIndex].classList.add("is-active");
      amDots[amIndex]?.classList.add("is-active");
      amButtons[amIndex]?.classList.add("is-active");
      if (amCounter) amCounter.querySelector("strong").textContent = pad(amIndex + 1);

      // Update our custom active label in the selector card
      const active = amButtons[amIndex];
      const activeLabel = document.getElementById("amActiveLabel");
      if (activeLabel && active) {
        activeLabel.textContent = active.getAttribute("title") || "";
      }
    };

    amPrevBtn?.addEventListener("click", () => amGoTo(amIndex - 1));
    amNextBtn?.addEventListener("click", () => amGoTo(amIndex + 1));
    amButtons.forEach((btn) => btn.addEventListener("click", () => amGoTo(parseInt(btn.dataset.index, 10))));
  }

  /* ---------- interactive residence selector ---------- */
  const floorHotspots = $("#floorHotspots");
  const selectorStage = $(".res-selector__stage");
  const selectorImage = $(".res-selector__image");
  const floorModal = $("#floorModal");
  const floorModalClose = $("#floorModalClose");
  const floorModalKicker = $("#floorModalKicker");
  const floorModalTitle = $("#floorModalTitle");
  const floorModalSub = $("#floorModalSub");
  const floorPlanStage = $("#floorPlanStage");
  const floorPlanImage = $("#floorPlanImage");
  const flatHotspots = $("#flatHotspots");
  const floorModeLabel = $("#floorModeLabel");
  const flatTitle = $("#flatTitle");
  const flatCopy = $("#flatCopy");
  const flatMeta = $("#flatMeta");
  const flatEnquire = $("#flatEnquire");
  const floorBack = $("#floorBack");

  const towerPlans = {
    a: {
      name: "Tower A",
      type: "3 BHK",
      floorPlan: "assets/images/plan/TOWER-A.webp",
      bounds: { x: 31.4, y: 9.7, w: 12.2, h: 73.8 },
      units: [
        { id: "a1", unit: "Unit 1", label: "A1", facing: "East", type: "3 BHK", area: "3,587 sq ft", plan: "assets/images/interactive/unit-a-1-3bhk-3587.webp", zone: { x: 5.5, y: 9.4, w: 34, h: 31 } },
        { id: "a2", unit: "Unit 2", label: "A2", facing: "West", type: "3 BHK", area: "3,617 sq ft", plan: "assets/images/interactive/unit-a-2-3bhk-3617.webp", zone: { x: 42.5, y: 15.2, w: 35, h: 31 } },
        { id: "a3", unit: "Unit 3", label: "A3", facing: "East", type: "3 BHK", area: "3,678 sq ft", plan: "assets/images/interactive/unit-a-3-3bhk-3678.webp", zone: { x: 27.8, y: 64.8, w: 31, h: 30 } },
        { id: "a4", unit: "Unit 4", label: "A4", facing: "West", type: "3 BHK", area: "3,671 sq ft", plan: "assets/images/interactive/unit-a-4-3bhk-3671.webp", zone: { x: 63.4, y: 68.6, w: 31, h: 28 } },
      ],
    },
    b: {
      name: "Tower B",
      type: "4 BHK",
      floorPlan: "assets/images/plan/TOWER-B.webp",
      bounds: { x: 55.4, y: 9.7, w: 12.2, h: 73.8 },
      units: [
        { id: "b1", unit: "Unit 1", label: "B1", facing: "East", type: "4 BHK", area: "4,545 sq ft", plan: "assets/images/interactive/unit-b-1-4bhk-4545.webp", zone: { x: 3.4, y: 4.2, w: 35.5, h: 34 } },
        { id: "b2", unit: "Unit 2", label: "B2", facing: "West", type: "4 BHK", area: "4,549 sq ft", plan: "assets/images/interactive/unit-b-2-4bhk-4549.webp", zone: { x: 44.5, y: 7.8, w: 33, h: 32 } },
        { id: "b3", unit: "Unit 3", label: "B3", facing: "East", type: "4 BHK", area: "4,622 sq ft", plan: "assets/images/interactive/unit-b-3-4bhk-4622.webp", zone: { x: 32.5, y: 62.2, w: 32.5, h: 32 } },
        { id: "b4", unit: "Unit 4", label: "B4", facing: "West", type: "4 BHK", area: "4,621 sq ft", plan: "assets/images/interactive/unit-b-4-4bhk-4621.webp", zone: { x: 66.2, y: 65.5, w: 31.6, h: 31 } },
      ],
    },
  };

  let activeTowerKey = "a";
  let activeFloor = 35;

  const positionFloorHotspots = () => {
    if (!floorHotspots || !selectorStage || !selectorImage) return;
    const rect = selectorStage.getBoundingClientRect();
    const naturalWidth = selectorImage.naturalWidth || 1672;
    const naturalHeight = selectorImage.naturalHeight || 941;
    if (!rect.width || !rect.height) return;

    const scale = Math.max(rect.width / naturalWidth, rect.height / naturalHeight);
    const renderedWidth = naturalWidth * scale;
    const renderedHeight = naturalHeight * scale;
    floorHotspots.style.width = `${renderedWidth}px`;
    floorHotspots.style.height = `${renderedHeight}px`;
    floorHotspots.style.left = `${(rect.width - renderedWidth) / 2}px`;
    floorHotspots.style.top = `${(rect.height - renderedHeight) / 2}px`;
  };

  /* ---------- floor-plan pan / pinch / zoom viewer ---------- */
  const planViewer = (() => {
    const stage = floorPlanStage;
    const layer = $("#floorPlanZoomWrapper");
    const img = floorPlanImage;
    if (!stage || !layer || !img) return null;

    let scale = 1, tx = 0, ty = 0, baseW = 0, baseH = 0, natAspect = 4391 / 5923;
    const MIN = 1, MAX = 4.5;

    const apply = () => {
      layer.style.setProperty("--k", scale);
      layer.style.setProperty("--tx", `${tx}px`);
      layer.style.setProperty("--ty", `${ty}px`);
      stage.classList.toggle("is-zoomed", scale > 1.01);
    };
    const clampT = () => {
      const mx = Math.max(0, (baseW * scale - stage.clientWidth) / 2);
      const my = Math.max(0, (baseH * scale - stage.clientHeight) / 2);
      tx = clamp(tx, -mx, mx);
      ty = clamp(ty, -my, my);
    };
    const computeFit = () => {
      const body = stage.closest(".floor-modal__body");
      if (!body) return;
      const stacked = getComputedStyle(body).flexDirection === "column";
      const gap = parseFloat(getComputedStyle(body).gap) || 20;
      if (stacked) {
        stage.style.width = "";
        const sw = stage.clientWidth, sh = stage.clientHeight;
        let w = sw, h = sw / natAspect;
        if (h > sh) { h = sh; w = sh * natAspect; }
        baseW = Math.round(w); baseH = Math.round(h);
      } else {
        const side = body.querySelector(".floor-modal__side");
        const bodyH = body.clientHeight;
        const availW = body.clientWidth - (side ? side.offsetWidth : 0) - gap - 2;
        let h = bodyH, w = h * natAspect;
        if (w > availW) { w = availW; h = w / natAspect; }
        baseW = Math.round(w); baseH = Math.round(h);
        stage.style.width = `${baseW}px`;
        stage.style.height = `${baseH}px`;
      }
      layer.style.width = `${baseW}px`;
      layer.style.height = `${baseH}px`;
    };
    const reset = () => { scale = 1; tx = 0; ty = 0; computeFit(); apply(); };
    const refresh = () => { computeFit(); clampT(); apply(); };
    const zoomTo = (k, px, py) => {
      const r = stage.getBoundingClientRect();
      const Px = px - r.left - r.width / 2;
      const Py = py - r.top - r.height / 2;
      const nk = clamp(k, MIN, MAX);
      tx = Px - (Px - tx) * (nk / scale);
      ty = Py - (Py - ty) * (nk / scale);
      scale = nk;
      clampT(); apply();
    };
    const load = (src, alt) => {
      scale = 1; tx = 0; ty = 0; apply();
      const done = () => { if (img.naturalWidth) natAspect = img.naturalWidth / img.naturalHeight; reset(); };
      img.alt = alt || "";
      if (img.getAttribute("src") === src && img.complete && img.naturalWidth) done();
      else { img.onload = done; img.src = src; }
    };

    // pointer gestures: 1 finger / mouse = pan, 2 fingers = pinch
    const pts = new Map();
    let pinchDist = 0, panFrom = null;
    stage.addEventListener("pointerdown", (e) => {
      if (e.target.closest(".flat-hotspot")) return; // let hotspots handle their own taps
      stage.setPointerCapture(e.pointerId);
      pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pts.size === 1) { panFrom = { x: e.clientX, y: e.clientY, tx, ty }; if (scale > 1.01) stage.classList.add("is-panning"); }
      else if (pts.size === 2) { const p = [...pts.values()]; pinchDist = Math.hypot(p[0].x - p[1].x, p[0].y - p[1].y); panFrom = null; }
    });
    stage.addEventListener("pointermove", (e) => {
      if (!pts.has(e.pointerId)) return;
      pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pts.size >= 2) {
        const p = [...pts.values()];
        const d = Math.hypot(p[0].x - p[1].x, p[0].y - p[1].y);
        if (pinchDist) zoomTo(scale * (d / pinchDist), (p[0].x + p[1].x) / 2, (p[0].y + p[1].y) / 2);
        pinchDist = d;
      } else if (panFrom && scale > 1.01) {
        tx = panFrom.tx + (e.clientX - panFrom.x);
        ty = panFrom.ty + (e.clientY - panFrom.y);
        clampT(); apply();
      }
    });
    const up = (e) => {
      pts.delete(e.pointerId);
      if (pts.size < 2) pinchDist = 0;
      if (pts.size === 0) { stage.classList.remove("is-panning"); panFrom = null; }
      else { const p = [...pts.values()][0]; panFrom = { x: p.x, y: p.y, tx, ty }; }
    };
    stage.addEventListener("pointerup", up);
    stage.addEventListener("pointercancel", up);
    stage.addEventListener("wheel", (e) => { e.preventDefault(); zoomTo(scale * Math.exp(-e.deltaY * 0.0016), e.clientX, e.clientY); }, { passive: false });
    stage.addEventListener("dblclick", (e) => { e.preventDefault(); if (scale > 1.01) reset(); else zoomTo(2.4, e.clientX, e.clientY); });
    const ctr = () => { const r = stage.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; };
    $("#zoomIn")?.addEventListener("click", () => zoomTo(scale * 1.45, ...ctr()));
    $("#zoomOut")?.addEventListener("click", () => zoomTo(scale / 1.45, ...ctr()));
    window.addEventListener("resize", refresh, { passive: true });
    if ("ResizeObserver" in window) new ResizeObserver(refresh).observe(stage);

    return { load, reset, refresh };
  })();

  const setFloorView = () => {
    const tower = towerPlans[activeTowerKey];
    planViewer?.load(tower.floorPlan, `${tower.name} typical floor plate`);
    if (floorModalKicker) floorModalKicker.textContent = `${tower.name} · Floor ${activeFloor}`;
    if (floorModalTitle) floorModalTitle.textContent = `${tower.name} Typical Floor Plate`;
    if (floorModalSub) floorModalSub.textContent = `Select a flat on Floor ${activeFloor} to view the individual ${tower.type} plan.`;
    if (floorModeLabel) floorModeLabel.textContent = "Typical floor";
    if (flatTitle) flatTitle.textContent = "Choose a flat";
    if (flatCopy) flatCopy.textContent = `Four ${tower.type} residences are arranged around the lift lobby on this typical floor.`;
    if (flatMeta) flatMeta.innerHTML = tower.units.map((u) => `<span>${u.unit}<strong>${u.area}</strong></span>`).join("");
    if (flatEnquire) flatEnquire.dataset.intent = tower.type;
    floorBack.hidden = true;
    flatHotspots.innerHTML = "";
    tower.units.forEach((unit) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "flat-hotspot";
      btn.style.left = `${unit.zone.x}%`;
      btn.style.top = `${unit.zone.y}%`;
      btn.style.width = `${unit.zone.w}%`;
      btn.style.height = `${unit.zone.h}%`;
      btn.setAttribute("aria-label", `${unit.unit}, ${unit.type}, ${unit.area}`);
      btn.innerHTML = `<span>${unit.label}</span>`;
      btn.addEventListener("click", () => setFlatView(unit));
      flatHotspots.appendChild(btn);
    });
  };

  const setFlatView = (unit) => {
    const tower = towerPlans[activeTowerKey];
    planViewer?.load(unit.plan, `${tower.name} ${unit.unit} floor plan`);
    if (floorModalKicker) floorModalKicker.textContent = `${tower.name} · Floor ${activeFloor}`;
    if (floorModalTitle) floorModalTitle.textContent = `${unit.unit} · ${unit.type}`;
    if (floorModalSub) floorModalSub.textContent = `${unit.area} ${unit.facing.toLowerCase()}-facing residence.`;
    if (floorModeLabel) floorModeLabel.textContent = "Flat plan";
    if (flatTitle) flatTitle.textContent = `${tower.name} ${unit.unit}`;
    if (flatCopy) flatCopy.textContent = "This individual plan is extracted from the project brochure for closer review.";
    if (flatMeta) {
      flatMeta.innerHTML = `
        <span>Tower<strong>${tower.name}</strong></span>
        <span>Flat<strong>${unit.unit}</strong></span>
        <span>Type<strong>${unit.type}</strong></span>
        <span>Facing<strong>${unit.facing}</strong></span>
        <span>Saleable area<strong>${unit.area}</strong></span>
      `;
    }
    if (flatEnquire) flatEnquire.dataset.intent = `${tower.name} ${unit.unit}`;
    floorBack.hidden = false;
    flatHotspots.innerHTML = "";
  };

  const openFloorModal = (towerKey, floor) => {
    activeTowerKey = towerKey;
    activeFloor = floor;
    setFloorView();
    floorModal.classList.add("is-open");
    floorModal.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
    floorModalClose.focus();
    requestAnimationFrame(() => planViewer?.refresh());
  };

  const closeFloorModal = () => {
    if (!floorModal?.classList.contains("is-open")) return;
    floorModal.classList.remove("is-open");
    floorModal.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
  };

  if (floorHotspots && floorModal) {
    const MIN_FLOOR = 5;
    const MAX_FLOOR = 55;
    const FLOOR_COUNT = MAX_FLOOR - MIN_FLOOR + 1;
    Object.entries(towerPlans).forEach(([towerKey, tower]) => {
      for (let floor = MIN_FLOOR; floor <= MAX_FLOOR; floor += 1) {
        const strip = document.createElement("button");
        const offsetFromTop = MAX_FLOOR - floor;
        strip.type = "button";
        strip.className = "floor-hotspot";
        strip.style.left = `${tower.bounds.x}%`;
        strip.style.top = `${tower.bounds.y + (tower.bounds.h / FLOOR_COUNT) * offsetFromTop}%`;
        strip.style.width = `${tower.bounds.w}%`;
        strip.style.height = `${tower.bounds.h / FLOOR_COUNT}%`;
        strip.dataset.label = `${tower.name} Floor ${floor}`;
        strip.setAttribute("aria-label", `${tower.name} Floor ${floor}`);
        strip.addEventListener("click", () => openFloorModal(towerKey, floor));
        floorHotspots.appendChild(strip);
      }
    });
    positionFloorHotspots();
    selectorImage?.addEventListener("load", positionFloorHotspots);
    window.addEventListener("resize", positionFloorHotspots, { passive: true });
    if ("ResizeObserver" in window && selectorStage) {
      new ResizeObserver(positionFloorHotspots).observe(selectorStage);
    }
    floorModalClose.addEventListener("click", closeFloorModal);
    floorModal.addEventListener("click", (e) => { if (e.target === floorModal) closeFloorModal(); });
    floorBack.addEventListener("click", setFloorView);
  }

  /* ---------- CONNECTED map: pinned scroll animation ---------- */
  const connect = $(".connect");
  const timelineFill = $("#timelineFill");
  const car = $("#timelineCar");
  const timelineEl = $(".timeline");
  const stops = $$(".timeline__stop");
  const radiusCircle = $("#radiusCircle");
  const radiusPulse = $("#radiusPulse");
  const mapZoom = $("#mapZoom");
  const pois = $$(".poi");

  const RINGS = [
    { at: 0.3, ring: "1" },
    { at: 0.62, ring: "2" },
    { at: 0.92, ring: "3" },
  ];
  const R_MIN = 42;
  const R_MAX = 560;
  const easeOut = (t) => 1 - Math.pow(1 - t, 2.2);

  if (connect && !reduced) {
    let ticking = false;
    const render = () => {
      ticking = false;
      const rect = connect.getBoundingClientRect();
      const range = rect.height - window.innerHeight;
      const p = clamp(-rect.top / range, 0, 1);

      // car travels the timeline; the covered stretch fills in
      const carW = 56;
      const travel = timelineEl.clientWidth - carW;
      car.style.transform = `translateX(${travel * p}px)`;
      timelineFill.style.width = `${p * 100}%`;

      // stops light up as the car reaches them
      stops.forEach((s) => s.classList.toggle("is-on", p >= parseFloat(s.dataset.at) - 0.02));

      // radius grows around the project pin
      const r = lerp(R_MIN, R_MAX, easeOut(p));
      radiusCircle.setAttribute("r", r);
      radiusPulse.setAttribute("r", r * 0.72);
      radiusPulse.setAttribute("stroke-opacity", String(0.16 * (1 - p * 0.6)));

      // map eases out from a closer zoom as the radius expands
      mapZoom.style.transform = `scale(${lerp(1.22, 1, easeOut(p))})`;

      // POI pills pop in ring by ring
      RINGS.forEach(({ at, ring }) => {
        const on = p >= at - 0.06;
        pois.forEach((poi) => {
          if (poi.dataset.ring === ring) poi.classList.toggle("is-on", on);
        });
      });
    };
    const onScroll = () => {
      if (!ticking) { ticking = true; requestAnimationFrame(render); }
    };
    bindScrollWhileVisible(connect, onScroll);
    window.addEventListener("resize", onScroll);
    render();
  } else if (connect && reduced) {
    // static fallback: everything visible
    radiusCircle.setAttribute("r", R_MAX * 0.8);
    pois.forEach((poi) => poi.classList.add("is-on"));
    stops.forEach((s) => s.classList.add("is-on"));
    timelineFill.style.width = "100%";
  }

  /* ---------- lightbox ---------- */
  const lightbox = $("#lightbox");
  const lbImg = $("#lightboxImg");
  const lbCap = $("#lightboxCap");
  const openLightbox = (src, cap) => {
    lbImg.src = src;
    lbImg.alt = cap || "";
    lbCap.textContent = cap || "";
    lightbox.classList.add("is-open");
    lightbox.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
  };
  const closeLightbox = () => {
    lightbox.classList.remove("is-open");
    lightbox.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
  };
  $(".lightbox__close").addEventListener("click", closeLightbox);
  lightbox.addEventListener("click", (e) => { if (e.target === lightbox) closeLightbox(); });
  $$("[data-lightbox-src]").forEach((btn) =>
    btn.addEventListener("click", () => openLightbox(btn.dataset.lightboxSrc, btn.dataset.lightboxCap))
  );
  $$(".gallery__slide img").forEach((img) => {
    img.style.cursor = "zoom-in";
    img.addEventListener("click", () => {
      const cap = img.nextElementSibling?.textContent || "";
      openLightbox(img.dataset.full || img.src, cap);
    });
  });
  $$(".welcome__slide").forEach((fig) => {
    const img = fig.querySelector("img");
    if (!img) return;
    img.style.cursor = "zoom-in";
    const cap = fig.querySelector("h3")?.textContent || "";
    img.addEventListener("click", () => openLightbox(img.dataset.full || img.src, cap));
  });

  /* ---------- enquiry modal ---------- */
  const modal = $("#modal");
  const modalIntent = $("#modalIntent");
  const openModal = (intent = "general") => {
    modalIntent.value = intent;
    const title = $("#modalTitle");
    if (intent === "brochure") title.textContent = "Get the Brochure";
    else if (intent.includes("BHK")) title.textContent = `Enquire — ${intent}`;
    else if (intent === "visit") title.textContent = "Book a Site Visit";
    else title.textContent = "Register Your Interest";
    modal.classList.add("is-open");
    modal.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
    setTimeout(() => $("#modalForm input")?.focus(), 340);
  };
  const closeModal = () => {
    modal.classList.remove("is-open");
    modal.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
  };
  $$("[data-open-enquiry]").forEach((btn) =>
    btn.addEventListener("click", () => openModal(btn.dataset.intent || "general"))
  );
  $("[data-close-modal]").addEventListener("click", closeModal);
  modal.addEventListener("click", (e) => { if (e.target === modal) closeModal(); });

  document.addEventListener("keydown", (e) => {
    if (e.key !== "Escape") return;
    closeDiscoverPlayer();
    closeFloorModal();
    closeModal();
    closeLightbox();
    setDrawer(false);
  });

  /* ---------- forms (demo submit) ----------
     Wire to your CRM / lead endpoint, e.g.
     fetch("/api/lead", { method: "POST", body: new FormData(form) })      */
  const handleSubmit = (form, okEl) => {
    if (!form) return;
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      if (!form.reportValidity()) return;
      const btn = form.querySelector('button[type="submit"]');
      btn.disabled = true;
      btn.textContent = "Sending…";
      setTimeout(() => {
        okEl.hidden = false;
        btn.textContent = "Sent ✓";
        form.querySelectorAll("input, select, textarea").forEach((f) => (f.disabled = true));
      }, 650);
    });
  };
  handleSubmit($("#enquiryForm"), $("#formOk"));
  handleSubmit($("#modalForm"), $("#modalOk"));
  handleSubmit($("#newsForm"), $("#newsOk"));

  /* ---------- preselect interest from unit cards ---------- */
  $$("[data-open-enquiry][data-intent]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const sel = $("#interestSelect");
      const val = btn.dataset.intent;
      if (sel && [...sel.options].some((o) => o.value === val)) sel.value = val;
    });
  });

  /* ---------- Balcony Views Day/Night Slider ---------- */
  const initViewsSlider = () => {
    const slider = document.getElementById("viewsSlider");
    const overlay = document.getElementById("viewsOverlay");
    const handle = document.getElementById("viewsHandle");
    
    if (!slider || !overlay || !handle) return;
    
    let isDragging = false;
    
    const updateSlider = (x) => {
      const rect = slider.getBoundingClientRect();
      const pct = Math.max(0, Math.min(100, ((x - rect.left) / (rect.width || 1)) * 100));
      
      overlay.style.width = `${pct}%`;
      handle.style.left = `${pct}%`;
      
      // Update image width property to keep the image centered without squeezing
      overlay.style.setProperty('--container-width', `${rect.width}px`);
    };
    
    const startDrag = (e) => {
      isDragging = true;
      overlay.style.transition = "none";
      handle.style.transition = "none";
      
      const clientX = e.type.startsWith('touch') ? e.touches[0].clientX : e.clientX;
      updateSlider(clientX);
      
      // Prevent browser text selection or scrolling while dragging starts
      if (e.cancelable) e.preventDefault();
    };
    
    const drag = (e) => {
      if (!isDragging) return;
      const clientX = e.type.startsWith('touch') ? e.touches[0].clientX : e.clientX;
      updateSlider(clientX);
    };
    
    const stopDrag = () => {
      isDragging = false;
    };
    
    // Desktop mouse events
    slider.addEventListener("mousedown", startDrag);
    window.addEventListener("mousemove", drag);
    window.addEventListener("mouseup", stopDrag);
    
    // Mobile touch events
    slider.addEventListener("touchstart", startDrag, { passive: false });
    window.addEventListener("touchmove", drag, { passive: true });
    window.addEventListener("touchend", stopDrag);
    window.addEventListener("touchcancel", stopDrag);
    
    // Resize handler to update image width variable
    const onResize = () => {
      const rect = slider.getBoundingClientRect();
      overlay.style.setProperty('--container-width', `${rect.width}px`);
    };
    window.addEventListener("resize", onResize);
    onResize();
  };
  
  initViewsSlider();

  /* ---------- Master/Floor Plans Modal ---------- */
  const initPlanModal = () => {
    const modal = $("#planModal");
    const title = $("#planModalTitle");
    const image = $("#planModalImage");
    const tabs = $("#planModalTabs");
    const overlay = $("#planModalOverlay");
    const closeBtn = $("#planModalClose");
    
    const openMaster = $("#openMasterPlan");
    const openFloor = $("#openFloorPlans");
    
    // Zoom & Pan elements
    const stage = $("#planModalZoomStage");
    const layer = $("#planModalZoomLayer");
    
    if (!modal || !openMaster || !openFloor || !stage || !layer) return;
    
    let scale = 1;
    let tx = 0;
    let ty = 0;
    let isDragging = false;
    let startX = 0;
    let startY = 0;
    
    // Touch tracking for pinch-to-zoom
    let touchStartScale = 1;
    let lastTouchDistance = 0;
    
    const applyTransform = () => {
      layer.style.setProperty("--k", scale);
      layer.style.setProperty("--tx", `${tx}px`);
      layer.style.setProperty("--ty", `${ty}px`);
    };
    
    const resetZoom = () => {
      scale = 1;
      tx = 0;
      ty = 0;
      applyTransform();
    };
    
    const clampTranslations = () => {
      if (scale <= 1) {
        tx = 0;
        ty = 0;
        return;
      }
      const maxTx = (stage.clientWidth * (scale - 1)) / 2;
      const maxTy = (stage.clientHeight * (scale - 1)) / 2;
      tx = clamp(tx, -maxTx, maxTx);
      ty = clamp(ty, -maxTy, maxTy);
    };
    
    const getDistance = (t1, t2) => {
      return Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
    };
    
    // Mouse Drag (Desktop)
    stage.addEventListener("mousedown", (e) => {
      if (scale <= 1) return;
      isDragging = true;
      startX = e.clientX - tx;
      startY = e.clientY - ty;
      stage.classList.add("is-dragging");
    });
    
    window.addEventListener("mousemove", (e) => {
      if (!isDragging) return;
      tx = e.clientX - startX;
      ty = e.clientY - startY;
      clampTranslations();
      applyTransform();
    });
    
    window.addEventListener("mouseup", () => {
      isDragging = false;
      stage.classList.remove("is-dragging");
    });
    
    // Mouse Wheel Zoom (Desktop)
    stage.addEventListener("wheel", (e) => {
      e.preventDefault();
      const zoomSpeed = 0.15;
      const prevScale = scale;
      if (e.deltaY < 0) {
        scale = Math.min(4, scale + zoomSpeed);
      } else {
        scale = Math.max(1, scale - zoomSpeed);
      }
      
      if (scale === 1) {
        tx = 0;
        ty = 0;
      } else {
        const rect = stage.getBoundingClientRect();
        const mouseX = e.clientX - rect.left - rect.width / 2;
        const mouseY = e.clientY - rect.top - rect.height / 2;
        tx -= (mouseX * (scale - prevScale)) / scale;
        ty -= (mouseY * (scale - prevScale)) / scale;
        clampTranslations();
      }
      applyTransform();
    }, { passive: false });
    
    // Touch Panning & Pinch-to-Zoom (Mobile)
    stage.addEventListener("touchstart", (e) => {
      if (e.touches.length === 2) {
        isDragging = false;
        lastTouchDistance = getDistance(e.touches[0], e.touches[1]);
        touchStartScale = scale;
      } else if (e.touches.length === 1) {
        isDragging = true;
        startX = e.touches[0].clientX - tx;
        startY = e.touches[0].clientY - ty;
        stage.classList.add("is-dragging");
      }
    }, { passive: true });
    
    stage.addEventListener("touchmove", (e) => {
      if (e.touches.length === 2) {
        e.preventDefault();
        const dist = getDistance(e.touches[0], e.touches[1]);
        const factor = dist / (lastTouchDistance || 1);
        scale = Math.max(1, Math.min(4, touchStartScale * factor));
        if (scale === 1) {
          tx = 0;
          ty = 0;
        } else {
          clampTranslations();
        }
        applyTransform();
      } else if (e.touches.length === 1 && isDragging) {
        e.preventDefault();
        tx = e.touches[0].clientX - startX;
        ty = e.touches[0].clientY - startY;
        clampTranslations();
        applyTransform();
      }
    }, { passive: false });
    
    stage.addEventListener("touchend", (e) => {
      isDragging = false;
      stage.classList.remove("is-dragging");
      if (e.touches.length === 1) {
        startX = e.touches[0].clientX - tx;
        startY = e.touches[0].clientY - ty;
        isDragging = true;
        stage.classList.add("is-dragging");
      }
    });
    
    const openModal = (type) => {
      modal.classList.add("is-open");
      modal.setAttribute("aria-hidden", "false");
      document.body.style.overflow = "hidden"; // lock page scroll
      resetZoom();
      
      if (type === "master") {
        title.textContent = "Master Plan";
        image.src = "assets/images/plan/master.webp";
        tabs.style.display = "none";
      } else {
        title.textContent = "Floor Plans";
        image.src = "assets/images/plan/TOWER-A.webp";
        tabs.style.display = "flex";
        
        // reset tab states
        const tabBtns = $$(".plan-modal__tab-btn");
        tabBtns.forEach((btn, idx) => {
          btn.classList.toggle("is-active", idx === 0);
        });
      }
    };
    
    const closeModal = () => {
      modal.classList.remove("is-open");
      modal.setAttribute("aria-hidden", "true");
      document.body.style.overflow = ""; // unlock page scroll
      setTimeout(() => { image.src = ""; resetZoom(); }, 300);
    };
    
    openMaster.addEventListener("click", () => openModal("master"));
    openFloor.addEventListener("click", () => openModal("floor"));
    closeBtn.addEventListener("click", closeModal);
    overlay.addEventListener("click", closeModal);
    
    // Handle floor plan tab clicks
    tabs.addEventListener("click", (e) => {
      const btn = e.target.closest(".plan-modal__tab-btn");
      if (!btn) return;
      
      const tabBtns = $$(".plan-modal__tab-btn");
      tabBtns.forEach(b => b.classList.remove("is-active"));
      btn.classList.add("is-active");
      
      resetZoom();
      
      const tower = btn.getAttribute("data-tower");
      if (tower === "A") {
        image.src = "assets/images/plan/TOWER-A.webp";
      } else {
        image.src = "assets/images/plan/TOWER-B.webp";
      }
    });
    
    // Close on ESC key
    window.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && modal.classList.contains("is-open")) {
        closeModal();
      }
    });
  };
  
  initPlanModal();
})();
