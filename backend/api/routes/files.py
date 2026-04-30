import os
import io

from fastapi import APIRouter, UploadFile, File, HTTPException
from fastapi.responses import FileResponse, StreamingResponse
from PIL import Image

from services.file_parser import file_parser
from core.logger import get_logger

logger = get_logger("routes.files")
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


@router.get("/image/highlight")
async def highlight_image(
    image_path: str,
    bbox: str,
    slide_w: float = 0,
    slide_h: float = 0,
):
    """
    Resmin tamamını döner; verilen bbox koordinatlarına kırmızı dikdörtgen çizer.
    Geri kalan alan yarı saydam karartma ile vurgulanır.
    bbox formatı: "x0,y0,x1,y1" (PDF pikselleri veya EMU, slide_w/h ile normalize edilir).
    """
    if not image_path:
        raise HTTPException(status_code=404, detail="Resim yolu boş.")
    if not os.path.exists(image_path):
        raise HTTPException(status_code=404, detail="Resim dosyası sunucuda bulunamadı.")

    if not bbox or bbox == "0,0,0,0":
        return FileResponse(image_path)

    try:
        from PIL import ImageDraw

        parts = [float(x.strip()) for x in bbox.split(",")]
        l, t, r, b = parts[0], parts[1], parts[2], parts[3]

        with Image.open(image_path) as img:
            img = img.convert("RGBA")
            img_w, img_h = img.width, img.height

            # Koordinat dönüşümü: EMU/pt → piksel
            if slide_w > 0 and slide_h > 0:
                px_l = max(0, (l / slide_w) * img_w)
                px_t = max(0, (t / slide_h) * img_h)
                px_r = min(img_w, (r / slide_w) * img_w)
                px_b = min(img_h, (b / slide_h) * img_h)
            else:
                px_l, px_t, px_r, px_b = l, t, r, b

            # Karartma katmanı (vignette): seçili alan dışını karart
            overlay = Image.new("RGBA", (img_w, img_h), (0, 0, 0, 0))
            draw_ov = ImageDraw.Draw(overlay)
            draw_ov.rectangle([0, 0, img_w - 1, img_h - 1], fill=(0, 0, 0, 140))
            # Seçili alanı şeffaf bırak
            draw_ov.rectangle([px_l, px_t, px_r, px_b], fill=(0, 0, 0, 0))
            img = Image.alpha_composite(img, overlay)

            # Kırmızı çerçeve: 4px kalınlık
            draw_rect = ImageDraw.Draw(img)
            for i in range(4):
                draw_rect.rectangle(
                    [px_l - i, px_t - i, px_r + i, px_b + i],
                    outline=(239, 68, 68, 255),
                )

            img = img.convert("RGB")
            buf = io.BytesIO()
            img.save(buf, format="PNG", optimize=False)
            buf.seek(0)
            return StreamingResponse(buf, media_type="image/png")

    except Exception as e:
        logger.warning("Highlight hatası [%s]: %s", image_path, e)
        return FileResponse(image_path)


@router.get("/page-image/{belge_kimlik}/{page_no}")
async def get_page_image(
    belge_kimlik: str,
    page_no: int,
    bbox: str = "",
    slide_w: float = 0,
    slide_h: float = 0,
):
    """
    Belge kimliği + sayfa numarasına göre slayt görselini döner.
    Belge'nin meta.images_yolu üzerinden arşiv konumunu çözer.
    image_path'in bozuk/eski olduğu durumlarda bile çalışır.
    """
    from database.sql.session import get_session
    from database.sql.models import Belge

    with get_session() as db:
        belge = db.get(Belge, belge_kimlik)
        if not belge or not belge.meta:
            raise HTTPException(status_code=404, detail="Belge bulunamadı.")
        imgs_dir = (belge.meta or {}).get("images_yolu", "")
        if not imgs_dir:
            raise HTTPException(status_code=404, detail="Bu belge için görsel dizini bulunamadı.")
        img_path = os.path.join(imgs_dir, f"page_{page_no}.png")
        if not os.path.exists(img_path):
            raise HTTPException(status_code=404, detail=f"Sayfa görseli bulunamadı: page_{page_no}.png")

    return await highlight_image(image_path=img_path, bbox=bbox, slide_w=slide_w, slide_h=slide_h)


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
        logger.warning("Resim kırpma hatası [%s]: %s", image_path, e)
        return FileResponse(image_path)
