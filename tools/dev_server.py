"""Local preview server with SIMULATED online payments.

    python tools/dev_server.py [port]        (default port 8768)

Serves the site exactly like the normal preview, but adds tools/dev/local-api.js to every
page. That script runs the real code in functions/ inside the browser and replaces Pesapal
with a pretend one, so the whole checkout can be clicked through without keys or real money.
Nothing here is published: it is for testing on your own computer only.
"""
import http.server
import os
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
INJECT = b'<script src="/tools/dev/local-api.js"></script>'


class Handler(http.server.SimpleHTTPRequestHandler):
    extensions_map = {**http.server.SimpleHTTPRequestHandler.extensions_map, '.js': 'text/javascript'}

    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=ROOT, **kwargs)

    def end_headers(self):
        self.send_header('Cache-Control', 'no-store')
        super().end_headers()

    def do_GET(self):
        path = self.translate_path(self.path.split('?', 1)[0])
        if os.path.isdir(path):
            path = os.path.join(path, 'index.html')
        if path.endswith('.html') and os.path.isfile(path):
            with open(path, 'rb') as f:
                data = f.read().replace(b'<head>', b'<head>' + INJECT, 1)
            self.send_response(200)
            self.send_header('Content-Type', 'text/html; charset=utf-8')
            self.send_header('Content-Length', str(len(data)))
            self.end_headers()
            self.wfile.write(data)
        else:
            super().do_GET()

    def log_message(self, *args):
        pass


if __name__ == '__main__':
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8768
    print(f'Local test site with simulated payments: http://localhost:{port}/shop.html')
    http.server.ThreadingHTTPServer(('', port), Handler).serve_forever()
