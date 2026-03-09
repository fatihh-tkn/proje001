const fs = require('fs');
const path = require('path');

// 1. Oluşturulacak Klasörler
const folders = [
  'src/assets',
  'src/components',
  'src/api'
];

// 2. Oluşturulacak Dosyalar ve İçerikleri
const files = {
  'src/components/Sidebar.jsx': `import React from 'react';
import { Plus, FileText, AlignLeft } from 'lucide-react';

const Sidebar = () => {
  return (
    <aside className="w-80 bg-white border-r border-gray-200 flex flex-col p-4 h-full">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-sm font-semibold text-gray-600 uppercase tracking-wider">Kaynaklar</h2>
        <button className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors">
          <Plus className="w-5 h-5 text-gray-600" />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto space-y-3">
        <div className="p-3 bg-gray-50 border border-gray-200 rounded-xl cursor-pointer hover:bg-gray-100">
          <div className="flex items-center text-gray-800">
            <FileText className="w-4 h-4 mr-2 text-blue-500" />
            <h3 className="text-sm font-medium truncate">Proje_Raporu_2026.pdf</h3>
          </div>
          <p className="text-xs text-gray-500 mt-1 ml-6">12 Sayfa • PDF</p>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;`,

  'src/components/Header.jsx': `import React from 'react';
import { BookOpen, Share2 } from 'lucide-react';

const Header = () => {
  return (
    <header className="h-16 flex items-center px-8 bg-white border-b border-gray-200 shadow-sm z-10 w-full shrink-0">
      <h1 className="text-xl font-semibold text-gray-800 flex items-center">
        <BookOpen className="w-5 h-5 mr-3 text-gray-600" />
        Yeni Not Defteri
      </h1>
      <div className="ml-auto flex space-x-3">
        <button className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg flex items-center">
          <Share2 className="w-4 h-4 mr-2" /> Paylaş
        </button>
      </div>
    </header>
  );
};

export default Header;`,

  'src/components/ChatHistory.jsx': `import React from 'react';
import { Sparkles, User } from 'lucide-react';

const ChatHistory = () => {
  return (
    <div className="flex-1 overflow-y-auto p-8 bg-[#f8f9fa] flex flex-col items-center w-full">
      <div className="w-full max-w-3xl space-y-6">
        <div className="flex flex-col items-start w-full">
          <div className="flex items-center text-xs font-semibold text-gray-500 mb-1 ml-1">
            <Sparkles className="w-3 h-3 mr-1 text-blue-500" /> NotebookLM
          </div>
          <div className="bg-white border border-gray-200 p-4 rounded-2xl rounded-tl-none shadow-sm text-gray-700 max-w-[85%] text-sm">
            Merhaba! Yüklediğin belgesini inceledim. Bana bu belgeyle ilgili sorular sorabilirsin.
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatHistory;`,

  'src/components/ChatInput.jsx': `import React, { useState } from 'react';
import { Key, ListChecks, ArrowUp } from 'lucide-react';

const ChatInput = () => {
  const [message, setMessage] = useState('');

  return (
    <div className="p-6 bg-gradient-to-t from-[#f8f9fa] via-[#f8f9fa] to-transparent flex justify-center w-full shrink-0">
      <div className="w-full max-w-3xl relative">
        <div className="relative bg-white rounded-2xl shadow-md border border-gray-200 overflow-hidden focus-within:ring-2 focus-within:ring-blue-100 transition-all">
          <textarea
            className="w-full max-h-40 min-h-[56px] p-4 pr-14 resize-none outline-none text-gray-700 bg-transparent text-sm"
            placeholder="Ne bilmek istersiniz?"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={1}
          />
          <button className="absolute right-3 bottom-3 w-8 h-8 flex items-center justify-center rounded-full bg-blue-600 text-white hover:bg-blue-700">
            <ArrowUp className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatInput;`,

  'src/api/chatService.js': `// Yapay zeka ile konuşacak fonksiyonlar burada yer alacak
export const sendMessageToAI = async (message) => {
  console.log("AI'ye mesaj gönderiliyor:", message);
  // İleride buraya fetch/axios kodları gelecek
  return { success: true, reply: "Bu bir test cevabıdır." };
};`,

  'src/App.jsx': `import React from 'react';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import ChatHistory from './components/ChatHistory';
import ChatInput from './components/ChatInput';

const App = () => {
  return (
    <div className="flex h-screen w-full overflow-hidden font-sans">
      <Sidebar />
      <main className="flex-1 flex flex-col h-full relative">
        <Header />
        <ChatHistory />
        <ChatInput />
      </main>
    </div>
  );
};

export default App;`
};

// 3. İşlemi Başlat
console.log("🚀 Dosyalar ve klasörler oluşturuluyor...");

folders.forEach(folder => {
  const targetPath = path.join(__dirname, folder);
  if (!fs.existsSync(targetPath)) {
    fs.mkdirSync(targetPath, { recursive: true });
    console.log(`✅ Klasör oluşturuldu: \${folder}`);
  }
});

Object.keys(files).forEach(filePath => {
  const targetPath = path.join(__dirname, filePath);
  fs.writeFileSync(targetPath, files[filePath], 'utf8');
  console.log(`📄 Dosya yazıldı: \${filePath}`);
});

console.log("🎉 Tüm işlem başarıyla tamamlandı!");
