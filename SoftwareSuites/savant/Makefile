CC      ?= cc
CFLAGS  ?= -O2 -Wall -Wextra -std=c99 -pedantic
LDFLAGS ?= -lm
INCLUDE  = -Iinclude

SRC      = src/utils.c \
           src/oscillator.c \
           src/envelope.c \
           src/filter.c \
           src/effects.c \
           src/fft.c \
           src/wav.c \
           src/synth.c \
           src/main.c

BIN      = bin/savant

.PHONY: all build run test clean examples demo

all: build

build:
	@mkdir -p bin
	$(CC) $(CFLAGS) $(INCLUDE) $(SRC) -o $(BIN) $(LDFLAGS)
	@echo "  built: $(BIN)"

test:
	$(CC) $(CFLAGS) $(INCLUDE) src/utils.c src/oscillator.c \
	    src/envelope.c src/filter.c src/effects.c \
	    src/fft.c src/wav.c src/synth.c tests/test_dsp.c \
	    -o bin/test_dsp $(LDFLAGS)
	@./bin/test_dsp

examples: build
	@mkdir -p out
	@for f in examples/*.synth; do \
	    echo "  compiling $$f"; \
	    ./$(BIN) $$f || true; \
	done

demo: build
	./$(BIN) examples/melody.synth
	./$(BIN) examples/bass.synth
	./$(BIN) examples/pad.synth
	./$(BIN) examples/arp.synth

clean:
	rm -rf bin out *.wav
	@echo "  cleaned"
