import React from 'react';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import ChatHistory from './components/ChatHistory';
import ChatInput from './components/ChatInput';

const App = () => {
  return (
    <div className="flex h-screen w-full overflow-hidden font-sans bg-[#0f172a] text-slate-200">
      <Sidebar />
      <main className="flex-1 flex flex-col h-full relative">
        <Header />
        <ChatHistory />
        <ChatInput />
      </main>
    </div>
  );
};

export default App;