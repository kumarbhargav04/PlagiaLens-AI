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
from services.auth_helper import get_current_user_id

api_bp = Blueprint('api', __name__)

ALLOWED_EXTENSIONS = {'txt', 'pdf', 'doc', 'docx'}

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def login_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        user_id = get_current_user_id()
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
        return jsonify({"error": "No files provided for comparison."}), 400
        
    files = request.files.getlist('files')
    
    if len(files) < 2:
        return jsonify({"error": "At least 2 files are required for comparison (supports 2 or more files)."}), 400
        
    processed_docs = []
    
    # Process files safely with collision prevention
    for file in files:
        if file and allowed_file(file.filename):
            orig_name = secure_filename(file.filename) or "document"
            unique_filename = f"{uuid.uuid4().hex[:8]}_{orig_name}"
            filepath = os.path.join(current_app.config['UPLOAD_FOLDER'], unique_filename)
            file.save(filepath)
            
            try:
                raw_text = process_document(filepath)
                if not raw_text or len(raw_text.strip()) < 10:
                    return jsonify({
                        "error": f"Document '{orig_name}' contains no readable text. If this is a scanned PDF, please upload a text-based document."
                    }), 400
                    
                processed_text = preprocess_text(raw_text)
                if not processed_text:
                    return jsonify({
                        "error": f"Document '{orig_name}' contains insufficient words to analyze."
                    }), 400
                    
                processed_docs.append({
                    "name": orig_name,
                    "storage_name": unique_filename,
                    "raw_text": raw_text,
                    "processed_text": processed_text,
                    "keywords": extract_keywords(raw_text)
                })
            except ValueError as ve:
                return jsonify({"error": f"Error in {orig_name}: {str(ve)}"}), 400
            except Exception as e:
                print(f"Error processing {orig_name}: {e}")
                return jsonify({"error": f"Error processing {orig_name}: {str(e)}"}), 500
        else:
            return jsonify({"error": f"Invalid format for '{file.filename}'. Supported formats: PDF, DOCX, TXT."}), 400

    if len(processed_docs) < 2:
        return jsonify({"error": "At least 2 readable documents are required to perform comparison."}), 400

    N = len(processed_docs)
    comparisons = []
    matrix = [[100.0 if i == j else 0.0 for j in range(N)] for i in range(N)]

    # Pairwise comparison across all pairs (i, j) where i < j
    for i in range(N):
        for j in range(i + 1, N):
            doc_i = processed_docs[i]
            doc_j = processed_docs[j]
            
            pair_scores = calculate_all_similarities(doc_i['processed_text'], doc_j['processed_text'])
            pair_matches = find_matching_sentences(doc_i['raw_text'], doc_j['raw_text'])
            pair_verdict = get_verdict(pair_scores['overall'])
            
            comparisons.append({
                "doc1_idx": i,
                "doc2_idx": j,
                "doc1_name": doc_i['name'],
                "doc2_name": doc_j['name'],
                "scores": pair_scores,
                "overall": pair_scores['overall'],
                "verdict": pair_verdict,
                "matches": pair_matches
            })
            
            matrix[i][j] = pair_scores['overall']
            matrix[j][i] = pair_scores['overall']

    # Sort comparisons by overall similarity descending so highest similarity pair comes first
    comparisons.sort(key=lambda c: c['overall'], reverse=True)
    top_pair = comparisons[0]

    # Overall metrics default to top matching pair
    scores = top_pair['scores']
    verdict = top_pair['verdict']
    matches = top_pair['matches']
    overall_sim = top_pair['overall']

    # Save Report
    report_id = str(uuid.uuid4())
    new_report = Report(
        report_id=report_id,
        user_id=request.user.id,
        overall_similarity=overall_sim,
        verdict=verdict
    )
    new_report.set_documents([d['storage_name'] for d in processed_docs])
    
    # Store scores and multi-doc metadata in algorithm_scores
    stored_scores = dict(scores)
    stored_scores["is_multi"] = (N > 2)
    stored_scores["doc_count"] = N
    stored_scores["doc_names"] = [d['name'] for d in processed_docs]
    stored_scores["matrix"] = matrix
    stored_scores["comparisons"] = [
        {
            "doc1_idx": c["doc1_idx"],
            "doc2_idx": c["doc2_idx"],
            "doc1_name": c["doc1_name"],
            "doc2_name": c["doc2_name"],
            "overall": c["overall"],
            "verdict": c["verdict"],
            "scores": c["scores"],
            "matches": c["matches"][:50]
        }
        for c in comparisons
    ]

    new_report.set_algorithm_scores(stored_scores)
    new_report.set_matched_sentences(matches)
    
    db.session.add(new_report)
    db.session.commit()
    
    return jsonify({
        "report_id": report_id,
        "is_multi": (N > 2),
        "doc_count": N,
        "documents": [
            {
                "id": idx,
                "name": d['name'],
                "text": d['raw_text'],
                "keywords": d['keywords']
            }
            for idx, d in enumerate(processed_docs)
        ],
        "scores": scores,
        "matches": matches,
        "verdict": verdict,
        "comparisons": comparisons,
        "matrix": matrix,
        "highest_pair": {
            "doc1_name": top_pair["doc1_name"],
            "doc2_name": top_pair["doc2_name"],
            "overall": top_pair["overall"],
            "verdict": top_pair["verdict"]
        }
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
    data = report.to_dict()
    alg = data.get('algorithm_scores', {})
    if isinstance(alg, dict) and alg.get('is_multi'):
        data['is_multi'] = True
        data['comparisons'] = alg.get('comparisons', [])
        data['matrix'] = alg.get('matrix', [])
        data['doc_names'] = alg.get('doc_names', [])
    return jsonify(data), 200

@api_bp.route('/report/<report_id>', methods=['DELETE'])
@login_required
def delete_report(report_id):
    report = Report.query.filter_by(report_id=report_id, user_id=request.user.id).first()
    if not report:
        return jsonify({"error": "Report not found"}), 404
        
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
