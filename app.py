import sys
import os
import importlib.util

cur = os.path.dirname(os.path.abspath(__file__))
server_dir = os.path.join(cur, 'server')

if os.path.isdir(server_dir):
    server_app_file = os.path.join(server_dir, 'app.py')
    if server_dir not in sys.path:
        sys.path.insert(0, server_dir)
else:
    server_app_file = os.path.join(cur, 'app.py')
    if cur not in sys.path:
        sys.path.insert(0, cur)

spec = importlib.util.spec_from_file_location("plagialens_backend", server_app_file)
mod = importlib.util.module_from_spec(spec)
sys.modules["plagialens_backend"] = mod
spec.loader.exec_module(mod)

app = mod.app

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port)
