import unittest
import json
from datetime import datetime
from flask import session
from app import create_app
from models.database import db, User, Report, AuthEvent

class AuthTestCase(unittest.TestCase):
    def setUp(self):
        self.app = create_app()
        # Set database URI to an in-memory SQLite database for testing
        self.app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///:memory:'
        self.app.config['TESTING'] = True
        self.app.config['SESSION_COOKIE_SECURE'] = False
        self.app.config['GOOGLE_CLIENT_ID'] = 'test-client-id'
        self.app.config['GOOGLE_CLIENT_SECRET'] = 'test-client-secret'
        self.app.config['GOOGLE_REDIRECT_URI'] = 'http://localhost:5000/api/auth/google/callback'
        self.app.config['ALLOWED_GOOGLE_DOMAIN'] = ''
        
        self.client = self.app.test_client()
        self.ctx = self.app.app_context()
        self.ctx.push()
        
        db.create_all()
        
    def tearDown(self):
        db.session.remove()
        db.drop_all()
        self.ctx.pop()
        
    def test_google_login_url(self):
        """Test OAuth redirect URL generation and state initialization."""
        res = self.client.get('/api/auth/google')
        self.assertEqual(res.status_code, 200)
        data = res.json
        self.assertIn('auth_url', data)
        self.assertIn('client_id=test-client-id', data['auth_url'])
        self.assertIn('redirect_uri=http%3A%2F%2Flocalhost%3A5000%2Fapi%2Fauth%2Fgoogle%2Fcallback', data['auth_url'])
        
        # Verify OAuth state parameters are saved in session
        with self.client.session_transaction() as sess:
            self.assertIn('oauth_state', sess)
            self.assertIn('oauth_nonce', sess)

    def test_callback_invalid_state(self):
        """Test that callbacks with mismatching OAuth states are securely rejected."""
        with self.client.session_transaction() as sess:
            sess['oauth_state'] = 'correct-state'
            
        res = self.client.get('/api/auth/google/callback?code=testcode&state=mismatching-state')
        self.assertEqual(res.status_code, 302)
        # Should redirect back to frontend login with security warning
        self.assertIn('/login?error=Authentication%20state%20mismatch.%20Security%20violation.', res.headers['Location'])

    def test_auth_me_and_logout(self):
        """Test session status resolution (/auth/me) and logout execution."""
        # 1. Unauthenticated state check
        res = self.client.get('/api/auth/me')
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json['authenticated'], False)
        
        # 2. Add local user
        user = User(
            google_sub='google-sub-999',
            email='testuser@example.com',
            name='Test Account',
            avatar_url='http://example.com/avatar.png',
            email_verified=True
        )
        db.session.add(user)
        db.session.commit()
        
        # 3. Simulate logging in by setting session variable
        with self.client.session_transaction() as sess:
            sess['user_id'] = user.id
            
        # 4. Authenticated check
        res = self.client.get('/api/auth/me')
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json['authenticated'], True)
        self.assertEqual(res.json['user']['email'], 'testuser@example.com')
        self.assertEqual(res.json['user']['name'], 'Test Account')
        
        # 5. Log out
        res = self.client.post('/api/auth/logout')
        self.assertEqual(res.status_code, 200)
        self.assertTrue(res.json['success'])
        
        # 6. Re-check authentication status
        res = self.client.get('/api/auth/me')
        self.assertEqual(res.json['authenticated'], False)

    def test_report_authorization_and_ownership(self):
        """Verify strict authorization checks for endpoints, preventing unauthorized resource leak."""
        # 1. Create two separate users
        u1 = User(google_sub='sub-111', email='u1@example.com', name='User 1', email_verified=True)
        u2 = User(google_sub='sub-222', email='u2@example.com', name='User 2', email_verified=True)
        db.session.add_all([u1, u2])
        db.session.commit()
        
        # 2. Add reports belonging to users
        r1 = Report(
            report_id='report-u1',
            user_id=u1.id,
            overall_similarity=12.5,
            verdict='Original',
            documents='["docA.txt", "docB.txt"]',
            algorithm_scores='{"cosine": 12.5, "overall": 12.5}'
        )
        r2 = Report(
            report_id='report-u2',
            user_id=u2.id,
            overall_similarity=85.0,
            verdict='Plagiarized',
            documents='["docX.txt", "docY.txt"]',
            algorithm_scores='{"cosine": 85.0, "overall": 85.0}'
        )
        db.session.add_all([r1, r2])
        db.session.commit()

        # Test A: Accessing protected endpoints unauthenticated gets 401
        res = self.client.get('/api/history')
        self.assertEqual(res.status_code, 401)
        res = self.client.get('/api/report/report-u1')
        self.assertEqual(res.status_code, 401)
        
        # Authenticate as User 1
        with self.client.session_transaction() as sess:
            sess['user_id'] = u1.id

        # Test B: User 1 history includes ONLY User 1 reports
        res = self.client.get('/api/history')
        self.assertEqual(res.status_code, 200)
        reports = res.json
        self.assertEqual(len(reports), 1)
        self.assertEqual(reports[0]['report_id'], 'report-u1')

        # Test C: User 1 stats match only User 1 dashboard metrics
        res = self.client.get('/api/dashboard')
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json['total_comparisons'], 1)
        self.assertEqual(res.json['highest_similarity'], 12.5)

        # Test D: User 1 cannot access User 2's reports (gets 404 to avoid information disclosure)
        res = self.client.get('/api/report/report-u2')
        self.assertEqual(res.status_code, 404)

        # Test E: User 1 cannot delete User 2's reports (gets 404)
        res = self.client.delete('/api/report/report-u2')
        self.assertEqual(res.status_code, 404)

        # Test F: User 1 deletes own report successfully
        res = self.client.delete('/api/report/report-u1')
        self.assertEqual(res.status_code, 200)
        self.assertIsNone(Report.query.filter_by(report_id='report-u1').first())

if __name__ == '__main__':
    unittest.main()
