from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from database.sql.session import get_db
from database.sql.models import AIAgent
from schemas.agent_schema import AgentBase, AgentResponse

router = APIRouter()

@router.get("/agents")
def get_agents(db: Session = Depends(get_db)):
    """Tüm ajan konfigürasyonlarını getirir."""
    agents = db.query(AIAgent).all()
    # by_alias=False ile frontend'in beklediği camelCase alan adlarıyla döndür
    return [AgentResponse.model_validate(a).model_dump(by_alias=False) for a in agents]

@router.post("/save")
def save_agents(agents_data: List[AgentBase], db: Session = Depends(get_db)):
    """Arayüzden gelen tüm ajanları toplu olarak veritabanına yazar."""
    for agent_data in agents_data:
        # Pydantic alias mapping ile by_alias kullanarak DB alan isimlerini alıyoruz
        db_data = agent_data.model_dump(by_alias=True)
        agent_id = db_data.pop("kimlik", None)
        
        if not agent_id:
            continue
            
        existing_agent = db.query(AIAgent).filter(AIAgent.kimlik == agent_id).first()
        
        if existing_agent:
            # Güncelle
            for k, v in db_data.items():
                setattr(existing_agent, k, v)
        else:
            # Oluştur
            new_agent = AIAgent(kimlik=agent_id, **db_data)
            db.add(new_agent)
            
    try:
        db.commit()
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Kaydetme hatası: {str(e)}")
        
    return {"message": "Ajan konfigürasyonları başarıyla kaydedildi"}

@router.patch("/agents/{agent_id}/toggle")
def toggle_agent(agent_id: str, db: Session = Depends(get_db)):
    """Bir ajanı tek tıklamayla aktif/pasif yapar."""
    agent = db.query(AIAgent).filter(AIAgent.kimlik == agent_id).first()
    if not agent:
        raise HTTPException(status_code=404, detail="Ajan bulunamadı")
        
    agent.aktif_mi = not agent.aktif_mi
    db.commit()
    
    return {"message": "Ajan durumu güncellendi", "aktif_mi": agent.aktif_mi, "kimlik": agent.kimlik}
