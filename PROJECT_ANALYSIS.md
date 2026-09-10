# Project Analysis: mnemonic-recovery

## 1. What this project is

This repository is a browser-based mnemonic recovery utility for BIP39 seed phrases. It is designed to help recover partially damaged or missing wallet backup phrases by:

- accepting a BIP39 phrase
- allowing a missing word placeholder like `?`
- checking whether the phrase is valid
- suggesting likely word replacements using edit-distance logic
- brute-forcing the missing word across the BIP39 wordlist
- deriving wallet addresses from valid candidate seeds
- showing addresses for multiple coins and address types

The project is a specialized recovery tool for people who have lost or mistyped part of a wallet seed and want to test candidate words quickly without needing a full backend service.

---

## 2. Project purpose and user value

The README makes the intent very clear: this is meant to help recover a 24-word seed phrase when a hardware wallet returns errors like:

- "Mnemonic is not valid"
- "Invalid recovery phrase"
- wallet-specific recovery failures

The app is intended as a first-pass recovery aid. It helps users find the correct mnemonic by trying likely alternatives and checking the resulting derived addresses against blockchain explorers.

This is not a general-purpose wallet manager. It is a focused forensic / recovery tool for BIP39 phrases.

---

## 3. Project structure

Main project files:

- [README.md](README.md) — usage, purpose, and project background
- [compile.py](compile.py) — builds the standalone HTML version
- [src/index.html](src/index.html) — main browser UI and page layout
- [src/js/index.js](src/js/index.js) — recovery logic and address derivation
- [mnemonic-standalone.html](mnemonic-standalone.html) — generated standalone version with embedded assets
- [src/css/app.css](src/css/app.css) — styling
- [src/js](src/js) — JavaScript libraries and helpers, including Bitcoin and BIP39 logic

Notable library files in the JS folder:

- bitcoinjs-3.3.2.js
- jsbip39.js
- sjcl-bip39.js
- ethereumjs-util.js
- zxcvbn.js
- jquery-3.2.1.js
- bootstrap-3.3.7.js

This is a classic static web app: no Node server, no framework, and no package manager build pipeline.

---

## 4. High-level architecture

The app is built around a single page and a set of browser-side scripts.

### Front-end UI

The user interface is defined in [src/index.html](src/index.html). It contains:

- a textarea for entering the mnemonic
- a table with candidate recovered words and derived addresses
- explanatory text and examples
- links to block explorers for various cryptocurrencies

The UI is intentionally simple: the page is mostly a form and a results table.

### Core logic

The main logic lives in [src/js/index.js](src/js/index.js). It handles:

- input change events
- phrase validation
- language detection
- closest-word suggestions
- missing-word brute force
- seed derivation
- address generation for multiple coins
- output rendering to the DOM

### Crypto libraries

The project relies on JavaScript crypto and Bitcoin tooling already included in the repo. The main ones are:

- BitcoinJS for key derivation and address generation
- BIP39 implementation for checking mnemonic validity
- Ethereum utility functions for Ethereum address conversion
- jQuery for DOM interaction

This keeps the app self-contained and runnable directly in a browser.

---

## 5. How the recovery flow actually works

The main execution path is straightforward:

1. The user enters a mnemonic phrase into the textarea.
2. The app listens for input changes and calls a delayed update handler.
3. It calls `findPhraseErrors()` to validate the phrase.
4. If a word is unknown, it accepts `?` and calls `wordBruteforce()`.
5. For each candidate word in the BIP39 wordlist, it checks whether the full phrase is valid.
6. When a valid mnemonic is found, it derives addresses for standard derivation paths.
7. It renders those addresses in the result table as clickable links.

This makes the project very practical for manual wallet recovery, especially when a seed is mostly known but one word is missing or mistyped.

---

## 6. Key functions and their responsibilities

### `findPhraseErrors(phrase)`

This is the validator.

It does several checks:

- normalizes the phrase
- splits into words
- rejects blank phrases
- allows only one `?` placeholder
- rejects words not in the selected language list
- suggests closest matches if the word is close but not exact
- if a `?` is present, triggers brute-force recovery instead of a normal validation failure
- validates the full phrase using the BIP39 checker

### `wordBruteforce(words, index)`

This is the most important recovery loop.

It iterates through the whole BIP39 wordlist and replaces the unknown word with each candidate. For each candidate:

- joins the words into a phrase
- checks if it is a valid BIP39 mnemonic
- if valid, calls `DerivePublicAddresses(phrase, word)`

This is the logic that turns a partially known mnemonic into a set of possible matching wallet addresses.

### `DerivePublicAddresses(phrase, word)`

This function calculates addresses for multiple derivation schemes, including:

- Bitcoin legacy: BIP44
- Bitcoin Segwit: BIP49 and BIP84
- Ethereum: BIP44 and legacy path
- XRP
- Litecoin
- Zencash

It then writes the results into the table as HTML rows.

### `DerivePublicAddress(path)`

This function derives the key for a specific path and converts it to the correct address format for that coin. It handles:

- hardened derivation
- network-specific keypair creation
- Ethereum private key conversion
- Bitcoin Segwit and P2SH-wrapped Segwit addresses
- Ripple-specific conversion

### `findNearestWord(word)` and related helper functions

These functions use the Levenshtein distance algorithm to suggest near-matches when a user mistypes a word. The app also tries to find words sharing the same first and last letters, which is a useful heuristic for seed recovery.

---

## 7. Why this project matters for cryptocurrency recovery

The app is relevant because wallet seed phrases are often a single word away from being usable, and many users do not remember exactly which word was used. This tool is built to recover from that class of errors.

Its value is strongest when:

- the seed is mostly known
- one word is missing or mistyped
- the user wants to test likely wallet outputs before trying more expensive or slower recovery tools

That said, the process can be slow for 12-word phrases because the search space is large. The UI explicitly warns that 12-word seeds may take much longer to brute-force.

---

## 8. Build and packaging model

The project is built as a static web app with a generation step.

The script [compile.py](compile.py) does this:

- reads [src/index.html](src/index.html)
- finds all external script tags and stylesheet links
- inlines them into the HTML
- writes the result to [mnemonic-standalone.html](mnemonic-standalone.html)

This creates a standalone version that can be opened directly in a browser without needing a web server or external asset references.

Important note from the README: edits should be made in the source files under [src](src), not directly in the generated standalone HTML file.

---

## 9. Strengths of the project

- Very focused on a real-world recovery problem
- Runs entirely in the browser
- No backend or installation required
- Standalone offline version available
- Supports multiple address types and networks
- Easy to extend with more coin paths
- Generates directly useful wallet addresses for checking against explorers

---

## 10. Limitations and trade-offs

- It is a client-side JavaScript app, so runtime is limited by browser performance.
- Brute-forcing a missing word across a large wordlist can be slow.
- It is a recovery aid, not a secure storage or wallet solution.
- It depends on local browser computation and exposed libraries, which is appropriate for offline tools but not ideal for high-scale automation.
- There is no formal test suite or modern build system in the repository structure shown here.

---

## 11. Overall assessment

This is a practical, static-browser mnemonic recovery utility with a clear purpose: reduce the effort of recovering a damaged BIP39 seed by validating candidates and deriving wallet addresses. Its value is in the combination of:

- wordlist brute force
- Levenshtein typo suggestion
- address derivation
- multi-coin explorer integration

It is a lightweight but effective tool for the exact class of recovery problems it targets.

---

## 12. Recommended mental model for understanding the app

Think of it as a seed guesser + address derivation engine.

It does not secretly store or transmit secrets; it takes a user-entered phrase, tries plausible variants, and derives addresses to help the user verify whether a candidate seed matches a real wallet.

That makes it a useful wallet-recovery helper, especially for people working with partially known recovery phrases.
