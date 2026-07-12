import os
from flask import Flask, jsonify
from flask_cors import CORS
from models.database import db
from routes.api import api_bp

def create_app():
    app = Flask(__name__)
    CORS(app)

    # Configuration
    basedir = os.path.abspath(os.path.dirname(__name__))
    db_path = os.path.join(basedir, 'plagscan.db')
    app.config['SQLALCHEMY_DATABASE_URI'] = f'sqlite:///{db_path}'
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

    # Create Database Tables
    with app.app_context():
        db.create_all()

    return app

app = create_app()

if __name__ == '__main__':
    app.run(debug=True, port=5000)
