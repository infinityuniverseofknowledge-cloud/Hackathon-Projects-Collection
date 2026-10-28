package vm

import (
	"testing"

	"aurora/internal/compiler"
	"aurora/internal/lexer"
	"aurora/internal/object"
	"aurora/internal/parser"
)

func run(t *testing.T, input string) object.Object {
	l := lexer.New(input)
	p := parser.New(l)
	prog := p.ParseProgram()
	if errs := p.Errors(); len(errs) > 0 {
		t.Fatalf("parse errors: %v", errs)
	}
	comp := compiler.New()
	if err := comp.Compile(prog); err != nil {
		t.Fatalf("compile error: %v", err)
	}
	bc := comp.Bytecode()
	machine := New(bc)
	if err := machine.Run(); err != nil {
		t.Fatalf("vm error: %v", err)
	}
	return machine.LastPopped()
}

func TestIntegerArithmetic(t *testing.T) {
	tests := []struct {
		input    string
		expected int64
	}{
		{"1", 1},
		{"2", 2},
		{"1 + 2", 3},
		{"1 - 2", -1},
		{"2 * 3", 6},
		{"10 / 5", 2},
		{"10 % 3", 1},
		{"-5", -5},
		{"-10 + 5", -5},
		{"(1 + 2) * 3", 9},
		{"1 + 2 * 3", 7},
	}
	for _, tt := range tests {
		result := run(t, tt.input)
		integer, ok := result.(*object.Integer)
		if !ok {
			t.Fatalf("%s: expected Integer, got %T (%+v)", tt.input, result, result)
		}
		if integer.Value != tt.expected {
			t.Errorf("%s: expected %d, got %d", tt.input, tt.expected, integer.Value)
		}
	}
}

func TestBooleanExpressions(t *testing.T) {
	tests := []struct {
		input    string
		expected bool
	}{
		{"true", true},
		{"false", false},
		{"1 < 2", true},
		{"1 > 2", false},
		{"1 <= 1", true},
		{"1 >= 2", false},
		{"1 == 1", true},
		{"1 != 2", true},
		{"!true", false},
		{"!false", true},
		{"!!true", true},
	}
	for _, tt := range tests {
		result := run(t, tt.input)
		b, ok := result.(*object.Boolean)
		if !ok {
			t.Fatalf("%s: not a Boolean, got %T", tt.input, result)
		}
		if b.Value != tt.expected {
			t.Errorf("%s: expected %t, got %t", tt.input, tt.expected, b.Value)
		}
	}
}

func TestStringConcatenation(t *testing.T) {
	result := run(t, `"hello" + " " + "world"`)
	s, ok := result.(*object.String)
	if !ok {
		t.Fatalf("not a String, got %T", result)
	}
	if s.Value != "hello world" {
		t.Errorf("expected hello world, got %s", s.Value)
	}
}

func TestArray(t *testing.T) {
	result := run(t, "[1, 2, 3]")
	arr, ok := result.(*object.Array)
	if !ok {
		t.Fatalf("not an Array, got %T", result)
	}
	if len(arr.Elements) != 3 {
		t.Errorf("expected 3 elements, got %d", len(arr.Elements))
	}
}

func TestIndex(t *testing.T) {
	result := run(t, "[1, 2, 3][1]")
	i, ok := result.(*object.Integer)
	if !ok {
		t.Fatalf("not an Integer")
	}
	if i.Value != 2 {
		t.Errorf("expected 2, got %d", i.Value)
	}
}

func TestHash(t *testing.T) {
	result := run(t, `{"a": 1, "b": 2}["a"]`)
	i, ok := result.(*object.Integer)
	if !ok {
		t.Fatalf("not an Integer")
	}
	if i.Value != 1 {
		t.Errorf("expected 1, got %d", i.Value)
	}
}

func TestFunctionCall(t *testing.T) {
	input := `let add = fn(a, b) { a + b }
add(2, 3)`
	result := run(t, input)
	i, ok := result.(*object.Integer)
	if !ok {
		t.Fatalf("not an Integer, got %T", result)
	}
	if i.Value != 5 {
		t.Errorf("expected 5, got %d", i.Value)
	}
}

func TestClosure(t *testing.T) {
	input := `let make_adder = fn(n) {
  fn(x) { x + n }
}
let add5 = make_adder(5)
add5(3)`
	result := run(t, input)
	i, ok := result.(*object.Integer)
	if !ok {
		t.Fatalf("not an Integer, got %T", result)
	}
	if i.Value != 8 {
		t.Errorf("expected 8, got %d", i.Value)
	}
}

func TestIfExpression(t *testing.T) {
	tests := []struct {
		input    string
		expected int64
	}{
		{"if (true) { 10 } else { 20 }", 10},
		{"if (false) { 10 } else { 20 }", 20},
		{"if (1 < 2) { 5 } else { 10 }", 5},
	}
	for _, tt := range tests {
		result := run(t, tt.input)
		i, ok := result.(*object.Integer)
		if !ok {
			t.Fatalf("%s: not an Integer, got %T", tt.input, result)
		}
		if i.Value != tt.expected {
			t.Errorf("%s: expected %d, got %d", tt.input, tt.expected, i.Value)
		}
	}
}

func TestBuiltinLen(t *testing.T) {
	result := run(t, `len([1, 2, 3, 4, 5])`)
	i, ok := result.(*object.Integer)
	if !ok {
		t.Fatalf("not an Integer")
	}
	if i.Value != 5 {
		t.Errorf("expected 5, got %d", i.Value)
	}
}

func TestBuiltinPush(t *testing.T) {
	input := `let xs = [1, 2, 3]
let ys = push(xs, 4)
ys[3]`
	result := run(t, input)
	i, ok := result.(*object.Integer)
	if !ok {
		t.Fatalf("not an Integer")
	}
	if i.Value != 4 {
		t.Errorf("expected 4, got %d", i.Value)
	}
}
