import os
import secrets
import urllib.parse
import hashlib
from datetime import datetime, timezone
from functools import wraps
from flask import Blueprint, request, jsonify, session, redirect, current_app
import requests
from google.oauth2 import id_token
from google.auth.transport import requests as google_requests

from models.database import db, User, AuthEvent, Report

auth_bp = Blueprint('auth', __name__)

# Simple in-memory rate limiter
RATE_LIMIT_LIMIT = 30  # max requests
RATE_LIMIT_WINDOW = 60  # per 60 seconds
ip_requests = {}

def rate_limit(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        ip = request.remote_addr
        now = datetime.now(timezone.utc).timestamp()
        
        # Clean up old timestamps
        if ip in ip_requests:
            ip_requests[ip] = [t for t in ip_requests[ip] if now - t < RATE_LIMIT_WINDOW]
        else:
            ip_requests[ip] = []
            
        if len(ip_requests[ip]) >= RATE_LIMIT_LIMIT:
            return jsonify({"error": "Too many requests. Please try again later."}), 429
            
        ip_requests[ip].append(now)
        return f(*args, **kwargs)
    return decorated_function

def log_auth_event(user_id, event_type, req):
    try:
        ip = req.remote_addr or ""
        ip_hash = hashlib.sha256(ip.encode('utf-8')).hexdigest()
        user_agent = req.headers.get('User-Agent', '')[:255]
        
        event = AuthEvent(
            user_id=user_id,
            event_type=event_type,
            ip_hash=ip_hash,
            user_agent=user_agent
        )
        db.session.add(event)
        db.session.commit()
    except Exception as e:
        print(f"Error logging auth event: {e}")

def verify_google_token(token, client_id):
    try:
        idinfo = id_token.verify_oauth2_token(token, google_requests.Request(), client_id)
        return idinfo
    except Exception as e:
        print(f"ID token verification failed: {e}")
        return None

@auth_bp.route('/google', methods=['GET'])
@rate_limit
def google_login():
    client_id = current_app.config.get('GOOGLE_CLIENT_ID')
    redirect_uri = current_app.config.get('GOOGLE_REDIRECT_URI')
    
    if not client_id or not redirect_uri:
        return jsonify({"error": "Google OAuth is not configured on the server."}), 500
        
    state = secrets.token_urlsafe(32)
    nonce = secrets.token_urlsafe(32)
    
    session['oauth_state'] = state
    session['oauth_nonce'] = nonce
    
    params = {
        'client_id': client_id,
        'redirect_uri': redirect_uri,
        'response_type': 'code',
        'scope': 'openid email profile',
        'state': state,
        'nonce': nonce,
        'access_type': 'offline',
        'prompt': 'select_account'
    }
    
    auth_url = "https://accounts.google.com/o/oauth2/v2/auth?" + urllib.parse.urlencode(params)
    return jsonify({"auth_url": auth_url})

@auth_bp.route('/google/callback', methods=['GET'])
@rate_limit
def google_callback():
    frontend_url = current_app.config.get('FRONTEND_URL', 'http://localhost:5173')
    client_id = current_app.config.get('GOOGLE_CLIENT_ID')
    client_secret = current_app.config.get('GOOGLE_CLIENT_SECRET')
    redirect_uri = current_app.config.get('GOOGLE_REDIRECT_URI')
    
    code = request.args.get('code')
    state = request.args.get('state')
    error_query = request.args.get('error')
    
    if error_query:
        log_auth_event(None, 'LOGIN_FAILURE', request)
        return redirect(f"{frontend_url}/login?error={urllib.parse.quote('Google sign-in was cancelled.')}")
        
    stored_state = session.get('oauth_state')
    
    if not stored_state or state != stored_state:
        log_auth_event(None, 'LOGIN_FAILURE', request)
        return redirect(f"{frontend_url}/login?error={urllib.parse.quote('Authentication state mismatch. Security violation.')}")
        
    # Clear state from session
    session.pop('oauth_state', None)
    
    # Exchange authorization code for token
    token_url = "https://oauth2.googleapis.com/token"
    token_data = {
        'code': code,
        'client_id': client_id,
        'client_secret': client_secret,
        'redirect_uri': redirect_uri,
        'grant_type': 'authorization_code'
    }
    
    try:
        token_res = requests.post(token_url, data=token_data, timeout=10)
        if token_res.status_code != 200:
            log_auth_event(None, 'LOGIN_FAILURE', request)
            return redirect(f"{frontend_url}/login?error={urllib.parse.quote('Failed to exchange Google authorization code.')}")
            
        token_json = token_res.json()
        id_jwt = token_json.get('id_token')
        
        idinfo = verify_google_token(id_jwt, client_id)
        if not idinfo:
            log_auth_event(None, 'LOGIN_FAILURE', request)
            return redirect(f"{frontend_url}/login?error={urllib.parse.quote('Failed to verify Google identity token.')}")
            
        sub = idinfo.get('sub')
        email = idinfo.get('email')
        name = idinfo.get('name')
        picture = idinfo.get('picture')
        email_verified = idinfo.get('email_verified')
        
        if not email_verified:
            log_auth_event(None, 'LOGIN_FAILURE', request)
            return redirect(f"{frontend_url}/login?error={urllib.parse.quote('Google account email is not verified.')}")
            
        # Domain Restriction
        allowed_domain = current_app.config.get('ALLOWED_GOOGLE_DOMAIN')
        if allowed_domain:
            domain = email.split('@')[-1]
            if domain.lower() != allowed_domain.lower():
                log_auth_event(None, 'LOGIN_FAILURE', request)
                return redirect(f"{frontend_url}/login?error={urllib.parse.quote(f'Access restricted to accounts from domain: {allowed_domain}')}")
                
        user = User.query.filter_by(google_sub=sub).first()
        if not user:
            # Create user (first-time login)
            user = User(
                google_sub=sub,
                email=email,
                name=name,
                avatar_url=picture,
                email_verified=email_verified
            )
            db.session.add(user)
        else:
            # Returning user: update details and last login time
            user.name = name
            user.avatar_url = picture
            user.last_login_at = datetime.now(timezone.utc)
            
        db.session.commit()
        
        # Start user session
        session['user_id'] = user.id
        session.permanent = True
        log_auth_event(user.id, 'LOGIN_SUCCESS', request)
        return redirect(f"{frontend_url}/")
        
    except Exception as e:
        print(f"Exception during OAuth callback: {e}")
        log_auth_event(None, 'LOGIN_FAILURE', request)
        return redirect(f"{frontend_url}/login?error={urllib.parse.quote('An unexpected error occurred during login.')}")

@auth_bp.route('/logout', methods=['POST'])
@rate_limit
def logout():
    user_id = session.get('user_id')
    if user_id:
        log_auth_event(user_id, 'LOGOUT', request)
    session.clear()
    return jsonify({"success": True, "message": "Logged out successfully"}), 200

@auth_bp.route('/me', methods=['GET'])
@rate_limit
def get_me():
    user_id = session.get('user_id')
    if not user_id:
        return jsonify({"authenticated": False}), 200
        
    user = db.session.get(User, user_id)
    if not user:
        session.clear()
        return jsonify({"authenticated": False}), 200
        
    return jsonify({
        "authenticated": True,
        "user": user.to_dict()
    }), 200

@auth_bp.route('/delete-account', methods=['DELETE'])
@rate_limit
def delete_account():
    user_id = session.get('user_id')
    if not user_id:
        return jsonify({"error": "Unauthorized"}), 401
        
    user = db.session.get(User, user_id)
    if not user:
        session.clear()
        return jsonify({"error": "User not found"}), 404
        
    try:
        # File Cleanup: delete user files on disk
        reports = Report.query.filter_by(user_id=user.id).all()
        upload_folder = current_app.config.get('UPLOAD_FOLDER')
        
        for r in reports:
            try:
                docs = r.get_documents()
                for doc in docs:
                    file_path = os.path.join(upload_folder, doc)
                    if os.path.exists(file_path):
                        os.remove(file_path)
            except Exception as fe:
                print(f"File cleanup error: {fe}")
                
        # Delete user (cascades database report rows automatically)
        db.session.delete(user)
        db.session.commit()
        session.clear()
        
        return jsonify({"success": True, "message": "Account deleted successfully"}), 200
        
    except Exception as e:
        print(f"Error deleting user account: {e}")
        db.session.rollback()
        return jsonify({"error": "Failed to delete account."}), 500
