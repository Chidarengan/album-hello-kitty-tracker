import { useState, useEffect } from 'react';
import { signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db, auth } from '../firebase';

export const useAlbum = (isGuest) => {
  const [user, setUser] = useState(null);
  const [ownedStickers, setOwnedStickers] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const docPath = isGuest ? 'albuns/hk_visitante' : 'albuns/hk_casal';
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
  }, [user, docPath]); // Adicionei docPath nas dependências

  const toggleSticker = (id) => {
    const newOwned = ownedStickers.includes(id)
      ? ownedStickers.filter(s => s !== id)
      : [...ownedStickers, id];
    
    setOwnedStickers(newOwned);
  };

  const forceSave = async (customList = null) => {
    if (!user || isGuest) return false; // Bloqueia salvamento para visitantes
    try {
      const listToSave = customList || ownedStickers;
      const [collectionName, docName] = docPath.split('/');
      const docRef = doc(db, collectionName, docName);
      
      await setDoc(docRef, { 
        owned: listToSave, 
        lastUpdatedBy: user.uid, 
        timestamp: Date.now() 
      }, { merge: true });
      
      if (customList) setOwnedStickers(customList);
      return true;
    } catch (error) { 
      return false; 
    }
  };

  const importMissingStickers = async (textInput) => {
    const cleanInput = textInput
      .toUpperCase()
      .replace(/[\n\r]/g, ',')
      .split(',')
      .map(s => s.trim())
      .filter(s => s !== '');

    const allStickers = [...regularStickers, ...hkStickers];
    const newOwned = allStickers.filter(id => !cleanInput.includes(id));

    return await forceSave(newOwned);
  };

  return {
    user, ownedStickers, loading,
    regularStickers, hkStickers, totalStickersCount,
    displayPercentage, exactProgress, isComplete,
    toggleSticker, forceSave, importMissingStickers
  };
};