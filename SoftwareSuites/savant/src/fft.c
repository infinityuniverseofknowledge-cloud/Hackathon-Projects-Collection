/* SAVANT — FFT radix-2 Cooley-Tukey + analise espectral */
#include "savant.h"
#include <math.h>
#include <stdlib.h>

void fft(double* real, double* imag, size_t n) {
    if (n == 0 || (n & (n - 1)) != 0) return;

    size_t j = 0;
    for (size_t i = 0; i < n - 1; i++) {
        if (i < j) {
            double tr = real[i]; real[i] = real[j]; real[j] = tr;
            double ti = imag[i]; imag[i] = imag[j]; imag[j] = ti;
        }
        size_t m = n >> 1;
        while (m >= 1 && j >= m) {
            j -= m;
            m >>= 1;
        }
        j += m;
    }

    for (size_t len = 2; len <= n; len <<= 1) {
        double ang = -2.0 * M_PI / (double)len;
        double wr_len = cos(ang);
        double wi_len = sin(ang);
        for (size_t i = 0; i < n; i += len) {
            double wr = 1.0, wi = 0.0;
            for (size_t k = 0; k < len / 2; k++) {
                size_t u = i + k;
                size_t v = i + k + len / 2;
                double tr = wr * real[v] - wi * imag[v];
                double ti = wr * imag[v] + wi * real[v];
                real[v] = real[u] - tr;
                imag[v] = imag[u] - ti;
                real[u] += tr;
                imag[u] += ti;
                double nwr = wr * wr_len - wi * wi_len;
                wi = wr * wi_len + wi * wr_len;
                wr = nwr;
            }
        }
    }
}

void hann_window(double* data, size_t n) {
    if (n < 2) return;
    for (size_t i = 0; i < n; i++) {
        data[i] *= 0.5 * (1.0 - cos(2.0 * M_PI * (double)i / (double)(n - 1)));
    }
}

void spectrum_analyze(const double* samples, size_t n, int sample_rate) {
    if (n < 16) {
        printf("  (buffer muito curto para analise)\n");
        return;
    }

    size_t fft_n = 8192;
    while (fft_n > n) fft_n >>= 1;
    if (fft_n < 64) {
        printf("  (buffer muito curto para FFT)\n");
        return;
    }

    double* re = (double*)calloc(fft_n, sizeof(double));
    double* im = (double*)calloc(fft_n, sizeof(double));
    double* mag = (double*)calloc(fft_n / 2, sizeof(double));
    if (!re || !im || !mag) {
        free(re); free(im); free(mag);
        return;
    }

    size_t num_windows = n / fft_n;
    if (num_windows < 1) num_windows = 1;
    if (num_windows > 32) num_windows = 32;

    for (size_t w = 0; w < num_windows; w++) {
        size_t offset = w * fft_n;
        for (size_t i = 0; i < fft_n; i++) {
            re[i] = (offset + i < n) ? samples[offset + i] : 0.0;
            im[i] = 0.0;
        }
        hann_window(re, fft_n);
        fft(re, im, fft_n);
        for (size_t i = 0; i < fft_n / 2; i++) {
            mag[i] += sqrt(re[i] * re[i] + im[i] * im[i]);
        }
    }

    double max_mag = 0.0;
    for (size_t i = 1; i < fft_n / 2; i++) {
        mag[i] /= (double)num_windows;
        if (mag[i] > max_mag) max_mag = mag[i];
    }

    printf("  Analise espectral (picos acima de 20%% do max):\n");
    int printed = 0;
    for (size_t i = 2; i + 1 < fft_n / 2; i++) {
        if (mag[i] > mag[i - 1] && mag[i] > mag[i + 1] && mag[i] > 0.2 * max_mag) {
            double freq = (double)i * (double)sample_rate / (double)fft_n;
            double level_db = 20.0 * log10(mag[i] / (max_mag > 0 ? max_mag : 1.0));
            printf("    %7.1f Hz   %6.1f dB\n", freq, level_db);
            printed++;
            if (printed >= 12) break;
        }
    }
    if (printed == 0) printf("    (nenhum pico significativo)\n");

    free(re);
    free(im);
    free(mag);
}
