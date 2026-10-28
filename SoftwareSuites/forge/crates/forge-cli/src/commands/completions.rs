use anyhow::{bail, Result};

pub fn execute(shell: &str) -> Result<()> {
    match shell {
        "bash" => print!("{}", BASH),
        "zsh" => print!("{}", ZSH),
        "fish" => print!("{}", FISH),
        other => bail!("unsupported shell: {}", other),
    }
    Ok(())
}

const BASH: &str = r#"_forge() {
    local cur tasks
    COMPREPLY=()
    cur="${COMP_WORDS[COMP_CWORD]}"
    if [ "$COMP_CWORD" -eq 1 ]; then
        COMPREPLY=( $(compgen -W "run graph clean watch remote completions version" -- "$cur") )
    fi
}
complete -F _forge forge
"#;

const ZSH: &str = r#"#compdef forge
_forge() {
    local -a cmds
    cmds=(
        'run:Run a task and its dependencies'
        'graph:Print task graph as DOT'
        'clean:Clean local cache'
        'watch:Re-run on change'
        'remote:Remote cache operations'
        'completions:Generate completions'
        'version:Show version'
    )
    _describe 'command' cmds
}
_forge "$@"
"#;

const FISH: &str = r#"complete -c forge -f
complete -c forge -n '__fish_use_subcommand' -a run -d 'Run task'
complete -c forge -n '__fish_use_subcommand' -a graph -d 'Print DOT graph'
complete -c forge -n '__fish_use_subcommand' -a clean -d 'Clean cache'
complete -c forge -n '__fish_use_subcommand' -a watch -d 'Watch files'
complete -c forge -n '__fish_use_subcommand' -a remote -d 'Remote cache'
"#;
