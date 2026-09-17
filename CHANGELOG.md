# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and version numbers follow [Semantic Versioning](https://semver.org/).

## [1.1.0] - 2026-09-16

### Added

- "Drop" round result, for an incomplete tournament — excluded from the
  win/loss/tie tally, distinct from a Loss.
- Support for upcoming/future events: the Add/Edit form hides the Placement
  and Rounds sections for a future-dated event, and its card shows
  "🕐 Upcoming event" with "in N day(s)" in place of a result.
- Round dividers — split a single event's round list into groups (e.g.
  Swiss vs Top Cut) via a button next to the Rounds section on Add/Edit;
  removable inline, and shown on the event's detail page too.
- Yellow/Joltik theme.
- Real bundled images for the trophy/medal/thumbnail badges, replacing the
  Material Symbols placeholders.
- Result-specific placeholder text ("ID (Intentional Draw)", "No Show",
  "Bye", "Drop") shown in a round's opponent field when nothing was
  entered, instead of a generic "No opponent recorded".
- A separate Android app id for development-client builds, so one can be
  installed alongside a production build.
- A "Logs + photos" backup option (alongside "Logs only") that produces a
  `.zip` with photos included, restorable back to their original events.
- An export to `.txt` option for a readable format.
- De-duplication on import: "Import & Add" now flags events that already
  look like ones you have (same date, event type and location) and lets you
  Add anyway or Skip each one before importing.
- De-duplication for photos and markers as well.
- An "About" section on Settings, with "Check for updates" (GitHub
  releases) and "Buy me a pack" (paypal.me) links.
- Dashboards section with data for total tournaments, total rounds, prizing rate, w/l/t pie chart, most played matchups, best/worst matchups, with filtering and threshold settings.
- Most Played screen for full list.
- My Decklists feature to store decklists, and the ability to link them to events bi-directionally.
- Marker based date range filtering.


### Changed

- "Set as thumbnail" no longer reorders an event's other photos —
  thumbnail selection is now independent of photo order. Deleting the
  current thumbnail promotes the next photo automatically.
- The Add/Edit round editor hides the opponent Pokémon/deck fields for Bye
  and Drop rounds, which never have an opponent.
- The win/loss/tie record is hidden entirely when it's 0-0-0, instead of
  showing a meaningless "0-0-0".
- The event detail page's round list lost its table headers, was renamed
  "Results", and rounds now display as R1/R2/etc.
- Marker colors adapt per theme, fixing a black marker that was hard to
  read in Dark/Umbreon mode.
- Lightened the score/record text color for readability.

### Fixed

- The photo viewer's "Set as thumbnail"/"Delete" buttons were nearly
  transparent and could sit too close to the on-screen navigation area —
  given a solid background and safe-area-aware spacing.

## [1.0.0] - 2026-09-09

### Added

- Initial release.
