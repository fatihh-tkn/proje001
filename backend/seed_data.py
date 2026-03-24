"""
seed_data.py
─────────────────────────────────────────────────────────────────────────────
Test verisi eklemek için tek seferlik çalıştırılan script.

Çalıştırma (backend klasöründen):
    python seed_data.py

Ne ekler:
  - 2 Kullanıcı           (admin, analyst)
  - 3 Rol                 (yonetici, analist, kullanici)
  - 5 Arşiv Klasörü
  - 16 Belge (farklı türlerde, bazıları vektörleşmiş)
  - 3 Sohbet Oturumu + toplam 12 Mesaj
  - 5 Vektör Parçası
"""

import sys
import os

# Backend kök dizinini path'e ekle
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from database.sql.session import engine, SessionLocal
from database.sql.models import (
    Base, Kullanici, Rol, KullaniciRol, Belge, VektorParcasi,
    SohbetOturumu, SohbetMesaji, AIModeli
)
from datetime import datetime, timezone, timedelta
import uuid

def simdi():
    return datetime.now(timezone.utc).isoformat()

def tarih(gun_once=0):
    return (datetime.now(timezone.utc) - timedelta(days=gun_once)).isoformat()

def _uuid():
    return str(uuid.uuid4())

def seed():
    # Tabloları oluştur (zaten varsa atla)
    Base.metadata.create_all(bind=engine)

    db = SessionLocal()
    try:
        # ── Mevcut test verilerini temizle (isteğe bağlı)
        # (Yorum kaldırılırsa varolan test verilerini silip baştan ekler)
        # db.query(Belge).delete()
        # db.query(Kullanici).delete()
        # db.commit()

        # ── ROLLER ─────────────────────────────────────────────────────────
        rol_ids = {}
        for ad, acik in [
            ("yonetici",  "Tam yetkili sistem yöneticisi"),
            ("analist",   "Veri analiz uzmanı"),
            ("kullanici", "Standart kullanıcı"),
        ]:
            var_mi = db.query(Rol).filter(Rol.ad == ad).first()
            if not var_mi:
                r = Rol(kimlik=_uuid(), ad=ad, aciklama=acik,
                        izinler=["veritabani:okuma", "model:yazma"] if ad == "yonetici" else ["veritabani:okuma"])
                db.add(r)
                db.flush()
                rol_ids[ad] = r.kimlik
                print(f"  ✅ Rol: {ad}")
            else:
                rol_ids[ad] = var_mi.kimlik

        # ── KULLANICILAR ────────────────────────────────────────────────────
        kullanici_map = {}
        for eposta, tam_ad, super_k in [
            ("admin@demo.com",   "Sistem Yöneticisi",  True),
            ("analyst@demo.com", "Veri Analisti",      False),
        ]:
            var_mi = db.query(Kullanici).filter(Kullanici.eposta == eposta).first()
            if not var_mi:
                k = Kullanici(kimlik=_uuid(), eposta=eposta, tam_ad=tam_ad,
                              sifre_karma="$2b$12$demo_hash_not_real",
                              super_kullanici_mi=super_k, aktif_mi=True,
                              meta={"department": "IT" if super_k else "Analytics"})
                db.add(k)
                db.flush()
                kullanici_map[eposta] = k.kimlik
                print(f"  ✅ Kullanıcı: {tam_ad} ({eposta})")
            else:
                kullanici_map[eposta] = var_mi.kimlik

        db.commit()

        # ── ARŞİV KLASÖRLER ─────────────────────────────────────────────────
        klasor_ids = {}
        klasorler = [
            ("Finans Raporları",   None),
            ("Teknik Dökümanlar", None),
            ("İK Belgeleri",      None),
            ("2024 Arşivi",       "Finans Raporları"),
            ("API Dökümantasyonu","Teknik Dökümanlar"),
        ]

        for klasor_ad, ust_klasor_ad in klasorler:
            var_mi = db.query(Belge).filter(
                Belge.dosya_adi == klasor_ad,
                Belge.dosya_turu == "folder"
            ).first()
            if var_mi:
                klasor_ids[klasor_ad] = var_mi.kimlik
                continue

            ust_id = klasor_ids.get(ust_klasor_ad) if ust_klasor_ad else None
            k = Belge(
                kimlik=_uuid(),
                dosya_adi=klasor_ad,
                dosya_turu="folder",
                dosya_boyutu_bayt=0,
                parca_sayisi=0,
                durum="folder",
                meta={"klasor_kimlik": ust_id} if ust_id else {}
            )
            db.add(k)
            db.flush()
            klasor_ids[klasor_ad] = k.kimlik
            print(f"  📁 Klasör: {klasor_ad}")

        db.commit()

        # ── BELGELER ─────────────────────────────────────────────────────────
        belgeler_data = [
            # (ad, tur, boyut_kb, klasör, vektörleşmiş, etiketler, aciklama)
            ("Q4_2024_Bilanço.pdf",          "pdf",   1240, "Finans Raporları",    True,  ["finans","kritik"],    "2024 yılı 4. çeyrek bilanço raporu"),
            ("Bütçe_Analizi_2025.xlsx",       "xlsx",   830, "Finans Raporları",    False, ["finans","planlama"],  ""),
            ("Gelir_Tablosu_Mart.csv",         "csv",    120, "2024 Arşivi",         False, ["gelir","aylık"],      ""),
            ("Yatırım_Planı.pdf",              "pdf",   2100, "Finans Raporları",    True,  ["yatırım"],            "2025-2027 yatırım stratejisi"),
            ("Sistem_Mimarisi.pdf",            "pdf",   3400, "Teknik Dökümanlar",  True,  ["mimari","teknik"],    "Mikroservis mimarisi diyagramları"),
            ("API_Referans_v2.pdf",            "pdf",    980, "API Dökümantasyonu",  True,  ["api","dökümantasyon"],"REST API v2.0 tam referans kılavuzu"),
            ("Veritabanı_Şeması.png",          "png",    450, "Teknik Dökümanlar",  False, ["db","görsel"],        ""),
            ("Deploy_Runbook.md",              "md",      88, "API Dökümantasyonu",  False, ["devops"],             "Üretim ortamı deploy adımları"),
            ("Docker_Compose.yaml",            "yaml",    45, "Teknik Dökümanlar",  False, ["devops","docker"],    ""),
            ("İşe_Alım_Formu.docx",           "docx",   310, "İK Belgeleri",       False, ["ik","form"],          ""),
            ("Çalışan_Kılavuzu_2024.pdf",     "pdf",   1800, "İK Belgeleri",       True,  ["ik","kılavuz"],       "Yeni çalışan oryantasyon rehberi"),
            ("Bordro_Şablonu.xlsx",            "xlsx",   220, "İK Belgeleri",       False, ["ik","bordro"],        ""),
            ("Sunuм_Proje_Alpha.pptx",         "pptx",  4200, None,                 False, ["proje","sunum"],      ""),
            ("Logo_Final.png",                 "png",    780, None,                 False, ["marka","görsel"],     "Şirket logosu yüksek çözünürlük"),
            ("requirements.txt",               "txt",     12, None,                 False, ["python","bağımlılık"],""),
            ("Toplantı_Notları_24Mart.txt",    "txt",     34, None,                 False, ["toplantı","notlar"],  "Haftalık sprint retrospektif notları"),
        ]

        belge_ids = []
        for ad, tur, boyut_kb, klasor_adi, vek, etiketler, aciklama in belgeler_data:
            var_mi = db.query(Belge).filter(Belge.dosya_adi == ad, Belge.dosya_turu != "folder").first()
            if var_mi:
                belge_ids.append(var_mi.kimlik)
                continue

            klasor_id = klasor_ids.get(klasor_adi) if klasor_adi else None
            meta = {"klasor_kimlik": klasor_id} if klasor_id else {}
            if etiketler: meta["etiketler"] = etiketler
            if aciklama:  meta["aciklama"] = aciklama

            b = Belge(
                kimlik=_uuid(),
                yukleyen_kimlik=kullanici_map.get("admin@demo.com"),
                dosya_adi=ad,
                dosya_turu=tur,
                dosya_boyutu_bayt=boyut_kb * 1024,
                depolama_yolu=f"./archive_uploads/demo_{ad.replace(' ','_')}",
                vektorlestirildi_mi=vek,
                durum="arsivde",
                parca_sayisi=0,
                meta=meta,
                olusturulma_tarihi=tarih(90 - belge_ids.__len__() * 5)
            )
            db.add(b)
            db.flush()
            belge_ids.append(b.kimlik)
            print(f"  📄 Belge: {ad} ({'✅ vektör' if vek else '📁 arşiv'})")

        db.commit()

        # ── VEKTÖR PARÇALARI ────────────────────────────────────────────────
        for i, belge_id in enumerate(belge_ids[:5]):
            belge = db.get(Belge, belge_id)
            if not belge or not belge.vektorlestirildi_mi:
                continue
            # Zaten parçası var mı?
            var_mi = db.query(VektorParcasi).filter(VektorParcasi.belge_kimlik == belge_id).first()
            if var_mi:
                continue
            for parca_no in range(1, 4):
                p = VektorParcasi(
                    belge_kimlik=belge_id,
                    chromadb_kimlik=f"chroma_{belge_id[:8]}_{parca_no}",
                    icerik=f"Bu {belge.dosya_adi} dosyasının {parca_no}. parçasıdır. Demo içerik.",
                    sayfa_no=parca_no,
                    konum_imi=f"sayfa={parca_no}"
                )
                db.add(p)
            belge.parca_sayisi = 3
        db.commit()
        print("  🧩 Vektör parçaları eklendi")

        # ── SOHBET OTURUMLARI ───────────────────────────────────────────────
        sohbet_verileri = [
            ("Q4 Bilanço Analizi",    "gemini-2.0-flash", 8,  15),
            ("Sistem Mimarisi Soruları","gemini-2.0-flash", 4, 30),
            ("İK Politikası Sorgusu", "gemini-2.0-flash", 6,  60),
        ]

        for baslik, model, mesaj_sayisi, gun_once in sohbet_verileri:
            var_mi = db.query(SohbetOturumu).filter(SohbetOturumu.baslik == baslik).first()
            if var_mi:
                continue
            kullanici_id = kullanici_map.get("analyst@demo.com")
            o = SohbetOturumu(
                kimlik=_uuid(),
                kullanici_kimlik=kullanici_id,
                baslik=baslik,
                kullanilan_model=model,
                mesaj_sayisi=mesaj_sayisi,
                toplam_token=mesaj_sayisi * 350,
                toplam_maliyet_usd=mesaj_sayisi * 0.0003,
                olusturulma_tarihi=tarih(gun_once),
                guncelleme_tarihi=tarih(gun_once - 1 if gun_once > 1 else 0)
            )
            db.add(o)
            db.flush()

            # Mesajlar
            ornekler = [
                ("kullanici", f"{baslik} hakkında bilgi verir misin?"),
                ("asistan",   "Bu konuda elimdeki belgeler şunu gösteriyor: [Demo yanıt içeriği buraya gelir.]"),
                ("kullanici", "Peki hangi dönem için geçerli?"),
                ("asistan",   "İlgili belgelere göre bu değerler 2024 yılı için hesaplanmıştır."),
            ]
            for rol, icerik in ornekler[:min(4, mesaj_sayisi)]:
                db.add(SohbetMesaji(
                    kimlik=_uuid(),
                    oturum_kimlik=o.kimlik,
                    rol=rol,
                    icerik=icerik,
                    model=model if rol == "asistan" else None,
                    istek_token=120 if rol == "kullanici" else None,
                    yanit_token=280 if rol == "asistan" else None,
                    toplam_token=400 if rol == "asistan" else 120,
                    maliyet_usd=0.0004 if rol == "asistan" else None,
                    sure_ms=1200 if rol == "asistan" else None,
                    olusturulma_tarihi=tarih(gun_once)
                ))

            print(f"  💬 Sohbet: {baslik} ({mesaj_sayisi} mesaj)")

        db.commit()

        print("\n🎉 Seed verisi başarıyla eklendi!")
        print(f"  📁 {len(klasor_ids)} Klasör")
        print(f"  📄 {len(belge_ids)} Belge")
        print(f"  🗣 3 Sohbet Oturumu")

    except Exception as e:
        db.rollback()
        print(f"\n❌ Hata: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    print("🌱 Seed verisi ekleniyor...\n")
    seed()
