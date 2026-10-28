# SPYDER · Neural Core

Real character-level GPT transformer running 100% in the browser.
Zero dependencies. Zero network calls. Zero API keys.

## How to run
Open `index.html` in any modern browser.

## How to use
1. Click **Train** tab → **Train 500** (wait 15–30s for loss to drop)
2. Click **Chat** tab → ask a question
3. Optional: paste your own dialogue in **Fine-tune With Your Data** and click **Fine-tune**

## What it really is
- 1 transformer block, 2 attention heads, 32-dim embedding, 32-char context
- Full reverse-mode autograd (custom Value class)
- Adam optimizer, cross-entropy loss, causal self-attention
- ~20K parameters trained on ~5KB of curated dialogue

This is a **real** transformer that **really trains** and **really generates**.
It is NOT GPT-4. Expect short, imperfect, pattern-echoing answers.
State persists in `localStorage` (key `spyder_model_v2`).
