import React from 'react';
import { BookOpen, Share2 } from 'lucide-react';
import { motion } from 'framer-motion';

const Header = () => {
  return (
    <motion.header 
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className="h-16 flex items-center px-8 bg-[#131c31] border-b border-slate-800 shadow-sm z-10 w-full shrink-0"
    >
      <h1 className="text-xl font-semibold text-slate-200 flex items-center tracking-wide">
        <BookOpen className="w-5 h-5 mr-3 text-teal-500" />
        Yeni Not Defteri
      </h1>
      <div className="ml-auto flex space-x-3">
        <button className="px-4 py-2 text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg flex items-center transition-colors border border-transparent hover:border-slate-700">
          <Share2 className="w-4 h-4 mr-2" /> Paylaş
        </button>
      </div>
    </motion.header>
  );
};

export default Header;