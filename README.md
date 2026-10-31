# Matthew's Idle Casino

An idle/incremental casino game for Android tablets. Nine fully drawn tables —
Slot Machine, Roulette, Blackjack, Craps, Baccarat, Video Poker, Keno, Big Six
Wheel and Sic Bo — where the house rules favor *you*.

**Install on the tablet:** open this link in Chrome on the tablet, then tap Install:

    https://github.com/<your-username>/matthews-idle-casino/releases/latest/download/MatthewsIdleCasino.apk

Every time the code changes, GitHub builds a new version automatically
(see the Actions tab) and publishes it under Releases. New versions install
over the old one and keep your casino.

## How it plays
- Pick your first table for free and play $10 rounds by hand (hands-on play gets a bonus edge).
- At $100, hire your first dealer: they play that table for you, even while the app is closed.
- At $1,000, open your next table. Each new table has a higher minimum bet (×4) and costs more to open.
- Per table: hire more dealers, raise the table limit (×2 bets), speed up dealers, buy lucky charms (+edge).
  Every 25/50/100/150… dealers on one table doubles its limit for free.
- Casino tab: better offline earnings and a casino-wide edge boost.
- VIP tab: once you've won $10B, cash out for VIP chips (+1% edge on every table, forever) and start over bigger.

## Files
- `src/` — the game source (rules, drawing, scenes, interface). Run `python3 build.py` to rebuild.
- `android/app/src/main/assets/index.html` — the bundled game the app loads.
- `android/` — the small Android wrapper (full-screen WebView, vibration on big wins).
- `.github/workflows/build.yml` — builds and publishes the APK.
