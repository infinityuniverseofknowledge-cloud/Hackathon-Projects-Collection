.RECIPEPREFIX = >
CC      ?= cc
CFLAGS  ?= -std=c11 -O3 -march=native -pthread -Wall -Wextra -Wno-unused-parameter
LDFLAGS ?= -pthread -lm
PREFIX  ?= /usr/local

SRC     := $(wildcard src/*.c)
OBJ     := $(SRC:.c=.o)
TEST_SRC := $(wildcard tests/*.c)

BIN     := lumen
TEST_BIN := test_lumen

.PHONY: all build test clean install format valgrind demo

all: build

build: $(BIN)

$(BIN): $(OBJ)
> $(CC) $(OBJ) -o $@ $(LDFLAGS)
> @echo "built: $@"

%.o: %.c
> $(CC) $(CFLAGS) -c $< -o $@

# Test binary: link all src objects except main.o, plus test runner
$(TEST_BIN): $(filter-out src/main.o,$(OBJ)) $(TEST_SRC)
> $(CC) $(CFLAGS) $(filter-out src/main.o,$(OBJ)) $(TEST_SRC) -o $@ $(LDFLAGS)
> @echo "built: $@"

test: $(TEST_BIN)
> ./$(TEST_BIN)

clean:
> rm -f $(OBJ) $(BIN) $(TEST_BIN)
> rm -f out/*.ppm
> @echo "cleaned"

install: build
> install -m 755 $(BIN) $(PREFIX)/bin/$(BIN)

format:
> clang-format -i src/*.c src/*.h tests/*.c 2>/dev/null || true

valgrind: build
> valgrind --leak-check=full ./$(BIN) --width 100 --height 100 --samples 5 -o /tmp/vg.ppm

demo: build
> bash scripts/demo.sh

.DEFAULT_GOAL := build
