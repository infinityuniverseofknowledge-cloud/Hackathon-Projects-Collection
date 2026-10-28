/* SAVANT — filtros biquad (RBJ cookbook) */
#include "savant.h"
#include <math.h>

void filter_init(Filter* f, FilterType type, double cutoff, double resonance, int sample_rate) {
    f->type = type;
    f->cutoff = cutoff;
    f->resonance = resonance;
    f->b0 = f->b1 = f->b2 = 0.0;
    f->a1 = f->a2 = 0.0;
    f->x1 = f->x2 = f->y1 = f->y2 = 0.0;

    if (type == FILTER_NONE || sample_rate <= 0) return;

    /* Nyquist clamp */
    if (cutoff > sample_rate * 0.49) cutoff = sample_rate * 0.49;
    if (cutoff < 10.0) cutoff = 10.0;

    double w0 = 2.0 * M_PI * cutoff / (double)sample_rate;
    double cw = cos(w0);
    double sw = sin(w0);

    double Q = (resonance > 0.01) ? resonance : 0.707;
    double alpha = sw / (2.0 * Q);

    double b0, b1, b2, a0, a1, a2;

    switch (type) {
        case FILTER_LOWPASS:
            b0 = (1.0 - cw) / 2.0;
            b1 = 1.0 - cw;
            b2 = (1.0 - cw) / 2.0;
            a0 = 1.0 + alpha;
            a1 = -2.0 * cw;
            a2 = 1.0 - alpha;
            break;
        case FILTER_HIGHPASS:
            b0 = (1.0 + cw) / 2.0;
            b1 = -(1.0 + cw);
            b2 = (1.0 + cw) / 2.0;
            a0 = 1.0 + alpha;
            a1 = -2.0 * cw;
            a2 = 1.0 - alpha;
            break;
        case FILTER_BANDPASS:
            b0 = alpha;
            b1 = 0.0;
            b2 = -alpha;
            a0 = 1.0 + alpha;
            a1 = -2.0 * cw;
            a2 = 1.0 - alpha;
            break;
        case FILTER_NOTCH:
            b0 = 1.0;
            b1 = -2.0 * cw;
            b2 = 1.0;
            a0 = 1.0 + alpha;
            a1 = -2.0 * cw;
            a2 = 1.0 - alpha;
            break;
        case FILTER_PEAK:
            b0 = 1.0 + alpha * Q;
            b1 = -2.0 * cw;
            b2 = 1.0 - alpha * Q;
            a0 = 1.0 + alpha / Q;
            a1 = -2.0 * cw;
            a2 = 1.0 - alpha / Q;
            break;
        default:
            return;
    }

    if (a0 == 0.0) a0 = 1.0;

    f->b0 = b0 / a0;
    f->b1 = b1 / a0;
    f->b2 = b2 / a0;
    f->a1 = a1 / a0;
    f->a2 = a2 / a0;
}

double filter_process(Filter* f, double input) {
    if (f->type == FILTER_NONE) return input;

    double y = f->b0 * input + f->b1 * f->x1 + f->b2 * f->x2
             - f->a1 * f->y1 - f->a2 * f->y2;

    f->x2 = f->x1;
    f->x1 = input;
    f->y2 = f->y1;
    f->y1 = y;

    return y;
}
