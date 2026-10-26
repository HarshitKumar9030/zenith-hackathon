# Discovery Points leaderboard

Standalone, responsive public leaderboard website. No dependencies, accounts, keys, Mongo credentials or build step. Requires Node.js 20+ for the included static server.

```sh
cd discovery-leaderboard
npm start
```

Open http://localhost:3002. It reads real scores from the EcoMitra public API, updates every 30 seconds while visible and supports manual refresh. For the local app running on port 3001, open http://localhost:3002/?source=local. No invented entries or scores are shown when the API is unavailable.

Deploy `index.html`, `style.css` and `app.js` to any static host, or use `npm start` on a Node host (`PORT` defaults to 3002). No deployment has been created for this separate site yet. Its default API is `https://wasteright.harshit.page/api/discovery-leaderboard?public=1`; deploy the matching web-app API changes first.

The public API exposes only top-20 pseudonyms and scores, with cross-origin read access and no personal total. The authenticated app retains personal totals. Public ranking participation is inherent to earning Discovery Points; account details and locations are not published. This is a hackathon participation challenge, not an anti-cheat system or pickup reward currency.

The main app has a separate sidebar page at `/app?view=Discovery%20Points`. Existing pickup rewards remain on Rewards. See `../docs/discovery-points.md` for earning rules.
