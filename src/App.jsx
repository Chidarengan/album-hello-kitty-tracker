import React, { useState, useEffect, useRef } from 'react';
import { Copy, Check, Trophy, Sparkles, Save, Heart, XCircle, Loader2, Lock, ArrowRight, Upload } from 'lucide-react';
import { signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';

// O erro aqui no chat é esperado. No seu VS Code vai funcionar.
import { db, auth } from './firebase';

// ==========================================
// 🔐 CONFIGURAÇÃO DA SENHA (SEGURA)
// ==========================================
// O código busca a senha no arquivo .env
// Se não encontrar (caso do chat), usa uma string vazia para não quebrar
const APP_PASSWORD = import.meta.env ? import.meta.env.VITE_APP_PASSWORD : ""; 
// ==========================================

// --- 1. COMPONENTE: BOTÃO DA FIGURINHA ---
const StickerButton = ({ id, isSpecial, isOwned, toggleSticker }) => {
  return (
    <button
      onClick={() => toggleSticker(id)}
      className={`
        relative w-full aspect-square flex items-center justify-center rounded-2xl font-bold shadow-sm touch-manipulation transition-transform active:scale-95
        ${isSpecial ? 'text-xl sm:text-2xl' : 'text-lg sm:text-xl'}
        ${isOwned 
          ? 'bg-pink-400 text-white border-4 border-pink-200 shadow-pink-200' 
          : 'bg-white/80 backdrop-blur-sm text-gray-400 border-2 border-white hover:border-pink-200'}
      `}
      style={{ fontFamily: '"Varela Round", sans-serif' }}
    >
      {isOwned && (
        <div className="absolute top-1 right-1 bg-white rounded-full p-0.5 shadow-sm">
           <Heart className="w-3 h-3 text-red-500 fill-current" />
        </div>
      )}
      {id}
    </button>
  );
};

// --- 2. LÓGICA (Hook) ---
const useAlbum = () => {
  const [user, setUser] = useState(null);
  const [ownedStickers, setOwnedStickers] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const docPath = 'albuns/hk_casal';
  const TOTAL_REGULAR = 196;
  const TOTAL_HK = 20;

  const regularStickers = Array.from({ length: TOTAL_REGULAR }, (_, i) => (i + 1).toString());
  const hkStickers = Array.from({ length: TOTAL_HK }, (_, i) => `HK${i + 1}`);
  const totalStickersCount = TOTAL_REGULAR + TOTAL_HK;

  const exactProgress = (ownedStickers.length / totalStickersCount) * 100;
  const displayPercentage = exactProgress === 100 ? "100%" : `${exactProgress.toFixed(1)}%`;
  const isComplete = ownedStickers.length === totalStickersCount;

  useEffect(() => {
    const initAuth = async () => {
      try {
        if (auth && !auth.currentUser) await signInAnonymously(auth);
      } catch (error) {
        console.error("Erro Auth:", error);
      }
    };
    initAuth();
    const unsubscribe = onAuthStateChanged(auth, setUser);
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user || !db) return;
    
    const timer = setTimeout(() => setLoading(false), 5000); 
    const [collectionName, docName] = docPath.split('/');
    const docRef = doc(db, collectionName, docName);
    
    const unsubscribe = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.owned) setOwnedStickers(data.owned);
      }
      setLoading(false);
      clearTimeout(timer);
    }, (err) => {
      console.error("Erro leitura:", err);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  const toggleSticker = (id) => {
    const newOwned = ownedStickers.includes(id)
      ? ownedStickers.filter(s => s !== id)
      : [...ownedStickers, id];
    
    setOwnedStickers(newOwned);
  };

  // Função genérica de salvar (aceita lista customizada)
  const forceSave = async (customList = null) => {
    if (!user) return false;
    try {
      const listToSave = customList || ownedStickers;
      const [collectionName, docName] = docPath.split('/');
      const docRef = doc(db, collectionName, docName);
      
      await setDoc(docRef, { 
        owned: listToSave, 
        lastUpdatedBy: user.uid, 
        timestamp: Date.now() 
      }, { merge: true });
      
      // Se foi uma importação, atualiza o estado local também
      if (customList) setOwnedStickers(customList);
      
      return true;
    } catch (error) { 
      console.error("Erro detalhado do Firebase:", error);
      return false; 
    }
  };

  // --- NOVA LÓGICA: IMPORTAR FALTANTES ---
  const importMissingStickers = async (textInput) => {
    // 1. Limpa o texto (remove espaços, quebras de linha)
    const cleanInput = textInput
      .toUpperCase()
      .replace(/[\n\r]/g, ',') // Troca enter por vírgula
      .split(',')
      .map(s => s.trim())
      .filter(s => s !== ''); // Remove vazios

    // 2. Cria lista de TODAS as figurinhas
    const allStickers = [...regularStickers, ...hkStickers];

    // 3. Matemática: Se NÃO está na lista de input (faltantes), então tenho.
    const newOwned = allStickers.filter(id => !cleanInput.includes(id));

    // 4. Salva no banco
    return await forceSave(newOwned);
  };

  return {
    user, ownedStickers, loading,
    regularStickers, hkStickers, totalStickersCount,
    displayPercentage, exactProgress, isComplete,
    toggleSticker, forceSave, importMissingStickers
  };
};

// --- 3. APP PRINCIPAL ---
const App = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [loginError, setLoginError] = useState(false);

  const {
    loading, ownedStickers, regularStickers, hkStickers, totalStickersCount,
    exactProgress, isComplete, toggleSticker, forceSave, importMissingStickers
  } = useAlbum();

  const [toastMessage, setToastMessage] = useState('');
  const [showCelebration, setShowCelebration] = useState(false);
  const [saveModalStatus, setSaveModalStatus] = useState(null);
  
  // Estado do Modal de Importação
  const [showImportModal, setShowImportModal] = useState(false);
  const [importText, setImportText] = useState('');

  const hasCelebrated = useRef(false);

  useEffect(() => {
    const savedAuth = localStorage.getItem('hk_auth_token');
    // Verifica se a senha salva bate com a variável de ambiente
    if (savedAuth && savedAuth === APP_PASSWORD) {
      setIsAuthenticated(true);
    }
  }, []);

  const handleLogin = (e) => {
    e.preventDefault();
    if (passwordInput === APP_PASSWORD) {
      setIsAuthenticated(true);
      localStorage.setItem('hk_auth_token', APP_PASSWORD);
      setLoginError(false);
    } else {
      setLoginError(true);
      setTimeout(() => setLoginError(false), 500);
    }
  };

  useEffect(() => {
    if (isComplete && !loading && !hasCelebrated.current) {
        setShowCelebration(true);
        hasCelebrated.current = true;
    }
    if (!isComplete) {
        hasCelebrated.current = false;
    }
  }, [isComplete, loading]);

  const handleManualSave = async () => {
    setSaveModalStatus('loading');
    await new Promise(r => setTimeout(r, 800)); 
    const success = await forceSave();
    if (success) {
      setSaveModalStatus('success');
      setTimeout(() => setSaveModalStatus(null), 1500);
    } else {
      setSaveModalStatus('error');
      setTimeout(() => setSaveModalStatus(null), 2500);
    }
  };

  // --- AÇÃO DO BOTÃO IMPORTAR ---
  const handleImport = async () => {
    if (!importText.trim()) return;
    
    setShowImportModal(false); // Fecha modal de input
    setSaveModalStatus('loading'); // Abre modal de salvando
    
    const success = await importMissingStickers(importText);
    
    if (success) {
      setSaveModalStatus('success');
      setImportText(''); // Limpa texto
      setTimeout(() => setSaveModalStatus(null), 1500);
    } else {
      setSaveModalStatus('error');
      setTimeout(() => setSaveModalStatus(null), 2500);
    }
  };

  const copyMissingToClipboard = async () => {
    const missingRegular = regularStickers.filter(id => !ownedStickers.includes(id));
    const missingHK = hkStickers.filter(id => !ownedStickers.includes(id));

    if (missingRegular.length === 0 && missingHK.length === 0) {
      showToast("Álbum completo!");
      return;
    }
    const text = `Oi! 💕 Faltam essas:\n\n✨ Especiais: ${missingHK.length ? missingHK.join(', ') : 'Completas'}\n\n📖 Normais: ${missingRegular.length ? missingRegular.join(', ') : 'Completas'}`;
    
    try {
      await navigator.clipboard.writeText(text);
      showToast("Copiado com sucesso!");
    } catch (err) {
      try {
        const textArea = document.createElement("textarea");
        textArea.value = text;
        textArea.style.position = "fixed"; 
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        showToast("Copiado!");
      } catch (fallbackErr) {
        showToast("Erro ao copiar.");
      }
    }
  };

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3000);
  };

  if (!isAuthenticated) {
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
          <form onSubmit={handleLogin} className="space-y-4">
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
          </form>
        </div>
      </div>
    );
  }

  if (loading) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-pink-50 relative overflow-hidden">
       <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(#ff69b4 2px, transparent 2px)', backgroundSize: '20px 20px' }}></div>
       <Loader2 className="w-10 h-10 text-pink-400 animate-spin mb-4" />
       <p className="text-pink-400 font-bold text-xl">Carregando...</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-pink-50 pb-40 font-sans relative overflow-hidden">
      
      {/* Background */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute inset-0 bg-gradient-to-b from-pink-50 via-white to-pink-50"></div>
        <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(#ff69b4 3px, transparent 3px)', backgroundSize: '30px 30px' }}></div>
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-pink-200 rounded-full mix-blend-multiply filter blur-3xl opacity-40 animate-pulse"></div>
        <div className="absolute top-1/3 -right-20 w-80 h-80 bg-blue-100 rounded-full mix-blend-multiply filter blur-3xl opacity-40"></div>
        <div className="absolute -bottom-32 left-1/4 w-96 h-96 bg-yellow-100 rounded-full mix-blend-multiply filter blur-3xl opacity-40"></div>
      </div>

      <div className="relative z-10 max-w-2xl mx-auto px-4">
        
        {/* Cabeçalho */}
        <div className="sticky top-0 z-30 pt-4 pb-2">
          <div className="bg-white/80 backdrop-blur-md rounded-2xl p-4 shadow-sm border border-white">
            <div className="flex justify-between items-center mb-2">
              <h1 className="text-2xl font-black text-gray-700 tracking-tight flex items-center gap-2">
                <span>🎀</span> Álbum HK
              </h1>
              <div className="flex items-center gap-3">
                <span className="bg-pink-100 text-pink-600 font-bold text-sm px-3 py-1 rounded-full border border-pink-200 shadow-inner">
                  {ownedStickers.length}/{totalStickersCount}
                </span>
              </div>
            </div>
            <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden border border-gray-200">
              <div 
                className="h-full bg-gradient-to-r from-pink-300 via-pink-400 to-pink-500 transition-all duration-300"
                style={{ width: `${exactProgress}%` }}
              />
            </div>
          </div>
        </div>

        {/* Lista */}
        <div className="space-y-8 mt-6">
          <div>
            <h2 className="text-pink-500 font-black text-xl mb-4 flex items-center gap-2 bg-white/60 w-max px-4 py-1 rounded-full backdrop-blur-sm border border-white">
              <Sparkles className="w-5 h-5 fill-current text-yellow-400" /> Especiais
            </h2>
            <div className="grid grid-cols-4 gap-3">
              {hkStickers.map(id => <StickerButton key={id} id={id} isSpecial={true} isOwned={ownedStickers.includes(id)} toggleSticker={toggleSticker} />)}
            </div>
          </div>

          <div className="flex items-center justify-center gap-2 opacity-50">
            <div className="h-px bg-pink-300 w-12 rounded-full"></div>
            <Heart className="w-4 h-4 text-pink-300" />
            <div className="h-px bg-pink-300 w-12 rounded-full"></div>
          </div>

          <div>
            <h2 className="text-gray-600 font-black text-xl mb-4 flex items-center gap-2 bg-white/60 w-max px-4 py-1 rounded-full backdrop-blur-sm border border-white">
              📖 Normais
            </h2>
            <div className="grid grid-cols-5 gap-2">
              {regularStickers.map(id => <StickerButton key={id} id={id} isSpecial={false} isOwned={ownedStickers.includes(id)} toggleSticker={toggleSticker} />)}
            </div>
          </div>
        </div>

        {/* Botões Flutuantes (Footer) */}
        <div className="fixed bottom-6 left-0 right-0 px-4 flex gap-2 z-40 pointer-events-none max-w-2xl mx-auto">
          <button 
            onClick={handleManualSave} 
            className="pointer-events-auto flex-1 bg-[#6EC6E8] hover:bg-[#5dbfe6] text-white h-16 rounded-2xl shadow-lg shadow-blue-200 font-bold text-lg flex items-center justify-center gap-2 active:scale-95 border-4 border-white transition-all"
          >
            <Save className="w-6 h-6" />
            <span>SALVAR</span>
          </button>

          <button
            onClick={copyMissingToClipboard}
            className="pointer-events-auto flex-1 bg-[#6EC6E8] hover:bg-[#5dbfe6] text-white h-16 rounded-2xl shadow-lg shadow-blue-200 font-bold text-lg flex items-center justify-center gap-2 active:scale-95 border-4 border-white transition-all"
          >
            <Copy className="w-6 h-6" />
            <span>COPIAR</span>
          </button>

          {/* Botão de Importar Pequeno */}
          <button
            onClick={() => setShowImportModal(true)}
            className="pointer-events-auto w-16 bg-pink-400 hover:bg-pink-500 text-white h-16 rounded-2xl shadow-lg shadow-pink-200 flex items-center justify-center active:scale-95 border-4 border-white transition-all"
          >
            <Upload className="w-7 h-7" />
          </button>
        </div>

        {/* --- MODAL DE IMPORTAÇÃO --- */}
        {showImportModal && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl p-6 shadow-2xl w-full max-w-sm animate-bounce-in border-4 border-white">
              <h3 className="text-xl font-black text-gray-700 mb-2">Importar Faltantes</h3>
              <p className="text-gray-400 text-sm mb-4">
                Cole a lista de números que você <strong>NÃO</strong> tem (separados por vírgula).<br/>
                <span className="text-xs text-pink-500 font-bold">Aviso: Isso vai substituir sua lista atual.</span>
              </p>
              
              <textarea 
                value={importText}
                onChange={(e) => setImportText(e.target.value)}
                placeholder="Ex: HK1, 5, 10, 15, HK20..."
                className="w-full h-32 p-4 border-2 border-gray-200 rounded-xl mb-4 text-gray-700 focus:border-pink-400 outline-none resize-none bg-gray-50 text-sm"
              />

              <div className="flex gap-2">
                <button 
                  onClick={() => setShowImportModal(false)}
                  className="flex-1 py-3 font-bold text-gray-400 hover:bg-gray-100 rounded-xl transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  onClick={handleImport}
                  className="flex-1 bg-pink-500 text-white py-3 rounded-xl font-bold shadow-lg shadow-pink-200 active:scale-95 transition-transform"
                >
                  Processar
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modais de Status e Toast */}
        {saveModalStatus && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl p-8 shadow-2xl flex flex-col items-center justify-center min-w-[250px] animate-bounce-in border-4 border-white">
              {saveModalStatus === 'loading' && (
                <>
                  <Loader2 className="w-12 h-12 text-blue-400 animate-spin mb-4" />
                  <p className="text-gray-600 font-bold text-lg">Salvando dados...</p>
                </>
              )}
              {saveModalStatus === 'success' && (
                <>
                  <div className="bg-green-100 p-3 rounded-full mb-4 animate-bounce">
                    <Check className="w-8 h-8 text-green-500" />
                  </div>
                  <p className="text-gray-800 font-bold text-lg">Salvo com sucesso!</p>
                </>
              )}
              {saveModalStatus === 'error' && (
                <>
                  <div className="bg-red-100 p-3 rounded-full mb-4">
                    <XCircle className="w-8 h-8 text-red-500" />
                  </div>
                  <p className="text-red-500 font-bold text-lg">Erro ao salvar!</p>
                </>
              )}
            </div>
          </div>
        )}

        {toastMessage && (
          <div className="fixed top-32 left-1/2 -translate-x-1/2 bg-gray-800/90 backdrop-blur text-white px-6 py-4 rounded-2xl shadow-2xl z-50 font-bold text-center text-sm animate-fade-in-down flex items-center gap-2 w-max">
            <Check className="w-4 h-4 text-green-400" />
            {toastMessage}
          </div>
        )}

        {showCelebration && (
          <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4 backdrop-blur-sm" onClick={() => setShowCelebration(false)}>
            <div className="bg-white rounded-[2rem] p-8 text-center w-full max-w-sm border-4 border-white shadow-2xl relative overflow-hidden">
              <div className="absolute inset-0 bg-pink-50 opacity-50 pointer-events-none" style={{ backgroundImage: 'radial-gradient(#ffcdD2 2px, transparent 2px)', backgroundSize: '15px 15px' }}></div>
              <Trophy className="w-24 h-24 text-yellow-400 mx-auto mb-4 animate-bounce" />
              <h2 className="text-3xl font-black text-pink-500 mb-2">Parabéns!</h2>
              <p className="text-gray-600 mb-6 font-medium">O álbum está completo!</p>
              <button onClick={(e) => { e.stopPropagation(); setShowCelebration(false); }} className="bg-gradient-to-r from-pink-400 to-pink-500 text-white w-full py-3 rounded-xl font-bold text-lg shadow-lg">
                Uhuuul! 🎉
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default App;