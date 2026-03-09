import React from 'react';
import { Sparkles, User } from 'lucide-react';
import { motion } from 'framer-motion';

const ChatHistory = () => {
  return (
    <div className="flex-1 overflow-y-auto p-8 flex flex-col items-center w-full custom-scrollbar">
      <div className="w-full max-w-3xl space-y-6">
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="flex flex-col items-start w-full"
        >
          <div className="flex items-center text-xs font-semibold text-slate-400 mb-1 ml-1 tracking-wider uppercase">
            <Sparkles className="w-3 h-3 mr-1 text-teal-400" /> NotebookLM
          </div>
          <div className="bg-[#1e293b] border border-slate-700 p-4 rounded-2xl rounded-tl-none shadow-sm text-slate-200 text-sm max-w-[85%] leading-relaxed">
            Merhaba! Yüklediğin belgesini inceledim. Bana bu belgeyle ilgili sorular sorabilirsin.
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default ChatHistory;