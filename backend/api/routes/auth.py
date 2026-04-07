from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from pydantic import BaseModel
import bcrypt

from database.sql.session import get_db
from database.sql.models import Kullanici

router = APIRouter()

class RegisterRequest(BaseModel):
    tam_ad: str
    eposta: str
    sifre: str

class LoginRequest(BaseModel):
    eposta: str
    sifre: str

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return bcrypt.checkpw(plain_password.encode('utf-8'), hashed_password.encode('utf-8'))

@router.post("/register")
def register(req: RegisterRequest, db: Session = Depends(get_db)):
    try:
        yeni_kullanici = Kullanici(
            tam_ad=req.tam_ad,
            eposta=req.eposta,
            sifre_karma=hash_password(req.sifre)
        )
        db.add(yeni_kullanici)
        db.commit()
        db.refresh(yeni_kullanici)
        return {"mesaj": "Kayıt başarılı", "kimlik": yeni_kullanici.kimlik}
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=400, detail="Bu e-posta adresi zaten kullanılıyor.")
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail="Sunucu hatası: Can't register user")

@router.post("/login")
def login(req: LoginRequest, db: Session = Depends(get_db)):
    kullanici = db.query(Kullanici).filter(Kullanici.eposta == req.eposta).first()
    if not kullanici:
        raise HTTPException(status_code=401, detail="E-posta veya şifre hatalı.")
    
    if not kullanici.sifre_karma or not verify_password(req.sifre, kullanici.sifre_karma):
        raise HTTPException(status_code=401, detail="E-posta veya şifre hatalı.")
        
    return {"mesaj": "Giriş başarılı", "kimlik": kullanici.kimlik, "tam_ad": kullanici.tam_ad}

