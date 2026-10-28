# Installation

Requirements: Python 3.10 or newer. The inspected Termux device has Python 3.14.6. The project has no runtime dependencies, downloads, or root requirement.

```sh
cd /storage/emulated/0/Download/OMEGA_AGI_FORGE
sh scripts/install.sh
sh scripts/doctor.sh
sh scripts/start.sh status
```

The install script initializes `.omega/` and runs the local unit suite. It does not create a virtual environment or install Python packages. To install a console entry point in an isolated environment, use a Python environment you manage and `python -m pip install .`; this optional packaging route was not required or tested on Android shared storage. No model runtime was detected; see [CONFIGURATION.md](CONFIGURATION.md) before connecting a compatible server.