/* SAVANT — efeitos: delay com feedback, saturacao */
#include "savant.h"
#include <math.h>
#include <stdlib.h>

void delay_init(Delay* d, double time_sec, double feedback, double mix, int sample_rate) {
    d->feedback = feedback;
    d->mix = mix;
    size_t samples = (size_t)(time_sec * (double)sample_rate);
    if (samples < 1) samples = 1;
    d->size = samples + 1;
    d->write_pos = 0;
    d->buffer = (double*)calloc(d->size, sizeof(double));
    if (!d->buffer) d->size = 0;
}

double delay_process(Delay* d, double input) {
    if (!d->buffer || d->size < 2) return input;

    size_t delay_samples = d->size - 1;
    size_t read_pos = (d->write_pos + d->size - delay_samples) % d->size;
    double delayed = d->buffer[read_pos];

    d->buffer[d->write_pos] = input + delayed * d->feedback;
    d->write_pos = (d->write_pos + 1) % d->size;

    return input * (1.0 - d->mix) + delayed * d->mix;
}

void delay_free(Delay* d) {
    if (d->buffer) free(d->buffer);
    d->buffer = NULL;
    d->size = 0;
    d->write_pos = 0;
}

double distortion_soft(double x, double drive) {
    double d = (drive > 0.0) ? drive : 1.0;
    return tanh(x * d);
}
