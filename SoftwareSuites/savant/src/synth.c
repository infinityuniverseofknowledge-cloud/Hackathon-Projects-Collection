/* SAVANT — parser de .synth + motor de renderizacao */
#include "savant.h"
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <ctype.h>
#include <math.h>

static void strip_comments(char* line) {
    char* p = strchr(line, '#');
    if (p) *p = '\0';
    p = strchr(line, '\n');
    if (p) *p = '\0';
    p = strchr(line, '\r');
    if (p) *p = '\0';
}

static char* trim_left(char* s) {
    while (*s && isspace((unsigned char)*s)) s++;
    return s;
}

int parse_synth_file(const char* path, Synth* s, char* output_filename, size_t out_size) {
    FILE* f = fopen(path, "r");
    if (!f) return -1;

    s->sample_rate = DEFAULT_SAMPLE_RATE;
    s->duration = 2.0;
    osc_init(&s->osc, OSC_SINE, 440.0, 0.5);
    s->env.type = ENV_NONE;
    s->filter.type = FILTER_NONE;
    s->delay.buffer = NULL;
    s->delay.size = 0;
    s->delay.write_pos = 0;
    s->delay.feedback = 0.0;
    s->delay.mix = 0.0;
    s->distortion_drive = 0.0;
    s->num_notes = 0;
    if (out_size > 0) output_filename[0] = '\0';

    FilterType ftype = FILTER_NONE;
    double fcut = 1000.0, fq = 0.707;

    int delay_set = 0;
    double d_time = 0.0, d_fb = 0.0, d_mix = 0.0;

    char line[MAX_LINE];
    while (fgets(line, sizeof(line), f)) {
        strip_comments(line);
        char* p = trim_left(line);
        if (!*p) continue;

        char cmd[64] = {0};
        if (sscanf(p, "%63s", cmd) != 1) continue;

        if (strcmp(cmd, "sample_rate") == 0) {
            int sr = 0;
            if (sscanf(p, "%*s %d", &sr) == 1 && sr > 0) s->sample_rate = sr;
        } else if (strcmp(cmd, "duration") == 0) {
            double d = 0.0;
            if (sscanf(p, "%*s %lf", &d) == 1 && d > 0) s->duration = d;
        } else if (strcmp(cmd, "osc") == 0) {
            char type[32] = {0};
            if (sscanf(p, "%*s %31s", type) != 1) continue;
            double freq = s->osc.freq;
            double amp = s->osc.amp;
            char* fp = strstr(p, "freq=");
            if (fp) freq = atof(fp + 5);
            char* ap = strstr(p, "amp=");
            if (ap) amp = atof(ap + 4);

            OscType ot = OSC_SINE;
            if      (strcmp(type, "sine")     == 0) ot = OSC_SINE;
            else if (strcmp(type, "saw")      == 0) ot = OSC_SAW;
            else if (strcmp(type, "square")   == 0) ot = OSC_SQUARE;
            else if (strcmp(type, "triangle") == 0) ot = OSC_TRIANGLE;
            else if (strcmp(type, "noise")    == 0) ot = OSC_NOISE;
            else if (strcmp(type, "fm")       == 0) ot = OSC_FM;

            osc_init(&s->osc, ot, freq, amp);
        } else if (strcmp(cmd, "env") == 0) {
            char type[32] = {0};
            if (sscanf(p, "%*s %31s", type) != 1) continue;
            if (strcmp(type, "adsr") == 0) {
                double a, d, sus, r;
                if (sscanf(p, "%*s %*s %lf %lf %lf %lf", &a, &d, &sus, &r) == 4) {
                    env_init_adsr(&s->env, a, d, sus, r);
                }
            } else if (strcmp(type, "ar") == 0) {
                double a, r;
                if (sscanf(p, "%*s %*s %lf %lf", &a, &r) == 2) {
                    env_init_ar(&s->env, a, r);
                }
            }
        } else if (strcmp(cmd, "filter") == 0) {
            char type[32] = {0};
            if (sscanf(p, "%*s %31s", type) != 1) continue;
            double cutoff, q;
            if (sscanf(p, "%*s %*s %lf %lf", &cutoff, &q) != 2) continue;
            if      (strcmp(type, "lowpass")  == 0) ftype = FILTER_LOWPASS;
            else if (strcmp(type, "highpass") == 0) ftype = FILTER_HIGHPASS;
            else if (strcmp(type, "bandpass") == 0) ftype = FILTER_BANDPASS;
            else if (strcmp(type, "notch")    == 0) ftype = FILTER_NOTCH;
            else if (strcmp(type, "peak")     == 0) ftype = FILTER_PEAK;
            fcut = cutoff;
            fq = q;
        } else if (strcmp(cmd, "delay") == 0) {
            double t, fb, mix;
            if (sscanf(p, "%*s %lf %lf %lf", &t, &fb, &mix) == 3) {
                d_time = t;
                d_fb = fb;
                d_mix = mix;
                delay_set = 1;
            }
        } else if (strcmp(cmd, "distortion") == 0) {
            double drive;
            if (sscanf(p, "%*s %lf", &drive) == 1) {
                s->distortion_drive = drive;
            }
        } else if (strcmp(cmd, "note") == 0) {
            char freq_or_name[32] = {0};
            double dur = 0.5;
            int got = sscanf(p, "%*s %31s %lf", freq_or_name, &dur);
            if (got >= 1 && s->num_notes < MAX_NOTES) {
                double freq = note_name_to_freq(freq_or_name);
                double start = 0.0;
                for (size_t i = 0; i < s->num_notes; i++) {
                    start += s->notes[i].duration;
                }
                s->notes[s->num_notes].frequency = freq;
                s->notes[s->num_notes].start_time = start;
                s->notes[s->num_notes].duration = dur;
                s->num_notes++;
            }
        } else if (strcmp(cmd, "output") == 0) {
            char fname[256] = {0};
            if (sscanf(p, "%*s %255s", fname) == 1) {
                strncpy(output_filename, fname, out_size - 1);
                output_filename[out_size - 1] = '\0';
            }
        }
    }

    fclose(f);

    if (ftype != FILTER_NONE) {
        filter_init(&s->filter, ftype, fcut, fq, s->sample_rate);
    }
    if (delay_set && d_time > 0.0) {
        delay_init(&s->delay, d_time, d_fb, d_mix, s->sample_rate);
    }

    return 0;
}

int synth_render(Synth* s, double** out_samples, size_t* out_n) {
    if (s->sample_rate <= 0 || s->duration <= 0) return -1;

    size_t n = (size_t)(s->duration * s->sample_rate);
    double* buf = (double*)calloc(n, sizeof(double));
    if (!buf) return -2;

    if (s->num_notes == 0) {
        s->notes[0].frequency = s->osc.freq;
        s->notes[0].start_time = 0.0;
        s->notes[0].duration = s->duration;
        s->num_notes = 1;
    }

    double saved_freq = s->osc.freq;
    double saved_phase = s->osc.phase;

    for (size_t i = 0; i < s->num_notes; i++) {
        Note* note = &s->notes[i];
        size_t start = (size_t)(note->start_time * (double)s->sample_rate);
        size_t len = (size_t)(note->duration * (double)s->sample_rate);

        s->osc.freq = note->frequency;
        s->osc.phase = 0.0;

        for (size_t k = 0; k < len && start + k < n; k++) {
            double t = (double)k / (double)s->sample_rate;
            double remaining = note->duration - t;

            double osc_val = osc_next(&s->osc, s->sample_rate);
            double env_val = env_next(&s->env, t, remaining);
            double sample = osc_val * env_val;

            sample = filter_process(&s->filter, sample);

            if (s->distortion_drive > 0.0) {
                sample = distortion_soft(sample, s->distortion_drive);
            }

            buf[start + k] += sample;
        }
    }

    s->osc.freq = saved_freq;
    s->osc.phase = saved_phase;

    if (s->delay.buffer) {
        for (size_t i = 0; i < n; i++) {
            buf[i] = delay_process(&s->delay, buf[i]);
        }
    }

    *out_samples = buf;
    *out_n = n;
    return 0;
}

void synth_free(Synth* s) {
    delay_free(&s->delay);
}
