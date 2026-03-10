from fastapi import APIRouter, UploadFile, File, HTTPException
from services.file_parser import file_parser

router = APIRouter()

@router.post("/parse")
async def parse_file(file: UploadFile = File(...)):
    """
    Kullanıcıdan bir dosya alır (Excel) 
    ve içini okuyup JSON tipinde yanıt döner.
    """
    
    file_name = file.filename.lower()
    content_bytes = await file.read()
    
    if file_name.endswith(".xlsx") or file_name.endswith(".xls"):
        result = file_parser.parse_excel(content_bytes)
        return result
        
    else:
        raise HTTPException(
            status_code=400, 
            detail="Sadece .xlsx ve .xls desteklenmektedir."
        )
