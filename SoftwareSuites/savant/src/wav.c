/* SAVANT — leitura/escrita WAV PCM 16-bit mono */
#include "savant.h"
#include <stdlib.h>
#include <string.h>
#include <stdint.h>

typedef struct __attribute__((packed)) {
    char     riff[4];
    uint32_t size;
    char     wave[4];
    char     fmt[4];
    uint32_t fmt_size;
    uint16_t audio_fmt;
    uint16_t channels;
    uint32_t sample_rate;
    uint32_t byte_rate;
    uint16_t block_align;
    uint16_t bits_per_sample;
    char     data[4];
    uint32_t data_size;
} WavHeader;

int wav_write(const char* filename, const double* samples, size_t n, int sample_rate) {
    FILE* f = fopen(filename, "wb");
    if (!f) return -1;

    WavHeader h;
    memset(&h, 0, sizeof(h));
    memcpy(h.riff, "RIFF", 4);
    h.size = (uint32_t)(sizeof(WavHeader) - 8 + n * 2);
    memcpy(h.wave, "WAVE", 4);
    memcpy(h.fmt, "fmt ", 4);
    h.fmt_size = 16;
    h.audio_fmt = 1;
    h.channels = 1;
    h.sample_rate = (uint32_t)sample_rate;
    h.byte_rate = (uint32_t)(sample_rate * 2);
    h.block_align = 2;
    h.bits_per_sample = 16;
    memcpy(h.data, "data", 4);
    h.data_size = (uint32_t)(n * 2);

    fwrite(&h, sizeof(h), 1, f);

    for (size_t i = 0; i < n; i++) {
        double s = samples[i];
        if (s > 1.0) s = 1.0;
        if (s < -1.0) s = -1.0;
        int16_t v = (int16_t)(s * 32767.0);
        fwrite(&v, sizeof(v), 1, f);
    }

    fclose(f);
    return 0;
}

int wav_read(const char* filename, double** samples, size_t* n, int* sample_rate) {
    FILE* f = fopen(filename, "rb");
    if (!f) return -1;

    WavHeader h;
    if (fread(&h, sizeof(h), 1, f) != 1) {
        fclose(f);
        return -2;
    }

    if (memcmp(h.riff, "RIFF", 4) != 0 || memcmp(h.wave, "WAVE", 4) != 0) {
        fclose(f);
        return -3;
    }

    size_t num_samples = h.data_size / 2;
    double* buf = (double*)calloc(num_samples, sizeof(double));
    if (!buf) {
        fclose(f);
        return -4;
    }

    for (size_t i = 0; i < num_samples; i++) {
        int16_t v;
        if (fread(&v, sizeof(v), 1, f) != 1) {
            num_samples = i;
            break;
        }
        buf[i] = (double)v / 32767.0;
    }

    fclose(f);
    *samples = buf;
    *n = num_samples;
    *sample_rate = (int)h.sample_rate;
    return 0;
}

int wav_info(const char* filename) {
    FILE* f = fopen(filename, "rb");
    if (!f) {
        printf("  erro: nao foi possivel abrir %s\n", filename);
        return -1;
    }
    WavHeader h;
    if (fread(&h, sizeof(h), 1, f) != 1) {
        printf("  erro: arquivo muito curto\n");
        fclose(f);
        return -1;
    }
    fclose(f);

    double duration = 0.0;
    if (h.sample_rate > 0 && h.block_align > 0) {
        duration = (double)h.data_size / (double)h.byte_rate;
    }

    printf("  Arquivo    : %s\n", filename);
    printf("  Formato    : %s\n", (h.audio_fmt == 1) ? "PCM" : "?");
    printf("  Canais     : %u\n", (unsigned)h.channels);
    printf("  Taxa       : %u Hz\n", (unsigned)h.sample_rate);
    printf("  Bits/sample: %u\n", (unsigned)h.bits_per_sample);
    printf("  Duracao    : %.3f s\n", duration);
    printf("  Tamanho    : %.2f KB\n", (double)h.data_size / 1024.0);
    return 0;
}
