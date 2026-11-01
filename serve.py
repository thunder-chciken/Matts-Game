"""Local dev server for Hoardlands with caching disabled, so code and art changes show on reload.

    python serve.py            # then open http://localhost:8642
"""
import http.server, sys


class NoCache(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store, must-revalidate')
        super().end_headers()

    def log_message(self, *args):
        if sys.stderr:  # pythonw (the desktop launcher) has no console to log to
            super().log_message(*args)


class Server(http.server.ThreadingHTTPServer):
    # on Windows SO_REUSEADDR would let a second copy share the port; refuse instead, so
    # the desktop launcher can start this blindly and a duplicate just exits
    allow_reuse_address = sys.platform != 'win32'


if __name__ == '__main__':
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8642
    try:
        server = Server(('127.0.0.1', port), NoCache)
    except OSError:
        sys.exit(0)  # already running
    server.serve_forever()
