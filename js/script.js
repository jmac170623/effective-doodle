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
    var activeTabEl = document.querySelector(".search-tab.active");
    var activeTabName = activeTabEl ? activeTabEl.getAttribute("data-tab") : null;
    navLinks.forEach(function (link) {
      var tabLink = link.getAttribute("data-tab-link");
      var match = tabLink
        ? current.id === "home" && tabLink === activeTabName
        : link.getAttribute("href") === "#" + current.id;
      link.classList.toggle("active", match);
    });
  }

  /* ---------- Back to top button ---------- */
  var backToTop = document.getElementById("backToTop");
  function toggleBackToTop() {
    backToTop.classList.toggle("visible", window.scrollY > 500);
  }

  /* ---------- Mobile search bar ---------- */
  var mobileSearchBar = document.getElementById("mobileSearchBar");
  function toggleMobileSearchBar() {
    mobileSearchBar.classList.toggle("visible", window.scrollY > 500);
  }

  /* ---------- Scroll progress bar ---------- */
  var scrollProgress = document.getElementById("scrollProgress");
  function updateScrollProgress() {
    var docHeight = document.documentElement.scrollHeight - window.innerHeight;
    var pct = docHeight > 0 ? (window.scrollY / docHeight) * 100 : 0;
    scrollProgress.style.width = pct + "%";
  }

  window.addEventListener(
    "scroll",
    function () {
      setActiveLink();
      toggleBackToTop();
      toggleMobileSearchBar();
      updateScrollProgress();
    },
    { passive: true }
  );
  setActiveLink();
  toggleBackToTop();
  toggleMobileSearchBar();
  updateScrollProgress();

  backToTop.addEventListener("click", function () {
    window.scrollTo({ top: 0, behavior: "smooth" });
  });

  /* ---------- Currency selector (display only, illustrative prices) ---------- */
  var currencySelect = document.getElementById("currencySelect");
  var currencyRates = {
    USD: { rate: 1, symbol: "$" },
    GBP: { rate: 0.79, symbol: "£" },
    EUR: { rate: 0.92, symbol: "€" },
    AUD: { rate: 1.52, symbol: "A$" }
  };
  if (currencySelect) {
    currencySelect.addEventListener("change", function () {
      var currency = currencyRates[currencySelect.value] || currencyRates.USD;
      document.querySelectorAll(".price[data-usd]").forEach(function (priceEl) {
        var usd = parseFloat(priceEl.getAttribute("data-usd"));
        var amountEl = priceEl.querySelector(".price-amount");
        if (!amountEl || isNaN(usd)) return;
        var converted = Math.round(usd * currency.rate).toLocaleString();
        amountEl.textContent = currency.symbol + converted;
      });
    });
  }

  /* ---------- Scroll-reveal animations ---------- */
  var revealEls = Array.prototype.slice.call(document.querySelectorAll(".reveal"));
  if ("IntersectionObserver" in window) {
    var revealObserver = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            revealObserver.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15, rootMargin: "0px 0px -40px 0px" }
    );
    revealEls.forEach(function (el) {
      revealObserver.observe(el);
    });
  } else {
    revealEls.forEach(function (el) {
      el.classList.add("is-visible");
    });
  }

  /* ---------- Animated stat counters ---------- */
  var countEls = Array.prototype.slice.call(document.querySelectorAll("[data-count-to]"));
  function animateCount(el) {
    var target = parseFloat(el.getAttribute("data-count-to"));
    var suffix = el.getAttribute("data-suffix") || "";
    var duration = 1200;
    var start = null;
    function step(timestamp) {
      if (start === null) start = timestamp;
      var progress = Math.min((timestamp - start) / duration, 1);
      var eased = 1 - Math.pow(1 - progress, 3);
      el.textContent = Math.round(target * eased) + suffix;
      if (progress < 1) window.requestAnimationFrame(step);
    }
    window.requestAnimationFrame(step);
  }
  if ("IntersectionObserver" in window && countEls.length) {
    var countObserver = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            animateCount(entry.target);
            countObserver.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.5 }
    );
    countEls.forEach(function (el) {
      countObserver.observe(el);
    });
  } else {
    countEls.forEach(function (el) {
      el.textContent = el.getAttribute("data-count-to") + (el.getAttribute("data-suffix") || "");
    });
  }

  /* ---------- Search widget tabs ---------- */
  var searchTabs = Array.prototype.slice.call(document.querySelectorAll(".search-tab"));
  var searchPanels = Array.prototype.slice.call(document.querySelectorAll(".search-panel"));

  function activateTab(tabName) {
    searchTabs.forEach(function (tab) {
      var isActive = tab.getAttribute("data-tab") === tabName;
      tab.classList.toggle("active", isActive);
      tab.setAttribute("aria-selected", String(isActive));
    });
    searchPanels.forEach(function (panel) {
      panel.classList.toggle("active", panel.getAttribute("data-panel") === tabName);
    });
    setActiveLink();
  }

  searchTabs.forEach(function (tab) {
    tab.addEventListener("click", function () {
      activateTab(tab.getAttribute("data-tab"));
    });
  });

  Array.prototype.slice.call(document.querySelectorAll("[data-tab-link]")).forEach(function (link) {
    link.addEventListener("click", function () {
      activateTab(link.getAttribute("data-tab-link"));
    });
  });

  /* ---------- Hero search (demo only, no backend) ---------- */
  var heroSearch = document.getElementById("heroSearch");
  var primaryFieldByTab = {
    stays: "staysDestination",
    flights: "flightsTo",
    packages: "packagesDestination",
    activities: "activitiesDestination"
  };
  heroSearch.addEventListener("submit", function (e) {
    e.preventDefault();
    var activeTab = document.querySelector(".search-tab.active");
    var tabName = activeTab ? activeTab.getAttribute("data-tab") : "stays";
    var fieldId = primaryFieldByTab[tabName];
    var field = fieldId ? document.getElementById(fieldId) : null;
    var destination = field ? field.value.trim() : "";
    document.getElementById("contact").scrollIntoView({ behavior: "smooth" });
    var status = document.getElementById("formStatus");
    if (destination) {
      status.textContent =
        'Noted — tell us a little more about ' + destination + ' below and our team will send you live pricing.';
      status.className = "form-status success";
      document.getElementById("message").value = "I'd like to book: " + destination + ".";
    } else {
      status.textContent = "Tell us a little more below and our team will send you live pricing.";
      status.className = "form-status success";
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

    var submitBtn = contactForm.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    formStatus.textContent = "Sending...";
    formStatus.className = "form-status";

    fetch("https://formsubmit.co/ajax/hello@365travel.co", {
      method: "POST",
      headers: { Accept: "application/json" },
      body: new FormData(contactForm)
    })
      .then(function (response) {
        if (!response.ok) throw new Error("Request failed");
        formStatus.textContent =
          "Thank you, " + name.split(" ")[0] + ". Our team will be in touch shortly — 365 days a year.";
        formStatus.className = "form-status success";
        contactForm.reset();
      })
      .catch(function () {
        formStatus.textContent =
          "Something went wrong sending your message — please email hello@365travel.co directly.";
        formStatus.className = "form-status error";
      })
      .finally(function () {
        submitBtn.disabled = false;
      });
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

    var subscribeBtn = newsletterForm.querySelector('button[type="submit"]');
    subscribeBtn.disabled = true;
    newsletterStatus.textContent = "Sending...";
    newsletterStatus.className = "form-status";

    fetch("https://formsubmit.co/ajax/hello@365travel.co", {
      method: "POST",
      headers: { Accept: "application/json" },
      body: new FormData(newsletterForm)
    })
      .then(function (response) {
        if (!response.ok) throw new Error("Request failed");
        newsletterStatus.textContent = "You're subscribed! Watch your inbox for deals.";
        newsletterStatus.className = "form-status success";
        newsletterForm.reset();
      })
      .catch(function () {
        newsletterStatus.textContent = "Something went wrong — please try again.";
        newsletterStatus.className = "form-status error";
      })
      .finally(function () {
        subscribeBtn.disabled = false;
      });
  });
})();
