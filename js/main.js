/* ============================================================
   JAYABHERI THE PINNACLE — interactions
   ============================================================ */
(() => {
  "use strict";

  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];
  const clamp = (v, a, b) => Math.min(Math.max(v, a), b);
  const lerp = (a, b, t) => a + (b - a) * t;

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

  /* ---------- dynamic navbar transparency on scroll ---------- */
  const nav = $("#nav");
  let navTicking = false;
  const updateNavState = () => {
    nav?.classList.toggle("is-scrolled", window.scrollY > 1);
    navTicking = false;
  };
  window.addEventListener("scroll", () => {
    if (!navTicking) {
      window.requestAnimationFrame(updateNavState);
      navTicking = true;
    }
  }, { passive: true });
  updateNavState();

  /* ---------- reveal on scroll ---------- */
  const io = new IntersectionObserver(
    (entries) => entries.forEach((e) => {
      if (e.isIntersecting) { e.target.classList.add("in-view"); io.unobserve(e.target); }
    }),
    { threshold: 0.12, rootMargin: "0px 0px -6% 0px" }
  );
  $$(".reveal").forEach((el) => io.observe(el));

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
    // autoplay silently when it scrolls into view; button stays for sound
    new IntersectionObserver((entries, obs) => {
      entries.forEach((e) => {
        if (e.isIntersecting) {
          dVideo.play().then(() => setPreviewPauseIcon(false)).catch(() => {});
          dPause.hidden = false;
          obs.disconnect();
        }
      });
    }, { threshold: 0.45 }).observe(dVideo);
  }

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
        img.src = slideImg ? slideImg.src : "";
        img.alt = slideImg ? slideImg.alt : "";
        img.loading = "lazy";
        
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
    
    renderControls();
  };
  
  initGallery();

  /* ---------- grand welcome carousel ---------- */
  const wTrack = $("#welcomeTrack");
  if (wTrack) {
    const slides = $$(".welcome__slide", wTrack);
    const dots = $$("#welcomeDots button");
    const GAP = 18;
    const step = () => wTrack.clientWidth + GAP;
    let current = 0;
    const go = (i) => {
      current = clamp(i, 0, slides.length - 1);
      wTrack.scrollTo({ left: current * step(), behavior: "smooth" });
    };
    $("#welcomePrev").addEventListener("click", () => go(current - 1));
    $("#welcomeNext").addEventListener("click", () => go(current + 1));
    dots.forEach((d, i) => d.addEventListener("click", () => go(i)));
    // dots track the animation live; `current` commits once scrolling settles
    // so rapid clicks aren't reset by in-flight smooth scrolling
    let settle;
    wTrack.addEventListener("scroll", () => {
      const i = clamp(Math.round(wTrack.scrollLeft / step()), 0, slides.length - 1);
      dots.forEach((d, j) => d.classList.toggle("is-active", j === i));
      clearTimeout(settle);
      settle = setTimeout(() => { current = i; }, 90);
    }, { passive: true });
  }

  /* ---------- fullscreen amenities carousel ---------- */
  const amSlides = $$(".amenities__slide");
  const amButtons = $$("#amenityButtons li");
  const amPrevBtn = $("#amenitiesPrev");
  const amNextBtn = $("#amenitiesNext");
  const amDotsContainer = $("#amenitiesDots");

  if (amSlides.length > 0) {
    let amCurrentIndex = 0;

    // Create dots
    amSlides.forEach((_, i) => {
      const dot = document.createElement("button");
      dot.type = "button";
      dot.setAttribute("aria-label", `Go to slide ${i + 1}`);
      if (i === 0) dot.className = "is-active";
      dot.addEventListener("click", () => amGoTo(i));
      amDotsContainer.appendChild(dot);
    });
    const amDots = $$("button", amDotsContainer);

    const amGoTo = (index) => {
      amSlides[amCurrentIndex].classList.remove("is-active");
      amDots[amCurrentIndex].classList.remove("is-active");

      amCurrentIndex = (index + amSlides.length) % amSlides.length;

      amSlides[amCurrentIndex].classList.add("is-active");
      amDots[amCurrentIndex].classList.add("is-active");

      // Update top button state
      const currentGroup = amSlides[amCurrentIndex].dataset.group;
      amButtons.forEach((btn) => {
        const btnGroup = btn.dataset.group;
        btn.classList.toggle("is-active", btnGroup === currentGroup);
      });

      // Scroll the buttons panel to keep the active one visible on mobile/tablet
      const activeBtn = $("#amenityButtons li.is-active");
      if (activeBtn) {
        const parent = $("#amenityButtons");
        const parentLeft = parent.getBoundingClientRect().left;
        const btnLeft = activeBtn.getBoundingClientRect().left;
        const currentScroll = parent.scrollLeft;
        parent.scrollTo({
          left: currentScroll + (btnLeft - parentLeft) - (parent.clientWidth / 2) + (activeBtn.clientWidth / 2),
          behavior: "smooth"
        });
      }
    };

    amPrevBtn?.addEventListener("click", () => amGoTo(amCurrentIndex - 1));
    amNextBtn?.addEventListener("click", () => amGoTo(amCurrentIndex + 1));

    // Click category buttons
    amButtons.forEach((btn) => {
      btn.addEventListener("click", () => {
        const index = parseInt(btn.dataset.slideIndex, 10);
        amGoTo(index);
      });
    });
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

  let floorPlanZoom = 1;
  const updatePlanZoom = () => {
    const wrapper = $("#floorPlanZoomWrapper");
    if (!wrapper) return;
    wrapper.style.width = `${floorPlanZoom * 100}%`;
    wrapper.style.height = `${floorPlanZoom * 100}%`;
    if (floorPlanStage) {
      if (floorPlanZoom > 1.0) {
        floorPlanStage.style.cursor = "grab";
      } else {
        floorPlanStage.style.cursor = "";
      }
    }
  };

  const setFloorView = () => {
    floorPlanZoom = 1;
    updatePlanZoom();
    const tower = towerPlans[activeTowerKey];
    floorPlanStage.style.aspectRatio = "4391 / 5923";
    floorPlanImage.src = tower.floorPlan;
    floorPlanImage.alt = `${tower.name} typical floor plate`;
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
    floorPlanZoom = 1;
    updatePlanZoom();
    const tower = towerPlans[activeTowerKey];
    floorPlanStage.style.aspectRatio = "2056 / 2977";
    floorPlanImage.src = unit.plan;
    floorPlanImage.alt = `${tower.name} ${unit.unit} floor plan`;
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

    // Zoom handlers
    $("#zoomIn")?.addEventListener("click", () => {
      floorPlanZoom = Math.min(floorPlanZoom + 0.25, 2.5);
      updatePlanZoom();
    });
    $("#zoomOut")?.addEventListener("click", () => {
      floorPlanZoom = Math.max(floorPlanZoom - 0.25, 1.0);
      updatePlanZoom();
    });

    // Drag-to-scroll / panning logic for floor plan stage
    let isDown = false;
    let startX;
    let startY;
    let scrollLeft;
    let scrollTop;

    floorPlanStage?.addEventListener("mousedown", (e) => {
      if (floorPlanZoom <= 1.0) return;
      if (e.target.tagName.toLowerCase() === "img") {
        e.preventDefault();
      }
      isDown = true;
      floorPlanStage.classList.add("is-dragging");
      floorPlanStage.style.cursor = "grabbing";
      startX = e.pageX - floorPlanStage.offsetLeft;
      startY = e.pageY - floorPlanStage.offsetTop;
      scrollLeft = floorPlanStage.scrollLeft;
      scrollTop = floorPlanStage.scrollTop;
    });

    floorPlanStage?.addEventListener("mouseleave", () => {
      isDown = false;
      floorPlanStage.classList.remove("is-dragging");
      if (floorPlanStage) {
        floorPlanStage.style.cursor = floorPlanZoom > 1.0 ? "grab" : "";
      }
    });

    floorPlanStage?.addEventListener("mouseup", () => {
      isDown = false;
      floorPlanStage.classList.remove("is-dragging");
      if (floorPlanStage) {
        floorPlanStage.style.cursor = floorPlanZoom > 1.0 ? "grab" : "";
      }
    });

    floorPlanStage?.addEventListener("mousemove", (e) => {
      if (!isDown) return;
      e.preventDefault();
      const x = e.pageX - floorPlanStage.offsetLeft;
      const y = e.pageY - floorPlanStage.offsetTop;
      const walkX = (x - startX) * 1.5;
      const walkY = (y - startY) * 1.5;
      floorPlanStage.scrollLeft = scrollLeft - walkX;
      floorPlanStage.scrollTop = scrollTop - walkY;
    });
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
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

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
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    render();
  } else if (connect && reduced) {
    // static fallback: everything visible
    radiusCircle.setAttribute("r", R_MAX * 0.8);
    pois.forEach((poi) => poi.classList.add("is-on"));
    stops.forEach((s) => s.classList.add("is-on"));
    timelineFill.style.width = "100%";
  }

  /* ---------- sticky project bar: hide near footer & forms ---------- */
  const projbar = $("#projbar");
  const hideZones = ["#enquire", ".footer"].map((s) => $(s)).filter(Boolean);
  const barIO = new IntersectionObserver(
    (entries) => {
      const anyVisible = entries.some((e) => e.isIntersecting);
      if (anyVisible) projbar.classList.add("is-hidden");
      else {
        const stillVisible = hideZones.some((z) => {
          const r = z.getBoundingClientRect();
          return r.top < window.innerHeight && r.bottom > 0;
        });
        if (!stillVisible) projbar.classList.remove("is-hidden");
      }
    },
    { threshold: 0.05 }
  );
  hideZones.forEach((z) => barIO.observe(z));

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
      openLightbox(img.src, cap);
    });
  });
  $$(".welcome__slide").forEach((fig) => {
    const img = fig.querySelector("img");
    if (!img) return;
    img.style.cursor = "zoom-in";
    const cap = fig.querySelector("h3")?.textContent || "";
    img.addEventListener("click", () => openLightbox(img.src, cap));
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
})();
