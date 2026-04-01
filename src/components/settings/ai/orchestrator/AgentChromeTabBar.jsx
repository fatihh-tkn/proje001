import React, { useState, useRef, useEffect } from 'react';
import { Bot, Brain, Plus } from 'lucide-react';

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
            className="flex items-end px-0 pt-0 shrink-0 overflow-x-auto z-10 relative w-full"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
            {agents.map((agent, index) => {
                const isActive = selectedItemId === agent.id;
                const isFirst = index === 0;
                const isEditing = editingId === agent.id;

                const cornerClass = isFirst ? 'rounded-tr-xl rounded-tl-none' : 'rounded-t-xl';
                const marginClass = isFirst ? 'ml-0' : 'ml-[1px]';

                return (
                    <div
                        key={agent.id}
                        onClick={() => onSelect(agent.id)}
                        onDoubleClick={(e) => startEdit(e, agent)}
                        className={`relative group flex items-center justify-between min-w-[150px] max-w-[220px] h-[36px] px-3 cursor-pointer transition-all select-none border-slate-200/80 border-b-0 shrink-0 ${cornerClass} ${marginClass} ${isActive ? 'bg-white border text-slate-700 z-20' : 'bg-transparent border-transparent hover:bg-slate-200/50 text-slate-500 mb-[1px]'}`}
                        style={isActive ? { marginBottom: '-1px', paddingBottom: '1px' } : {}}
                        title={isEditing ? undefined : `${agent.name} — Yeniden adlandırmak için çift tıklayın`}
                    >
                        <div className="flex items-center gap-2 overflow-hidden flex-1 relative z-10">
                            <div className={`shrink-0 flex items-center justify-center ${isActive ? 'text-indigo-600' : 'text-slate-400 group-hover:text-slate-500'}`}>
                                {agent.agentKind === 'chatbot' ? <Bot size={13} /> : <Brain size={13} />}
                            </div>

                            {isEditing && isActive ? (
                                <input
                                    ref={inputRef}
                                    value={editValue}
                                    onChange={(e) => setEditValue(e.target.value)}
                                    onBlur={commitEdit}
                                    onKeyDown={handleKeyDown}
                                    onClick={(e) => e.stopPropagation()}
                                    className="text-[12px] font-semibold bg-transparent outline-none border-b border-indigo-400 text-slate-700 w-full min-w-0 leading-none py-0"
                                />
                            ) : (
                                <span className={`text-[12px] truncate font-semibold pt-[1px] ${isActive ? '' : 'group-hover:text-slate-600'}`}>
                                    {agent.name}
                                </span>
                            )}
                        </div>

                        {/* Aktif sekmeyi alt kutu ile bütünleştiren beyaz çizgi */}
                        {isActive && <div className="absolute -bottom-[2px] left-0 right-0 h-[3px] bg-white z-20"></div>}
                    </div>
                );
            })}

            {/* Yeni Sekme (Görsel) */}
            <div className="w-8 h-8 rounded-full hover:bg-slate-200/50 flex items-center justify-center cursor-pointer text-slate-400 hover:text-slate-600 ml-1 mb-1 shrink-0 transition-colors z-10 relative">
                <Plus size={14} />
            </div>
        </div>
    );
};

export default AgentChromeTabBar;
