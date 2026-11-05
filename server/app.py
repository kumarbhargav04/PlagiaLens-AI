import os
from datetime import timedelta
from dotenv import load_dotenv
load_dotenv()

from flask import Flask, jsonify
from flask_cors import CORS
from werkzeug.middleware.proxy_fix import ProxyFix
from models.database import db
import nltk

# Render containers are read‑only except for /tmp – use it for NLTK data
nltk.data.path.extend([
    '/opt/render/project/src/nltk_data',
    '/tmp/nltk_data',
    '/tmp'
])

for resource, path in [
    ('stopwords', 'corpora/stopwords'),
    ('wordnet', 'corpora/wordnet'),
    ('punkt_tab', 'tokenizers/punkt_tab'),
    ('punkt', 'tokenizers/punkt')
]:
    try:
        nltk.data.find(path)
    except LookupError:
        try:
            nltk.download(resource, download_dir='/tmp', quiet=True)
        except Exception:
            pass

from routes.api import api_bp
from routes.auth import auth_bp
from sqlalchemy import inspect

def create_app():
    app = Flask(__name__)
    app.wsgi_app = ProxyFix(app.wsgi_app, x_for=1, x_proto=1, x_host=1, x_prefix=1)
    
    # Configure Secret Key for Sessions
    app.secret_key = os.environ.get('SESSION_SECRET', 'dev-secret-key-1234567890-change-in-production')
    
    # Load Environment Configurations into app.config
    app.config['GOOGLE_CLIENT_ID'] = os.environ.get('GOOGLE_CLIENT_ID')
    app.config['GOOGLE_CLIENT_SECRET'] = os.environ.get('GOOGLE_CLIENT_SECRET')
    app.config['GOOGLE_REDIRECT_URI'] = os.environ.get('GOOGLE_REDIRECT_URI')
    app.config['ALLOWED_GOOGLE_DOMAIN'] = os.environ.get('ALLOWED_GOOGLE_DOMAIN')
    raw_frontend = os.environ.get('FRONTEND_URL', 'http://localhost:5173')
    frontend_url = raw_frontend.rstrip('/')
    app.config['FRONTEND_URL'] = frontend_url
    
    # Determine if running in production (cross-site HTTPS)
    is_prod = (
        os.environ.get('FLASK_ENV') == 'production' or
        os.environ.get('ENV') == 'production' or
        bool(frontend_url and 'localhost' not in frontend_url)
    )
    
    # Session Security Config
    app.config['PERMANENT_SESSION_LIFETIME'] = timedelta(days=7)
    app.config['SESSION_COOKIE_HTTPONLY'] = True
    app.config['SESSION_COOKIE_SECURE'] = is_prod  # True for HTTPS cross-site
    app.config['SESSION_COOKIE_SAMESITE'] = 'None' if is_prod else 'Lax'
    
    # Configure CORS to support credentials across local dev and Vercel deployments
    import re
    allowed_origins = [
        frontend_url,
        f'{frontend_url}/',
        'http://localhost:5173',
        'http://localhost:3000',
        'http://127.0.0.1:5173',
        'http://127.0.0.1:3000',
        re.compile(r'^https://.*\.vercel\.app$')
    ]
    allowed_origins = [o for o in allowed_origins if o]
    CORS(app, supports_credentials=True, origins=allowed_origins)

    # Configuration - use file directory instead of __name__
    basedir = os.path.abspath(os.path.dirname(__file__))
    db_path = os.path.join(basedir, 'plagscan.db')
    
    # Use DATABASE_URL from production environment if present (e.g. PostgreSQL), otherwise fallback to local SQLite
    database_url = os.environ.get('DATABASE_URL')
    if database_url and database_url.startswith("postgres://"):
        # SQLAlchemy 1.4+ requires "postgresql://" protocol instead of "postgres://"
        database_url = database_url.replace("postgres://", "postgresql://", 1)
        
    app.config['SQLALCHEMY_DATABASE_URI'] = database_url or f'sqlite:///{db_path}'
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
    
    # Uploads and Reports Directory
    app.config['UPLOAD_FOLDER'] = os.path.join(basedir, 'uploads')
    app.config['REPORT_FOLDER'] = os.path.join(basedir, 'reports')
    try:
        os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)
        os.makedirs(app.config['REPORT_FOLDER'], exist_ok=True)
    except Exception as e:
        print(f"Folder creation warning: {e}")

    # Initialize extensions
    db.init_app(app)

    # Register Blueprints
    app.register_blueprint(api_bp, url_prefix='/api')
    app.register_blueprint(auth_bp, url_prefix='/api/auth')

    # Create Database Tables and perform migration if necessary
    with app.app_context():
        try:
            db.create_all()
            
            # SQLite Migration: Add user_id column to reports if not present
            inspector = inspect(db.engine)
            if 'reports' in inspector.get_table_names():
                columns = [c['name'] for c in inspector.get_columns('reports')]
                if 'user_id' not in columns:
                    try:
                        db.session.execute(db.text("ALTER TABLE reports ADD COLUMN user_id INTEGER REFERENCES users(id)"))
                        db.session.commit()
                    except Exception as e:
                        print(f"Migration error (user_id): {e}")
                        db.session.rollback()
        except Exception as e:
            print(f"Database setup warning (handled): {e}")

    return app

try:
    app = create_app()
except Exception as e:
    import traceback
    traceback.print_exc()
    raise

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=True)
