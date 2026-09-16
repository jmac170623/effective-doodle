(function () {
  "use strict";

  document.getElementById("year").textContent = new Date().getFullYear();

  /* ---------- Mobile nav toggle ---------- */
  var navToggle = document.getElementById("navToggle");
  var mainNav = document.getElementById("main-nav");

  navToggle.addEventListener("click", function () {
    var isOpen = mainNav.classList.toggle("open");
    navToggle.classList.toggle("open", isOpen);
    navToggle.setAttribute("aria-expanded", String(isOpen));
  });

  mainNav.querySelectorAll(".nav-link").forEach(function (link) {
    link.addEventListener("click", function () {
      mainNav.classList.remove("open");
      navToggle.classList.remove("open");
      navToggle.setAttribute("aria-expanded", "false");
    });
  });

  /* ---------- Active nav link on scroll ---------- */
  var sections = Array.prototype.slice.call(
    document.querySelectorAll("main section[id]")
  );
  var navLinks = Array.prototype.slice.call(document.querySelectorAll(".nav-link"));

  function setActiveLink() {
    var scrollPos = window.scrollY + 120;
    var current = sections[0];
    sections.forEach(function (section) {
      if (section.offsetTop <= scrollPos) current = section;
    });
    navLinks.forEach(function (link) {
      var match = link.getAttribute("href") === "#" + current.id;
      link.classList.toggle("active", match);
    });
  }

  /* ---------- Back to top button ---------- */
  var backToTop = document.getElementById("backToTop");
  function toggleBackToTop() {
    backToTop.classList.toggle("visible", window.scrollY > 500);
  }

  window.addEventListener(
    "scroll",
    function () {
      setActiveLink();
      toggleBackToTop();
    },
    { passive: true }
  );
  setActiveLink();
  toggleBackToTop();

  backToTop.addEventListener("click", function () {
    window.scrollTo({ top: 0, behavior: "smooth" });
  });

  /* ---------- Hero search (demo only, no backend) ---------- */
  var heroSearch = document.getElementById("heroSearch");
  heroSearch.addEventListener("submit", function (e) {
    e.preventDefault();
    var destination = document.getElementById("destination").value.trim();
    document.getElementById("contact").scrollIntoView({ behavior: "smooth" });
    var status = document.getElementById("formStatus");
    if (destination) {
      status.textContent =
        'Noted — tell us a little more about ' + destination + ' below and a travel architect will call you.';
      status.className = "form-status success";
      document.getElementById("message").value =
        "I'd like to discuss a trip to " + destination + ".";
    }
  });

  /* ---------- Contact form validation ---------- */
  var contactForm = document.getElementById("contactForm");
  var formStatus = document.getElementById("formStatus");

  function showFieldError(fieldId, message) {
    var field = document.getElementById(fieldId);
    var errorEl = contactForm.querySelector('[data-error-for="' + fieldId + '"]');
    field.closest(".field").classList.toggle("has-error", Boolean(message));
    if (errorEl) errorEl.textContent = message || "";
  }

  function isValidEmail(value) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  }

  contactForm.addEventListener("submit", function (e) {
    e.preventDefault();
    var name = document.getElementById("name").value.trim();
    var email = document.getElementById("email").value.trim();
    var message = document.getElementById("message").value.trim();
    var valid = true;

    if (!name) {
      showFieldError("name", "Please enter your name.");
      valid = false;
    } else {
      showFieldError("name", "");
    }

    if (!email) {
      showFieldError("email", "Please enter your email.");
      valid = false;
    } else if (!isValidEmail(email)) {
      showFieldError("email", "Please enter a valid email address.");
      valid = false;
    } else {
      showFieldError("email", "");
    }

    if (!message) {
      showFieldError("message", "Please add a short message.");
      valid = false;
    } else {
      showFieldError("message", "");
    }

    if (!valid) {
      formStatus.textContent = "Please fix the errors above and try again.";
      formStatus.className = "form-status error";
      return;
    }

    formStatus.textContent =
      "Thank you, " + name.split(" ")[0] + ". A travel architect will call you directly, usually within a few hours — 365 days a year.";
    formStatus.className = "form-status success";
    contactForm.reset();
  });

  /* ---------- Newsletter form ---------- */
  var newsletterForm = document.getElementById("newsletterForm");
  var newsletterStatus = document.getElementById("newsletterStatus");

  newsletterForm.addEventListener("submit", function (e) {
    e.preventDefault();
    var email = document.getElementById("newsletterEmail").value.trim();
    if (!isValidEmail(email)) {
      newsletterStatus.textContent = "Please enter a valid email address.";
      newsletterStatus.className = "form-status error";
      return;
    }
    newsletterStatus.textContent = "You're subscribed! Watch your inbox for deals.";
    newsletterStatus.className = "form-status success";
    newsletterForm.reset();
  });
})();
