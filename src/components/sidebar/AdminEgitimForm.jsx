import React, { useState } from 'react';

const AdminEgitimForm = () => {
  const [chapters, setChapters] = useState([
    { id: 1, name: '', duration: '' },
    { id: 2, name: '', duration: '' }
  ]);
  const [savedNote, setSavedNote] = useState('');
  
  const [activeType, setActiveType] = useState('Zorunlu');
  const [activeModules, setActiveModules] = useState(['FI']);
  const [activeLevel, setActiveLevel] = useState('Orta');
  const [activeFormat, setActiveFormat] = useState('Online');
  
  const toggleModule = (m) => {
    setActiveModules(prev => prev.includes(m) ? prev.filter(x => x !== m) : [...prev, m]);
  };

  const addChapter = () => {
    setChapters([...chapters, { id: Date.now(), name: '', duration: '' }]);
  };
  const removeChapter = (id) => {
    setChapters(chapters.filter(c => c.id !== id));
  };
  
  const [toggles, setToggles] = useState({
    exam: true, cert: true, retry: true, approval: false, email: true
  });
  
  const onPublish = () => {
    setSavedNote('● Eğitim başarıyla yayınlandı');
    setTimeout(() => setSavedNote(''), 2500);
  };
  const onDraft = () => {
    setSavedNote('● Taslak kaydedildi');
    setTimeout(() => setSavedNote(''), 2500);
  };

  return (
    <div className="admin-egitim-form" style={{ fontFamily: 'sans-serif', padding: '0 0.5rem 1rem' }}>
      <style>{`
        .admin-egitim-form {
          --color-border-tertiary: #2a2a2d;
          --color-text-primary: #f1f5f9;
          --color-text-secondary: #94a3b8;
          --color-text-tertiary: #64748b;
          --color-background-primary: #0f172a;
          --color-background-secondary: #1e293b;
          --border-radius-md: 6px;
          --border-radius-lg: 8px;
        }
        .admin-egitim-form * { box-sizing: border-box; }
        .aef-hdr { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 1rem; padding-bottom: 0.8rem; border-bottom: 0.5px solid var(--color-border-tertiary); }
        .aef-hdr h1 { font-size: 14px; font-weight: 600; color: var(--color-text-primary); margin: 0 0 3px 0; line-height: 1.2; }
        .aef-hdr .sub { font-size: 10px; color: var(--color-text-secondary); }
        .admin-chip { display: inline-flex; align-items: center; gap: 5px; background: rgba(160,27,27,0.15); color: #ef4444; font-size: 9px; padding: 2px 6px; border-radius: var(--border-radius-md); margin-top: 6px; border: 1px solid rgba(160,27,27,0.3); }
        .aef-draft { font-size: 10px; color: var(--color-text-tertiary); }
        .aef-section { background: var(--color-background-primary); border: 0.5px solid var(--color-border-tertiary); border-radius: var(--border-radius-lg); padding: 0.8rem 1rem; margin-bottom: 1rem; }
        .aef-sec-title { font-size: 11px; font-weight: 500; color: var(--color-text-primary); display: flex; align-items: center; gap: 8px; margin-bottom: 3px; }
        .step-num { display: inline-flex; align-items: center; justify-content: center; width: 16px; height: 16px; border-radius: 50%; background: #334155; color: #e2e8f0; font-size: 9px; font-weight: 600; }
        .sec-hint { font-size: 9px; color: var(--color-text-tertiary); margin-bottom: 0.9rem; }
        .aef-row { display: grid; gap: 8px; margin-bottom: 10px; }
        .aef-row.r2 { grid-template-columns: 1fr 1fr; }
        @media (max-width: 400px) {
            .aef-row.r2 { grid-template-columns: 1fr; }
        }
        .aef-field { display: flex; flex-direction: column; gap: 4px; }
        .aef-field label { font-size: 9px; color: var(--color-text-secondary); text-transform: uppercase; letter-spacing: 0.04em; font-weight: 500; }
        .aef-req { color: #A32D2D; margin-left: 2px; }
        .aef-field input, .aef-field select, .aef-field textarea {
           background: #1e293b; border: 1px solid #334155; color: #f1f5f9; padding: 7px 8px; border-radius: 4px; font-size: 11px; outline: none; width: 100%; transition: border-color 0.2s;
        }
        .aef-field input:focus, .aef-field select:focus, .aef-field textarea:focus { border-color: #378ADD; }
        .aef-field textarea { min-height: 50px; resize: vertical; }
        .pill-group { display: flex; gap: 4px; flex-wrap: wrap; margin-top: 2px; }
        .pill { font-size: 9px; padding: 4px 8px; border-radius: var(--border-radius-md); border: 0.5px solid var(--color-border-tertiary); background: var(--color-background-primary); color: var(--color-text-secondary); cursor: pointer; transition: all 0.2s; }
        .pill:hover { background: var(--color-background-secondary); }
        .pill.active { background: #1e3a5f; color: #60a5fa; border-color: #378ADD; }
        
        .pill.active[data-g="type-req"] { background: rgba(160,27,27,0.15); color: #ef4444; border-color: rgba(160,27,27,0.5); }
        .pill.active[data-g="type-ext"] { background: rgba(99,102,241,0.15); color: #818cf8; border-color: rgba(99,102,241,0.5); }
        .pill.active[data-g="lvl"] { background: rgba(16,185,129,0.15); color: #34d399; border-color: rgba(16,185,129,0.5); }
        .pill.active[data-g="fmt"] { background: rgba(245,158,11,0.15); color: #fbbf24; border-color: rgba(245,158,11,0.5); }
        
        .mod-pill.active { background: #1e3a5f; color: #60a5fa; border-color: #378ADD; }

        .checkbox-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; margin-top: 2px; }
        .cb { display: flex; align-items: center; gap: 6px; padding: 6px 8px; border: 0.5px solid var(--color-border-tertiary); border-radius: var(--border-radius-md); cursor: pointer; font-size: 9px; color: var(--color-text-primary); background: var(--color-background-primary); transition: all 0.2s; }
        .cb:hover { background: var(--color-background-secondary); border-color: #475569; }
        .cb input { margin: 0; width: 12px; height: 12px; accent-color: #378ADD; cursor: pointer; }
        .cb.checked { background: rgba(55,138,221,0.15); border-color: rgba(55,138,221,0.5); color: #bae6fd; }

        .chapter { background: var(--color-background-secondary); border-radius: var(--border-radius-md); padding: 0.6rem 0.6rem; margin-bottom: 6px; display: flex; align-items: center; gap: 6px; }
        .ch-num { width: 18px; height: 18px; border-radius: 50%; background: var(--color-background-primary); color: var(--color-text-secondary); display: flex; align-items: center; justify-content: center; font-size: 9px; font-weight: 500; flex-shrink: 0; }
        .ch-input { flex: 1; display: grid; grid-template-columns: 2fr 1fr; gap: 6px; }
        
        .btn-remove { background: transparent; border: none; color: var(--color-text-tertiary); cursor: pointer; font-size: 14px; padding: 2px; border-radius: 4px; display: flex; align-items: center; justify-content: center; height: 24px; width: 24px; transition: all 0.2s; }
        .btn-remove:hover { background: rgba(160,27,27,0.15); color: #ef4444; }

        .btn-add { display: inline-flex; align-items: center; gap: 6px; background: transparent; border: 0.5px dashed #475569; color: var(--color-text-secondary); font-size: 10px; padding: 6px 10px; border-radius: var(--border-radius-md); cursor: pointer; width: 100%; justify-content: center; transition: all 0.2s; }
        .btn-add:hover { background: var(--color-background-secondary); color: var(--color-text-primary); border-style: solid; border-color: #64748b; }

        .toggle-row { display: flex; justify-content: space-between; align-items: center; padding: 8px 0; border-bottom: 0.5px solid var(--color-border-tertiary); }
        .toggle-row:last-child { border-bottom: none; }
        .toggle-label { font-size: 10px; color: var(--color-text-primary); }
        .aef-toggle { position: relative; width: 26px; height: 14px; background: #334155; border-radius: 7px; cursor: pointer; transition: background 0.2s; flex-shrink: 0; }
        .aef-toggle::after { content: ""; position: absolute; top: 2px; left: 2px; width: 10px; height: 10px; background: #fff; border-radius: 50%; transition: transform 0.2s; }
        .aef-toggle.on { background: #378ADD; }
        .aef-toggle.on::after { transform: translateX(12px); }

        .aef-actions { display: flex; flex-direction: column; gap: 8px; padding-top: 1rem; margin-top: 0.5rem; border-top: 0.5px solid var(--color-border-tertiary); }
        .btn-primary { background: #378ADD; color: #fff; border: none; font-size: 10px; font-weight: 500; padding: 6px 10px; border-radius: var(--border-radius-md); cursor: pointer; transition: background 0.2s; }
        .btn-primary:hover { background: #185FA5; }
        .btn-secondary { background: transparent; color: var(--color-text-secondary); border: 1px solid #475569; font-size: 10px; padding: 6px 10px; border-radius: var(--border-radius-md); cursor: pointer; transition: all 0.2s; }
        .btn-secondary:hover { background: var(--color-background-secondary); color: var(--color-text-primary); border-color: #64748b; }
        .btn-danger { background: transparent; color: #ef4444; border: 1px solid rgba(239,68,68,0.3); font-size: 10px; padding: 6px 10px; border-radius: var(--border-radius-md); cursor: pointer; transition: all 0.2s; }
        .btn-danger:hover { background: rgba(239,68,68,0.1); border-color: rgba(239,68,68,0.5); }
        
        .saved-note { font-size: 10px; color: #34d399; display: flex; align-items: center; justify-content: center; width: 100%; transition: opacity 0.3s; opacity: 0; margin-bottom: 6px; font-weight: 500; }
        .saved-note.show { opacity: 1; }

        .aef-upload { border: 0.5px dashed #475569; border-radius: var(--border-radius-md); padding: 12px; text-align: center; font-size: 9px; color: var(--color-text-secondary); cursor: pointer; transition: all 0.2s; }
        .aef-upload:hover { background: var(--color-background-secondary); border-color: #94a3b8; color: #e2e8f0; }
        .aef-upload strong { color: #378ADD; font-weight: 500; font-size: 10px; }
      `}</style>

      <div className="aef-hdr">
        <div>
          <h1>Yeni Eğitim Aç</h1>
          <div className="sub">Şirket içi eğitimi yayınla</div>
          <span className="admin-chip">Admin Yetkisi</span>
        </div>
      </div>

      <div className="aef-section">
        <div className="aef-sec-title"><span className="step-num">1</span>Temel bilgiler</div>
        <div className="aef-row">
          <div className="aef-field"><label>Eğitim adı<span className="aef-req">*</span></label><input type="text" placeholder="Örn. FI-AP Eğitim" /></div>
        </div>
        <div className="aef-row r2">
          <div className="aef-field"><label>Süre (saat)<span className="aef-req">*</span></label><input type="number" placeholder="8" /></div>
          <div className="aef-field"><label>Eğitmen</label><input type="text" placeholder="Adı" /></div>
        </div>
      </div>

      <div className="aef-section">
        <div className="aef-sec-title"><span className="step-num">2</span>Tür ve Modül</div>
        
        <div className="aef-field" style={{marginBottom:'8px'}}>
          <div className="pill-group">
            {['Zorunlu', 'Ekstra', 'Yenileme'].map(t => (
              <span key={t} className={`pill ${activeType === t ? 'active' : ''}`} data-g={t==='Zorunlu'?'type-req':t==='Ekstra'?'type-ext':''} onClick={() => setActiveType(t)}>{t}</span>
            ))}
          </div>
        </div>

        <div className="aef-field" style={{marginBottom:'8px'}}>
          <div className="pill-group">
            {['FI','CO','MM','SD','HR'].map(m => (
              <span key={m} className={`pill mod-pill ${activeModules.includes(m) ? 'active' : ''}`} data-m={m} onClick={() => toggleModule(m)}>{m}</span>
            ))}
          </div>
        </div>

        <div className="aef-row r2">
          <div className="aef-field">
            <div className="pill-group">
                {['Başlangıç', 'Orta', 'İleri'].map(l => (
                    <span key={l} className={`pill ${activeLevel === l ? 'active' : ''}`} data-g="lvl" onClick={() => setActiveLevel(l)}>{l}</span>
                ))}
            </div>
          </div>
        </div>
      </div>

      <div className="aef-section">
        <div className="aef-sec-title"><span className="step-num">3</span>Roller</div>
        <div className="aef-field">
          <div className="checkbox-grid">
            {['Func. Cons.', 'Key User', 'End User', 'Developer'].map(r => (
               <label key={r} className={`cb ${r==='Func. Cons.'?'checked':''}`} onClick={(e)=>{const el=e.currentTarget; el.classList.toggle('checked')}}><input type="checkbox" defaultChecked={r==='Func. Cons.'} onClick={e=>e.stopPropagation()} /> {r}</label>
            ))}
          </div>
        </div>
      </div>

      <div className="aef-section">
        <div className="aef-sec-title"><span className="step-num">4</span>İçerik</div>
        <div style={{marginBottom: '8px'}}>
          {chapters.map((ch, i) => (
            <div className="chapter" key={ch.id}>
              <div className="ch-num">{i+1}</div>
              <div className="ch-input">
                <input type="text" placeholder="Bölüm adı" />
                <input type="number" placeholder="dk" />
              </div>
              <button className="btn-remove" onClick={() => removeChapter(ch.id)}>&times;</button>
            </div>
          ))}
        </div>
        <button className="btn-add" onClick={addChapter} style={{marginBottom:'8px'}}>+ Bölüm ekle</button>
        <div className="aef-upload" onClick={() => alert('Dosya yükleme')}>
          <strong>Dosya yükle</strong> veya sürükle<br/>
          <span style={{marginTop: '4px', display: 'block'}}>PDF, PPTX, MP4</span>
        </div>
      </div>

      <div className="aef-section">
        <div className="aef-sec-title"><span className="step-num">5</span>Ayarlar</div>
        <div className="toggle-row">
          <div><div className="toggle-label">Sınav zorunlu</div></div>
          <div className={`aef-toggle ${toggles.exam ? 'on' : ''}`} onClick={() => setToggles({...toggles, exam: !toggles.exam})}></div>
        </div>
        <div className="toggle-row">
          <div><div className="toggle-label">Sertifika ver</div></div>
          <div className={`aef-toggle ${toggles.cert ? 'on' : ''}`} onClick={() => setToggles({...toggles, cert: !toggles.cert})}></div>
        </div>
      </div>

      <div className="aef-actions">
        {savedNote && <div className={`saved-note show`}>{savedNote}</div>}
        <div style={{display:'flex', gap:'6px', justifyContent: 'space-between', width: '100%'}}>
          <button className="btn-danger" onClick={() => {}}>Sil</button>
          <div style={{display:'flex', gap:'6px'}}>
            <button className="btn-secondary" onClick={onDraft}>Taslak</button>
            <button className="btn-primary" onClick={onPublish}>Yayınla</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminEgitimForm;
