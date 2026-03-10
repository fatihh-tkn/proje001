import io
import pandas as pd

class FileParserService:
    @staticmethod
    def parse_excel(file_bytes: bytes) -> dict:
        """
        Excel dosyasını alır (XLSX, XLS vb.) ve ilk sayfasını parse edip
        satırları bir JSON/Dict yapısına dönüştürür.
        """
        try:
            df = pd.read_excel(io.BytesIO(file_bytes))
            df = df.fillna("")
            data = df.to_dict(orient="records")
            
            return {
                "success": True,
                "type": "excel",
                "row_count": len(df),
                "columns": df.columns.tolist(),
                "data": data,
                "message": "Excel dosyası başarıyla çözümlendi."
            }
        except Exception as e:
            return {
                "success": False,
                "type": "excel",
                "error": str(e),
                "message": "Excel okunurken bir hata oluştu."
            }

file_parser = FileParserService()
