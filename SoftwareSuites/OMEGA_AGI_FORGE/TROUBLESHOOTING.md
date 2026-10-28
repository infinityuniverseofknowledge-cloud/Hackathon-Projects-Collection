# Troubleshooting

- `No language model is configured`: expected by default. Use deterministic tools, or configure a compatible endpoint explicitly.
- `Provider request failed`: verify endpoint reachability and `/v1/chat/completions` compatibility. OMEGA does not check service health or model availability in advance.
- `Absolute paths are not accepted` / `Path traversal is not allowed`: project tools are intentionally restricted to relative project paths.
- `Project tests execute code with your permissions`: inspect the test files before using the explicit approval flag. No sandbox is available.
- Database locked: stop concurrent OMEGA processes and retry; SQLite has a five-second busy timeout.
- Storage exhaustion: do not download model weights on this device without separately checking architecture and available space. Database contents are under `.omega/`.
- Install failure: no packages are needed; check Python 3.10+ and run `python3 -m unittest discover -s tests -v` from the project root.