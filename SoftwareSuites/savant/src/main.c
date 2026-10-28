/* SAVANT — CLI */
#include "savant.h"
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

static void usage(const char* prog) {
    printf("SAVANT %s — motor de sintese sonora\n\n", SAVANT_VERSION);
    printf("USO:\n");
    printf("  %s <arquivo.synth>             compila e gera WAV\n", prog);
    printf("  %s --spectrum <arquivo.wav>    analisa espectro\n", prog);
    printf("  %s --info <arquivo.wav>        mostra info do WAV\n", prog);
    printf("  %s --help                      mostra ajuda\n", prog);
    printf("  %s --version                   mostra versao\n", prog);
    printf("\n");
    printf("EXEMPLO:\n");
    printf("  %s examples/melody.synth\n", prog);
}

static int cmd_render(const char* path) {
    Synth s;
    char output[256];
    if (parse_synth_file(path, &s, output, sizeof(output)) != 0) {
        fprintf(stderr, "erro: nao foi possivel ler %s\n", path);
        return 1;
    }
    if (output[0] == '\0') {
        strcpy(output, "output.wav");
    }

    printf("  Patch      : %s\n", path);
    printf("  Taxa       : %d Hz\n", s.sample_rate);
    printf("  Duracao    : %.3f s\n", s.duration);
    printf("  Notas      : %zu\n", s.num_notes);
    printf("  Saida      : %s\n", output);
    printf("\n");

    double* samples = NULL;
    size_t n = 0;
    int rc = synth_render(&s, &samples, &n);
    if (rc != 0 || !samples) {
        fprintf(stderr, "erro: renderizacao falhou (code %d)\n", rc);
        synth_free(&s);
        return 1;
    }

    if (wav_write(output, samples, n, s.sample_rate) != 0) {
        fprintf(stderr, "erro: nao foi possivel escrever %s\n", output);
        free(samples);
        synth_free(&s);
        return 1;
    }

    printf("  Escreveu %zu amostras (%.2f KB)\n",
           n, (double)(n * 2) / 1024.0);

    free(samples);
    synth_free(&s);
    return 0;
}

static int cmd_spectrum(const char* path) {
    double* samples = NULL;
    size_t n = 0;
    int sr = 0;
    if (wav_read(path, &samples, &n, &sr) != 0) {
        fprintf(stderr, "erro: nao foi possivel ler %s\n", path);
        return 1;
    }
    printf("  Analisando %s (%zu amostras @ %d Hz)\n\n", path, n, sr);
    spectrum_analyze(samples, n, sr);
    free(samples);
    return 0;
}

int main(int argc, char** argv) {
    if (argc < 2) {
        print_banner();
        usage(argv[0]);
        return 0;
    }

    const char* arg = argv[1];

    if (strcmp(arg, "--help") == 0 || strcmp(arg, "-h") == 0) {
        print_banner();
        usage(argv[0]);
        return 0;
    }
    if (strcmp(arg, "--version") == 0 || strcmp(arg, "-v") == 0) {
        printf("savant %s\n", SAVANT_VERSION);
        return 0;
    }
    if (strcmp(arg, "--spectrum") == 0) {
        if (argc < 3) {
            fprintf(stderr, "erro: --spectrum requer arquivo\n");
            return 1;
        }
        return cmd_spectrum(argv[2]);
    }
    if (strcmp(arg, "--info") == 0) {
        if (argc < 3) {
            fprintf(stderr, "erro: --info requer arquivo\n");
            return 1;
        }
        return wav_info(argv[2]);
    }

    print_banner();
    return cmd_render(arg);
}
