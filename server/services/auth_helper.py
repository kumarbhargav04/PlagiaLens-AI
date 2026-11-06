import hmac
import hashlib
import time
import secrets
from flask import request, session, current_app

def generate_signed_state(secret_key):
    """Generates an HMAC-signed OAuth state string."""
    ts = str(int(time.time()))
    nonce = secrets.token_hex(16)
    data = f"{ts}:{nonce}"
    sig = hmac.new(secret_key.encode('utf-8'), data.encode('utf-8'), hashlib.sha256).hexdigest()
    return f"{data}:{sig}"

def verify_signed_state(state_str, secret_key, max_age=900):
    """Verifies that the OAuth state string was signed with our secret_key and is not expired."""
    try:
        if not state_str or ':' not in state_str:
            return False
        parts = state_str.split(':')
        if len(parts) != 3:
            return False
        ts_str, nonce, sig = parts
        expected = hmac.new(secret_key.encode('utf-8'), f"{ts_str}:{nonce}".encode('utf-8'), hashlib.sha256).hexdigest()
        if not hmac.compare_digest(sig, expected):
            return False
        ts = int(ts_str)
        if abs(time.time() - ts) > max_age:
            return False
        return True
    except Exception:
        return False

def generate_auth_token(user_id, secret_key):
    """Generates an HMAC-signed Bearer auth token for cross-origin deployments."""
    ts = str(int(time.time()))
    data = f"{user_id}:{ts}"
    sig = hmac.new(secret_key.encode('utf-8'), data.encode('utf-8'), hashlib.sha256).hexdigest()
    return f"{data}:{sig}"

def verify_auth_token(token_str, secret_key, max_age=86400 * 30):
    """Verifies an HMAC-signed auth token and returns the user_id if valid."""
    try:
        if not token_str or ':' not in token_str:
            return None
        parts = token_str.split(':')
        if len(parts) != 3:
            return None
        user_id_str, ts_str, sig = parts
        expected = hmac.new(secret_key.encode('utf-8'), f"{user_id_str}:{ts_str}".encode('utf-8'), hashlib.sha256).hexdigest()
        if not hmac.compare_digest(sig, expected):
            return None
        ts = int(ts_str)
        if abs(time.time() - ts) > max_age:
            return None
        return int(user_id_str)
    except Exception:
        return None

def get_current_user_id():
    """
    Retrieves the authenticated user ID from either:
    1. HTTP Authorization Bearer token (immune to cross-domain cookie restrictions)
    2. Flask session cookie
    """
    auth_header = request.headers.get('Authorization', '')
    if auth_header.startswith('Bearer '):
        token = auth_header.split(' ', 1)[1].strip()
        uid = verify_auth_token(token, current_app.secret_key)
        if uid:
            return uid
            
    return session.get('user_id')

