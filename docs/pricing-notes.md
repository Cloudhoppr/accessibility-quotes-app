# Pricing notes (pitch aid)

## "How did you get the base prices?"

We priced each of the seven fixtures once during development, for Manhattan, and saved the results in `src/data/prices.json`. Each fixture has a parts range and a professional-installation labor range, and the app adds them to give an installed range. Every number links to the pages it came from, and the app's "Where do these prices come from?" sheet lists those pages.

The research method (2026-11-21):

- **Gemini 4 research (4 of 7 fixtures):** `scripts/fetch-prices.mjs` runs one Gemini 4 (`gemini-4-argon`) query per fixture with Google Search grounding through the Interactions API, all seven in parallel (about 20 s in total). Each query asks for the Manhattan, NYC parts and labor ranges as strict JSON. The script follows each citation (Google's expiring `vertexaisearch` redirect links) to the final page and records the Google searches Gemini ran. Any installed range outside a per-fixture sanity band is not written. Run it with a key in `.env`: `node scripts/fetch-prices.mjs --write` (add `--only id1,id2` to redo specific fixtures).
- **Hand estimates (3 of 7 fixtures):** the toilet grab bar, shower seat and raised toilet seat keep the hand-researched numbers. Across runs on 2026-11-21, Gemini's ranges for these went past the sanity band: up to $500–$650 installed for a toilet grab bar, and it priced wall-mounted seats and handyman labor for the seat and riser. For the hand estimates we searched the web for cost guides (HomeAdvisor, Angi, Fixr, Homewyse, Handoff), NYC-specific pages where they exist, and retail listings (Target, Staples, Walmart) for products you buy rather than install. National labor ranges were set toward their high end to reflect Manhattan rates.
- **Sources:** every fixture keeps its hand-checked pages. Gemini-researched fixtures also list the pages Gemini cited and its Google searches as "Google search: ..." links.
- **At runtime:** the estimate screen shows the saved prices right away. A live Gemini 4 refresh (`gemini-4-argon`, Interactions API, Google Search, about 15 s) replaces a line only if both ends of its range fall within 0.33x the saved low to 3x the saved high.

Short pitch answer: *"Gemini 4 with Google Search, priced for Manhattan, with sanity bands and hand-checked pages behind it. The sources are listed in the app."*

## "Why no location multiplier?"

We priced Manhattan directly, so there is nothing to multiply. A regional multiplier would be a made-up number we couldn't source. Where only national ranges existed, we chose values toward the high end of the range instead of scaling them by a factor.

## Sources table

Installed = parts + labor, per unit, before tax.

| Fixture | Parts | Labor | Installed | Sources |
|---|---|---|---|---|
| Grab bar by the toilet (each) | $30–$90 | $130–$280 | $160–$370 | [HomeAdvisor grab bar cost](https://www.homeadvisor.com/cost/disability-accommodation/grab-bar) ($100–$400 national); [Fixr grab bars](https://www.fixr.com/costs/grab-bars-installation) ($85–$300); [Handoff, Bronx NY](https://www.handoff.ai/construction-costs/install-a-safety-grab-bar/bronx-ny) ($149–$317 per bar) |
| Tub/shower grab bars (set of 2) — **Gemini 4** | $60–$150 | $195–$450 | $255–$600 | Gemini cited: [ContractorPlus, New York NY](https://contractorplus.app/resources/construction-costs/install-grab-bars/new-york-ny); [3 Birds Accessibility](https://www.3birdsaccessibility.com/blog-details/grab-bar-installation-cost-in-2026-what-homeowners-should-expect); [HomeGuide](https://homeguide.com/grab-bar-installation). Hand-checked: [HomeAdvisor grab bar cost](https://www.homeadvisor.com/cost/disability-accommodation/grab-bar); [Angi grab bar cost](https://match.angi.com/cost/disability-accommodation/grab-bar); [Handoff, Bronx NY](https://www.handoff.ai/construction-costs/install-a-safety-grab-bar/bronx-ny) |
| Shower seat (each) | $50–$120 | $0–$75 (assembly/delivery) | $50–$195 | [Target, Drive Medical tub transfer bench](https://www.target.com/p/drive-medical-plastic-tub-transfer-bench-with-adjustable-backrest/-/A-51389743) (~$52); [Staples, Drive Medical shower chair with back and arms](https://www.staples.com/Drive-Medical-Premium-Series-Shower-Chair-with-Back-and-Arms/product_1037156) |
| Raised toilet seat (each) | $30–$80 | $0–$40 | $30–$120 | [Staples, Drive Medical raised seat with arms](https://www.staples.com/Drive-Medical-Locking-Raised-Toilet-Seat-with-Arms--10-H--White--RTL12027RA-/product_1037172); [Walmart, Carex raised seat](https://www.walmart.com/ip/Carex-Raised-Toilet-Seat-With-Handles-Standard-Elongated-Toilets-Adds-3-5-Inches-to-Toilet-Height-Toilet-Seat-Riser-For-Handicap-and-Seniors/17215628) |
| Handheld shower with slide bar (each) — **Gemini 4** | $60–$300 | $75–$220 | $135–$520 | Gemini cited: [Angi showerhead replacement](https://www.angi.com/articles/cost-replace-shower-head.htm); [Home Depot shower head replacement service](https://www.homedepot.com/services/c/shower-head-replacement/678ceba2e). Hand-checked: [Homewyse shower head install](https://www.homewyse.com/services/cost_to_install_shower_head.html) ($175–$451); [Handoff, handheld shower US](https://www.handoff.ai/construction-costs/install-a-handheld-shower-head) ($207–$417); [Angi showerhead replacement](https://angi.com/articles/cost-replace-shower-head.htm) |
| Non-slip strips and mat (set) — **Gemini 4** | $20–$65 | $0 (DIY) | $20–$65 | Gemini cited: [eBay bathtub strips](https://www.ebay.com/b/Bathtub-Strips/66722/bn_7023259208); [Target bath rugs](https://www.target.com/s/rubber+backed+bath+rug); [Bed Bath & Beyond bath mats](https://www.bedbathandbeyond.com/c/bath/bathroom-rugs-bath-mats?t=19459). Hand-checked: [Walmart shower strips](https://www.walmart.com/c/kp/shower-strips); [Walmart, SlipX safety treads](https://www.walmart.com/ip/856074370) |
| Lever faucet (each) — **Gemini 4** | $30–$600 | $150–$400 | $180–$1,000 | Gemini cited: [Monarch Contracting, plumber cost NYC](https://monarchcontractingny.com/blog/plumber-cost-nyc); [Angi bathroom faucet replacement](https://www.angi.com/articles/how-much-cost-replace-bathroom-faucet.htm); [Quality NYC Home Improvement, faucet replacement NYC](https://www.quality-new-york-city-home-improvement.com/faucet-replacement-cost-nyc.html). Hand-checked: [HomeAdvisor, New York NY faucet/plumbing](https://homeadvisor.com/tloc/New-York-NY/Faucets-Fixtures-and-Pipes-Repair-or-Replace) ($196–$492 NYC); [HomeAdvisor bathroom faucet replacement](https://www.homeadvisor.com/cost/plumbing/cost-to-replace-a-bathroom-faucet); [Roto-Rooter FAQ](https://rotorooter.com/frequently-asked-questions/faucets/will-a-plumber-install-a-new-faucet-in-my-bathroom) (about 1 hour of labor) |

## Honest caveats

- **These are estimates, not quotes.** Real prices depend on wall type (tile over concrete costs more), building rules (many Manhattan co-ops require a licensed and insured contractor), and minimum call-out fees.
- **Most sources are national or NYC-wide.** Few pages publish Manhattan-only prices. The closest local data is a Bronx grab-bar page and HomeAdvisor's New York, NY plumbing page. We set labor toward the high end of national ranges instead of applying a multiplier.
- **Retail prices are snapshots.** Product prices for seats, risers and strips come from retailer listings on 2026-11-21 and will change.
- **The contractor is fictional.** "Chelsea Home Safety Co. (sample)" does not exist. The app labels it as a sample.
- **Live research status (2026-11-21):** Gemini 4 numbers cover the tub/shower grab bars, handheld shower, non-slip set and lever faucet. The other three keep hand estimates (see above). The lever faucet range is wide ($180–$1,000) because Gemini's parts range runs from a basic faucet to a designer one. Gemini's numbers vary from run to run by about ±30% at the high end.
