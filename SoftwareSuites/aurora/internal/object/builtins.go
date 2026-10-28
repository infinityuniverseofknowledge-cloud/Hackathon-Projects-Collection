package object

import (
	"fmt"
	"sort"
)

type BuiltinDef struct {
	Name    string
	Builtin *Builtin
}

var Builtins = []BuiltinDef{
	{Name: "len", Builtin: &Builtin{Fn: builtinLen}},
	{Name: "puts", Builtin: &Builtin{Fn: builtinPuts}},
	{Name: "first", Builtin: &Builtin{Fn: builtinFirst}},
	{Name: "last", Builtin: &Builtin{Fn: builtinLast}},
	{Name: "rest", Builtin: &Builtin{Fn: builtinRest}},
	{Name: "push", Builtin: &Builtin{Fn: builtinPush}},
	{Name: "keys", Builtin: &Builtin{Fn: builtinKeys}},
	{Name: "values", Builtin: &Builtin{Fn: builtinValues}},
	{Name: "type", Builtin: &Builtin{Fn: builtinType}},
	{Name: "str", Builtin: &Builtin{Fn: builtinStr}},
	{Name: "int", Builtin: &Builtin{Fn: builtinInt}},
}

func builtinLen(args ...Object) Object {
	if len(args) != 1 {
		return &Error{Message: fmt.Sprintf("len: expected 1 arg, got %d", len(args))}
	}
	switch a := args[0].(type) {
	case *String:
		return &Integer{Value: int64(len([]rune(a.Value)))}
	case *Array:
		return &Integer{Value: int64(len(a.Elements))}
	case *Hash:
		return &Integer{Value: int64(len(a.Pairs))}
	}
	return &Error{Message: "len: unsupported type " + string(args[0].Type())}
}

func builtinPuts(args ...Object) Object {
	for _, a := range args {
		fmt.Println(a.Inspect())
	}
	return NULL
}

func builtinFirst(args ...Object) Object {
	if len(args) != 1 {
		return &Error{Message: "first: expected 1 arg"}
	}
	arr, ok := args[0].(*Array)
	if !ok {
		return &Error{Message: "first: not an array"}
	}
	if len(arr.Elements) == 0 {
		return NULL
	}
	return arr.Elements[0]
}

func builtinLast(args ...Object) Object {
	if len(args) != 1 {
		return &Error{Message: "last: expected 1 arg"}
	}
	arr, ok := args[0].(*Array)
	if !ok {
		return &Error{Message: "last: not an array"}
	}
	if len(arr.Elements) == 0 {
		return NULL
	}
	return arr.Elements[len(arr.Elements)-1]
}

func builtinRest(args ...Object) Object {
	if len(args) != 1 {
		return &Error{Message: "rest: expected 1 arg"}
	}
	arr, ok := args[0].(*Array)
	if !ok {
		return &Error{Message: "rest: not an array"}
	}
	if len(arr.Elements) == 0 {
		return NULL
	}
	newElems := make([]Object, len(arr.Elements)-1)
	copy(newElems, arr.Elements[1:])
	return &Array{Elements: newElems}
}

func builtinPush(args ...Object) Object {
	if len(args) != 2 {
		return &Error{Message: "push: expected 2 args"}
	}
	arr, ok := args[0].(*Array)
	if !ok {
		return &Error{Message: "push: first arg not an array"}
	}
	newElems := make([]Object, len(arr.Elements)+1)
	copy(newElems, arr.Elements)
	newElems[len(arr.Elements)] = args[1]
	return &Array{Elements: newElems}
}

func builtinKeys(args ...Object) Object {
	if len(args) != 1 {
		return &Error{Message: "keys: expected 1 arg"}
	}
	h, ok := args[0].(*Hash)
	if !ok {
		return &Error{Message: "keys: not a hash"}
	}
	keys := make([]Object, 0, len(h.Pairs))
	for _, p := range h.Pairs {
		keys = append(keys, p.Key)
	}
	sort.Slice(keys, func(i, j int) bool {
		return keys[i].Inspect() < keys[j].Inspect()
	})
	return &Array{Elements: keys}
}

func builtinValues(args ...Object) Object {
	if len(args) != 1 {
		return &Error{Message: "values: expected 1 arg"}
	}
	h, ok := args[0].(*Hash)
	if !ok {
		return &Error{Message: "values: not a hash"}
	}
	vals := make([]Object, 0, len(h.Pairs))
	for _, p := range h.Pairs {
		vals = append(vals, p.Value)
	}
	return &Array{Elements: vals}
}

func builtinType(args ...Object) Object {
	if len(args) != 1 {
		return &Error{Message: "type: expected 1 arg"}
	}
	return &String{Value: string(args[0].Type())}
}

func builtinStr(args ...Object) Object {
	if len(args) != 1 {
		return &Error{Message: "str: expected 1 arg"}
	}
	return &String{Value: args[0].Inspect()}
}

func builtinInt(args ...Object) Object {
	if len(args) != 1 {
		return &Error{Message: "int: expected 1 arg"}
	}
	switch a := args[0].(type) {
	case *Integer:
		return a
	case *String:
		var v int64
		_, err := fmt.Sscanf(a.Value, "%d", &v)
		if err != nil {
			return &Error{Message: "int: cannot parse " + a.Value}
		}
		return &Integer{Value: v}
	}
	return &Error{Message: "int: unsupported type"}
}
