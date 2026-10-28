// Package object define os valores de runtime da linguagem AURORA.
package object

import (
	"bytes"
	"fmt"
	"hash/fnv"
	"strings"

	"aurora/internal/code"
)

type Type string

const (
	INTEGER_OBJ     = "INTEGER"
	BOOLEAN_OBJ     = "BOOLEAN"
	NULL_OBJ        = "NULL"
	STRING_OBJ      = "STRING"
	ARRAY_OBJ       = "ARRAY"
	HASH_OBJ        = "HASH"
	COMPILED_FN_OBJ = "COMPILED_FUNCTION"
	CLOSURE_OBJ     = "CLOSURE"
	BUILTIN_OBJ     = "BUILTIN"
	ERROR_OBJ       = "ERROR"
)

type Object interface {
	Type() Type
	Inspect() string
}

type Hashable interface {
	HashKey() HashKey
}

type HashKey struct {
	Type  Type
	Value uint64
}

type Integer struct{ Value int64 }

func (i *Integer) Type() Type      { return INTEGER_OBJ }
func (i *Integer) Inspect() string { return fmt.Sprintf("%d", i.Value) }
func (i *Integer) HashKey() HashKey {
	return HashKey{Type: i.Type(), Value: uint64(i.Value)}
}

type Boolean struct{ Value bool }

func (b *Boolean) Type() Type      { return BOOLEAN_OBJ }
func (b *Boolean) Inspect() string { return fmt.Sprintf("%t", b.Value) }
func (b *Boolean) HashKey() HashKey {
	var v uint64
	if b.Value {
		v = 1
	}
	return HashKey{Type: b.Type(), Value: v}
}

type Null struct{}

func (n *Null) Type() Type      { return NULL_OBJ }
func (n *Null) Inspect() string { return "null" }

type String struct{ Value string }

func (s *String) Type() Type      { return STRING_OBJ }
func (s *String) Inspect() string { return s.Value }
func (s *String) HashKey() HashKey {
	h := fnv.New64a()
	h.Write([]byte(s.Value))
	return HashKey{Type: s.Type(), Value: h.Sum64()}
}

type Array struct{ Elements []Object }

func (a *Array) Type() Type { return ARRAY_OBJ }
func (a *Array) Inspect() string {
	var out bytes.Buffer
	elems := []string{}
	for _, e := range a.Elements {
		elems = append(elems, e.Inspect())
	}
	out.WriteString("[")
	out.WriteString(strings.Join(elems, ", "))
	out.WriteString("]")
	return out.String()
}

type HashPair struct {
	Key   Object
	Value Object
}

type Hash struct{ Pairs map[HashKey]HashPair }

func (h *Hash) Type() Type { return HASH_OBJ }
func (h *Hash) Inspect() string {
	var out bytes.Buffer
	pairs := []string{}
	for _, p := range h.Pairs {
		pairs = append(pairs, fmt.Sprintf("%s: %s", p.Key.Inspect(), p.Value.Inspect()))
	}
	out.WriteString("{")
	out.WriteString(strings.Join(pairs, ", "))
	out.WriteString("}")
	return out.String()
}

type CompiledFunction struct {
	Instructions  code.Instructions
	NumLocals     int
	NumParameters int
}

func (cf *CompiledFunction) Type() Type      { return COMPILED_FN_OBJ }
func (cf *CompiledFunction) Inspect() string { return fmt.Sprintf("CompiledFunction[%p]", cf) }

type Closure struct {
	Fn   *CompiledFunction
	Free []Object
}

func (c *Closure) Type() Type      { return CLOSURE_OBJ }
func (c *Closure) Inspect() string { return "Closure[" + c.Fn.Inspect() + "]" }

type BuiltinFunction func(args ...Object) Object

type Builtin struct{ Fn BuiltinFunction }

func (b *Builtin) Type() Type      { return BUILTIN_OBJ }
func (b *Builtin) Inspect() string { return "builtin function" }

type Error struct{ Message string }

func (e *Error) Type() Type      { return ERROR_OBJ }
func (e *Error) Inspect() string { return "ERROR: " + e.Message }

var (
	NULL  = &Null{}
	TRUE  = &Boolean{Value: true}
	FALSE = &Boolean{Value: false}
)

func BoolToObj(b bool) *Boolean {
	if b {
		return TRUE
	}
	return FALSE
}
