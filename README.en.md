# Cyberpunk RED Interactive Sheet

[Русский README](README.md)

Offline interactive **player character sheet** and **GM sheet** for the *Cyberpunk RED* tabletop RPG.
They calculate stats, rolls, damage, ammo, armor, and role abilities by the rulebook.
No install, no server, no required internet.

**UI language: Russian and English.** Use the **RU / EN** switch in the header of either sheet.
Saved data stays in Russian (the project’s book-data canon); English is a display layer only.

- **Player sheet** (`Player.html`) — for players.
- **GM sheet** (`Dm.html`) — for the Game Master: enemies, combat, initiative, NPCs, the NET.

> Pre-1.0.0 builds are prereleases. If something doesn’t match the book, open an issue.

## Quick start

1. Open [Releases](https://github.com/kli133/cyberpunkred-interactive-sheet-rus/releases)
   and download the latest **zip** or **rar**.
2. Unpack the archive.
3. Open in a browser (Chrome, Edge, or Firefox):
   - `Player.html` — character sheet;
   - `Dm.html` — GM sheet.
4. Switch language with **RU** / **EN** at the top of the page
   (the choice is stored in the browser).

After unpacking you get two HTML files and the `player/`, `dm/`, and `shared/` folders
(you don’t need to open those folders yourself).

**Blank** prints an empty sheet to fill by hand.

**+ NEW** offers a blank sheet or a **Streetrat** template from the book: all 10 roles
with ready STATs (row 1 of the roll table), skills, weapons, armor, gear, and cyberware.
Where the book says “A or B”, the sheet takes the first option; name and lifepath are yours to fill.

## Where data is stored

- The sheet autosaves in this browser on this computer.
- **Export JSON** saves a character to a file (backup or move to another PC/browser).
- **Import JSON** adds a character from a file as a new sheet and does not overwrite the current one.
- Clearing browser data deletes characters — export first.
- The GM sheet stores its data separately and exports its own JSON.
- **Updating**: unpacking into a new folder may hide old data from the browser.
  Export from the old version and import into the new one.

## Player tabs

| Tab | Contents |
| --- | --- |
| **00 // Dashboard** | name, portrait, session notes, roll / hit log |
| **01 // Character** | stats, HP, armor, hit calculator, wounds, critical injuries |
| **02 // Skills** | all skills with totals and rolls, specialties, Improvement Points |
| **03 // Gear** | items, ammo, weapons, one-click combat actions |
| **04 // Lifepath** | background, relationships, daily life |
| **05 // Cyberware** | book catalog, foundations and slots, ON/OFF, sheet effects, body diagram |
| **06 // Role** | appears after you pick a role: ability automation |

Header: character switcher, **RU / EN**, **Print**, **Blank**, **Export / Import JSON**, and dice.

## Language (RU / EN)

- Switch is in the header of `Player.html` and `Dm.html`; language is stored in `localStorage`.
- **EN** covers UI labels, roles, skills, weapon types, Streetrat gear names, cyberware blurbs,
  the weapon attachments dialog, and tooltips.
- **Saves and JSON** are unchanged (still Russian internally). Free-text fields
  (name, notes) are not auto-translated.
- Dictionary / display layer: `shared/i18n.js` (`t`, `term`, `data-i18n`).

## Features

### Character

- **STATs and skills** by *Cyberpunk RED* rules.
- **Character creation**: 62 points for STATs (2–8) and 86 for skills (max 6).
  `(x2)` skills cost double; basic skills stay at least 2.
- **Specialties**: languages, local expert, martial arts, instruments, sciences, etc.
- **Hover tips** on STAT abbreviations and skill names (including what 10 / 14 / 18 mean).
- **Skill search** highlights matches.
- **Improvement Points (IP)**: in play mode, raise a skill with the button (20 × new level).
- **HP** = 10 + 5 × ⌈(BODY + WILL) / 2⌉, Seriously Wounded threshold, Death Save, Move (MOVE × 2 m).
- **Multiple characters** with quick switching.

### Armor, damage, and wounds

- Book armor kits: Leather, Kevlar, Armorjacks, Flak, Metalgear.
- Separate **head / body** SP; when armor is penetrated, current SP drops by 1.
- **Hit calculator**: damage − SP; head ×2; melee SP halved.
- **Armor penalty** to REF / DEX / MOVE uses the highest penalty (not summed).
- **Critical injuries**: 2d6 by zone table, +5 damage, logged on the sheet.
- **Wounds** track from HP: Seriously Wounded (−2) and Mortally Wounded (−4, −6 MOVE).
- **Death Save** with a growing +1 penalty per attempt.

### Weapons

- **Weapon type** from the book fills skill, damage, magazine, ROF, and autofire.
- **ATTACK**: 1d10 + STAT + skill with penalties; spends a round.
- **DAMAGE**: weapon damage roll; two or more sixes hint at a Critical Injury.
- **Autofire**: Autofire checkbox on SMGs and assault rifles; spends 10 rounds;
  Autofire skill; **SUPPRESSIVE** fire when available.
- **Reload** and **ATTACH** (mods, p. 342–344): book attachments, custom mods, quality, Tech upgrades.
- Weapon **quality** (Excellent / Standard / Poor) shows on the ATTACH / QUAL. button.

### Ammo

- Ammo table on Gear: caliber, type, quantity, effect, and book price; **+10** (or +1 for grenades/rockets).
- Loaded ammo column on each weapon; reload pulls from stock and returns leftovers when you swap loads.
- Special ammo changes damage / effect buttons (shotgun shells, poison, EMP, gas, smart ammo, etc.).

### Roles

Role abilities match the rulebook (1.25e, pp. 143–165): Solo, Netrunner, Tech, Medtech, Media,
Rockerboy, Exec, Lawman, Fixer, Nomad — each with its own **06** panel automation.
**Multiclass** (p. 143): in play mode take another role at rank 1 for 60 IP (last role must be rank 4+).

### Cyberware

- Book catalog (pp. 358–367): foundations, options, fashionware, borgware.
- ON / OFF install toggles with Humanity Loss; Sandevistan has a separate Active state.
- Effects apply to BODY, skills, Initiative, SP, Move, etc.; cyberweapons appear under Gear.

### Combat actions & dice

- Gear tab combat actions from the book (pp. 168–177) with one-click rolls.
- Dice drawer: any dice, advantage/disadvantage, critical success/failure on 1d10 (p. 130), Luck after the roll, Initiative.

### Print

- **Print** — filled current character (3× A4).
- **Blank** — empty sheet for handwriting.

### Convenience

- Collapse blocks; gear icon hides whole sections.
- Autosave; undo delete; mobile card layout; embedded Tektur font.
- Offline **RU / EN** UI.

## GM sheet

Open `Dm.html`. Separate storage and JSON from the player sheet.

| Tab | Contents |
| --- | --- |
| **00 // Session** | scene, enemy HP summary, players, roll log, notes |
| **01 // Enemies** | enemy cards or compact list, group hits |
| **02 // Initiative** | order, rounds, timed effects, “Acting now” |
| **03 // NPCs & notes** | NPC cards, locations, clues, loot |
| **04 // Bestiary & scenes** | templates and prepared encounters |
| **05 // NET** | architecture generator, Owlbear image, demons, programs / ICE / gear |
| **06 // Generators** | calendar, encounters, loot, jobs, NPCs, reputation, factions, names |
| **07 // Combat: rules** | combat reference, modifiers, hit chance, cover, weapons, chase |
| **08 // Reference** | roles by rank, STATs/skills, book bestiary, drugs, cyberware |
| **09 // Economy** | monthly costs, job pay, gigs, IP, prices |
| **10 // Fun** | house-rule extras (punishments, tarot, cards, toys) |

Header: **RU / EN**, print enemy cards, link to player sheet, Clear, Export / Import JSON, dice.

Enemies get book weapons (including exotic), mods, DV by range, autofire/suppressive fire,
critical injuries, statuses, and group damage. NET tools build architectures from the book tables
and export floor maps for Owlbear.

## House rules vs the book

- **Luck** is spent after the roll. In the book you declare it before rolling.

## Project layout

| Path | Contents |
| --- | --- |
| `Player.html` | player entry point |
| `Dm.html` | GM entry point |
| `player/` | player logic (`app.js`, Streetrat `data-templates.js`, …) |
| `dm/` | GM code (`dm.js`, `*-data.js`, tab modules) |
| `shared/` | shared `data.js`, `i18n.js` (RU/EN), `styles.css`, `fonts/` |

No libraries and no build step — plain HTML, CSS, and JavaScript.

## Contributing

Bugs and ideas: [Issues](https://github.com/kli133/cyberpunkred-interactive-sheet-rus/issues).
Code help: [CONTRIBUTING.md](CONTRIBUTING.md).
Conduct: [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md).
Security: [SECURITY.md](SECURITY.md).

The full feature write-up in Russian (more detail on every GM tab) is in [README.md](README.md).

## License

Repository code is [MIT](LICENSE).

*Cyberpunk RED* and related trademarks / rulebook content belong to
**R. Talsorian Games** and rights holders. This is an unofficial fan tool;
the MIT license does not cover their intellectual property.
