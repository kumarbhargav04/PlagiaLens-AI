import os
from datetime import timedelta
from dotenv import load_dotenv
load_dotenv()

from flask import Flask, jsonify
from flask_cors import CORS
from models.database import db
import nltk
# Render containers are read‑only except for /tmp – use it for NLTK data
nltk.data.path.append('/tmp')
try:
    nltk.data.find('corpora/stopwords')
except LookupError:
    nltk.download('stopwords', download_dir='/tmp')
from routes.api import api_bp
from routes.auth import auth_bp
from sqlalchemy import inspect

def create_app():
    app = Flask(__name__)
    
    # Configure Secret Key for Sessions
    app.secret_key = os.environ.get('SESSION_SECRET', 'dev-secret-key-1234567890-change-in-production')
    
    # Load Environment Configurations into app.config
    app.config['GOOGLE_CLIENT_ID'] = os.environ.get('GOOGLE_CLIENT_ID')
    app.config['GOOGLE_CLIENT_SECRET'] = os.environ.get('GOOGLE_CLIENT_SECRET')
    app.config['GOOGLE_REDIRECT_URI'] = os.environ.get('GOOGLE_REDIRECT_URI')
    app.config['ALLOWED_GOOGLE_DOMAIN'] = os.environ.get('ALLOWED_GOOGLE_DOMAIN')
    app.config['FRONTEND_URL'] = os.environ.get('FRONTEND_URL', 'http://localhost:5173')
    
    # Session Security Config
    app.config['PERMANENT_SESSION_LIFETIME'] = timedelta(days=7)
    app.config['SESSION_COOKIE_HTTPONLY'] = True
    app.config['SESSION_COOKIE_SECURE'] = False  # Set to True in production (HTTPS)
    app.config['SESSION_COOKIE_SAMESITE'] = 'Lax'
    
    # Configure CORS to support credentials
    CORS(app, supports_credentials=True, origins=[app.config['FRONTEND_URL']])


    # Configuration
    basedir = os.path.abspath(os.path.dirname(__name__))
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
    os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)
    os.makedirs(app.config['REPORT_FOLDER'], exist_ok=True)

    # Initialize extensions
    db.init_app(app)

    # Register Blueprints
    app.register_blueprint(api_bp, url_prefix='/api')
    app.register_blueprint(auth_bp, url_prefix='/api/auth')

    # Create Database Tables and perform migration if necessary
    with app.app_context():
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

    return app

app = create_app()

if __name__ == '__main__':
    app.run(debug=True, port=5000)

