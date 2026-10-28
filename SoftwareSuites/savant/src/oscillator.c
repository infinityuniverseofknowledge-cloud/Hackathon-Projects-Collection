/* SAVANT — osciladores */
#include "savant.h"
#include <math.h>

void osc_init(Oscillator* o, OscType type, double freq, double amp) {
    o->type = type;
    o->freq = freq;
    o->amp = amp;
    o->fm_freq = 0.0;
    o->fm_depth = 0.0;
    o->phase = 0.0;
    o->noise_seed = 0x123456789abcdefULL;
}

static double xorshift_uniform(Oscillator* o) {
    uint64_t x = o->noise_seed;
    x ^= x << 13;
    x ^= x >> 7;
    x ^= x << 17;
    o->noise_seed = x;
    return ((double)(x >> 11) / 9007199254740992.0) * 2.0 - 1.0;
}

double osc_next(Oscillator* o, int sample_rate) {
    if (sample_rate <= 0) return 0.0;
    double phase_inc = o->freq / (double)sample_rate;
    double value = 0.0;

    switch (o->type) {
        case OSC_SINE:
            value = sin(2.0 * M_PI * o->phase);
            break;
        case OSC_SAW:
            value = 2.0 * o->phase - 1.0;
            break;
        case OSC_SQUARE:
            value = (o->phase < 0.5) ? 1.0 : -1.0;
            break;
        case OSC_TRIANGLE:
            value = (o->phase < 0.5)
                ? (4.0 * o->phase - 1.0)
                : (3.0 - 4.0 * o->phase);
            break;
        case OSC_NOISE:
            value = xorshift_uniform(o);
            break;
        case OSC_FM: {
            double mod = sin(2.0 * M_PI * o->fm_freq * o->phase);
            double instant = o->freq + o->fm_depth * mod;
            value = sin(2.0 * M_PI * instant * o->phase / (o->freq > 0 ? o->freq : 1));
            break;
        }
    }

    o->phase += phase_inc;
    if (o->phase >= 1.0) o->phase -= (long)o->phase;
    if (o->phase < 0.0) o->phase += 1.0;

    return value * o->amp;
}
