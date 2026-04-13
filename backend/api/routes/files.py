import os
import io

from fastapi import APIRouter, UploadFile, File, HTTPException
from fastapi.responses import FileResponse, StreamingResponse
from PIL import Image

from services.file_parser import file_parser

router = APIRouter()


@router.post("/parse")
async def parse_file(file: UploadFile = File(...)):
    """
    Kullanıcıdan bir dosya alır (Excel)
    ve içini okuyup JSON tipinde yanıt döner.
    """
    if file.filename is None:
        raise HTTPException(status_code=400, detail="Dosya adı bulunamadı.")

    file_name     = file.filename.lower()
    content_bytes = await file.read()

    if file_name.endswith(".xlsx") or file_name.endswith(".xls"):
        result = file_parser.parse_excel(content_bytes)
        return result

    raise HTTPException(status_code=400, detail="Sadece .xlsx ve .xls desteklenmektedir.")


@router.get("/image/crop")
async def crop_image(
    image_path: str,
    bbox: str,
    slide_w: float,
    slide_h: float,
):
    """
    Belirtilen resmi açar ve EMU cinsinden verilen bbox (sol,ust,sag,alt)
    koordinatlarını resim piksellerine dönüştürerek kırpar ve PNG akışı döner.
    """
    if not image_path:
        raise HTTPException(status_code=404, detail="Resim yolu boş.")
    if not os.path.exists(image_path):
        raise HTTPException(status_code=404, detail="Resim dosyası sunucuda bulunamadı.")

    # Kırpılacak koordinat yoksa resmin tamamını yolla
    if not bbox or bbox == "0,0,0,0":
        return FileResponse(image_path)

    try:
        l, t, r, b = [float(x.strip()) for x in bbox.split(",")]

        with Image.open(image_path) as img:
            img_w, img_h = img.width, img.height

            if slide_w > 0 and slide_h > 0:
                pixel_l = (l / slide_w) * img_w
                pixel_t = (t / slide_h) * img_h
                pixel_r = (r / slide_w) * img_w
                pixel_b = (b / slide_h) * img_h

                # Etrafına pay (padding) bırakalım ki metin çok sınırda kesilmesin
                pad_x = 15
                pad_y = 15
                pixel_l = max(0, pixel_l - pad_x)
                pixel_t = max(0, pixel_t - pad_y)
                pixel_r = min(img_w, pixel_r + pad_x)
                pixel_b = min(img_h, pixel_b + pad_y)

                cropped = img.crop((pixel_l, pixel_t, pixel_r, pixel_b))
            else:
                cropped = img.copy()

            # Resmi hafızada oluşturup frontend'e akıt (streaming)
            buf = io.BytesIO()
            cropped.save(buf, format="PNG")
            buf.seek(0)

            return StreamingResponse(buf, media_type="image/png")

    except Exception as e:
        print(f"[CROP ERROR] {e}")
        # Kesme işleminde hesaplamalı hata olursa tam resmi döndür
        return FileResponse(image_path)
