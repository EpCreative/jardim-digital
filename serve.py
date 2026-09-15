"""Serve Jardim on its fixed loopback port; never fall back to another port."""
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from pathlib import Path
from functools import partial

if __name__ == '__main__':
    directory = str(Path(__file__).resolve().parent)
    handler = partial(SimpleHTTPRequestHandler, directory=directory)
    with ThreadingHTTPServer(('127.0.0.1', 4341), handler) as server:
        print('Jardim is available at http://127.0.0.1:4341', flush=True)
        server.serve_forever()
