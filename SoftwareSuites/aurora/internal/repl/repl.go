// Package repl implementa o loop read-eval-print da AURORA.
package repl

import (
	"bufio"
	"fmt"
	"io"
	"os"
	"strings"

	"aurora/internal/compiler"
	"aurora/internal/lexer"
	"aurora/internal/object"
	"aurora/internal/parser"
	"aurora/internal/vm"
)

const PROMPT = "> "

func Start(in io.Reader, out io.Writer) {
	scanner := bufio.NewScanner(in)

	globals := make([]object.Object, vm.GlobalsSize)
	symbolTable := compiler.NewSymbolTable()

	for i, v := range object.Builtins {
		symbolTable.DefineBuiltin(i, v.Name)
	}

	var constants []object.Object

	for {
		fmt.Fprint(out, PROMPT)
		if !scanner.Scan() {
			return
		}
		line := scanner.Text()
		if strings.TrimSpace(line) == "" {
			continue
		}
		if line == "exit" || line == "quit" {
			return
		}

		l := lexer.New(line)
		p := parser.New(l)
		program := p.ParseProgram()

		if errs := p.Errors(); len(errs) > 0 {
			printParserErrors(out, errs)
			continue
		}

		comp := compiler.NewWithState(symbolTable, constants)
		if err := comp.Compile(program); err != nil {
			fmt.Fprintf(out, "compile error: %s\n", err)
			continue
		}

		bc := comp.Bytecode()
		constants = bc.Constants

		machine := vm.NewWithGlobals(bc, globals)
		if err := machine.Run(); err != nil {
			fmt.Fprintf(out, "vm error: %s\n", err)
			continue
		}

		globals = machine.Globals()
		last := machine.LastPopped()
		if last != nil {
			fmt.Fprintln(out, last.Inspect())
		}
	}
}

func RunFile(path string) error {
	data, err := os.ReadFile(path)
	if err != nil {
		return err
	}
	src := string(data)

	l := lexer.New(src)
	p := parser.New(l)
	program := p.ParseProgram()
	if errs := p.Errors(); len(errs) > 0 {
		printParserErrors(os.Stderr, errs)
		return fmt.Errorf("parse failed")
	}

	comp := compiler.New()
	if err := comp.Compile(program); err != nil {
		return fmt.Errorf("compile: %w", err)
	}

	bc := comp.Bytecode()
	machine := vm.New(bc)
	if err := machine.Run(); err != nil {
		return fmt.Errorf("vm: %w", err)
	}
	return nil
}

func DumpFile(path string) error {
	data, err := os.ReadFile(path)
	if err != nil {
		return err
	}
	src := string(data)

	l := lexer.New(src)
	p := parser.New(l)
	program := p.ParseProgram()
	if errs := p.Errors(); len(errs) > 0 {
		printParserErrors(os.Stderr, errs)
		return fmt.Errorf("parse failed")
	}

	comp := compiler.New()
	if err := comp.Compile(program); err != nil {
		return fmt.Errorf("compile: %w", err)
	}
	bc := comp.Bytecode()

	fmt.Println("=== Constants ===")
	for i, c := range bc.Constants {
		fmt.Printf("%04d %s %s\n", i, c.Type(), c.Inspect())
	}
	fmt.Println()
	fmt.Println("=== Instructions ===")
	fmt.Println(bc.Instructions.String())
	return nil
}

func printParserErrors(out io.Writer, errors []string) {
	fmt.Fprintln(out, "parser errors:")
	for _, msg := range errors {
		fmt.Fprintf(out, "  %s\n", msg)
	}
}
