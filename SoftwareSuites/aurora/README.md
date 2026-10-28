# AURORA

> Compilador bytecode + VM para uma linguagem de scripting.
> Escrito em Go. Binario unico. Zero dependencias externas.

## O que e

AURORA e um pipeline completo de compilacao:

    source.aur
        |
        v
    [lexer] -> tokens
        |
        v
    [parser] -> AST
        |
        v
    [compiler] -> bytecode
        |
        v
    [VM] -> resultado

Tudo implementado do zero em ~3000 linhas de Go legivel.

## Instalar

    go install aurora/cmd/aurora@latest

Ou compilar do codigo:

    git clone <repo>
    cd aurora
    go build -o bin/aurora ./cmd/aurora
    ./bin/aurora

## Uso

Rodar um arquivo:

    aurora examples/hello.aur

REPL interativo:

    aurora

Disassembly do bytecode:

    aurora --dump examples/fib.aur

## Tour da linguagem

    // Variaveis
    let name = "World"
    let greeting = "Hello, " + name + "!"

    // Funcoes
    let add = fn(a, b) { a + b }
    let result = add(2, 3)

    // Closures
    let counter = fn() {
        let count = 0
        fn() { count = count + 1; count }
    }
    let c = counter()
    c()  // 1
    c()  // 2

    // Listas
    let xs = [1, 2, 3, 4, 5]
    puts(len(xs))

    // Maps
    let person = {name: "Alice", age: 30}
    puts(person["age"])

    // Condicionais
    if result > 5 {
        puts("big")
    } else {
        puts("small")
    }

    // Loops
    let i = 0
    while i < 10 {
        puts(i)
        i = i + 1
    }

## Arquitetura

    cmd/aurora/         CLI entry point
    internal/token/     Tipos de token
    internal/lexer/     Caracteres -> tokens
    internal/ast/       Abstract syntax tree
    internal/parser/    Tokens -> AST (Pratt parser)
    internal/compiler/  AST -> bytecode
    internal/code/      Opcodes + bytecode container
    internal/vm/        Bytecode -> execucao
    internal/object/    Valores runtime
    internal/repl/      Read-eval-print loop
    examples/           Arquivos .aur de exemplo

## Por que AURORA

- Aprender como compiladores funcionam — 3000 linhas legiveis de Go
- Sem dependencias — apenas stdlib
- Startup rapido — bytecode compilado, sem tree-walking
- Closures reais — captura correta de free variables
- Extensivel — adicionar builtin em 5 linhas

## Testes

    go test ./... -v
    go test ./... -race

## Licenca

MIT. Ver LICENSE.
