/* SAVANT — envelopes ADSR e AR */
#include "savant.h"

void env_init_adsr(Envelope* e, double a, double d, double s, double r) {
    e->type = ENV_ADSR;
    e->attack = a;
    e->decay = d;
    e->sustain = s;
    e->release = r;
}

void env_init_ar(Envelope* e, double a, double r) {
    e->type = ENV_AR;
    e->attack = a;
    e->decay = 0.0;
    e->sustain = 1.0;
    e->release = r;
}

double env_next(const Envelope* e, double elapsed, double remaining) {
    if (e->type == ENV_NONE) return 1.0;
    if (elapsed < 0.0 || remaining < 0.0) return 0.0;

    /* Attack phase */
    if (e->attack > 0.0 && elapsed < e->attack) {
        return elapsed / e->attack;
    }

    /* Release phase (near the end of the note) */
    if (e->release > 0.0 && remaining < e->release) {
        double base = (e->type == ENV_ADSR) ? e->sustain : 1.0;
        return base * (remaining / e->release);
    }

    /* Decay (ADSR only) */
    if (e->type == ENV_ADSR) {
        double attack_end = e->attack;
        double decay_end = attack_end + e->decay;
        if (elapsed < decay_end && e->decay > 0.0) {
            double frac = (elapsed - attack_end) / e->decay;
            return 1.0 + (e->sustain - 1.0) * frac;
        }
        return e->sustain;
    }

    return 1.0;
}
