import os
import uuid
from functools import wraps
from flask import Blueprint, request, jsonify, current_app, session
from werkzeug.utils import secure_filename
from models.database import db, Report, User
from services.document_processor import process_document
from services.text_preprocessor import preprocess_text
from algorithms.similarity import calculate_all_similarities, extract_keywords, get_verdict
from algorithms.highlighter import find_matching_sentences
from datetime import datetime, timedelta

api_bp = Blueprint('api', __name__)

ALLOWED_EXTENSIONS = {'txt', 'pdf', 'doc', 'docx'}

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def login_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        user_id = session.get('user_id')
        if not user_id:
            return jsonify({"error": "Authentication required."}), 401
        user = db.session.get(User, user_id)
        if not user:
            session.clear()
            return jsonify({"error": "User session invalid."}), 401
        request.user = user
        return f(*args, **kwargs)
    return decorated_function

@api_bp.route('/health', methods=['GET'])
def health_check():
    return jsonify({"status": "healthy"}), 200

@api_bp.route('/compare', methods=['POST'])
@login_required
def compare_documents():
    if 'files' not in request.files:
        return jsonify({"error": "No files part"}), 400
        
    files = request.files.getlist('files')
    
    if len(files) < 2:
        return jsonify({"error": "At least 2 files are required for comparison"}), 400
        
    processed_docs = []
    
    # Process files
    for file in files:
        if file and allowed_file(file.filename):
            filename = secure_filename(file.filename)
            filepath = os.path.join(current_app.config['UPLOAD_FOLDER'], filename)
            file.save(filepath)
            
            try:
                raw_text = process_document(filepath)
                processed_text = preprocess_text(raw_text)
                processed_docs.append({
                    "name": filename,
                    "raw_text": raw_text,
                    "processed_text": processed_text,
                    "keywords": extract_keywords(raw_text)
                })
            except Exception as e:
                return jsonify({"error": f"Error processing {filename}: {str(e)}"}), 500
        else:
            return jsonify({"error": f"Invalid file format for {file.filename}"}), 400

    # For MVP, just comparing the first two docs. Batch comparison logic can be expanded.
    doc1 = processed_docs[0]
    doc2 = processed_docs[1]
    
    # Calculate similarities based on preprocessed text
    scores = calculate_all_similarities(doc1['processed_text'], doc2['processed_text'])
    
    # Highlighting based on raw text
    matches = find_matching_sentences(doc1['raw_text'], doc2['raw_text'])
    
    verdict = get_verdict(scores['overall'])
    
    # Save Report
    report_id = str(uuid.uuid4())
    new_report = Report(
        report_id=report_id,
        user_id=request.user.id,
        overall_similarity=scores['overall'],
        verdict=verdict
    )
    new_report.set_documents([doc1['name'], doc2['name']])
    new_report.set_algorithm_scores(scores)
    new_report.set_matched_sentences(matches)
    
    db.session.add(new_report)
    db.session.commit()
    
    return jsonify({
        "report_id": report_id,
        "documents": [
            {
                "name": doc1['name'],
                "text": doc1['raw_text'],
                "keywords": doc1['keywords']
            },
            {
                "name": doc2['name'],
                "text": doc2['raw_text'],
                "keywords": doc2['keywords']
            }
        ],
        "scores": scores,
        "matches": matches,
        "verdict": verdict
    }), 200

@api_bp.route('/history', methods=['GET'])
@login_required
def get_history():
    reports = Report.query.filter_by(user_id=request.user.id).order_by(Report.created_at.desc()).limit(20).all()
    return jsonify([report.to_dict() for report in reports]), 200

@api_bp.route('/dashboard', methods=['GET'])
@login_required
def get_dashboard_stats():
    total_comparisons = Report.query.filter_by(user_id=request.user.id).count()
    if total_comparisons == 0:
        return jsonify({
            "total_documents": 0,
            "total_comparisons": 0,
            "average_similarity": 0,
            "highest_similarity": 0,
            "flagged": 0
        }), 200
        
    all_reports = Report.query.filter_by(user_id=request.user.id).all()
    total_similarity = sum(r.overall_similarity for r in all_reports)
    avg_sim = total_similarity / total_comparisons
    highest_sim = max(r.overall_similarity for r in all_reports)
    flagged = sum(1 for r in all_reports if r.overall_similarity > 40)
    
    # Estimate total documents (assuming 2 per comparison for now)
    # Ideally should count unique filenames
    doc_set = set()
    for r in all_reports:
        for doc in r.get_documents():
            doc_set.add(doc)
            
    return jsonify({
        "total_documents": len(doc_set),
        "total_comparisons": total_comparisons,
        "average_similarity": round(avg_sim, 2),
        "highest_similarity": round(highest_sim, 2),
        "flagged": flagged
    }), 200

@api_bp.route('/report/<report_id>', methods=['GET'])
@login_required
def get_report(report_id):
    report = Report.query.filter_by(report_id=report_id, user_id=request.user.id).first()
    if not report:
        return jsonify({"error": "Report not found"}), 404
    return jsonify(report.to_dict()), 200

@api_bp.route('/report/<report_id>', methods=['DELETE'])
@login_required
def delete_report(report_id):
    report = Report.query.filter_by(report_id=report_id, user_id=request.user.id).first()
    if not report:
        return jsonify({"error": "Report not found"}), 404
        
    # Delete uploaded files on disk for safety
    try:
        upload_folder = current_app.config.get('UPLOAD_FOLDER')
        docs = report.get_documents()
        for doc in docs:
            file_path = os.path.join(upload_folder, doc)
            if os.path.exists(file_path):
                os.remove(file_path)
    except Exception as fe:
        print(f"Error deleting file on report deletion: {fe}")
        
    db.session.delete(report)
    db.session.commit()
    return jsonify({"message": "Deleted successfully"}), 200

