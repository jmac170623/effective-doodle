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
  var currencySelects = Array.prototype.slice.call(
    document.querySelectorAll("#currencySelect, #currencySelectMobile")
  );
  var currencyRates = {
    USD: { rate: 1, symbol: "$" },
    GBP: { rate: 0.79, symbol: "£" },
    EUR: { rate: 0.92, symbol: "€" },
    AUD: { rate: 1.52, symbol: "A$" }
  };
  function applyCurrency(value) {
    var currency = currencyRates[value] || currencyRates.USD;
    document.querySelectorAll(".price[data-usd]").forEach(function (priceEl) {
      var usd = parseFloat(priceEl.getAttribute("data-usd"));
      var amountEl = priceEl.querySelector(".price-amount");
      if (!amountEl || isNaN(usd)) return;
      var converted = Math.round(usd * currency.rate).toLocaleString();
      amountEl.textContent = currency.symbol + converted;
    });
  }
  currencySelects.forEach(function (select) {
    select.addEventListener("change", function () {
      currencySelects.forEach(function (other) {
        if (other !== select) other.value = select.value;
      });
      applyCurrency(select.value);
    });
  });
  if (currencySelects.length) applyCurrency(currencySelects[0].value);

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
  var heroHeadline = document.getElementById("heroHeadline");
  var heroLead = document.getElementById("heroLead");
  var heroCopyByTab = {
    stays: {
      headline: "Book your stay<br>with crypto or card.",
      lead: "Search thousands of stays worldwide, then pay however suits you using major cards or leading cryptocurrencies."
    },
    flights: {
      headline: "Book your flight<br>with crypto or card.",
      lead: "Search hundreds of airlines worldwide, then pay however suits you using major cards or leading cryptocurrencies."
    },
    bundle: {
      headline: "Book flight + hotel<br>with crypto or card.",
      lead: "Bundle your flight and stay into one trip, then pay however suits you using major cards or leading cryptocurrencies."
    }
  };

  function activateTab(tabName) {
    searchTabs.forEach(function (tab) {
      var isActive = tab.getAttribute("data-tab") === tabName;
      tab.classList.toggle("active", isActive);
      tab.setAttribute("aria-selected", String(isActive));
    });
    searchPanels.forEach(function (panel) {
      panel.classList.toggle("active", panel.getAttribute("data-panel") === tabName);
    });
    var copy = heroCopyByTab[tabName];
    if (copy && heroHeadline && heroLead) {
      heroHeadline.innerHTML = copy.headline;
      heroLead.textContent = copy.lead;
    }
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
    bundle: "bundleDestination"
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
        'Noted. Tell us a little more about ' + destination + ' below and our team will send you live pricing.';
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

    fetch("https://formsubmit.co/ajax/info@365travel.co", {
      method: "POST",
      headers: { Accept: "application/json" },
      body: new FormData(contactForm)
    })
      .then(function (response) {
        if (!response.ok) throw new Error("Request failed");
        formStatus.textContent =
          "Thank you, " + name.split(" ")[0] + ". Our team will be in touch shortly, 365 days a year.";
        formStatus.className = "form-status success";
        contactForm.reset();
      })
      .catch(function () {
        formStatus.textContent =
          "Something went wrong sending your message. Please email info@365travel.co directly.";
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

    fetch("https://formsubmit.co/ajax/info@365travel.co", {
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
        newsletterStatus.textContent = "Something went wrong. Please try again.";
        newsletterStatus.className = "form-status error";
      })
      .finally(function () {
        subscribeBtn.disabled = false;
      });
  });

  /* ---------- Shared popover close-all helper ---------- */
  function closeAllPoppers(except) {
    Array.prototype.slice.call(document.querySelectorAll(".custom-select.open")).forEach(function (el) {
      if (el !== except) el.classList.remove("open");
    });
    Array.prototype.slice.call(document.querySelectorAll(".custom-datepicker.open")).forEach(function (el) {
      if (el !== except) el.classList.remove("open");
    });
    Array.prototype.slice.call(document.querySelectorAll(".custom-destination.open")).forEach(function (el) {
      if (el !== except) el.classList.remove("open");
    });
  }
  document.addEventListener("click", function (e) {
    if (!e.target.closest(".custom-select") && !e.target.closest(".custom-datepicker") && !e.target.closest(".custom-destination")) {
      closeAllPoppers(null);
    }
  });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") closeAllPoppers(null);
  });

  function positionPanelHorizontally(wrapper, panel) {
    wrapper.classList.remove("align-right");
    var rect = wrapper.getBoundingClientRect();
    var panelWidth = panel.offsetWidth || 280;
    if (rect.left + panelWidth > window.innerWidth - 16) {
      wrapper.classList.add("align-right");
    }
  }

  /* ---------- Marquee text: scroll text that's too long to fit, instead of "..." ---------- */
  var prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  function setupMarqueeText(container, text) {
    container.classList.remove("marquee");
    container.innerHTML = "";
    var track = document.createElement("span");
    track.className = "marquee-track";
    var copyA = document.createElement("span");
    copyA.className = "marquee-copy";
    copyA.textContent = text;
    track.appendChild(copyA);
    container.appendChild(track);

    if (prefersReducedMotion) return;

    requestAnimationFrame(function () {
      var overflowAmount = container.scrollWidth - container.clientWidth;
      if (overflowAmount > 4) {
        var copyB = document.createElement("span");
        copyB.className = "marquee-copy";
        copyB.setAttribute("aria-hidden", "true");
        copyB.textContent = text;
        track.appendChild(copyB);
        var singleWidth = track.scrollWidth / 2;
        var duration = Math.max(4, singleWidth / 38);
        track.style.animationDuration = duration + "s";
        container.classList.add("marquee");
      }
    });
  }

  /* ---------- Custom select dropdowns ---------- */
  function enhanceSelect(select) {
    if (select.dataset.enhanced) return;
    select.dataset.enhanced = "true";

    var wrapper = document.createElement("div");
    wrapper.className = "custom-select";
    if (select.classList.contains("currency-select")) {
      wrapper.classList.add("custom-select--compact");
    }
    select.parentNode.insertBefore(wrapper, select);
    wrapper.appendChild(select);
    select.classList.add("custom-select-native");
    select.setAttribute("tabindex", "-1");
    select.setAttribute("aria-hidden", "true");

    var button = document.createElement("button");
    button.type = "button";
    button.className = "custom-select-trigger";
    button.setAttribute("aria-haspopup", "listbox");
    button.setAttribute("aria-expanded", "false");

    var label = document.createElement("span");
    label.className = "custom-select-label";
    button.appendChild(label);

    var chevron = document.createElement("span");
    chevron.className = "custom-select-chevron";
    chevron.setAttribute("aria-hidden", "true");
    chevron.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>';
    button.appendChild(chevron);

    var listbox = document.createElement("ul");
    listbox.className = "custom-select-list";
    listbox.setAttribute("role", "listbox");

    var optionEls = Array.prototype.slice.call(select.options).map(function (opt, i) {
      var li = document.createElement("li");
      li.className = "custom-select-option";
      li.setAttribute("role", "option");
      setupMarqueeText(li, opt.textContent);
      if (opt.selected) li.classList.add("active");
      li.addEventListener("click", function () {
        select.selectedIndex = i;
        syncActiveOption();
        syncLabel();
        closeList();
        select.dispatchEvent(new Event("change", { bubbles: true }));
      });
      listbox.appendChild(li);
      return li;
    });

    function syncActiveOption() {
      optionEls.forEach(function (el, i) {
        el.classList.toggle("active", i === select.selectedIndex);
      });
    }
    function syncLabel() {
      var selected = select.options[select.selectedIndex];
      setupMarqueeText(label, selected ? selected.textContent : "");
    }
    syncLabel();

    function closeList() {
      wrapper.classList.remove("open");
      button.setAttribute("aria-expanded", "false");
    }
    function openList() {
      closeAllPoppers(wrapper);
      wrapper.classList.add("open");
      button.setAttribute("aria-expanded", "true");
      positionPanelHorizontally(wrapper, listbox);
    }

    button.addEventListener("click", function (e) {
      e.stopPropagation();
      if (wrapper.classList.contains("open")) closeList(); else openList();
    });

    wrapper.appendChild(button);
    wrapper.appendChild(listbox);
  }

  Array.prototype.slice.call(document.querySelectorAll(".js-customselect")).forEach(enhanceSelect);

  /* ---------- Destination suggestions (type freely, or pick a common search) ---------- */
  var POPULAR_DESTINATIONS = [
    "London, UK",
    "Paris, France",
    "New York, USA",
    "Dubai, UAE",
    "Rome, Italy",
    "Santorini, Greece",
    "Amalfi Coast, Italy",
    "Bali, Indonesia",
    "Courchevel, France",
    "Seychelles",
    "Kyoto, Japan",
    "Cape Town, South Africa"
  ];

  /* ---------- Shared: show the full value (scrolling if needed) once a text input is blurred ---------- */
  function attachOverflowDisplay(wrapper, input) {
    var display = document.createElement("span");
    display.className = "destination-display";
    display.setAttribute("aria-hidden", "true");
    wrapper.appendChild(display);

    function showDisplay() {
      if (!input.value) {
        input.classList.remove("text-hidden");
        display.classList.remove("visible");
        return;
      }
      setupMarqueeText(display, input.value);
      input.classList.add("text-hidden");
      display.classList.add("visible");
    }
    function hideDisplay() {
      input.classList.remove("text-hidden");
      display.classList.remove("visible");
    }

    return { showDisplay: showDisplay, hideDisplay: hideDisplay };
  }

  function enhanceOverflowInput(input) {
    if (input.dataset.overflowEnhanced) return;
    input.dataset.overflowEnhanced = "true";

    var wrapper = document.createElement("div");
    wrapper.className = "text-overflow-wrap";
    input.parentNode.insertBefore(wrapper, input);
    wrapper.appendChild(input);

    var controls = attachOverflowDisplay(wrapper, input);
    input.addEventListener("focus", controls.hideDisplay);
    input.addEventListener("blur", controls.showDisplay);
    controls.showDisplay();
  }

  Array.prototype.slice.call(document.querySelectorAll(".js-overflow-text")).forEach(enhanceOverflowInput);

  function enhanceDestinationInput(input) {
    if (input.dataset.enhanced) return;
    input.dataset.enhanced = "true";

    var wrapper = document.createElement("div");
    wrapper.className = "custom-destination";
    input.parentNode.insertBefore(wrapper, input);
    wrapper.appendChild(input);

    var controls = attachOverflowDisplay(wrapper, input);
    var showDisplay = controls.showDisplay;
    var hideDisplay = controls.hideDisplay;

    var listbox = document.createElement("ul");
    listbox.className = "custom-destination-list";
    listbox.setAttribute("role", "listbox");
    wrapper.appendChild(listbox);

    function render(query) {
      var q = (query || "").trim().toLowerCase();
      var matches = q
        ? POPULAR_DESTINATIONS.filter(function (name) { return name.toLowerCase().indexOf(q) !== -1; })
        : POPULAR_DESTINATIONS;
      listbox.innerHTML = "";
      matches.forEach(function (name) {
        var li = document.createElement("li");
        li.className = "custom-destination-option";
        li.setAttribute("role", "option");
        setupMarqueeText(li, name);
        li.addEventListener("click", function () {
          input.value = name;
          closePanel();
          input.blur();
        });
        listbox.appendChild(li);
      });
      return matches.length;
    }

    function openPanel() {
      if (render(input.value) === 0) return;
      closeAllPoppers(wrapper);
      wrapper.classList.add("open");
      positionPanelHorizontally(wrapper, listbox);
    }
    function closePanel() {
      wrapper.classList.remove("open");
    }

    listbox.addEventListener("mousedown", function (e) { e.preventDefault(); });
    input.addEventListener("focus", function () {
      hideDisplay();
      openPanel();
    });
    input.addEventListener("input", function () {
      if (render(input.value) === 0) closePanel(); else wrapper.classList.add("open");
    });
    input.addEventListener("click", function (e) {
      e.stopPropagation();
      hideDisplay();
      openPanel();
    });
    input.addEventListener("blur", showDisplay);

    showDisplay();
  }

  Array.prototype.slice.call(document.querySelectorAll(".js-destination")).forEach(enhanceDestinationInput);

  /* ---------- Custom date pickers ---------- */
  var MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  var WEEKDAY_LABELS = ["M", "T", "W", "T", "F", "S", "S"];

  function pad2(n) { return n < 10 ? "0" + n : "" + n; }
  function formatDisplayDate(date) {
    return date.getDate() + " " + MONTH_NAMES[date.getMonth()].slice(0, 3) + " " + date.getFullYear();
  }

  function enhanceDatePicker(input) {
    if (input.dataset.enhanced) return;
    input.dataset.enhanced = "true";

    var wrapper = document.createElement("div");
    wrapper.className = "custom-datepicker";
    input.parentNode.insertBefore(wrapper, input);
    wrapper.appendChild(input);

    var icon = document.createElement("span");
    icon.className = "custom-datepicker-icon";
    icon.setAttribute("aria-hidden", "true");
    icon.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="16" rx="2"></rect><path d="M8 3v4M16 3v4M3 10h18"></path></svg>';
    wrapper.appendChild(icon);

    var panel = document.createElement("div");
    panel.className = "custom-datepicker-panel";

    var header = document.createElement("div");
    header.className = "custom-datepicker-header";
    var prevBtn = document.createElement("button");
    prevBtn.type = "button";
    prevBtn.className = "custom-datepicker-nav";
    prevBtn.innerHTML = "‹";
    prevBtn.setAttribute("aria-label", "Previous month");
    var monthLabel = document.createElement("span");
    monthLabel.className = "custom-datepicker-month";
    var nextBtn = document.createElement("button");
    nextBtn.type = "button";
    nextBtn.className = "custom-datepicker-nav";
    nextBtn.innerHTML = "›";
    nextBtn.setAttribute("aria-label", "Next month");
    header.appendChild(prevBtn);
    header.appendChild(monthLabel);
    header.appendChild(nextBtn);

    var weekdaysRow = document.createElement("div");
    weekdaysRow.className = "custom-datepicker-weekdays";
    WEEKDAY_LABELS.forEach(function (w) {
      var el = document.createElement("span");
      el.textContent = w;
      weekdaysRow.appendChild(el);
    });

    var grid = document.createElement("div");
    grid.className = "custom-datepicker-grid";

    panel.appendChild(header);
    panel.appendChild(weekdaysRow);
    panel.appendChild(grid);
    wrapper.appendChild(panel);

    var today = new Date();
    today.setHours(0, 0, 0, 0);
    var viewYear = today.getFullYear();
    var viewMonth = today.getMonth();
    var selectedTime = null;

    function render() {
      monthLabel.textContent = MONTH_NAMES[viewMonth] + " " + viewYear;
      grid.innerHTML = "";
      var firstDay = new Date(viewYear, viewMonth, 1);
      var startOffset = (firstDay.getDay() + 6) % 7;
      var daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
      for (var i = 0; i < startOffset; i++) {
        var blank = document.createElement("span");
        blank.className = "custom-datepicker-day is-empty";
        grid.appendChild(blank);
      }
      var _loop = function (day) {
        var cellDate = new Date(viewYear, viewMonth, day);
        var cellTime = cellDate.getTime();
        var btn = document.createElement("button");
        btn.type = "button";
        btn.className = "custom-datepicker-day";
        btn.textContent = day;
        if (cellTime === today.getTime()) btn.classList.add("is-today");
        if (selectedTime === cellTime) btn.classList.add("is-selected");
        if (cellTime < today.getTime()) {
          btn.disabled = true;
          btn.classList.add("is-disabled");
        }
        btn.addEventListener("click", function () {
          selectedTime = cellTime;
          input.value = formatDisplayDate(cellDate);
          input.dataset.iso = cellDate.getFullYear() + "-" + pad2(cellDate.getMonth() + 1) + "-" + pad2(cellDate.getDate());
          closePanel();
          input.dispatchEvent(new Event("change", { bubbles: true }));
        });
        grid.appendChild(btn);
      };
      for (var d = 1; d <= daysInMonth; d++) _loop(d);
    }

    function openPanel() {
      closeAllPoppers(wrapper);
      wrapper.classList.add("open");
      viewYear = (selectedTime ? new Date(selectedTime) : today).getFullYear();
      viewMonth = (selectedTime ? new Date(selectedTime) : today).getMonth();
      render();
      positionPanelHorizontally(wrapper, panel);
    }
    function closePanel() {
      wrapper.classList.remove("open");
    }

    input.addEventListener("click", function (e) {
      e.stopPropagation();
      if (wrapper.classList.contains("open")) closePanel(); else openPanel();
    });
    icon.addEventListener("click", function (e) {
      e.stopPropagation();
      if (wrapper.classList.contains("open")) closePanel(); else openPanel();
    });
    prevBtn.addEventListener("click", function (e) {
      e.stopPropagation();
      viewMonth--;
      if (viewMonth < 0) { viewMonth = 11; viewYear--; }
      render();
    });
    nextBtn.addEventListener("click", function (e) {
      e.stopPropagation();
      viewMonth++;
      if (viewMonth > 11) { viewMonth = 0; viewYear++; }
      render();
    });
  }

  Array.prototype.slice.call(document.querySelectorAll(".js-datepicker")).forEach(enhanceDatePicker);
})();
