# Review patches

The HTML files in this branch are unchanged. Two tested patches are stored as split, base64-encoded gzip files because of transfer limits. Reconstruct each by concatenating its parts in numeric order, then base64-decode and gunzip. Review and apply them against commit 62facd2eb0ff05c315dcc4262c63b49e0f1b1367. The ChemForge patch includes its test files. The Aero/Arboris tests and full HTML files are provided in the separate local delivery. Tests cover selected functionality, not the entire applications.
