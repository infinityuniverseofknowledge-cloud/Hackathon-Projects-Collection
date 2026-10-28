// Command aurora e o CLI da linguagem AURORA.
package main

import (
	"flag"
	"fmt"
	"os"

	"aurora/internal/repl"
)

const version = "0.1.0"

func main() {
	var (
		showVersion bool
		dump        bool
		showHelp    bool
	)

	flag.BoolVar(&showVersion, "version", false, "print version and exit")
	flag.BoolVar(&dump, "dump", false, "compile and print bytecode disassembly")
	flag.BoolVar(&showHelp, "help", false, "print help")
	flag.Usage = func() {
		fmt.Fprintf(os.Stderr, `AURORA %s - compilador bytecode + VM

USO:
    aurora [OPCOES] [ARQUIVO.aur]

OPCOES:
    --version    mostra versao
    --dump       compila e mostra disassembly do bytecode
    --help       mostra esta ajuda

Sem ARQUIVO, inicia um REPL interativo.
`, version)
	}
	flag.Parse()

	if showHelp {
		flag.Usage()
		return
	}

	if showVersion {
		fmt.Printf("aurora %s\n", version)
		return
	}

	args := flag.Args()
	if len(args) == 0 {
		fmt.Printf("AURORA %s (digite 'exit' para sair)\n", version)
		repl.Start(os.Stdin, os.Stdout)
		return
	}

	path := args[0]
	if dump {
		if err := repl.DumpFile(path); err != nil {
			fmt.Fprintln(os.Stderr, "error:", err)
			os.Exit(1)
		}
		return
	}

	if err := repl.RunFile(path); err != nil {
		fmt.Fprintln(os.Stderr, "error:", err)
		os.Exit(1)
	}
}
