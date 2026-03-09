import React from 'react';
import { motion } from 'framer-motion';
import { User, Sparkles, FileText } from 'lucide-react';

// ==========================================
// SAHTE SOHBET VERİLERİ (MOCK DATA)
// ==========================================
const MESAJLAR = [
    { id: 1, sender: 'user', text: 'Sisteme yüklediğim "IK_Onay_Akisi.bpmn" dosyasını analiz eder misin?', time: '10:42' },
    { id: 2, sender: 'ai', text: 'Süreç 3 ana adımdan oluşuyor:\n1. Talep oluşturma\n2. Yönetici onayı\n3. IK onayı\n\n2. adımda bir darboğaz tespit ettim.', time: '10:43' },
    { id: 3, sender: 'user', text: 'Nedir o darboğaz?', time: '10:45' },
    { id: 4, sender: 'ai', text: 'Yönetici reddettiğinde süreç başa dönmek yerine direkt kapanıyor. Bu ciddi bir verimlilik kaybı.', time: '10:46' }
];

const TestVerisi = () => {
    return (
        <div className="flex flex-col gap-5 mt-2">

            {/* Aktif Belge Bilgisi (Küçük Badge) */}
            <div className="flex items-center justify-center gap-2 text-[10px] text-slate-500 bg-slate-800/30 py-1 px-3 rounded-full w-max mx-auto border border-slate-700/30">
                <FileText size={12} className="text-teal-500/70" />
                <span>Simülasyon Modu: Aktif Belge Analizi</span>
            </div>

            {MESAJLAR.map((msg, index) => {
                const isAI = msg.sender === 'ai';

                return (
                    <motion.div
                        key={msg.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3, delay: index * 0.1 }}
                        className={`flex w-full ${isAI ? 'justify-start' : 'justify-end'}`}
                    >
                        <div className={`flex gap-3 max-w-[90%] ${isAI ? 'flex-row' : 'flex-row-reverse'}`}>

                            {/* İKONLAR */}
                            <div className="shrink-0 mt-1">
                                {isAI ? (
                                    <div className="w-7 h-7 rounded-lg bg-teal-900/30 border border-teal-500/30 flex items-center justify-center">
                                        <Sparkles size={14} className="text-teal-400" />
                                    </div>
                                ) : (
                                    <div className="w-7 h-7 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center">
                                        <User size={14} className="text-slate-400" />
                                    </div>
                                )}
                            </div>

                            {/* BALONCUKLAR */}
                            <div className="flex flex-col gap-1 min-w-[100px]">
                                <div className={`flex items-center gap-2 text-[10px] text-slate-500 ${isAI ? 'justify-start' : 'justify-end'}`}>
                                    <span className="font-medium">{isAI ? 'AI Asistan' : 'Kullanıcı'}</span>
                                    <span>{msg.time}</span>
                                </div>

                                <div className={`p-3 rounded-2xl text-[13px] leading-relaxed 
                  ${isAI ? 'bg-slate-800/80 border border-slate-700 text-slate-300 rounded-tl-none'
                                        : 'bg-teal-600/10 border border-teal-500/20 text-teal-50 rounded-tr-none'}`}>
                                    <div className="whitespace-pre-wrap">{msg.text}</div>
                                </div>
                            </div>

                        </div>
                    </motion.div>
                );
            })}
        </div>
    );
};

export default TestVerisi;