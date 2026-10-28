/* SAVANT — motor de sintese sonora + DSP */
#ifndef SAVANT_H
#define SAVANT_H

#include <stdint.h>
#include <stddef.h>
#include <stdio.h>

#define SAVANT_VERSION "0.1.0"
#define DEFAULT_SAMPLE_RATE 44100
#define MAX_NOTES 4096
#define MAX_LINE 1024

#ifndef M_PI
#define M_PI 3.14159265358979323846
#endif

/* ============================================================
 * Osciladores
 * ============================================================ */
typedef enum {
    OSC_SINE,
    OSC_SAW,
    OSC_SQUARE,
    OSC_TRIANGLE,
    OSC_NOISE,
    OSC_FM
} OscType;

typedef struct {
    OscType type;
    double freq;
    double amp;
    double fm_freq;
    double fm_depth;
    double phase;
    uint64_t noise_seed;
} Oscillator;

void   osc_init(Oscillator* o, OscType type, double freq, double amp);
double osc_next(Oscillator* o, int sample_rate);

/* ============================================================
 * Envelopes
 * ============================================================ */
typedef enum {
    ENV_NONE,
    ENV_ADSR,
    ENV_AR
} EnvType;

typedef struct {
    EnvType type;
    double attack;
    double decay;
    double sustain;
    double release;
} Envelope;

void   env_init_adsr(Envelope* e, double a, double d, double s, double r);
void   env_init_ar(Envelope* e, double a, double r);
double env_next(const Envelope* e, double elapsed, double remaining);

/* ============================================================
 * Filtros (biquad)
 * ============================================================ */
typedef enum {
    FILTER_NONE,
    FILTER_LOWPASS,
    FILTER_HIGHPASS,
    FILTER_BANDPASS,
    FILTER_NOTCH,
    FILTER_PEAK
} FilterType;

typedef struct {
    FilterType type;
    double cutoff;
    double resonance;
    double b0, b1, b2, a1, a2;
    double x1, x2, y1, y2;
} Filter;

void   filter_init(Filter* f, FilterType type, double cutoff, double resonance, int sample_rate);
double filter_process(Filter* f, double input);

/* ============================================================
 * Efeitos
 * ============================================================ */
typedef struct {
    double* buffer;
    size_t size;
    size_t write_pos;
    double feedback;
    double mix;
} Delay;

void   delay_init(Delay* d, double time_sec, double feedback, double mix, int sample_rate);
double delay_process(Delay* d, double input);
void   delay_free(Delay* d);

double distortion_soft(double x, double drive);

/* ============================================================
 * FFT
 * ============================================================ */
void fft(double* real, double* imag, size_t n);
void hann_window(double* data, size_t n);
void spectrum_analyze(const double* samples, size_t n, int sample_rate);

/* ============================================================
 * WAV I/O
 * ============================================================ */
int wav_write(const char* filename, const double* samples, size_t n, int sample_rate);
int wav_read(const char* filename, double** samples, size_t* n, int* sample_rate);
int wav_info(const char* filename);

/* ============================================================
 * Sintese
 * ============================================================ */
typedef struct {
    double frequency;
    double start_time;
    double duration;
} Note;

typedef struct {
    int sample_rate;
    double duration;
    Oscillator osc;
    Envelope env;
    Filter filter;
    Delay delay;
    double distortion_drive;
    Note notes[MAX_NOTES];
    size_t num_notes;
} Synth;

int  parse_synth_file(const char* path, Synth* s, char* output_filename, size_t out_size);
int  synth_render(Synth* s, double** out_samples, size_t* out_n);
void synth_free(Synth* s);

/* ============================================================
 * Utilitarios
 * ============================================================ */
double db_to_linear(double db);
double midi_to_freq(int midi_note);
double note_name_to_freq(const char* name);
void   print_banner(void);

#endif /* SAVANT_H */
