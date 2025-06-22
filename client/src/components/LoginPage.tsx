import React from 'react';
import { useAuth } from '../hooks/useAuth';

const LoginPage: React.FC = () => {
  const { login } = useAuth();

  const handleLogin = () => {
    login('/');
  };

  return (
    <div>
      <button onClick={handleLogin} className="btn btn-small btn-success">
        Login
      </button>
    </div>
  );
};

export default LoginPage;