/* SAVANT — testes unitarios */
#include "savant.h"
#include <stdio.h>
#include <stdlib.h>
#include <math.h>

static int tests_run = 0;
static int tests_pass = 0;

#define ASSERT(cond, msg) do { \
    tests_run++; \
    if (cond) { tests_pass++; } \
    else { printf("  FAIL: %s (%s:%d)\n", msg, __FILE__, __LINE__); } \
} while(0)

#define ASSERT_NEAR(a, b, tol, msg) do { \
    tests_run++; \
    if (fabs((a) - (b)) <= (tol)) { tests_pass++; } \
    else { printf("  FAIL: %s — expected %.6f, got %.6f (%s:%d)\n", \
           msg, (double)(b), (double)(a), __FILE__, __LINE__); } \
} while(0)

static void test_oscillator(void) {
    printf("[oscilador]\n");
    Oscillator o;
    osc_init(&o, OSC_SINE, 440.0, 1.0);
    double v0 = osc_next(&o, 44100);
    ASSERT_NEAR(v0, 0.0, 0.01, "sine at phase 0 = 0");
    /* advance a quarter period */
    for (int i = 0; i < 44100 / (4 * 440); i++) osc_next(&o, 44100);
    /* after enough samples phase ~ 0.25 */
    /* Just check amplitude stays bounded */
    for (int i = 0; i < 1000; i++) {
        double v = osc_next(&o, 44100);
        ASSERT(fabs(v) <= 1.01, "sine amplitude bounded");
    }
}

static void test_envelope(void) {
    printf("[envelope]\n");
    Envelope e;
    env_init_adsr(&e, 0.1, 0.1, 0.5, 0.2);
    ASSERT_NEAR(env_next(&e, 0.0, 1.0), 0.0, 0.01, "attack start = 0");
    ASSERT_NEAR(env_next(&e, 0.05, 1.0), 0.5, 0.01, "attack mid = 0.5");
    ASSERT_NEAR(env_next(&e, 0.1, 1.0), 1.0, 0.01, "attack end = 1");
    ASSERT_NEAR(env_next(&e, 0.15, 1.0), 0.75, 0.01, "decay mid");
    ASSERT_NEAR(env_next(&e, 0.3, 1.0), 0.5, 0.01, "sustain");
}

static void test_filter(void) {
    printf("[filtro]\n");
    Filter f;
    filter_init(&f, FILTER_LOWPASS, 1000.0, 0.707, 44100);
    /* Feed DC and check steady state approaches DC */
    double y = 0;
    for (int i = 0; i < 10000; i++) y = filter_process(&f, 1.0);
    ASSERT_NEAR(y, 1.0, 0.05, "lowpass passes DC");

    filter_init(&f, FILTER_HIGHPASS, 1000.0, 0.707, 44100);
    y = 0;
    for (int i = 0; i < 10000; i++) y = filter_process(&f, 1.0);
    ASSERT_NEAR(y, 0.0, 0.05, "highpass blocks DC");
}

static void test_delay(void) {
    printf("[delay]\n");
    Delay d;
    delay_init(&d, 0.001, 0.5, 1.0, 44100);  /* 1 ms delay */
    /* impulse at time 0 */
    double out0 = delay_process(&d, 1.0);
    /* Wait for delay to fill */
    double sum = 0;
    for (int i = 0; i < 100; i++) {
        double v = delay_process(&d, 0.0);
        if (i == 43) sum = v;  /* ~1 ms = 44.1 samples */
    }
    ASSERT(fabs(out0) < 1.0, "delay output bounded at t=0");
    ASSERT(fabs(sum) > 0.1, "delayed impulse emerges");
    delay_free(&d);
}

static void test_fft(void) {
    printf("[fft]\n");
    size_t n = 64;
    double* re = calloc(n, sizeof(double));
    double* im = calloc(n, sizeof(double));
    /* Pure sine at bin 8 */
    for (size_t i = 0; i < n; i++) {
        re[i] = sin(2.0 * M_PI * 8.0 * i / n);
        im[i] = 0.0;
    }
    fft(re, im, n);
    double mag8 = sqrt(re[8] * re[8] + im[8] * im[8]);
    double mag20 = sqrt(re[20] * re[20] + im[20] * im[20]);
    ASSERT(mag8 > mag20 * 10.0, "fft concentrates energy at bin 8");
    free(re);
    free(im);
}

static void test_notes(void) {
    printf("[notas]\n");
    ASSERT_NEAR(note_name_to_freq("A4"), 440.0, 0.1, "A4 = 440 Hz");
    ASSERT_NEAR(note_name_to_freq("A5"), 880.0, 0.1, "A5 = 880 Hz");
    ASSERT_NEAR(note_name_to_freq("A3"), 220.0, 0.1, "A3 = 220 Hz");
    ASSERT_NEAR(note_name_to_freq("440"), 440.0, 0.1, "numeric pass-through");
}

static void test_wav_roundtrip(void) {
    printf("[wav roundtrip]\n");
    const char* tmp = "/tmp/savant_test.wav";
    size_t n = 1000;
    double* data = calloc(n, sizeof(double));
    for (size_t i = 0; i < n; i++) {
        data[i] = sin(2.0 * M_PI * 440.0 * i / 44100.0);
    }
    ASSERT(wav_write(tmp, data, n, 44100) == 0, "wav_write");

    double* readback = NULL;
    size_t nn = 0;
    int sr = 0;
    ASSERT(wav_read(tmp, &readback, &nn, &sr) == 0, "wav_read");
    ASSERT(nn == n, "wav sample count preserved");
    ASSERT(sr == 44100, "wav sample rate preserved");
    if (readback) {
        double err = fabs(readback[100] - data[100]);
        ASSERT(err < 0.001, "wav sample values approximate");
        free(readback);
    }
    free(data);
}

int main(void) {
    print_banner();
    printf("Rodando testes...\n\n");

    test_oscillator();
    test_envelope();
    test_filter();
    test_delay();
    test_fft();
    test_notes();
    test_wav_roundtrip();

    printf("\n%d/%d testes passaram.\n", tests_pass, tests_run);
    return (tests_pass == tests_run) ? 0 : 1;
}
