# Pricing notes (pitch aid)

## "How did you get the base prices?"

We priced each of the seven fixtures once during development, for Manhattan, and saved the results in `src/data/prices.json`. Each fixture has a parts range and a professional-installation labor range, and the app adds them to give an installed range. Every number links to the pages it came from, and the app's "Where do these prices come from?" sheet lists those pages.

The research method (2026-11-21):

- **Current saved file:** hand estimates. We searched the web for cost guides (HomeAdvisor, Angi, Fixr, Homewyse, Handoff), NYC-specific pages where they exist, and retail listings (Target, Staples, Walmart) for the products you buy rather than install. National labor ranges were set toward their high end to reflect Manhattan rates.
- **Live research:** `scripts/fetch-prices.mjs` runs one Gemini 4 query per fixture with Google Search grounding ("installed cost in Manhattan, NYC", strict JSON reply). It follows each grounding citation to its final URL and flags any number outside a sanity band for a hand check. Run it with a key in `.env`: `node scripts/fetch-prices.mjs --write`.
- **At runtime:** the estimate screen shows the saved prices right away. A live Gemini 4 + Google Search refresh replaces a line only if its range is within 0.33x to 3x of the saved range.

Short pitch answer: *"Gemini 4 with Google Search, checked by hand against the cited pages, priced for Manhattan. The sources are listed in the app."*

## "Why no location multiplier?"

We priced Manhattan directly, so there is nothing to multiply. A regional multiplier would be a made-up number we couldn't source. Where only national ranges existed, we chose values toward the high end of the range instead of scaling them by a factor.

## Sources table

Installed = parts + labor, per unit, before tax.

| Fixture | Parts | Labor | Installed | Sources |
|---|---|---|---|---|
| Grab bar by the toilet (each) | $30–$90 | $130–$280 | $160–$370 | [HomeAdvisor grab bar cost](https://www.homeadvisor.com/cost/disability-accommodation/grab-bar) ($100–$400 national); [Fixr grab bars](https://www.fixr.com/costs/grab-bars-installation) ($85–$300); [Handoff, Bronx NY](https://www.handoff.ai/construction-costs/install-a-safety-grab-bar/bronx-ny) ($149–$317 per bar) |
| Tub/shower grab bars (set of 2) | $60–$160 | $200–$420 | $260–$580 | [HomeAdvisor grab bar cost](https://www.homeadvisor.com/cost/disability-accommodation/grab-bar); [Angi grab bar cost](https://match.angi.com/cost/disability-accommodation/grab-bar); [Handoff, Bronx NY](https://www.handoff.ai/construction-costs/install-a-safety-grab-bar/bronx-ny) |
| Shower seat (each) | $50–$120 | $0–$75 (assembly/delivery) | $50–$195 | [Target, Drive Medical tub transfer bench](https://www.target.com/p/drive-medical-plastic-tub-transfer-bench-with-adjustable-backrest/-/A-51389743) (~$52); [Staples, Drive Medical shower chair with back and arms](https://www.staples.com/Drive-Medical-Premium-Series-Shower-Chair-with-Back-and-Arms/product_1037156) |
| Raised toilet seat (each) | $30–$80 | $0–$40 | $30–$120 | [Staples, Drive Medical raised seat with arms](https://www.staples.com/Drive-Medical-Locking-Raised-Toilet-Seat-with-Arms--10-H--White--RTL12027RA-/product_1037172); [Walmart, Carex raised seat](https://www.walmart.com/ip/Carex-Raised-Toilet-Seat-With-Handles-Standard-Elongated-Toilets-Adds-3-5-Inches-to-Toilet-Height-Toilet-Seat-Riser-For-Handicap-and-Seniors/17215628) |
| Handheld shower with slide bar (each) | $40–$150 | $150–$320 | $190–$470 | [Homewyse shower head install](https://www.homewyse.com/services/cost_to_install_shower_head.html) ($175–$451); [Handoff, handheld shower US](https://www.handoff.ai/construction-costs/install-a-handheld-shower-head) ($207–$417); [Angi showerhead replacement](https://angi.com/articles/cost-replace-shower-head.htm) |
| Non-slip strips and mat (set) | $20–$50 | $0 (DIY) | $20–$50 | [Walmart shower strips](https://www.walmart.com/c/kp/shower-strips); [Walmart, SlipX safety treads](https://www.walmart.com/ip/856074370) |
| Lever faucet (each) | $80–$250 | $180–$350 | $260–$600 | [HomeAdvisor, New York NY faucet/plumbing](https://homeadvisor.com/tloc/New-York-NY/Faucets-Fixtures-and-Pipes-Repair-or-Replace) ($196–$492 NYC); [HomeAdvisor bathroom faucet replacement](https://www.homeadvisor.com/cost/plumbing/cost-to-replace-a-bathroom-faucet); [Roto-Rooter FAQ](https://rotorooter.com/frequently-asked-questions/faucets/will-a-plumber-install-a-new-faucet-in-my-bathroom) (about 1 hour of labor) |

## Honest caveats

- **These are estimates, not quotes.** Real prices depend on wall type (tile over concrete costs more), building rules (many Manhattan co-ops require a licensed and insured contractor), and minimum call-out fees.
- **Most sources are national or NYC-wide.** Few pages publish Manhattan-only prices. The closest local data is a Bronx grab-bar page and HomeAdvisor's New York, NY plumbing page. We set labor toward the high end of national ranges instead of applying a multiplier.
- **Retail prices are snapshots.** Product prices for seats, risers and strips come from retailer listings on 2026-11-21 and will change.
- **The contractor is fictional.** "Chelsea Home Safety Co. (sample)" does not exist. The app labels it as a sample.
- **Live research status:** the saved file uses hand estimates because no Gemini API key was available when it was made. Running `scripts/fetch-prices.mjs --write` replaces the numbers and sources with Gemini 4 grounded results. Check the flagged outliers by hand before committing.
