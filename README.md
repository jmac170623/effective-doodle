# 365 Travel

Marketing/booking website for **365 Travel** (365travel.co) — search stays,
flights, holiday packages and activities worldwide, then pay with a major
card or leading cryptocurrencies. Static HTML/CSS/JS — no build step, no
dependencies.

Note: search and crypto checkout are UI/design only right now — there's no
live inventory or payment backend wired up yet.

## Structure

```
index.html       Single-page site (Home/Search, Payments, Destinations, Property Types, About, Contact)
css/styles.css    Styles
js/script.js      Mobile nav, search-widget tabs, active-link highlighting, scroll-reveal, animated stats, form validation
```

## Running locally

Any static file server works, e.g.:

```
python3 -m http.server 8000
```

Then open http://localhost:8000.
