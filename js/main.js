/* =========================================================
   EATO — Shared site behavior
   Modules: mobile nav toggle, accordion, carousel, form validation
   ========================================================= */
(function () {
  "use strict";

  /* -------------------------------------------------------
     Mobile nav toggle
     ------------------------------------------------------- */
  function initNavToggle() {
    var toggle = document.querySelector(".nav-toggle");
    var nav = document.getElementById("main-nav");
    if (!toggle || !nav) return;

    toggle.addEventListener("click", function () {
      var isOpen = nav.classList.toggle("is-open");
      toggle.setAttribute("aria-expanded", String(isOpen));
      document.body.style.overflow = isOpen ? "hidden" : "";
    });

    nav.addEventListener("click", function (e) {
      if (e.target.tagName === "A") {
        nav.classList.remove("is-open");
        toggle.setAttribute("aria-expanded", "false");
        document.body.style.overflow = "";
      }
    });

    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && nav.classList.contains("is-open")) {
        nav.classList.remove("is-open");
        toggle.setAttribute("aria-expanded", "false");
        document.body.style.overflow = "";
        toggle.focus();
      }
    });
  }

  /* -------------------------------------------------------
     Accordion (used on FAQ page and homepage FAQ preview)
     Single-open-at-a-time within a given .accordion, unless
     the accordion has [data-allow-multiple="true"].
     ------------------------------------------------------- */
  function initAccordions() {
    var accordions = document.querySelectorAll(".accordion");

    accordions.forEach(function (accordion) {
      var allowMultiple = accordion.dataset.allowMultiple === "true";
      var triggers = accordion.querySelectorAll(".accordion-trigger");

      triggers.forEach(function (trigger) {
        trigger.addEventListener("click", function () {
          var panelId = trigger.getAttribute("aria-controls");
          var panel = document.getElementById(panelId);
          var isExpanded = trigger.getAttribute("aria-expanded") === "true";

          if (!allowMultiple) {
            triggers.forEach(function (otherTrigger) {
              if (otherTrigger !== trigger) {
                collapse(otherTrigger);
              }
            });
          }

          if (isExpanded) {
            collapse(trigger);
          } else {
            expand(trigger, panel);
          }
        });
      });

      function expand(trigger, panel) {
        trigger.setAttribute("aria-expanded", "true");
        panel.style.maxHeight = panel.scrollHeight + "px";
      }

      function collapse(trigger) {
        var panelId = trigger.getAttribute("aria-controls");
        var panel = document.getElementById(panelId);
        trigger.setAttribute("aria-expanded", "false");
        if (panel) panel.style.maxHeight = "0px";
      }

      // Recalculate open panel height on resize (responsive text reflow)
      window.addEventListener("resize", debounce(function () {
        triggers.forEach(function (trigger) {
          if (trigger.getAttribute("aria-expanded") === "true") {
            var panel = document.getElementById(trigger.getAttribute("aria-controls"));
            if (panel) panel.style.maxHeight = panel.scrollHeight + "px";
          }
        });
      }, 150));
    });
  }

  function debounce(fn, wait) {
    var t;
    return function () {
      clearTimeout(t);
      var args = arguments, ctx = this;
      t = setTimeout(function () { fn.apply(ctx, args); }, wait);
    };
  }

  /* -------------------------------------------------------
     Carousel
     Structure expected:
     <div class="carousel" data-carousel data-per-view="3">
       <div class="carousel-viewport">
         <div class="carousel-track">...slides...</div>
       </div>
       <div class="carousel-controls">
         <button class="btn-icon" data-carousel-prev aria-label="Previous slide">…</button>
         <button class="btn-icon" data-carousel-next aria-label="Next slide">…</button>
       </div>
       <div class="carousel-dots" data-carousel-dots></div>
     </div>
     ------------------------------------------------------- */
  function initCarousels() {
    var carousels = document.querySelectorAll("[data-carousel]");

    carousels.forEach(function (root) {
      var track = root.querySelector(".carousel-track");
      var viewport = root.querySelector(".carousel-viewport");
      // Controls are usually nested inside the carousel root, but some layouts
      // (e.g. arrows placed next to a section heading) place them in an external
      // container linked via [data-carousel-controls="<carousel id>"].
      var externalControls = root.id ? document.querySelector('[data-carousel-controls="' + root.id + '"]') : null;
      var prevBtn = root.querySelector("[data-carousel-prev]") || (externalControls && externalControls.querySelector("[data-carousel-prev]"));
      var nextBtn = root.querySelector("[data-carousel-next]") || (externalControls && externalControls.querySelector("[data-carousel-next]"));
      var dotsWrap = root.querySelector("[data-carousel-dots]") || (externalControls && externalControls.querySelector("[data-carousel-dots]"));
      if (!track || !viewport) return;

      var slides = Array.prototype.slice.call(track.children);
      var index = 0;
      var perView = getPerView();
      var dots = [];

      function getPerView() {
        var configured = parseInt(root.dataset.perView || "1", 10);
        var w = window.innerWidth;
        if (w < 640) return 1;
        if (w < 1024) return Math.min(2, configured);
        return configured;
      }

      function maxIndex() {
        return Math.max(0, slides.length - perView);
      }

      function update() {
        var slideWidth = slides[0] ? slides[0].getBoundingClientRect().width : 0;
        var gap = parseFloat(getComputedStyle(track).gap || 0);
        var offset = index * (slideWidth + gap);
        track.style.transform = "translateX(-" + offset + "px)";

        if (prevBtn) prevBtn.disabled = index === 0;
        if (nextBtn) nextBtn.disabled = index >= maxIndex();

        dots.forEach(function (dot, i) {
          dot.setAttribute("aria-current", i === index ? "true" : "false");
        });
      }

      function goTo(newIndex) {
        index = Math.max(0, Math.min(newIndex, maxIndex()));
        update();
      }

      if (prevBtn) prevBtn.addEventListener("click", function () { goTo(index - 1); });
      if (nextBtn) nextBtn.addEventListener("click", function () { goTo(index + 1); });

      if (dotsWrap) {
        var dotCount = maxIndex() + 1;
        for (var i = 0; i < dotCount; i++) {
          var dot = document.createElement("button");
          dot.type = "button";
          dot.setAttribute("aria-label", "Go to slide " + (i + 1));
          (function (slideIndex) {
            dot.addEventListener("click", function () { goTo(slideIndex); });
          })(i);
          dotsWrap.appendChild(dot);
          dots.push(dot);
        }
      }

      // Keyboard support when track has focus
      track.setAttribute("tabindex", "0");
      track.setAttribute("role", "group");
      track.setAttribute("aria-label", root.dataset.carouselLabel || "Carousel");
      track.addEventListener("keydown", function (e) {
        if (e.key === "ArrowRight") { e.preventDefault(); goTo(index + 1); }
        if (e.key === "ArrowLeft") { e.preventDefault(); goTo(index - 1); }
      });

      // Touch / swipe support
      var startX = null;
      viewport.addEventListener("touchstart", function (e) {
        startX = e.touches[0].clientX;
      }, { passive: true });
      viewport.addEventListener("touchend", function (e) {
        if (startX === null) return;
        var deltaX = e.changedTouches[0].clientX - startX;
        if (Math.abs(deltaX) > 40) {
          goTo(deltaX < 0 ? index + 1 : index - 1);
        }
        startX = null;
      });

      window.addEventListener("resize", debounce(function () {
        perView = getPerView();
        index = Math.min(index, maxIndex());
        update();
      }, 150));

      update();
    });
  }

  /* -------------------------------------------------------
     Form validation
     Applies to any <form data-validate>. Validates on submit
     and re-validates a field on blur once it has been touched.
     ------------------------------------------------------- */
  function initFormValidation() {
    var forms = document.querySelectorAll("form[data-validate]");

    forms.forEach(function (form) {
      var status = form.querySelector(".form-status");
      var touched = {};

      form.addEventListener("submit", function (e) {
        e.preventDefault();
        var fields = Array.prototype.slice.call(form.querySelectorAll("[data-rules]"));
        var firstInvalid = null;
        var allValid = true;

        fields.forEach(function (field) {
          touched[field.name] = true;
          var valid = validateField(field);
          if (!valid && !firstInvalid) firstInvalid = field;
          if (!valid) allValid = false;
        });

        if (!allValid) {
          if (status) {
            status.textContent = "Please correct the highlighted fields below and try again.";
            status.className = "form-status is-error";
          }
          if (firstInvalid) firstInvalid.focus();
          return;
        }

        if (status) {
          status.textContent = form.dataset.successMessage ||
            "Thanks! Your submission was received successfully.";
          status.className = "form-status is-success";
        }
        form.reset();
        Array.prototype.slice.call(form.querySelectorAll(".field")).forEach(function (wrap) {
          wrap.classList.remove("has-error", "is-valid");
        });
        touched = {};
        if (status) status.focus();
      });

      var fieldEls = Array.prototype.slice.call(form.querySelectorAll("[data-rules]"));
      fieldEls.forEach(function (field) {
        field.addEventListener("blur", function () {
          touched[field.name] = true;
          validateField(field);
        });
        field.addEventListener("input", function () {
          if (touched[field.name]) validateField(field);
        });
      });

      function validateField(field) {
        var rules = field.dataset.rules.split(" ");
        var wrap = field.closest(".field");
        var errorEl = wrap ? wrap.querySelector(".error-message") : null;
        var value = field.value.trim();
        var message = "";

        for (var i = 0; i < rules.length; i++) {
          var rule = rules[i];
          if (rule === "required" && !value) {
            message = field.dataset.errorRequired || "This field is required.";
            break;
          }
          if (rule === "email" && value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
            message = field.dataset.errorEmail || "Please enter a valid email address.";
            break;
          }
          if (rule === "phone" && value && !/^[+]?[\d\s().-]{7,}$/.test(value)) {
            message = field.dataset.errorPhone || "Please enter a valid phone number.";
            break;
          }
          if (rule.indexOf("minlength:") === 0 && value) {
            var min = parseInt(rule.split(":")[1], 10);
            if (value.length < min) {
              message = field.dataset.errorMinlength || ("Please enter at least " + min + " characters.");
              break;
            }
          }
          if (rule === "checked" && field.type === "checkbox" && !field.checked) {
            message = field.dataset.errorRequired || "This field is required.";
            break;
          }
        }

        if (wrap) {
          if (message) {
            wrap.classList.add("has-error");
            wrap.classList.remove("is-valid");
            if (errorEl) errorEl.textContent = message;
            field.setAttribute("aria-invalid", "true");
          } else {
            wrap.classList.remove("has-error");
            if (value) wrap.classList.add("is-valid");
            if (errorEl) errorEl.textContent = "";
            field.removeAttribute("aria-invalid");
          }
        }

        return !message;
      }
    });
  }

  /* -------------------------------------------------------
     Scroll reveal
     Fades/slides sections and cards into view, and zoom-
     reveals card thumbnails, the first time each crosses
     into the viewport. The .reveal / .img-reveal classes are
     only ever added here, so if this script never runs (or
     errors out) every page still renders fully visible —
     this is pure progressive enhancement, not a requirement
     for content to be readable.
     Carousel slides are deliberately skipped: they're moved
     via horizontal translateX by the carousel controls, not
     by scrolling, so a card revealed only on vertical
     intersection could stay stuck invisible after a user
     pages to it with the arrows.
     ------------------------------------------------------- */
  function initScrollReveal() {
    if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (!("IntersectionObserver" in window)) return;

    function inCarousel(el) {
      return !!el.closest(".carousel-track");
    }

    function delayTarget(el) {
      if (el.classList.contains("img-reveal")) {
        return el.querySelector("img") || el;
      }
      return el;
    }

    var fadeSelector = [
      ".card", ".feature-item", ".stat-item", ".accordion-item",
      ".blog-featured", ".blog-row", ".split-media-content > *",
      ".gallery-cluster > *", ".section-head", ".stat-grid", ".quote-text"
    ].join(",");

    var fadeEls = Array.prototype.slice.call(document.querySelectorAll(fadeSelector))
      .filter(function (el) { return !inCarousel(el); });

    var zoomEls = Array.prototype.slice.call(document.querySelectorAll(".card-media"))
      .filter(function (el) { return !inCarousel(el); });

    fadeEls.forEach(function (el) { el.classList.add("reveal"); });
    zoomEls.forEach(function (el) { el.classList.add("img-reveal"); });

    var targets = fadeEls.concat(zoomEls);
    if (!targets.length) return;

    targets.forEach(function (el, i) {
      delayTarget(el).style.transitionDelay = (i % 6) * 70 + "ms";
    });

    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        var el = entry.target;
        el.classList.add("is-visible");
        observer.unobserve(el);
        // Clear the staggered entrance delay once it's done its job, so a
        // later hover/focus transition on the same element isn't delayed too.
        var delayEl = delayTarget(el);
        window.setTimeout(function () { delayEl.style.transitionDelay = ""; }, 1300);
      });
    }, { threshold: 0.15, rootMargin: "0px 0px -8% 0px" });

    targets.forEach(function (el) { observer.observe(el); });
  }

  /* -------------------------------------------------------
     Page transitions
     Fade the page in on load (handled purely in CSS via the
     page-fade-in keyframe on body) and fade out before
     following an internal link, so navigation between pages
     feels continuous rather than a hard cut. Only intercepts
     plain left-clicks on same-origin, non-hash links — every
     other click (new tab, modified click, external link,
     mailto/tel, in-page anchor) is left to the browser.
     ------------------------------------------------------- */
  function initPageTransitions() {
    if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    document.addEventListener("click", function (e) {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      var link = e.target.closest("a[href]");
      if (!link) return;

      var href = link.getAttribute("href");
      if (!href || href.charAt(0) === "#" || href.indexOf("mailto:") === 0 || href.indexOf("tel:") === 0) return;
      if (link.target === "_blank" || link.hasAttribute("download")) return;

      var url;
      try { url = new URL(link.href, window.location.href); } catch (err) { return; }
      if (url.origin !== window.location.origin) return;

      e.preventDefault();
      document.body.classList.add("is-leaving");
      window.setTimeout(function () { window.location.href = link.href; }, 220);
    });

    // Browsers that restore this page from the back/forward cache can bring
    // back the DOM mid-fade; make sure it's visible again on arrival.
    window.addEventListener("pageshow", function () {
      document.body.classList.remove("is-leaving");
    });
  }

  /* -------------------------------------------------------
     Countdown timer (Special Offer / Countdown page)
     ------------------------------------------------------- */
  function initCountdown() {
    var el = document.querySelector("[data-countdown]");
    if (!el) return;

    var target = new Date(el.dataset.countdown).getTime();
    var daysEl = el.querySelector("[data-cd-days]");
    var hoursEl = el.querySelector("[data-cd-hours]");
    var minsEl = el.querySelector("[data-cd-minutes]");
    var secsEl = el.querySelector("[data-cd-seconds]");

    function tick() {
      var now = Date.now();
      var diff = Math.max(0, target - now);

      var days = Math.floor(diff / (1000 * 60 * 60 * 24));
      var hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
      var minutes = Math.floor((diff / (1000 * 60)) % 60);
      var seconds = Math.floor((diff / 1000) % 60);

      if (daysEl) daysEl.textContent = String(days).padStart(2, "0");
      if (hoursEl) hoursEl.textContent = String(hours).padStart(2, "0");
      if (minsEl) minsEl.textContent = String(minutes).padStart(2, "0");
      if (secsEl) secsEl.textContent = String(seconds).padStart(2, "0");

      if (diff <= 0) {
        clearInterval(timer);
        el.dispatchEvent(new CustomEvent("countdown:complete"));
      }
    }

    tick();
    var timer = setInterval(tick, 1000);
  }

  document.addEventListener("DOMContentLoaded", function () {
    initNavToggle();
    initAccordions();
    initCarousels();
    initFormValidation();
    initCountdown();
    initScrollReveal();
    initPageTransitions();
  });
})();
