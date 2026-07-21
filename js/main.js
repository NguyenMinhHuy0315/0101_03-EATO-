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

      // Panels start at max-height:0 in CSS regardless of markup, so any
      // trigger authored as aria-expanded="true" needs its panel opened here
      // on load -- otherwise it renders visually collapsed until first click.
      triggers.forEach(function (trigger) {
        if (trigger.getAttribute("aria-expanded") === "true") {
          var initialPanel = document.getElementById(trigger.getAttribute("aria-controls"));
          if (initialPanel) initialPanel.style.maxHeight = initialPanel.scrollHeight + "px";
        }
      });

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

        // Looping carousel: arrows always stay enabled, wrapping past either end.
        if (prevBtn) prevBtn.disabled = false;
        if (nextBtn) nextBtn.disabled = false;

        dots.forEach(function (dot, i) {
          dot.setAttribute("aria-current", i === index ? "true" : "false");
        });
      }

      function goTo(newIndex) {
        var span = maxIndex() + 1;
        index = ((newIndex % span) + span) % span;
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
  function currentLang() {
    return document.documentElement.lang === "en" ? "en" : "vi";
  }

  // Bilingual fallback copy for validation/status messages that a form
  // doesn't override via data-*-vi / data-*-en attributes.
  var VALIDATION_DEFAULTS = {
    required: { vi: "Trường này là bắt buộc.", en: "This field is required." },
    email: { vi: "Vui lòng nhập địa chỉ email hợp lệ.", en: "Please enter a valid email address." },
    phone: { vi: "Vui lòng nhập số điện thoại hợp lệ.", en: "Please enter a valid phone number." },
    formError: { vi: "Vui lòng kiểm tra lại các trường được đánh dấu bên dưới và thử lại.", en: "Please correct the highlighted fields below and try again." },
    formSuccess: { vi: "Cảm ơn! Yêu cầu của bạn đã được gửi thành công.", en: "Thanks! Your submission was received successfully." }
  };

  function bilingualAttr(el, base, fallbackKey) {
    var lang = currentLang();
    var vi = el.dataset[base + "Vi"];
    var en = el.dataset[base + "En"];
    if (vi && en) return lang === "vi" ? vi : en;
    var fb = VALIDATION_DEFAULTS[fallbackKey];
    return fb ? fb[lang] : "";
  }

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
            status.textContent = bilingualAttr(form, "formError", "formError");
            status.className = "form-status is-error";
          }
          if (firstInvalid) firstInvalid.focus();
          return;
        }

        if (status) {
          status.textContent = bilingualAttr(form, "successMessage", "formSuccess");
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
        var lang = currentLang();
        var message = "";

        for (var i = 0; i < rules.length; i++) {
          var rule = rules[i];
          if (rule === "required" && !value) {
            message = bilingualAttr(field, "errorRequired", "required");
            break;
          }
          if (rule === "email" && value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
            message = bilingualAttr(field, "errorEmail", "email");
            break;
          }
          if (rule === "phone" && value && !/^[+]?[\d\s().-]{7,}$/.test(value)) {
            message = bilingualAttr(field, "errorPhone", "phone");
            break;
          }
          if (rule.indexOf("minlength:") === 0 && value) {
            var min = parseInt(rule.split(":")[1], 10);
            if (value.length < min) {
              var viM = field.dataset.errorMinlengthVi, enM = field.dataset.errorMinlengthEn;
              message = (viM && enM) ? (lang === "vi" ? viM : enM) :
                (lang === "vi" ? ("Vui lòng nhập ít nhất " + min + " ký tự.") : ("Please enter at least " + min + " characters."));
              break;
            }
          }
          if (rule === "checked" && field.type === "checkbox" && !field.checked) {
            message = bilingualAttr(field, "errorRequired", "required");
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
     Bilingual support (VI default / EN toggle)
     Elements carry both language strings on data attributes:
       data-vi / data-en                       -> textContent
       data-vi-html / data-en-html              -> innerHTML (only for
                                                    text runs that need
                                                    inline markup)
       data-vi-placeholder / data-en-placeholder -> placeholder attr
       data-vi-aria / data-en-aria               -> aria-label attr
     Preference is remembered in localStorage; falls back to
     Vietnamese for first-time visitors.
     ------------------------------------------------------- */
  function initI18n() {
    var STORAGE_KEY = "eato-lang";
    var buttons = document.querySelectorAll("[data-lang-btn]");
    if (!buttons.length) return;

    function applyLanguage(lang) {
      document.documentElement.lang = lang;

      document.querySelectorAll("[data-vi][data-en]").forEach(function (el) {
        el.textContent = lang === "vi" ? el.dataset.vi : el.dataset.en;
      });
      document.querySelectorAll("[data-vi-html][data-en-html]").forEach(function (el) {
        el.innerHTML = lang === "vi" ? el.dataset.viHtml : el.dataset.enHtml;
      });
      document.querySelectorAll("[data-vi-placeholder][data-en-placeholder]").forEach(function (el) {
        el.setAttribute("placeholder", lang === "vi" ? el.dataset.viPlaceholder : el.dataset.enPlaceholder);
      });
      document.querySelectorAll("[data-vi-aria][data-en-aria]").forEach(function (el) {
        el.setAttribute("aria-label", lang === "vi" ? el.dataset.viAria : el.dataset.enAria);
      });

      buttons.forEach(function (btn) {
        btn.setAttribute("aria-pressed", String(btn.dataset.langBtn === lang));
      });
      try { localStorage.setItem(STORAGE_KEY, lang); } catch (err) {}
    }

    buttons.forEach(function (btn) {
      btn.addEventListener("click", function () {
        applyLanguage(btn.dataset.langBtn);
      });
    });

    var saved = null;
    try { saved = localStorage.getItem(STORAGE_KEY); } catch (err) {}
    applyLanguage(saved === "en" ? "en" : "vi");
  }

  /* -------------------------------------------------------
     Fake auth (login.html / register.html)
     No real backend: any non-empty email/password "succeeds".
     The signed-in name/email is kept in localStorage under
     "eato_user" purely so the navbar (initAuthNav) can reflect
     a signed-in state across pages.
     ------------------------------------------------------- */
  function initLoginForm() {
    var form = document.getElementById("login-form");
    if (!form) return;
    var status = form.querySelector(".form-status");

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var lang = currentLang();
      var email = form.querySelector("#login-email").value.trim();
      var password = form.querySelector("#login-password").value.trim();

      if (!email || !password) {
        status.textContent = lang === "vi" ? "Vui lòng điền đầy đủ thông tin" : "Please fill in all fields.";
        status.className = "form-status is-error";
        return;
      }

      try { localStorage.setItem("eato_user", email); } catch (err) {}
      status.textContent = lang === "vi" ? "Đăng nhập thành công! Đang chuyển hướng..." : "Login successful! Redirecting...";
      status.className = "form-status is-success";
      window.location.href = "index.html";
    });
  }

  function initRegisterForm() {
    var form = document.getElementById("register-form");
    if (!form) return;
    var status = form.querySelector(".form-status");

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var lang = currentLang();
      var name = form.querySelector("#register-name").value.trim();
      var email = form.querySelector("#register-email").value.trim();
      var password = form.querySelector("#register-password").value;
      var confirmPassword = form.querySelector("#register-confirm-password").value;

      if (!name || !email || !password || !confirmPassword) {
        status.textContent = lang === "vi" ? "Vui lòng điền đầy đủ thông tin" : "Please fill in all fields.";
        status.className = "form-status is-error";
        return;
      }
      if (password !== confirmPassword) {
        status.textContent = lang === "vi" ? "Mật khẩu không khớp" : "Passwords do not match.";
        status.className = "form-status is-error";
        return;
      }

      try { localStorage.setItem("eato_user", name); } catch (err) {}
      status.textContent = lang === "vi" ? "Đăng ký thành công!" : "Registration successful!";
      status.className = "form-status is-success";
      window.setTimeout(function () {
        window.location.href = "index.html";
      }, 2000);
    });
  }

  /* -------------------------------------------------------
     Auth-aware navbar
     If "eato_user" is present in localStorage, swap the navbar's
     Login button for a greeting + Logout button. Runs on every
     page (main.js is shared), so it applies sitewide without
     per-page markup changes.
     ------------------------------------------------------- */
  function initAuthNav() {
    var loginLink = document.querySelector(".main-nav a.btn-outline-red");
    if (!loginLink) return;

    var user = null;
    try { user = localStorage.getItem("eato_user"); } catch (err) {}
    if (!user) return;

    var greeting = document.createElement("span");
    greeting.className = "nav-greeting";
    greeting.setAttribute("data-vi", "Xin chào, " + user);
    greeting.setAttribute("data-en", "Hello, " + user);
    greeting.textContent = currentLang() === "vi" ? ("Xin chào, " + user) : ("Hello, " + user);

    var logoutBtn = document.createElement("button");
    logoutBtn.type = "button";
    logoutBtn.className = "btn btn-outline-red";
    logoutBtn.setAttribute("data-vi", "Đăng xuất");
    logoutBtn.setAttribute("data-en", "Logout");
    logoutBtn.textContent = currentLang() === "vi" ? "Đăng xuất" : "Logout";
    logoutBtn.addEventListener("click", function () {
      try { localStorage.removeItem("eato_user"); } catch (err) {}
      window.location.reload();
    });

    loginLink.replaceWith(greeting, logoutBtn);
  }

  /* -------------------------------------------------------
     Dish detail modal (menu.html / index.html)
     Any .dish-card (data-rating + data-ingredients-vi/en set in
     markup, everything else read straight off the card's own
     h3/p/.dish-price/img) opens a single shared modal built once
     and reused. Closes on the X, an outside click, or Escape.
     ------------------------------------------------------- */
  function buildStarRating(rating) {
    var wrap = document.createElement("span");
    wrap.className = "rating dish-modal-rating";
    var full = Math.round(rating);
    for (var i = 0; i < 5; i++) {
      var svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      svg.setAttribute("class", "icon-star");
      svg.setAttribute("viewBox", "0 0 24 24");
      svg.setAttribute("fill", i < full ? "currentColor" : "none");
      svg.setAttribute("stroke", "currentColor");
      svg.setAttribute("stroke-width", "1.6");
      svg.innerHTML = '<path stroke-linecap="round" stroke-linejoin="round" d="M12 2.5l2.9 6.3 6.9.6-5.2 4.6 1.6 6.8L12 17.4l-6.2 3.4 1.6-6.8-5.2-4.6 6.9-.6z"/>';
      wrap.appendChild(svg);
    }
    var value = document.createElement("span");
    value.className = "rating-value";
    value.textContent = rating.toFixed(1);
    wrap.appendChild(value);
    return wrap;
  }

  function initDishModal() {
    var cards = document.querySelectorAll(".dish-card");
    if (!cards.length) return;

    var overlay = document.createElement("div");
    overlay.className = "dish-modal-overlay";
    overlay.setAttribute("aria-hidden", "true");
    overlay.innerHTML =
      '<div class="dish-modal" role="dialog" aria-modal="true" aria-labelledby="dish-modal-title">' +
        '<button type="button" class="dish-modal-close" aria-label="Close" data-vi-aria="Đóng" data-en-aria="Close">' +
          '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="5" y1="5" x2="19" y2="19"/><line x1="19" y1="5" x2="5" y2="19"/></svg>' +
        "</button>" +
        '<div class="dish-modal-media"><img alt=""></div>' +
        '<div class="dish-modal-body">' +
          '<h2 class="dish-modal-name" id="dish-modal-title"></h2>' +
          '<div class="dish-modal-rating-wrap"></div>' +
          '<p class="dish-modal-price"></p>' +
          '<hr class="dish-modal-divider">' +
          '<p class="dish-modal-desc"></p>' +
          '<h3 class="dish-modal-ingredients-heading" data-vi="Nguyên Liệu Chính" data-en="Key Ingredients">Nguyên Liệu Chính</h3>' +
          '<ul class="dish-modal-ingredients"></ul>' +
          '<div class="dish-modal-actions">' +
            '<a class="btn btn-primary" href="reservation.html" data-vi="Đặt Bàn Ngay" data-en="Reserve Now">Đặt Bàn Ngay</a>' +
            '<button type="button" class="btn btn-outline dish-modal-close-btn" data-vi="Đóng" data-en="Close">Đóng</button>' +
          "</div>" +
        "</div>" +
      "</div>";
    document.body.appendChild(overlay);

    var img = overlay.querySelector(".dish-modal-media img");
    var nameEl = overlay.querySelector(".dish-modal-name");
    var ratingWrap = overlay.querySelector(".dish-modal-rating-wrap");
    var priceEl = overlay.querySelector(".dish-modal-price");
    var descEl = overlay.querySelector(".dish-modal-desc");
    var ingredientsEl = overlay.querySelector(".dish-modal-ingredients");
    var closeBtn = overlay.querySelector(".dish-modal-close");
    var closeBtn2 = overlay.querySelector(".dish-modal-close-btn");
    var lastTrigger = null;

    function openFromCard(card) {
      var lang = currentLang();
      var h3 = card.querySelector(".card-body h3");
      var desc = card.querySelector(".card-body p");
      var priceSpan = card.querySelector(".dish-price");
      var cardImg = card.querySelector(".card-media img");
      var rating = parseFloat(card.dataset.rating || "4.8");
      var ingredientsRaw = (lang === "vi" ? card.dataset.ingredientsVi : card.dataset.ingredientsEn) || "";
      var ingredients = ingredientsRaw.split(",").map(function (s) { return s.trim(); }).filter(Boolean);

      nameEl.textContent = h3 ? (lang === "vi" ? h3.dataset.vi : h3.dataset.en) || h3.textContent : "";
      descEl.textContent = desc ? (lang === "vi" ? desc.dataset.vi : desc.dataset.en) || desc.textContent : "";
      priceEl.textContent = priceSpan ? priceSpan.textContent : "";
      if (cardImg) {
        img.src = cardImg.src;
        img.alt = cardImg.alt || "";
      }

      ratingWrap.innerHTML = "";
      ratingWrap.appendChild(buildStarRating(rating));

      ingredientsEl.innerHTML = "";
      ingredients.forEach(function (item) {
        var li = document.createElement("li");
        li.textContent = item;
        ingredientsEl.appendChild(li);
      });

      lastTrigger = card;
      document.body.classList.add("dish-modal-open");
      overlay.classList.add("is-open");
      overlay.setAttribute("aria-hidden", "false");
      window.setTimeout(function () { closeBtn.focus(); }, 50);
    }

    function close() {
      overlay.classList.remove("is-open");
      overlay.setAttribute("aria-hidden", "true");
      document.body.classList.remove("dish-modal-open");
      if (lastTrigger) {
        var focusTarget = lastTrigger.querySelector(".dish-card-cta") || lastTrigger;
        focusTarget.focus();
      }
    }

    cards.forEach(function (card) {
      card.addEventListener("click", function (e) {
        // Let real navigation (if a card ever contains a plain link) behave normally.
        if (e.target.closest("a")) return;
        openFromCard(card);
      });
    });

    closeBtn.addEventListener("click", close);
    closeBtn2.addEventListener("click", close);
    overlay.addEventListener("click", function (e) {
      if (e.target === overlay) close();
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && overlay.classList.contains("is-open")) close();
    });
  }

  /* -------------------------------------------------------
     Number counter animation (stat blocks — "1000+ customers"
     etc.). Counts up from 0 to the number embedded in the
     stat's own text the first time it scrolls into view,
     preserving whatever suffix follows it (+, %, ...).
     ------------------------------------------------------- */
  function initCounterAnimation() {
    var stats = document.querySelectorAll(".stat-number");
    if (!stats.length) return;
    var reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    function animate(el) {
      var match = el.textContent.match(/^(\d+)(.*)$/);
      if (!match) return;
      var target = parseInt(match[1], 10);
      var suffix = match[2] || "";
      if (reduceMotion) { el.textContent = target + suffix; return; }

      var duration = 1600;
      var start = null;
      function ease(t) { return 1 - Math.pow(1 - t, 3); }
      function step(ts) {
        if (start === null) start = ts;
        var progress = Math.min(1, (ts - start) / duration);
        var value = Math.round(target * ease(progress));
        el.textContent = value + suffix;
        if (progress < 1) window.requestAnimationFrame(step);
      }
      window.requestAnimationFrame(step);
    }

    if (!("IntersectionObserver" in window)) {
      stats.forEach(animate);
      return;
    }
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        animate(entry.target);
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.4 });
    stats.forEach(function (el) { observer.observe(el); });
  }

  /* -------------------------------------------------------
     Button ripple effect
     Delegated so it covers every button variant sitewide,
     including ones injected later (dish modal, auth nav).
     The ripple span inherits `color` from its button, so a
     single rule works whether the button is light or dark.
     ------------------------------------------------------- */
  function initRipple() {
    if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    var selector = ".btn, .btn-icon, .btn-outline, .btn-outline-red, .btn-primary, .btn-white, .btn-dark, .btn-rust, .dish-card-cta, .lang-btn, .menu-filters button, .dish-modal-close";

    document.addEventListener("click", function (e) {
      var btn = e.target.closest(selector);
      if (!btn || btn.disabled) return;

      var rect = btn.getBoundingClientRect();
      var size = Math.max(rect.width, rect.height);
      var ripple = document.createElement("span");
      ripple.className = "ripple";
      ripple.style.width = ripple.style.height = size + "px";
      ripple.style.left = (e.clientX - rect.left - size / 2) + "px";
      ripple.style.top = (e.clientY - rect.top - size / 2) + "px";
      btn.appendChild(ripple);
      ripple.addEventListener("animationend", function () { ripple.remove(); });
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

  /* -------------------------------------------------------
     Hero parallax
     Subtle scroll-linked translate on the hero photo (index.html,
     countdown.html — the only pages with an above-the-fold hero
     image; other pages' page-hero is text-only). transform-only,
     rAF-throttled, and skipped entirely under reduced motion.
     ------------------------------------------------------- */
  function initHeroParallax() {
    if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    var img = document.querySelector(".hero-media img");
    if (!img) return;

    var ticking = false;
    function update() {
      var rect = img.parentElement.getBoundingClientRect();
      var offset = Math.max(-24, Math.min(24, rect.top * -0.1));
      img.style.transform = "translateY(" + offset.toFixed(1) + "px) scale(1.12)";
      ticking = false;
    }
    function onScroll() {
      if (!ticking) {
        window.requestAnimationFrame(update);
        ticking = true;
      }
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    update();
  }

  /* -------------------------------------------------------
     Category filters (menu.html / gallery.html pill tabs)
     Structure expected:
     <div class="menu-filters">
       <button data-filter="all">All</button>
       <button data-filter="dessert">Desserts</button>
     </div>
     <div class="grid" data-filter-target>
       <article data-category="main">...</article>
       <article data-category="dessert">...</article>
     </div>
     Active state is shown by the sliding .tab-indicator (see
     initFilterIndicators) rather than a class swap on the button
     itself; matching grid items fade + slide up back in on every
     change via .filter-target / .tab-content-visible (see CSS).
     ------------------------------------------------------- */
  function initFilters() {
    var groups = document.querySelectorAll(".menu-filters[data-filter-group]");

    groups.forEach(function (group) {
      var targetSelector = group.dataset.filterGroup;
      var target = document.querySelector(targetSelector);
      if (!target) return;
      var buttons = Array.prototype.slice.call(group.querySelectorAll("[data-filter]"));
      var items = Array.prototype.slice.call(target.children);

      target.classList.add("filter-target");
      // Everything matches "all", so show it immediately with no
      // animation -- only later clicks should animate the change.
      items.forEach(function (item) { item.classList.add("tab-content-visible"); });

      function apply(filterValue) {
        var staggerDelay = 0;
        items.forEach(function (item) {
          var match = filterValue === "all" || item.dataset.category === filterValue;
          if (match) {
            item.style.display = "";
            item.classList.remove("tab-content-visible");
            void item.offsetWidth; // force reflow so the transition re-triggers
            (function (el, delay) {
              window.setTimeout(function () { el.classList.add("tab-content-visible"); }, delay);
            })(item, staggerDelay);
            staggerDelay += 40;
          } else {
            item.classList.remove("tab-content-visible");
            item.style.display = "none";
          }
        });
        buttons.forEach(function (btn) {
          btn.setAttribute("aria-pressed", String(btn.dataset.filter === filterValue));
        });
      }

      buttons.forEach(function (btn) {
        btn.addEventListener("click", function () { apply(btn.dataset.filter); });
      });
    });
  }

  /* -------------------------------------------------------
     Sliding tab indicator ("magic line")
     A floating pill injected as the first child of a
     position:relative tab group. moveTo(el) reads the target's
     real box (relative to the container) and animates the
     indicator on top of it via transform + width/height, so the
     motion is a single glide driven by actual DOM measurements
     rather than hardcoded per-item positions. Works for a
     horizontal pill row or the vertical stacked mobile nav.
     ------------------------------------------------------- */
  function createTabIndicator(container) {
    var indicator = document.createElement("div");
    indicator.className = "tab-indicator";
    indicator.setAttribute("aria-hidden", "true");
    container.insertBefore(indicator, container.firstChild);

    function moveTo(el) {
      if (!el) {
        indicator.classList.remove("is-visible");
        return;
      }
      var cRect = container.getBoundingClientRect();
      var eRect = el.getBoundingClientRect();
      indicator.style.transform = "translate(" + (eRect.left - cRect.left) + "px, " + (eRect.top - cRect.top) + "px)";
      indicator.style.width = eRect.width + "px";
      indicator.style.height = eRect.height + "px";
      indicator.classList.add("is-visible");
    }

    return { el: indicator, moveTo: moveTo };
  }

  function initNavIndicator() {
    var nav = document.querySelector(".main-nav");
    if (!nav) return;
    var indicator = createTabIndicator(nav);
    var links = Array.prototype.slice.call(nav.querySelectorAll("a")).filter(function (a) {
      return !a.classList.contains("btn");
    });
    if (!links.length) return;

    function rest() {
      indicator.moveTo(nav.querySelector('a[aria-current="page"]:not(.btn)'));
    }

    links.forEach(function (link) {
      link.addEventListener("mouseenter", function () { indicator.moveTo(link); });
      link.addEventListener("focus", function () { indicator.moveTo(link); });
    });
    nav.addEventListener("mouseleave", rest);

    window.addEventListener("resize", debounce(rest, 150));
    // Defer the first measurement a tick so fonts/layout have settled.
    window.setTimeout(rest, 50);
  }

  function initLangIndicator() {
    var switcher = document.querySelector(".lang-switch");
    if (!switcher) return;
    var indicator = createTabIndicator(switcher);

    function update() {
      indicator.moveTo(switcher.querySelector('[aria-pressed="true"]'));
    }

    Array.prototype.slice.call(switcher.querySelectorAll("[data-lang-btn]")).forEach(function (btn) {
      btn.addEventListener("click", function () { window.setTimeout(update, 0); });
    });
    window.addEventListener("resize", debounce(update, 150));
    window.setTimeout(update, 50);
  }

  function initFilterIndicators() {
    Array.prototype.slice.call(document.querySelectorAll(".menu-filters")).forEach(function (group) {
      var indicator = createTabIndicator(group);

      function update() {
        indicator.moveTo(group.querySelector('[aria-pressed="true"]'));
      }

      Array.prototype.slice.call(group.querySelectorAll("[data-filter]")).forEach(function (btn) {
        btn.addEventListener("click", function () { window.setTimeout(update, 0); });
      });
      window.addEventListener("resize", debounce(update, 150));
      window.setTimeout(update, 50);
    });
  }

  document.addEventListener("DOMContentLoaded", function () {
    // initDishModal must run before initI18n: it injects new
    // data-vi/data-en elements (modal labels), and initI18n's
    // initial language sweep only ever touches what's already
    // in the DOM at the moment it runs.
    initDishModal();
    initI18n();
    initAuthNav();
    initNavToggle();
    initAccordions();
    initCarousels();
    initFilters();
    initNavIndicator();
    initLangIndicator();
    initFilterIndicators();
    initFormValidation();
    initLoginForm();
    initRegisterForm();
    initCountdown();
    initScrollReveal();
    initPageTransitions();
    initHeroParallax();
    initCounterAnimation();
    initRipple();
  });
})();
