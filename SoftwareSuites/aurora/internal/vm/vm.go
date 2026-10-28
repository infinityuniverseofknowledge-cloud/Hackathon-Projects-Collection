// Package vm implementa a maquina virtual de pilha da AURORA.
package vm

import (
	"fmt"

	"aurora/internal/code"
	"aurora/internal/compiler"
	"aurora/internal/object"
)

const (
	StackSize   = 2048
	GlobalsSize = 65536
	MaxFrames   = 1024
)

type Frame struct {
	cl          *object.Closure
	ip          int
	basePointer int
}

func NewFrame(cl *object.Closure, basePointer int) *Frame {
	return &Frame{cl: cl, ip: -1, basePointer: basePointer}
}

func (f *Frame) Instructions() code.Instructions {
	return f.cl.Fn.Instructions
}

type VM struct {
	constants   []object.Object
	stack       []object.Object
	sp          int
	globals     []object.Object
	frames      []*Frame
	framesIndex int
}

func New(bc *compiler.Bytecode) *VM {
	mainFn := &object.CompiledFunction{Instructions: bc.Instructions}
	mainClosure := &object.Closure{Fn: mainFn}
	mainFrame := NewFrame(mainClosure, 0)

	frames := make([]*Frame, MaxFrames)
	frames[0] = mainFrame

	return &VM{
		constants:   bc.Constants,
		stack:       make([]object.Object, StackSize),
		sp:          0,
		globals:     make([]object.Object, GlobalsSize),
		frames:      frames,
		framesIndex: 1,
	}
}

func NewWithGlobals(bc *compiler.Bytecode, globals []object.Object) *VM {
	mainFn := &object.CompiledFunction{Instructions: bc.Instructions}
	mainClosure := &object.Closure{Fn: mainFn}
	mainFrame := NewFrame(mainClosure, 0)

	frames := make([]*Frame, MaxFrames)
	frames[0] = mainFrame

	return &VM{
		constants:   bc.Constants,
		stack:       make([]object.Object, StackSize),
		sp:          0,
		globals:     globals,
		frames:      frames,
		framesIndex: 1,
	}
}

func (vm *VM) Globals() []object.Object { return vm.globals }

func (vm *VM) currentFrame() *Frame {
	return vm.frames[vm.framesIndex-1]
}

func (vm *VM) pushFrame(f *Frame) {
	vm.frames[vm.framesIndex] = f
	vm.framesIndex++
}

func (vm *VM) popFrame() *Frame {
	vm.framesIndex--
	return vm.frames[vm.framesIndex]
}

func (vm *VM) push(o object.Object) error {
	if vm.sp >= StackSize {
		return fmt.Errorf("stack overflow")
	}
	vm.stack[vm.sp] = o
	vm.sp++
	return nil
}

func (vm *VM) pop() object.Object {
	o := vm.stack[vm.sp-1]
	vm.sp--
	return o
}

func (vm *VM) LastPopped() object.Object {
	return vm.stack[vm.sp]
}

func (vm *VM) Run() error {
	for vm.currentFrame().ip < len(vm.currentFrame().Instructions())-1 {
		vm.currentFrame().ip++
		ip := vm.currentFrame().ip
		ins := vm.currentFrame().Instructions()
		op := code.Opcode(ins[ip])

		switch op {
		case code.OpConstant:
			constIndex := code.ReadUint16(ins[ip+1:])
			vm.currentFrame().ip += 2
			if err := vm.push(vm.constants[constIndex]); err != nil {
				return err
			}

		case code.OpAdd, code.OpSub, code.OpMul, code.OpDiv, code.OpMod,
			code.OpEqual, code.OpNotEqual, code.OpGreater, code.OpGreaterEqual,
			code.OpLess, code.OpLessEqual:
			if err := vm.executeBinaryOperation(op); err != nil {
				return err
			}

		case code.OpPop:
			vm.pop()

		case code.OpDup:
			if err := vm.push(vm.stack[vm.sp-1]); err != nil {
				return err
			}

		case code.OpTrue:
			vm.push(object.TRUE)
		case code.OpFalse:
			vm.push(object.FALSE)
		case code.OpNull:
			vm.push(object.NULL)

		case code.OpBang:
			if err := vm.executeBangOperator(); err != nil {
				return err
			}
		case code.OpMinus:
			if err := vm.executeMinusOperator(); err != nil {
				return err
			}

		case code.OpJump:
			pos := int(code.ReadUint16(ins[ip+1:]))
			vm.currentFrame().ip = pos - 1

		case code.OpJumpNotTruthy:
			pos := int(code.ReadUint16(ins[ip+1:]))
			vm.currentFrame().ip += 2
			condition := vm.pop()
			if !isTruthy(condition) {
				vm.currentFrame().ip = pos - 1
			}

		case code.OpSetGlobal:
			globalIndex := code.ReadUint16(ins[ip+1:])
			vm.currentFrame().ip += 2
			vm.globals[globalIndex] = vm.pop()

		case code.OpGetGlobal:
			globalIndex := code.ReadUint16(ins[ip+1:])
			vm.currentFrame().ip += 2
			if err := vm.push(vm.globals[globalIndex]); err != nil {
				return err
			}

		case code.OpSetLocal:
			localIndex := int(ins[ip+1])
			vm.currentFrame().ip++
			frame := vm.currentFrame()
			vm.stack[frame.basePointer+localIndex] = vm.pop()

		case code.OpGetLocal:
			localIndex := int(ins[ip+1])
			vm.currentFrame().ip++
			frame := vm.currentFrame()
			if err := vm.push(vm.stack[frame.basePointer+localIndex]); err != nil {
				return err
			}

		case code.OpGetBuiltin:
			builtinIndex := int(ins[ip+1])
			vm.currentFrame().ip++
			def := object.Builtins[builtinIndex]
			if err := vm.push(def.Builtin); err != nil {
				return err
			}

		case code.OpArray:
			numElements := int(code.ReadUint16(ins[ip+1:]))
			vm.currentFrame().ip += 2
			array := vm.buildArray(vm.sp-numElements, vm.sp)
			vm.sp -= numElements
			vm.push(array)

		case code.OpHash:
			numElements := int(code.ReadUint16(ins[ip+1:]))
			vm.currentFrame().ip += 2
			hash, err := vm.buildHash(vm.sp-numElements, vm.sp)
			if err != nil {
				return err
			}
			vm.sp -= numElements
			vm.push(hash)

		case code.OpIndex:
			index := vm.pop()
			left := vm.pop()
			if err := vm.executeIndexExpression(left, index); err != nil {
				return err
			}

		case code.OpCall:
			numArgs := int(ins[ip+1])
			vm.currentFrame().ip++
			if err := vm.callClosure(numArgs); err != nil {
				return err
			}

		case code.OpReturnValue:
			returnValue := vm.pop()
			frame := vm.popFrame()
			vm.sp = frame.basePointer - 1
			if err := vm.push(returnValue); err != nil {
				return err
			}

		case code.OpReturn:
			frame := vm.popFrame()
			vm.sp = frame.basePointer - 1
			vm.push(object.NULL)

		case code.OpClosure:
			constIndex := code.ReadUint16(ins[ip+1:])
			numFree := int(ins[ip+3])
			vm.currentFrame().ip += 3
			if err := vm.pushClosure(int(constIndex), numFree); err != nil {
				return err
			}

		case code.OpGetFree:
			freeIndex := int(ins[ip+1])
			vm.currentFrame().ip++
			currentClosure := vm.currentFrame().cl
			if err := vm.push(currentClosure.Free[freeIndex]); err != nil {
				return err
			}

		case code.OpCurrentClosure:
			currentClosure := vm.currentFrame().cl
			if err := vm.push(currentClosure); err != nil {
				return err
			}
		}
	}
	return nil
}

func (vm *VM) executeBinaryOperation(op code.Opcode) error {
	right := vm.pop()
	left := vm.pop()

	if left.Type() == object.INTEGER_OBJ && right.Type() == object.INTEGER_OBJ {
		return vm.executeBinaryIntegerOperation(op, left, right)
	}
	if left.Type() == object.STRING_OBJ && right.Type() == object.STRING_OBJ {
		return vm.executeBinaryStringOperation(op, left, right)
	}

	switch op {
	case code.OpEqual:
		return vm.push(object.BoolToObj(right == left))
	case code.OpNotEqual:
		return vm.push(object.BoolToObj(right != left))
	}

	return fmt.Errorf("unsupported types for binary operation: %s %s",
		left.Type(), right.Type())
}

func (vm *VM) executeBinaryIntegerOperation(op code.Opcode, left, right object.Object) error {
	l := left.(*object.Integer).Value
	r := right.(*object.Integer).Value

	var result int64
	switch op {
	case code.OpAdd:
		result = l + r
	case code.OpSub:
		result = l - r
	case code.OpMul:
		result = l * r
	case code.OpDiv:
		if r == 0 {
			return fmt.Errorf("division by zero")
		}
		result = l / r
	case code.OpMod:
		result = l % r
	case code.OpEqual:
		return vm.push(object.BoolToObj(l == r))
	case code.OpNotEqual:
		return vm.push(object.BoolToObj(l != r))
	case code.OpGreater:
		return vm.push(object.BoolToObj(l > r))
	case code.OpGreaterEqual:
		return vm.push(object.BoolToObj(l >= r))
	case code.OpLess:
		return vm.push(object.BoolToObj(l < r))
	case code.OpLessEqual:
		return vm.push(object.BoolToObj(l <= r))
	default:
		return fmt.Errorf("unknown integer operator")
	}
	return vm.push(&object.Integer{Value: result})
}

func (vm *VM) executeBinaryStringOperation(op code.Opcode, left, right object.Object) error {
	l := left.(*object.String).Value
	r := right.(*object.String).Value
	switch op {
	case code.OpAdd:
		return vm.push(&object.String{Value: l + r})
	case code.OpEqual:
		return vm.push(object.BoolToObj(l == r))
	case code.OpNotEqual:
		return vm.push(object.BoolToObj(l != r))
	}
	return fmt.Errorf("unknown string operator")
}

func (vm *VM) executeBangOperator() error {
	operand := vm.pop()
	switch operand {
	case object.TRUE:
		return vm.push(object.FALSE)
	case object.FALSE:
		return vm.push(object.TRUE)
	case object.NULL:
		return vm.push(object.TRUE)
	default:
		return vm.push(object.FALSE)
	}
}

func (vm *VM) executeMinusOperator() error {
	operand := vm.pop()
	if operand.Type() != object.INTEGER_OBJ {
		return fmt.Errorf("unsupported type for negation: %s", operand.Type())
	}
	value := operand.(*object.Integer).Value
	return vm.push(&object.Integer{Value: -value})
}

func (vm *VM) buildArray(startIndex, endIndex int) object.Object {
	elements := make([]object.Object, endIndex-startIndex)
	for i := startIndex; i < endIndex; i++ {
		elements[i-startIndex] = vm.stack[i]
	}
	return &object.Array{Elements: elements}
}

func (vm *VM) buildHash(startIndex, endIndex int) (object.Object, error) {
	pairs := make(map[object.HashKey]object.HashPair)
	for i := startIndex; i < endIndex; i += 2 {
		key := vm.stack[i]
		value := vm.stack[i+1]
		pair := object.HashPair{Key: key, Value: value}
		hashKey, ok := key.(object.Hashable)
		if !ok {
			return nil, fmt.Errorf("unusable as hash key: %s", key.Type())
		}
		pairs[hashKey.HashKey()] = pair
	}
	return &object.Hash{Pairs: pairs}, nil
}

func (vm *VM) executeIndexExpression(left, index object.Object) error {
	switch {
	case left.Type() == object.ARRAY_OBJ && index.Type() == object.INTEGER_OBJ:
		return vm.executeArrayIndex(left, index)
	case left.Type() == object.HASH_OBJ:
		return vm.executeHashIndex(left, index)
	case left.Type() == object.STRING_OBJ && index.Type() == object.INTEGER_OBJ:
		return vm.executeStringIndex(left, index)
	}
	return fmt.Errorf("index operator not supported: %s", left.Type())
}

func (vm *VM) executeArrayIndex(array, index object.Object) error {
	arrayObject := array.(*object.Array)
	i := index.(*object.Integer).Value
	max := int64(len(arrayObject.Elements) - 1)
	if i < 0 || i > max {
		return vm.push(object.NULL)
	}
	return vm.push(arrayObject.Elements[i])
}

func (vm *VM) executeStringIndex(str, index object.Object) error {
	strObject := str.(*object.String)
	i := index.(*object.Integer).Value
	runes := []rune(strObject.Value)
	max := int64(len(runes) - 1)
	if i < 0 || i > max {
		return vm.push(object.NULL)
	}
	return vm.push(&object.String{Value: string(runes[i])})
}

func (vm *VM) executeHashIndex(hash, index object.Object) error {
	hashObject := hash.(*object.Hash)
	key, ok := index.(object.Hashable)
	if !ok {
		return fmt.Errorf("unusable as hash key: %s", index.Type())
	}
	pair, ok := hashObject.Pairs[key.HashKey()]
	if !ok {
		return vm.push(object.NULL)
	}
	return vm.push(pair.Value)
}

func (vm *VM) callClosure(numArgs int) error {
	callee := vm.stack[vm.sp-1-numArgs]
	if _, ok := callee.(*object.Builtin); ok {
		return vm.callBuiltin(numArgs)
	}

	cl, ok := callee.(*object.Closure)
	if !ok {
		return fmt.Errorf("calling non-function")
	}
	if numArgs != cl.Fn.NumParameters {
		return fmt.Errorf("wrong number of arguments: want=%d, got=%d",
			cl.Fn.NumParameters, numArgs)
	}
	frame := NewFrame(cl, vm.sp-numArgs)
	vm.pushFrame(frame)
	vm.sp = frame.basePointer + cl.Fn.NumLocals
	return nil
}

func (vm *VM) callBuiltin(numArgs int) error {
	builtin := vm.stack[vm.sp-1-numArgs].(*object.Builtin)
	args := make([]object.Object, numArgs)
	for i := 0; i < numArgs; i++ {
		args[i] = vm.stack[vm.sp-numArgs+i]
	}
	result := builtin.Fn(args...)
	vm.sp = vm.sp - numArgs - 1
	if result != nil {
		return vm.push(result)
	}
	return vm.push(object.NULL)
}

func (vm *VM) pushClosure(constIndex, numFree int) error {
	constant := vm.constants[constIndex]
	fn, ok := constant.(*object.CompiledFunction)
	if !ok {
		return fmt.Errorf("not a function")
	}
	free := make([]object.Object, numFree)
	for i := 0; i < numFree; i++ {
		free[i] = vm.stack[vm.sp-numFree+i]
	}
	vm.sp = vm.sp - numFree
	closure := &object.Closure{Fn: fn, Free: free}
	return vm.push(closure)
}

func isTruthy(obj object.Object) bool {
	switch obj {
	case object.NULL:
		return false
	case object.TRUE:
		return true
	case object.FALSE:
		return false
	default:
		return true
	}
}
