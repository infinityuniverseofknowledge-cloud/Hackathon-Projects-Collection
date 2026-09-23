/* OmniForge C core — HTTP server.
   Build: gcc omniforge.c -O2 -o omniforge-c
   Run:   ./omniforge-c
*/
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <unistd.h>
#include <arpa/inet.h>
#include <sys/socket.h>
#include <netinet/in.h>

static void send_json(int fd, const char *body) {
    char buf[8192];
    int n = snprintf(buf, sizeof buf,
        "HTTP/1.1 200 OK\r\nContent-Type: application/json\r\n"
        "Access-Control-Allow-Origin: *\r\nConnection: close\r\n"
        "Content-Length: %zu\r\n\r\n%s", strlen(body), body);
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
        unsigned x = 42; char b[1024]; int o = 0;
        o += snprintf(b+o, sizeof b-o, "{\"samples\":[");
        for (int i=0;i<20;i++){ x=x*1103515245u+12345u;
            o += snprintf(b+o, sizeof b-o, "%s%.2f", i?",":"", (x%10000)/100.0); }
        o += snprintf(b+o, sizeof b-o, "]}");
        send_json(fd, b);
    } else send_json(fd, "{\"error\":\"not found\"}");
    close(fd);
}

int main(void) {
    int srv = socket(AF_INET, SOCK_STREAM, 0), opt = 1;
    setsockopt(srv, SOL_SOCKET, SO_REUSEADDR, &opt, sizeof opt);
    struct sockaddr_in a = {0};
    a.sin_family = AF_INET; a.sin_addr.s_addr = htonl(INADDR_LOOPBACK);
    a.sin_port = htons(8001);
    if (bind(srv, (struct sockaddr*)&a, sizeof a) < 0) { perror("bind"); return 1; }
    listen(srv, 16);
    printf("OmniForge C → http://127.0.0.1:8001\n");
    for (;;) { int c = accept(srv,0,0); if (c<0) break; handle(c); }
    return 0;
}
