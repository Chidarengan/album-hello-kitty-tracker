import React, { useState, useEffect } from 'react';
import { Copy, Check, Trophy, Sparkles, Save, Heart, RefreshCw, WifiOff, XCircle, Loader2 } from 'lucide-react';
import { signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';

// --- IMPORTANTE: MANTENHA SEU IMPORT DO FIREBASE ---
import { db, auth } from './firebase';

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
  
  // Status de conexão apenas para saber se carregou (não mais para salvar auto)
  const [status, setStatus] = useState('idle');

  const appId = 'album-hk-casal';
  const TOTAL_REGULAR = 196;
  const TOTAL_HK = 20;

  const regularStickers = Array.from({ length: TOTAL_REGULAR }, (_, i) => (i + 1).toString());
  const hkStickers = Array.from({ length: TOTAL_HK }, (_, i) => `HK${i + 1}`);
  const totalStickersCount = TOTAL_REGULAR + TOTAL_HK;

  const exactProgress = (ownedStickers.length / totalStickersCount) * 100;
  const displayPercentage = exactProgress === 100 ? "100%" : `${exactProgress.toFixed(1)}%`;
  const isComplete = ownedStickers.length === totalStickersCount;

  // Autenticação
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

  // Leitura Inicial do Banco (Carregar o que já tem)
  useEffect(() => {
    if (!user || !db) return;
    
    const timer = setTimeout(() => setLoading(false), 3000); 

    const docRef = doc(db, 'artifacts', appId, 'public', 'data', 'stickers_album', 'shared');
    
    // Ouve mudanças. Se alguém salvar em outro lugar, atualiza aqui.
    const unsubscribe = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.owned) setOwnedStickers(data.owned);
      } else {
        // Se é a primeira vez, cria vazio
        setDoc(docRef, { owned: [] }, { merge: true }).catch(console.error);
      }
      setLoading(false);
      clearTimeout(timer);
    }, (err) => {
      console.error("Erro leitura:", err);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  // AÇÃO LOCAL: Só muda a cor na tela. NÃO SALVA NO BANCO AINDA.
  const toggleSticker = (id) => {
    const newOwned = ownedStickers.includes(id)
      ? ownedStickers.filter(s => s !== id)
      : [...ownedStickers, id];
    
    setOwnedStickers(newOwned);
  };

  // AÇÃO MANUAL: Botão Salvar
  const forceSave = async () => {
    if (!user) return false;
    try {
      const docRef = doc(db, 'artifacts', appId, 'public', 'data', 'stickers_album', 'shared');
      await setDoc(docRef, { owned: ownedStickers, lastUpdatedBy: user.uid, timestamp: Date.now() }, { merge: true });
      return true;
    } catch (err) { 
      console.error(err);
      return false; 
    }
  };

  return {
    user, ownedStickers, loading, status,
    regularStickers, hkStickers, totalStickersCount,
    displayPercentage, exactProgress, isComplete,
    toggleSticker, forceSave
  };
};

// --- 3. APP PRINCIPAL ---
const App = () => {
  const {
    loading, ownedStickers, regularStickers, hkStickers, totalStickersCount,
    exactProgress, isComplete, toggleSticker, forceSave
  } = useAlbum();

  const [toastMessage, setToastMessage] = useState('');
  const [showCelebration, setShowCelebration] = useState(false);
  
  // Estado do Modal de Salvamento
  const [saveModalStatus, setSaveModalStatus] = useState(null);

  useEffect(() => {
    if (isComplete && !loading) setShowCelebration(true);
  }, [isComplete, loading]);

  // --- BOTÃO SALVAR ---
  const handleManualSave = async () => {
    setSaveModalStatus('loading'); // Abre modal girando
    
    // Delay fake de 0.5s só pro usuário ver a animação acontecendo
    await new Promise(r => setTimeout(r, 500)); 

    const success = await forceSave();
    
    if (success) {
      setSaveModalStatus('success'); // Mostra sucesso
      setTimeout(() => setSaveModalStatus(null), 1500); // Fecha
    } else {
      setSaveModalStatus('error'); // Mostra erro
      setTimeout(() => setSaveModalStatus(null), 2000); // Fecha
    }
  };

  // --- BOTÃO COPIAR (Com Fallback para funcionar sempre) ---
  const copyMissingToClipboard = async () => {
    const missingRegular = regularStickers.filter(id => !ownedStickers.includes(id));
    const missingHK = hkStickers.filter(id => !ownedStickers.includes(id));

    if (missingRegular.length === 0 && missingHK.length === 0) {
      showToast("Álbum completo!");
      return;
    }

    const text = `Oi! 💕 Faltam essas:\n\n✨ Especiais: ${missingHK.length ? missingHK.join(', ') : 'Completas'}\n\n📖 Normais: ${missingRegular.length ? missingRegular.join(', ') : 'Completas'}`;
    
    try {
      // Tenta método moderno
      await navigator.clipboard.writeText(text);
      showToast("Copiado com sucesso!");
    } catch (err) {
      // Método Fallback (Funciona em navegadores antigos/celulares chatos)
      try {
        const textArea = document.createElement("textarea");
        textArea.value = text;
        
        // Evita scroll no celular ao criar o elemento
        textArea.style.top = "0";
        textArea.style.left = "0";
        textArea.style.position = "fixed";
        
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        
        const successful = document.execCommand('copy');
        document.body.removeChild(textArea);
        
        if (successful) showToast("Copiado!");
        else showToast("Erro ao copiar.");
      } catch (fallbackErr) {
        console.error("Falha total na cópia", fallbackErr);
        showToast("Erro ao copiar.");
      }
    }
  };

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3000);
  };

  if (loading) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-pink-50 relative overflow-hidden">
       <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(#ff69b4 2px, transparent 2px)', backgroundSize: '20px 20px' }}></div>
       <Loader2 className="w-10 h-10 text-pink-400 animate-spin mb-4" />
       <p className="text-pink-400 font-bold text-xl">Carregando...</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-pink-50 pb-36 font-sans relative overflow-hidden">
      
      {/* Background Decorativo */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute inset-0 bg-gradient-to-b from-pink-50 via-white to-pink-50"></div>
        <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(#ff69b4 3px, transparent 3px)', backgroundSize: '30px 30px' }}></div>
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-pink-200 rounded-full mix-blend-multiply filter blur-3xl opacity-40 animate-pulse"></div>
        <div className="absolute top-1/3 -right-20 w-80 h-80 bg-blue-100 rounded-full mix-blend-multiply filter blur-3xl opacity-40"></div>
        <div className="absolute -bottom-32 left-1/4 w-96 h-96 bg-yellow-100 rounded-full mix-blend-multiply filter blur-3xl opacity-40"></div>
      </div>

      {/* Conteúdo */}
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

        {/* Botões Flutuantes */}
        <div className="fixed bottom-6 left-0 right-0 px-4 flex gap-3 z-40 pointer-events-none max-w-2xl mx-auto">
          <button 
            onClick={handleManualSave} 
            className="pointer-events-auto flex-1 bg-[#6EC6E8] hover:bg-[#5dbfe6] text-white h-16 rounded-2xl shadow-lg shadow-blue-200 font-bold text-lg flex items-center justify-center gap-2 active:scale-95 border-4 border-white ring-2 ring-blue-100 transition-all"
          >
            <Save className="w-6 h-6" />
            <span>SALVAR</span>
          </button>

          <button
            onClick={copyMissingToClipboard}
            className="pointer-events-auto flex-1 bg-[#6EC6E8] hover:bg-[#5dbfe6] text-white h-16 rounded-2xl shadow-lg shadow-blue-200 font-bold text-lg flex items-center justify-center gap-2 active:scale-95 border-4 border-white ring-2 ring-blue-100 transition-all"
          >
            <Copy className="w-6 h-6" />
            <span>COPIAR FALTANTES</span>
          </button>
        </div>

        {/* --- MODAL POP-UP DE SALVAMENTO --- */}
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
                  <p className="text-gray-400 text-sm mt-1">Verifique sua internet</p>
                </>
              )}
            </div>
          </div>
        )}

        {/* Toast de Cópia */}
        {toastMessage && (
          <div className="fixed top-32 left-1/2 -translate-x-1/2 bg-gray-800/90 backdrop-blur text-white px-6 py-4 rounded-2xl shadow-2xl z-50 font-bold text-center text-sm animate-fade-in-down flex items-center gap-2 w-max">
            <Check className="w-4 h-4 text-green-400" />
            {toastMessage}
          </div>
        )}

        {/* Modal Parabéns */}
        {showCelebration && (
          <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4 backdrop-blur-sm" onClick={() => setShowCelebration(false)}>
            <div className="bg-white rounded-[2rem] p-8 text-center w-full max-w-sm border-4 border-white shadow-2xl relative overflow-hidden">
              <div className="absolute inset-0 bg-pink-50 opacity-50 pointer-events-none" style={{ backgroundImage: 'radial-gradient(#ffcdD2 2px, transparent 2px)', backgroundSize: '15px 15px' }}></div>
              <Trophy className="w-24 h-24 text-yellow-400 mx-auto mb-4 drop-shadow-md relative z-10" />
              <h2 className="text-3xl font-black text-pink-500 mb-2 relative z-10">Parabéns!</h2>
              <p className="text-gray-600 mb-6 font-medium relative z-10">O álbum está completo!</p>
              <button onClick={(e) => { e.stopPropagation(); setShowCelebration(false); }} className="bg-gradient-to-r from-pink-400 to-pink-500 text-white w-full py-3 rounded-xl font-bold text-lg shadow-lg relative z-10">
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