from flask_sqlalchemy import SQLAlchemy
from datetime import datetime
import json

db = SQLAlchemy()

class User(db.Model):
    __tablename__ = 'users'
    
    id = db.Column(db.Integer, primary_key=True)
    google_sub = db.Column(db.String(255), unique=True, nullable=False, index=True)
    email = db.Column(db.String(255), unique=True, nullable=False)
    name = db.Column(db.String(255), nullable=True)
    avatar_url = db.Column(db.String(500), nullable=True)
    email_verified = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    last_login_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    reports = db.relationship('Report', backref='user', lazy=True, cascade="all, delete-orphan")
    auth_events = db.relationship('AuthEvent', backref='user', lazy=True, cascade="all, delete-orphan")

    def __init__(self, **kwargs):
        super(User, self).__init__(**kwargs)

    def to_dict(self):
        return {
            'id': self.id,
            'email': self.email,
            'name': self.name,
            'avatar_url': self.avatar_url,
            'email_verified': self.email_verified,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'last_login_at': self.last_login_at.isoformat() if self.last_login_at else None
        }

class AuthEvent(db.Model):
    __tablename__ = 'auth_events'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'), nullable=True)
    event_type = db.Column(db.String(50), nullable=False) # LOGIN_SUCCESS, LOGIN_FAILURE, LOGOUT
    ip_hash = db.Column(db.String(64), nullable=True) # safe hash or metadata
    user_agent = db.Column(db.String(255), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def __init__(self, **kwargs):
        super(AuthEvent, self).__init__(**kwargs)

class Report(db.Model):
    __tablename__ = 'reports'
    
    id = db.Column(db.Integer, primary_key=True)
    report_id = db.Column(db.String(100), unique=True, nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    documents = db.Column(db.Text, nullable=False) # JSON array of document names
    overall_similarity = db.Column(db.Float, nullable=False)
    verdict = db.Column(db.String(50), nullable=False)
    algorithm_scores = db.Column(db.Text, nullable=False) # JSON representation of scores
    matched_sentences = db.Column(db.Text, nullable=True) # JSON representation of matched sentences
    
    def __init__(self, **kwargs):
        super(Report, self).__init__(**kwargs)

    def set_documents(self, docs_list):
        self.documents = json.dumps(docs_list)
        
    def get_documents(self):
        return json.loads(self.documents)
        
    def set_algorithm_scores(self, scores_dict):
        self.algorithm_scores = json.dumps(scores_dict)
        
    def get_algorithm_scores(self):
        return json.loads(self.algorithm_scores)
        
    def set_matched_sentences(self, matches_list):
        self.matched_sentences = json.dumps(matches_list)
        
    def get_matched_sentences(self):
        if self.matched_sentences:
            return json.loads(self.matched_sentences)
        return []

    def to_dict(self):
        return {
            'id': self.id,
            'report_id': self.report_id,
            'user_id': self.user_id,
            'created_at': self.created_at.isoformat(),
            'documents': self.get_documents(),
            'overall_similarity': self.overall_similarity,
            'verdict': self.verdict,
            'algorithm_scores': self.get_algorithm_scores(),
            'matched_sentences': self.get_matched_sentences()
        }


