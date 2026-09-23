/* OmniForge C core — single-file HTTP server.
   Compile: gcc omniforge.c -O2 -o omniforge-c
   Run:     ./omniforge-c
*/
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <unistd.h>
#include <arpa/inet.h>
#include <sys/socket.h>
#include <netinet/in.h>

static const char *JSON_HDR =
 "HTTP/1.1 200 OK\r\nContent-Type: application/json\r\n"
 "Access-Control-Allow-Origin: *\r\nConnection: close\r\n";

static void send_json(int fd, const char *body) {
    char buf[4096];
    int n = snprintf(buf, sizeof buf,
        "%sContent-Length: %zu\r\n\r\n%s", JSON_HDR, strlen(body), body);
    write(fd, buf, n);
}

static void handle(int fd) {
    char req[4096];
    ssize_t n = read(fd, req, sizeof req - 1);
    if (n <= 0) { close(fd); return; }
    req[n] = 0;

    if (strstr(req, "GET /health"))
        send_json(fd, "{\"status\":\"ok\",\"service\":\"c\"}");
    else if (strstr(req, "GET /api/version"))
        send_json(fd, "{\"service\":\"omniforge-c\",\"version\":\"1.0.0\"}");
    else if (strstr(req, "GET /api/stats")) {
        /* Fake but deterministic stats based on a simple LCG */
        unsigned x = 42;
        char body[512]; int off = 0;
        off += snprintf(body+off, sizeof body-off, "{\"samples\":[");
        for (int i = 0; i < 20; i++) {
            x = x * 1103515245u + 12345u;
            double v = (x % 10000) / 100.0;
            off += snprintf(body+off, sizeof body-off,
                            "%s%.2f", i ? "," : "", v);
        }
        off += snprintf(body+off, sizeof body-off, "]}");
        send_json(fd, body);
    } else {
        send_json(fd, "{\"error\":\"not found\"}");
    }
    close(fd);
}

int main(int argc, char **argv) {
    int port = 8001;
    for (int i = 1; i < argc; i++)
        if (!strcmp(argv[i], "-p") && i+1 < argc) port = atoi(argv[++i]);

    int srv = socket(AF_INET, SOCK_STREAM, 0);
    int opt = 1;
    setsockopt(srv, SOL_SOCKET, SO_REUSEADDR, &opt, sizeof opt);

    struct sockaddr_in a = {0};
    a.sin_family = AF_INET;
    a.sin_addr.s_addr = htonl(INADDR_LOOPBACK);
    a.sin_port = htons(port);
    if (bind(srv, (struct sockaddr*)&a, sizeof a) < 0) { perror("bind"); return 1; }
    listen(srv, 16);
    printf("OmniForge C — http://127.0.0.1:%d\n", port);
    for (;;) {
        int c = accept(srv, 0, 0);
        if (c < 0) break;
        handle(c);
    }
    return 0;
}
