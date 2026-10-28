# SAVANT — Notas de DSP

## Osciladores

### Sine
    y(t) = sin(2π f t)
Implementado como acumulador de fase para evitar drift numerico:

    phase += freq / sample_rate
    y = sin(2π · phase)

### Sawtooth
    y = 2 · phase - 1
Saw ingenua (sem antialiasing). Para audio real, aplicar oversampling
+ filtro lowpass, ou usar BLIT/BLEP.

### Square
    y = (phase < 0.5) ? 1 : -1

### Triangle
Forma triangular perfeita por partes.

### Noise
Gerador xorshift64. Periodo 2^64-1, passa testes estatisticos basicos.

### FM
Modulacao em frequencia simplificada. Sintese FM real usa operadores
encadeados (John Chowning, 1973).

## Envelopes

### ADSR
Quatro fases: ataque linear, decay exponencial (aqui linear), sustain,
release. O release e aplicado quando `remaining < release`, ou seja,
proximo do fim da nota.

### AR
Ataque + sustain + release instantaneo na ultima fracao.

## Filtros

Filtros biquad seguem o **RBJ Audio EQ Cookbook** (Robert Bristow-Johnson).

    H(z) = (b0 + b1 z⁻¹ + b2 z⁻²) / (1 + a1 z⁻¹ + a2 z⁻²)

Coeficientes calculados com:

    w0 = 2π f_c / f_s
    alpha = sin(w0) / (2 Q)

Cada tipo (LP/HP/BP/Notch/Peak) tem uma formula especifica.

## Delay

Buffer circular de tamanho fixo. Cada amostra:

    delayed = buffer[read_pos]
    buffer[write_pos] = input + delayed · feedback
    output = input · (1-mix) + delayed · mix

Cuidado com realimentacao > 0.95 (pode explodir).

## FFT

Implementacao **Cooley-Tukey radix-2 iterativa** com reordenamento
bit-reversal (Gold-Rader).

Complexidade: O(N log N).

Aplicacao em SAVANT: analise espectral de WAVs via `--spectrum`.

Janela Hann aplicada para reduzir leakage:

    w[n] = 0.5 · (1 - cos(2πn / (N-1)))

## WAV

Formato RIFF:
- Header 44 bytes
- Dados PCM signed 16-bit little-endian

## Referencias

- Roads, C. — *The Computer Music Tutorial* (MIT Press, 1996)
- Smith, J.O. — *Physical Audio Signal Processing* (CCRMA)
- Bristow-Johnson, R. — *Cookbook formulae for audio EQ biquad filter*
- Cooley & Tukey — *An algorithm for the machine calculation of complex
  Fourier series*, Math. Comp. 19 (1965)
