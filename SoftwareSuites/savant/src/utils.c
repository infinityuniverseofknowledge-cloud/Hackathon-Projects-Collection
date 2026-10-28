/* SAVANT — utilitarios matematicos e musicais */
#include "savant.h"
#include <math.h>
#include <stdlib.h>
#include <ctype.h>
#include <string.h>

double db_to_linear(double db) {
    return pow(10.0, db / 20.0);
}

double midi_to_freq(int midi_note) {
    return 440.0 * pow(2.0, (midi_note - 69) / 12.0);
}

double note_name_to_freq(const char* name) {
    if (!name || !*name) return 440.0;

    /* Se comeca com digito ou ponto, e um numero */
    if (isdigit((unsigned char)name[0]) || name[0] == '.') {
        return atof(name);
    }

    int note_idx = -1;
    switch (toupper((unsigned char)name[0])) {
        case 'C': note_idx = 0; break;
        case 'D': note_idx = 2; break;
        case 'E': note_idx = 4; break;
        case 'F': note_idx = 5; break;
        case 'G': note_idx = 7; break;
        case 'A': note_idx = 9; break;
        case 'B': note_idx = 11; break;
    }
    if (note_idx < 0) return 440.0;

    int i = 1;
    if (name[1] == '#' || name[1] == 's') { note_idx++; i++; }
    else if (name[1] == 'b') { note_idx--; i++; }

    int octave = 4;
    if (name[i]) octave = atoi(name + i);

    int midi = (octave + 1) * 12 + note_idx;
    return midi_to_freq(midi);
}

void print_banner(void) {
    printf("SAVANT %s — motor de sintese sonora + DSP\n", SAVANT_VERSION);
    printf("Osciladores · filtros biquad · ADSR · FFT · efeitos\n\n");
}
