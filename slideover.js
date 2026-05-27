/* ============================================================
   Reusable right-edge slide-over (Maison Nocturne).

   Usage: add a trigger anywhere —
     <button type="button" data-slideover="newsletter">Newsletter</button>
   and load this file + slideover.css. The panel markup is built
   here, so triggers stay one line and the pattern is reusable.

   Dismiss: backdrop click or Esc. Scroll is locked while open
   (and Lenis paused, if the page exposes window.__nocturneLenis).
   ============================================================ */
(function () {
  "use strict";

  var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  // Panel definitions, keyed by the data-slideover value.
  var PANELS = {
    newsletter: {
      eyebrow: "The Maison · Dispatches",
      title: "Occasional <em>dispatches.</em>",
      copy: "Occasional dispatches. Nothing more.",
      label: "Email",
      type: "email",
      submit: "Subscribe",
      foot: "Unsubscribe in a single click, always.",
      // Front-end only: validate, then show a quiet confirmation. No network.
      onSubmit: function (value, ui) {
        if (!EMAIL_RE.test(value)) {
          ui.error("Please enter a valid email.");
          return;
        }
        ui.success(
          '<span class="ok">You are <em>on the list.</em></span>' +
          "We write rarely. The next dispatch will find you when there is genuinely something to say."
        );
      },
    },
  };

  var backdrop, panel, lastFocus;

  function buildShell() {
    backdrop = document.createElement("div");
    backdrop.className = "so-backdrop";
    backdrop.setAttribute("role", "dialog");
    backdrop.setAttribute("aria-modal", "true");
    backdrop.hidden = true;

    panel = document.createElement("div");
    panel.className = "so-panel";
    backdrop.appendChild(panel);
    document.body.appendChild(backdrop);

    backdrop.addEventListener("click", function (e) {
      if (e.target === backdrop) close();
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && backdrop.classList.contains("open")) close();
    });
  }

  function lockScroll(on) {
    document.documentElement.style.overflow = on ? "hidden" : "";
    if (window.__nocturneLenis) {
      if (on) window.__nocturneLenis.stop();
      else window.__nocturneLenis.start();
    }
  }

  function render(def) {
    var inputId = "so-input-" + Date.now();
    panel.innerHTML =
      '<button type="button" class="so-close" aria-label="Close">×</button>' +
      '<p class="so-eyebrow">' + def.eyebrow + "</p>" +
      '<h2 class="so-title">' + def.title + "</h2>" +
      '<p class="so-copy">' + def.copy + "</p>" +
      '<form class="so-form" novalidate>' +
      '  <div class="so-field">' +
      '    <label for="' + inputId + '">' + def.label + "</label>" +
      '    <input id="' + inputId + '" type="' + def.type + '" autocomplete="email" required />' +
      "  </div>" +
      '  <div class="so-error" role="alert"></div>' +
      '  <button type="submit" class="so-submit"><span>' + def.submit + "</span><span aria-hidden=\"true\">→</span></button>" +
      "</form>" +
      '<p class="so-foot">' + def.foot + "</p>";

    panel.querySelector(".so-close").addEventListener("click", close);

    var form = panel.querySelector(".so-form");
    var input = panel.querySelector("input");
    var errEl = panel.querySelector(".so-error");

    var ui = {
      error: function (msg) { errEl.textContent = msg; },
      success: function (html) {
        // Replace the form with a calm confirmation; keep the footer line.
        form.outerHTML = '<div class="so-success">' + html + "</div>";
      },
    };

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      errEl.textContent = "";
      def.onSubmit(input.value.trim(), ui);
    });

    setTimeout(function () { input.focus(); }, 80);
  }

  function open(type) {
    var def = PANELS[type];
    if (!def) return;
    lastFocus = document.activeElement;
    render(def);
    backdrop.hidden = false;
    requestAnimationFrame(function () { backdrop.classList.add("open"); });
    lockScroll(true);
  }

  function close() {
    backdrop.classList.remove("open");
    lockScroll(false);
    setTimeout(function () {
      backdrop.hidden = true;
      panel.innerHTML = "";
    }, 600);
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }

  function init() {
    buildShell();
    document.addEventListener("click", function (e) {
      var trigger = e.target.closest("[data-slideover]");
      if (!trigger) return;
      e.preventDefault();
      open(trigger.getAttribute("data-slideover"));
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
