import React from 'react';
import { Heart } from 'lucide-react';

const StickerButton = ({ id, isOwned, toggleSticker, isSpecial }) => {
  return (
    <button
      onClick={() => toggleSticker(id)}
      className={`
        relative flex items-center justify-center rounded-2xl font-bold transition-all duration-300 transform shadow-sm
        ${isSpecial ? 'w-14 h-14 text-sm' : 'w-12 h-12 text-sm'}
        ${isOwned 
          ? 'bg-gradient-to-br from-pink-400 to-pink-500 text-white shadow-pink-200 shadow-lg scale-110 rotate-2 ring-2 ring-white' 
          : 'bg-white/80 backdrop-blur-sm text-gray-400 border-2 border-white hover:border-pink-300 hover:scale-105 active:scale-95 shadow-sm'}
      `}
    >
      {isOwned && (
        <Heart className="absolute w-3 h-3 -top-1 -right-1 text-white fill-current animate-bounce drop-shadow-md" />
      )}
      {id}
    </button>
  );
};

export default StickerButton;