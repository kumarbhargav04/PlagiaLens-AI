from flask_sqlalchemy import SQLAlchemy
from datetime import datetime
import json

db = SQLAlchemy()

class Report(db.Model):
    __tablename__ = 'reports'
    
    id = db.Column(db.Integer, primary_key=True)
    report_id = db.Column(db.String(100), unique=True, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    documents = db.Column(db.Text, nullable=False) # JSON array of document names
    overall_similarity = db.Column(db.Float, nullable=False)
    verdict = db.Column(db.String(50), nullable=False)
    algorithm_scores = db.Column(db.Text, nullable=False) # JSON representation of scores
    matched_sentences = db.Column(db.Text, nullable=True) # JSON representation of matched sentences
    
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
            'created_at': self.created_at.isoformat(),
            'documents': self.get_documents(),
            'overall_similarity': self.overall_similarity,
            'verdict': self.verdict,
            'algorithm_scores': self.get_algorithm_scores(),
            'matched_sentences': self.get_matched_sentences()
        }
