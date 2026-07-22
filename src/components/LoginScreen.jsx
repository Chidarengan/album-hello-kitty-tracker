import React, { useState } from 'react';
import { Lock, ArrowRight } from 'lucide-react';

const APP_PASSWORD = import.meta.env ? import.meta.env.VITE_APP_PASSWORD : "";

const LoginScreen = ({ onLogin, onGuestLogin }) => {
  const [passwordInput, setPasswordInput] = useState('');
  const [loginError, setLoginError] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (passwordInput === APP_PASSWORD) {
      localStorage.setItem('hk_auth_token', APP_PASSWORD);
      setLoginError(false);
      onLogin();
    } else {
      setLoginError(true);
      setTimeout(() => setLoginError(false), 500);
    }
  };

  return (
    <div className="min-h-screen bg-pink-50 flex flex-col items-center justify-center p-6 relative overflow-hidden font-sans">
      <div className="bg-white/80 backdrop-blur-md p-8 rounded-3xl shadow-xl w-full max-w-sm border-4 border-white relative z-10">
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-pink-100 rounded-full flex items-center justify-center mx-auto mb-4 shadow-inner">
            <Lock className="w-10 h-10 text-pink-500" />
          </div>
          <h1 className="text-2xl font-black text-gray-700 mb-2">Álbum Secreto</h1>
          <p className="text-gray-400 text-sm">Digite a senha do casal para entrar.</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="password"
            placeholder="Senha"
            value={passwordInput}
            onChange={(e) => setPasswordInput(e.target.value)}
            className={`w-full px-6 py-4 rounded-xl border-2 bg-white text-lg outline-none transition-all placeholder:text-gray-300
              ${loginError ? 'border-red-400 bg-red-50 animate-pulse text-red-500' : 'border-pink-100 focus:border-pink-400 focus:ring-4 focus:ring-pink-100 text-gray-600'}
            `}
          />
          <button 
            type="submit"
            className="w-full bg-gradient-to-r from-pink-400 to-pink-500 text-white font-bold py-4 rounded-xl shadow-lg active:scale-95 transition-transform flex items-center justify-center gap-2"
          >
            ENTRAR <ArrowRight className="w-5 h-5" />
          </button>
          
          <button 
            type="button"
            onClick={onGuestLogin}
            className="w-full bg-white text-pink-500 font-bold py-4 rounded-xl shadow-sm border-2 border-pink-100 active:scale-95 transition-transform hover:bg-pink-50"
          >
            Testar como Visitante
          </button>
        </form>
      </div>
    </div>
  );
};

export default LoginScreen;