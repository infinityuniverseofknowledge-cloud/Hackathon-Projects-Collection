# Contributing

Keep the standard-library-only runtime unless an optional integration proves worthwhile on constrained Android. Read existing code and tests before changing behavior. Preserve explicit permissions, use bounded inputs/timeouts, and never add automatic model downloads or unreviewed shell execution.

Run `python3 -W error::ResourceWarning -m unittest discover -s tests -v` and `python3 -m omega benchmark --json` from the root. Add focused tests for behavior and denial cases. Do not report tests as passing unless executed. Do not include secrets, local `.omega/` data, model weights, or private corpora in changes.