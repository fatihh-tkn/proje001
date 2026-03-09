import React, { useState } from 'react';
import { Sparkles, ArrowUp } from 'lucide-react';
import { motion } from 'framer-motion';

const ChatInput = () => {
  const [message, setMessage] = useState('');

  return (
    <div className="p-6 bg-gradient-to-t from-[#0f172a] via-[#0f172a] to-transparent flex justify-center w-full shrink-0">
      <motion.div 
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="w-full max-w-3xl relative"
      >
        <div className="relative bg-[#1e293b] rounded-2xl shadow-xl border border-slate-700 overflow-hidden focus-within:ring-2 focus-within:ring-teal-500/50 transition-all">
          <textarea
            className="w-full max-h-40 min-h-[56px] p-4 pr-14 resize-none outline-none text-slate-200 bg-transparent text-sm custom-scrollbar placeholder:text-slate-500"
            placeholder="Ne bilmek istersiniz?"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={1}
          />
          <button className="absolute right-3 bottom-3 w-8 h-8 flex items-center justify-center rounded-full bg-teal-600 text-white hover:bg-teal-500 transition-colors shadow-lg">
            <ArrowUp className="w-4 h-4" />
          </button>
        </div>
        <div className="mt-2 text-center text-xs text-slate-500 flex items-center justify-center gap-1">
          <Sparkles className="w-3 h-3 text-teal-500" />
          Yapay zekâ hatalar yapabilir. Lütfen önemli bilgileri doğrulayın.
        </div>
      </motion.div>
    </div>
  );
};

export default ChatInput;