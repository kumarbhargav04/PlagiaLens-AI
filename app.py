import sys
import os
import importlib.util

server_dir = os.path.join(os.path.dirname(__file__), 'server')
if server_dir not in sys.path:
    sys.path.insert(0, server_dir)

server_app_path = os.path.join(server_dir, 'app.py')
spec = importlib.util.spec_from_file_location("server_app", server_app_path)
server_app = importlib.util.module_from_spec(spec)
sys.modules["server_app"] = server_app
spec.loader.exec_module(server_app)

app = server_app.app

if __name__ == '__main__':
    app.run(debug=True, port=5000)
