import React, { useState, useRef, useEffect } from 'react';
import { Bot, Brain } from 'lucide-react';

const AgentChromeTabBar = ({ agents, selectedItemId, onSelect, onRename }) => {
    const [editingId, setEditingId] = useState(null);
    const [editValue, setEditValue] = useState('');
    const inputRef = useRef(null);

    useEffect(() => {
        if (editingId && inputRef.current) {
            inputRef.current.focus();
            inputRef.current.select();
        }
    }, [editingId]);

    const startEdit = (e, agent) => {
        e.stopPropagation();
        setEditingId(agent.id);
        setEditValue(agent.name);
    };

    const commitEdit = () => {
        if (editingId && editValue.trim()) {
            onRename?.(editingId, editValue.trim());
        }
        setEditingId(null);
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter') commitEdit();
        if (e.key === 'Escape') setEditingId(null);
    };

    return (
        <div
            className="flex items-stretch px-0 shrink-0 overflow-x-auto z-10 relative w-full h-full"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
            {agents.map((agent) => {
                const isActive = selectedItemId === agent.id;
                const isEditing = editingId === agent.id;

                return (
                    <div
                        key={agent.id}
                        onClick={() => onSelect(agent.id)}
                        onDoubleClick={(e) => startEdit(e, agent)}
                        className={`group relative flex items-center gap-2.5 min-w-[140px] max-w-[200px] h-full px-4 cursor-pointer transition-all select-none shrink-0 border-r border-stone-100 last:border-0
                            ${isActive ? 'text-stone-700 bg-stone-50/50' : 'text-stone-400 hover:text-stone-600 hover:bg-stone-50'}`}
                        title={isEditing ? undefined : `${agent.name} — Yeniden adlandırmak için çift tıklayın`}
                    >
                        <div className={`shrink-0 ${isActive ? 'text-[#378ADD]' : 'text-stone-400 group-hover:text-stone-500'}`}>
                            {agent.agentKind === 'chatbot' ? <Bot size={14} strokeWidth={isActive ? 2.5 : 2} /> : <Brain size={14} strokeWidth={isActive ? 2.5 : 2} />}
                        </div>

                        {isEditing && isActive ? (
                            <input
                                ref={inputRef}
                                value={editValue}
                                onChange={(e) => setEditValue(e.target.value)}
                                onBlur={commitEdit}
                                onKeyDown={handleKeyDown}
                                onClick={(e) => e.stopPropagation()}
                                className="text-[12px] font-black tracking-tight bg-transparent outline-none border-b border-[#378ADD] text-stone-700 w-full min-w-0 leading-none py-0 focus:ring-0"
                            />
                        ) : (
                            <span className={`text-[12px] tracking-tight truncate flex-1 ${isActive ? 'font-black' : 'font-bold'}`}>{agent.name}</span>
                        )}

                        {/* Aktif göstergesi — alt çizgi */}
                        {isActive && (
                            <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#378ADD] rounded-t-full" />
                        )}
                    </div>
                );
            })}
        </div>
    );
};

export default AgentChromeTabBar;
