from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from database.sql.session import get_db
from database.sql.models import AIAgent
from schemas.agent_schema import AgentBase, AgentResponse

router = APIRouter()

def _decompose_allowed_rags(allowed_rags: list | None) -> tuple[list[str], list[str]]:
    """
    AIAgent.allowed_rags JSON kolonu hem havuz ID'lerini (rag_1, rag_2) hem de
    "!file_id" prefix'iyle dışlanan belge ID'lerini saklar (legacy/kompakt biçim).
    Bu fonksiyon ikiye ayırıp temiz havuz listesi + excluded ID listesi döner.
    """
    rags = allowed_rags or []
    excluded = [str(r)[1:] for r in rags if str(r).startswith("!")]
    pools = [str(r) for r in rags if not str(r).startswith("!")]
    return pools, excluded


@router.get("/agents")
def get_agents(db: Session = Depends(get_db)):
    """Tüm ajan konfigürasyonlarını getirir."""
    agents = db.query(AIAgent).all()
    out = []
    for a in agents:
        # by_alias=False ile frontend'in beklediği camelCase alan adlarıyla döndür
        d = AgentResponse.model_validate(a).model_dump(by_alias=False)
        # allowed_rags JSON'unu havuz / excluded olarak ayrıştır
        pools, excluded = _decompose_allowed_rags(d.get("allowedRags"))
        d["allowedRags"] = pools
        d["excludedFiles"] = excluded
        out.append(d)
    return out

@router.post("/save")
def save_agents(agents_data: List[AgentBase], db: Session = Depends(get_db)):
    """Arayüzden gelen tüm ajanları toplu olarak veritabanına yazar.
    excludedFiles UI alanı, allowed_rags içine "!file_id" prefix'iyle merge edilir."""
    for agent_data in agents_data:
        # excludedFiles'ı allowed_rags ile birleştir (DB tarafı tek kolonda saklar)
        pools = [r for r in (agent_data.allowedRags or []) if not str(r).startswith("!")]
        excluded = [f"!{f}" for f in (agent_data.excludedFiles or [])]
        agent_data.allowedRags = pools + excluded

        # Pydantic alias mapping ile by_alias kullanarak DB alan isimlerini alıyoruz.
        # excludedFiles `exclude=True` ile zaten model_dump'ta yer almaz.
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
