import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import './LoginPage.css';

export default function LoginPage({ onLoginSuccess }) {
  const { login, loading, error: authError } = useAuth();
  const [email, setEmail] = useState('rider@example.com'); // Pre-fill for testing
  const [password, setPassword] = useState('ride1234'); // Pre-fill for testing
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    try {
      await login(email, password);
      if (onLoginSuccess) {
        onLoginSuccess();
      }
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="login-page">
      <div className="login-container">
        <div className="login-header">
          <h1>CodeCruise</h1>
          <p>Welcome back! Please login to continue.</p>
        </div>

        <form className="login-form" onSubmit={handleSubmit}>
          {(error || authError) && (
            <div className="error-message">
              {error || authError}
            </div>
          )}

          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              required
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              required
              disabled={loading}
            />
          </div>

          <button
            type="submit"
            className="login-button"
            disabled={loading}
          >
            {loading ? 'Logging in...' : 'Login'}
          </button>

          <div className="demo-credentials">
            <p className="demo-label">Demo Credentials:</p>
            <p>Email: rider@example.com</p>
            <p>Password: ride1234</p>
          </div>
        </form>
      </div>
    </div>
  );
}
