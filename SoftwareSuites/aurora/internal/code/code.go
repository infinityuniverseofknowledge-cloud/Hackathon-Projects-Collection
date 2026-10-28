// Package code define o formato de bytecode da AURORA.
package code

import (
	"encoding/binary"
	"fmt"
)

type Opcode byte

const (
	OpConstant Opcode = iota
	OpTrue
	OpFalse
	OpNull
	OpPop
	OpDup

	OpAdd
	OpSub
	OpMul
	OpDiv
	OpMod

	OpEqual
	OpNotEqual
	OpGreater
	OpGreaterEqual
	OpLess
	OpLessEqual

	OpMinus
	OpBang

	OpJump
	OpJumpNotTruthy

	OpSetGlobal
	OpGetGlobal

	OpArray
	OpHash
	OpIndex

	OpCall
	OpReturnValue
	OpReturn

	OpGetLocal
	OpSetLocal

	OpGetBuiltin

	OpClosure
	OpGetFree

	OpCurrentClosure
)

type Definition struct {
	Name          string
	OperandWidths []int
}

var definitions = map[Opcode]*Definition{
	OpConstant:       {"OpConstant", []int{2}},
	OpTrue:           {"OpTrue", nil},
	OpFalse:          {"OpFalse", nil},
	OpNull:           {"OpNull", nil},
	OpPop:            {"OpPop", nil},
	OpDup:            {"OpDup", nil},
	OpAdd:            {"OpAdd", nil},
	OpSub:            {"OpSub", nil},
	OpMul:            {"OpMul", nil},
	OpDiv:            {"OpDiv", nil},
	OpMod:            {"OpMod", nil},
	OpEqual:          {"OpEqual", nil},
	OpNotEqual:       {"OpNotEqual", nil},
	OpGreater:        {"OpGreater", nil},
	OpGreaterEqual:   {"OpGreaterEqual", nil},
	OpLess:           {"OpLess", nil},
	OpLessEqual:      {"OpLessEqual", nil},
	OpMinus:          {"OpMinus", nil},
	OpBang:           {"OpBang", nil},
	OpJump:           {"OpJump", []int{2}},
	OpJumpNotTruthy:  {"OpJumpNotTruthy", []int{2}},
	OpSetGlobal:      {"OpSetGlobal", []int{2}},
	OpGetGlobal:      {"OpGetGlobal", []int{2}},
	OpArray:          {"OpArray", []int{2}},
	OpHash:           {"OpHash", []int{2}},
	OpIndex:          {"OpIndex", nil},
	OpCall:           {"OpCall", []int{1}},
	OpReturnValue:    {"OpReturnValue", nil},
	OpReturn:         {"OpReturn", nil},
	OpGetLocal:       {"OpGetLocal", []int{1}},
	OpSetLocal:       {"OpSetLocal", []int{1}},
	OpGetBuiltin:     {"OpGetBuiltin", []int{1}},
	OpClosure:        {"OpClosure", []int{2, 1}},
	OpGetFree:        {"OpGetFree", []int{1}},
	OpCurrentClosure: {"OpCurrentClosure", nil},
}

func Lookup(op Opcode) (*Definition, error) {
	def, ok := definitions[op]
	if !ok {
		return nil, fmt.Errorf("opcode %d undefined", op)
	}
	return def, nil
}

type Instructions []byte

func (ins Instructions) String() string {
	var out string
	i := 0
	for i < len(ins) {
		def, err := Lookup(Opcode(ins[i]))
		if err != nil {
			out += fmt.Sprintf("ERROR: %s\n", err)
			i++
			continue
		}
		operands, read := ReadOperands(def, ins[i+1:])
		out += fmt.Sprintf("%04d %-16s", i, def.Name)
		for _, o := range operands {
			out += fmt.Sprintf(" %d", o)
		}
		out += "\n"
		i += 1 + read
	}
	return out
}

func Make(op Opcode, operands ...int) []byte {
	def, ok := definitions[op]
	if !ok {
		return []byte{}
	}
	length := 1
	for _, w := range def.OperandWidths {
		length += w
	}
	ins := make([]byte, length)
	ins[0] = byte(op)
	offset := 1
	for i, o := range operands {
		width := def.OperandWidths[i]
		switch width {
		case 2:
			binary.BigEndian.PutUint16(ins[offset:], uint16(o))
		case 1:
			ins[offset] = byte(o)
		}
		offset += width
	}
	return ins
}

func ReadOperands(def *Definition, ins Instructions) ([]int, int) {
	operands := make([]int, len(def.OperandWidths))
	offset := 0
	for i, width := range def.OperandWidths {
		switch width {
		case 2:
			operands[i] = int(binary.BigEndian.Uint16(ins[offset:]))
		case 1:
			operands[i] = int(ins[offset])
		}
		offset += width
	}
	return operands, offset
}

func ReadUint16(ins Instructions) uint16 {
	return binary.BigEndian.Uint16(ins)
}
