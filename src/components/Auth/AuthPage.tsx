import React, { useState } from 'react';
import { Wallet } from 'lucide-react';
import { LoginForm } from './LoginForm';
import { SignUpForm } from './SignUpForm';

export const AuthPage: React.FC = () => {
  const [isLogin, setIsLogin] = useState(true);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="flex items-center justify-center gap-3 mb-8">
            <div className="bg-blue-600 p-3 rounded-lg">
              <Wallet className="text-white" size={28} />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">FinTrack</h1>
          </div>

          <p className="text-center text-gray-600 mb-8">
            Управляйте своими финансами легко и разумно
          </p>

          {isLogin ? (
            <LoginForm onSignUp={() => setIsLogin(false)} />
          ) : (
            <SignUpForm onLogin={() => setIsLogin(true)} />
          )}
        </div>
      </div>
    </div>
  );
};
