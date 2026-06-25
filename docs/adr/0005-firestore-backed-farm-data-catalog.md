# Firestore-backed Farm Data Catalog

Farm content definitions (plants, items, shops) are stored in Firestore collections (`farmPlants`, `farmItems`, `farmShops`) and loaded into `useFarmDataStore` during `sessionBootstrap`, rather than hardcoded in `PlantData.js`, `ItemData.js`, and `ShopData.js`.

We chose Firestore so the Admin Dashboard can add plants, tweak grow times, reprice items, and create new shops without a code deploy. The JS files remain as seed defaults: on first hydration, if a collection is empty, the JS defaults are written to Firestore automatically.

**Considered options:**

- **Static JS files (status quo)** — zero latency, no auth required, but every content change requires a deploy. Ruled out because the product needs indefinite extensibility via Admin UI.
- **Firestore, JS as fallback** — chosen. One extra async step at login; game data is always fresh from the source.

**Consequences:**

- `farmLogic.js` pure functions receive `plants`/`items` as parameters from callers (rather than importing the module directly), keeping them testable without Firestore.
- Shop sell-list prices are independent of `farmItems.buyPrice` — each shop document stores its own `{ itemId, price }` array. `buyPrice` on an item is a reference price only.
- Adding a plant whose sprites don't exist in `Basic_Plants.png` is not supported via Admin UI — the admin picks frame indices from the existing sheet. New sprite sheets require a code + asset deploy.
