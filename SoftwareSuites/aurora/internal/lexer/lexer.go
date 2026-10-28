// Package lexer converte codigo-fonte AURORA em uma sequencia de tokens.
package lexer

import "aurora/internal/token"

type Lexer struct {
	input        string
	position     int
	readPosition int
	ch           byte
	line         int
	column       int
}

func New(input string) *Lexer {
	l := &Lexer{input: input, line: 1, column: 0}
	l.readChar()
	return l
}

func (l *Lexer) NextToken() token.Token {
	var tok token.Token
	l.skipWhitespace()
	line, col := l.line, l.column

	switch l.ch {
	case '=':
		if l.peekChar() == '=' {
			ch := l.ch
			l.readChar()
			tok = token.Token{Type: token.EQ, Literal: string(ch) + string(l.ch), Line: line, Column: col}
		} else if l.peekChar() == '>' {
			ch := l.ch
			l.readChar()
			tok = token.Token{Type: token.ARROW, Literal: string(ch) + string(l.ch), Line: line, Column: col}
		} else {
			tok = newToken(token.ASSIGN, l.ch, line, col)
		}
	case '+':
		tok = newToken(token.PLUS, l.ch, line, col)
	case '-':
		tok = newToken(token.MINUS, l.ch, line, col)
	case '!':
		if l.peekChar() == '=' {
			ch := l.ch
			l.readChar()
			tok = token.Token{Type: token.NOT_EQ, Literal: string(ch) + string(l.ch), Line: line, Column: col}
		} else {
			tok = newToken(token.BANG, l.ch, line, col)
		}
	case '*':
		tok = newToken(token.ASTERISK, l.ch, line, col)
	case '/':
		if l.peekChar() == '/' {
			for l.ch != '\n' && l.ch != 0 {
				l.readChar()
			}
			return l.NextToken()
		}
		if l.peekChar() == '*' {
			l.readChar()
			for {
				l.readChar()
				if l.ch == 0 {
					break
				}
				if l.ch == '*' && l.peekChar() == '/' {
					l.readChar()
					l.readChar()
					break
				}
			}
			return l.NextToken()
		}
		tok = newToken(token.SLASH, l.ch, line, col)
	case '%':
		tok = newToken(token.MODULO, l.ch, line, col)
	case '<':
		if l.peekChar() == '=' {
			ch := l.ch
			l.readChar()
			tok = token.Token{Type: token.LT_EQ, Literal: string(ch) + string(l.ch), Line: line, Column: col}
		} else {
			tok = newToken(token.LT, l.ch, line, col)
		}
	case '>':
		if l.peekChar() == '=' {
			ch := l.ch
			l.readChar()
			tok = token.Token{Type: token.GT_EQ, Literal: string(ch) + string(l.ch), Line: line, Column: col}
		} else {
			tok = newToken(token.GT, l.ch, line, col)
		}
	case '&':
		if l.peekChar() == '&' {
			ch := l.ch
			l.readChar()
			tok = token.Token{Type: token.AND, Literal: string(ch) + string(l.ch), Line: line, Column: col}
		} else {
			tok = newToken(token.ILLEGAL, l.ch, line, col)
		}
	case '|':
		if l.peekChar() == '|' {
			ch := l.ch
			l.readChar()
			tok = token.Token{Type: token.OR, Literal: string(ch) + string(l.ch), Line: line, Column: col}
		} else {
			tok = newToken(token.ILLEGAL, l.ch, line, col)
		}
	case ';':
		tok = newToken(token.SEMICOLON, l.ch, line, col)
	case ':':
		tok = newToken(token.COLON, l.ch, line, col)
	case ',':
		tok = newToken(token.COMMA, l.ch, line, col)
	case '(':
		tok = newToken(token.LPAREN, l.ch, line, col)
	case ')':
		tok = newToken(token.RPAREN, l.ch, line, col)
	case '{':
		tok = newToken(token.LBRACE, l.ch, line, col)
	case '}':
		tok = newToken(token.RBRACE, l.ch, line, col)
	case '[':
		tok = newToken(token.LBRACKET, l.ch, line, col)
	case ']':
		tok = newToken(token.RBRACKET, l.ch, line, col)
	case '"':
		tok.Type = token.STRING
		tok.Literal = l.readString()
		tok.Line = line
		tok.Column = col
	case 0:
		tok.Literal = ""
		tok.Type = token.EOF
		tok.Line = line
		tok.Column = col
	default:
		if isLetter(l.ch) {
			tok.Literal = l.readIdentifier()
			tok.Type = token.LookupIdent(tok.Literal)
			tok.Line = line
			tok.Column = col
			return tok
		} else if isDigit(l.ch) {
			tok.Type = token.INT
			tok.Literal = l.readNumber()
			tok.Line = line
			tok.Column = col
			return tok
		}
		tok = newToken(token.ILLEGAL, l.ch, line, col)
	}

	l.readChar()
	return tok
}

func newToken(tokenType token.Type, ch byte, line, col int) token.Token {
	return token.Token{Type: tokenType, Literal: string(ch), Line: line, Column: col}
}

func (l *Lexer) readChar() {
	if l.ch == '\n' {
		l.line++
		l.column = 0
	}
	if l.readPosition >= len(l.input) {
		l.ch = 0
	} else {
		l.ch = l.input[l.readPosition]
	}
	l.position = l.readPosition
	l.readPosition++
	l.column++
}

func (l *Lexer) peekChar() byte {
	if l.readPosition >= len(l.input) {
		return 0
	}
	return l.input[l.readPosition]
}

func (l *Lexer) readIdentifier() string {
	position := l.position
	for isLetter(l.ch) || isDigit(l.ch) {
		l.readChar()
	}
	return l.input[position:l.position]
}

func (l *Lexer) readNumber() string {
	position := l.position
	for isDigit(l.ch) {
		l.readChar()
	}
	return l.input[position:l.position]
}

func (l *Lexer) readString() string {
	position := l.position + 1
	for {
		l.readChar()
		if l.ch == '"' || l.ch == 0 {
			break
		}
	}
	return l.input[position:l.position]
}

func (l *Lexer) skipWhitespace() {
	for l.ch == ' ' || l.ch == '\t' || l.ch == '\n' || l.ch == '\r' {
		l.readChar()
	}
}

func isLetter(ch byte) bool {
	return 'a' <= ch && ch <= 'z' || 'A' <= ch && ch <= 'Z' || ch == '_'
}

func isDigit(ch byte) bool {
	return '0' <= ch && ch <= '9'
}
