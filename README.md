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
- Pick your first table for free and play $10 rounds by hand. Your first three hands are lucky ones.
- At $75, hire your first dealer: they play that table for you, even while the game is closed.
- At $1,000, open your next table. Each new table has a higher minimum bet (×4) and costs more to open.
- Per table: hire more dealers, raise the table limit, speed up dealers, buy lucky charms, and pick one of two
  **House Specials** unique to that table.
- **Goals** pay cash and +0.5% player edge each, forever.
- **High rollers** walk in every couple of minutes: tap them for a tip or a hot streak.
- The **casino jackpot** fills in real time, including while you're away. Tap it to hit it.
- Casino tab: offline earnings, the Lucky Carpet, graphics, and save export/import.
- VIP tab: once you've won $10B, cash out for VIP chips. Every chip adds +1% edge forever, and chips buy club perks.

## Files
- `src/` — the game source (rules, drawing, scenes, interface, and `extras.js` for specials, goals, events, jackpot and save tools). Run `python3 build.py` to rebuild.
- For itch.io: zip `android/app/src/main/assets/index.html` on its own and upload it as an HTML game.
- `android/app/src/main/assets/index.html` — the bundled game the app loads.
- `android/` — the small Android wrapper (full-screen WebView, vibration on big wins).
- `.github/workflows/build.yml` — builds and publishes the APK.
