from faster_whisper import WhisperModel
print('large-v3 Modeli indirilmeye baslaniyor (Yk. 3GB)...')
WhisperModel('large-v3', device='cpu', compute_type='int8')
print('Model inisi tamamlandi.')
