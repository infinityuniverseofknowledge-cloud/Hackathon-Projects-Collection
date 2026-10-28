# SAVANT

> Motor de sintese sonora + DSP escrito em C puro.
> Osciladores, filtros biquad, envelopes, FFT, efeitos.
> Linguagem de patch `.synth` com sintaxe declarativa.

## O que e

SAVANT e um **sintetizador de software** + **motor de DSP** em C99.
Gera arquivos WAV a partir de patches declarativos.

    patch.synth -> [parser] -> [synth engine] -> out.wav

Tudo implementado do zero, sem bibliotecas externas alem da libm.

## Compilar

    make build

Ou manualmente:

    cc -O2 -Wall -Iinclude src/*.c -o bin/savant -lm

## Uso

Gerar WAV de um patch:

    ./bin/savant examples/melody.synth

Analisar espectro de um WAV:

    ./bin/savant --spectrum out.wav

Info de um WAV:

    ./bin/savant --info out.wav

## Linguagem .synth

Formato linha-a-linha, comentarios com `#`:

    # Melody example
    sample_rate 44100
    duration 4.0

    osc sine freq=440 amp=0.4
    env adsr 0.01 0.2 0.6 0.3
    filter lowpass 1500 0.8
    delay 0.25 0.4 0.3
    distortion 2.0

    note C4 0.5
    note E4 0.5
    note G4 0.5
    note C5 0.5

    output melody.wav

### Comandos

| Comando | Argumentos | Efeito |
|---------|-----------|--------|
| `sample_rate` | Hz | Taxa de amostragem (default 44100) |
| `duration` | segundos | Duracao total |
| `osc` | tipo [freq=] [amp=] | Oscilador principal |
| `env` | adsr a d s r | Envelope ADSR |
| `env` | ar a r | Envelope attack-release |
| `filter` | tipo cutoff Q | Filtro biquad |
| `delay` | time feedback mix | Delay com feedback |
| `distortion` | drive | Saturacao tanh |
| `note` | freq/NOTA dur | Adiciona nota |
| `output` | arquivo.wav | Arquivo de saida |

### Tipos de oscilador

- `sine` — senoidal pura
- `saw` — dente de serra
- `square` — quadrada
- `triangle` — triangular
- `noise` — ruido branco (xorshift64)
- `fm` — modulacao de frequencia

### Tipos de filtro

- `lowpass`, `highpass`, `bandpass`, `notch`, `peak`

### Notas musicais

Aceita tanto `440` (Hz) quanto `A4`, `C#5`, `Eb3` (notacao anglo-saxonica).

## Algoritmos implementados

| Modulo | Algoritmo |
|--------|-----------|
| `oscillator.c` | seno/serra/quadrada/triangular/ruido/FM |
| `envelope.c` | ADSR linear com release por tempo restante |
| `filter.c` | Biquad RBJ (cookbook) — 5 tipos |
| `effects.c` | Delay circular com feedback |
| `fft.c` | Cooley-Tukey radix-2 iterativo |
| `fft.c` | Window Hann para analise |
| `wav.c` | RIFF/WAV PCM 16-bit mono |
| `synth.c` | Parser + mixagem + render |

## Testes

    make test

## Estrutura

    include/savant.h    -- API publica
    src/utils.c         -- helpers (dB, MIDI, notacao)
    src/oscillator.c    -- osciladores
    src/envelope.c      -- envelopes
    src/filter.c        -- filtros biquad
    src/effects.c       -- delay, saturacao
    src/fft.c           -- FFT + analise espectral
    src/wav.c           -- leitura/escrita WAV
    src/synth.c         -- parser + render
    src/main.c          -- CLI
    examples/*.synth    -- patches de exemplo
    tests/test_dsp.c    -- testes unitarios

## Licenca

MIT.
