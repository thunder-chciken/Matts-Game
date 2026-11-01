"""Local dev server for Hoardlands with caching disabled, so code and art changes show on reload.

    python serve.py            # then open http://localhost:8642
"""
import http.server, sys


class NoCache(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store, must-revalidate')
        super().end_headers()


if __name__ == '__main__':
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8642
    http.server.ThreadingHTTPServer(('127.0.0.1', port), NoCache).serve_forever()
