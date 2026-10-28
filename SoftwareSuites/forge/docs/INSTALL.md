# Install Guide

## Prerequisites

- Rust 1.75 or later (`rustup install stable`)
- macOS, Linux, or WSL on Windows

## Install via cargo

    cargo install forge-cli

This downloads the crate from crates.io, compiles it, and installs the
`forge` binary to `~/.cargo/bin/`.

## Install via Homebrew

    brew tap forge-rs/tap
    brew install forge

## Install from source

    git clone https://github.com/forge-rs/forge
    cd forge
    cargo install --path crates/forge-cli

## Verify

    forge --version
    # forge 0.1.0

## Shell completion

    # Bash
    forge completions bash > /etc/bash_completion.d/forge

    # Zsh
    forge completions zsh > "${fpath[1]}/_forge"

    # Fish
    forge completions fish > ~/.config/fish/completions/forge.fish
