"""
database/repositories/
────────────────────────
ORM üzerinden veri erişim katmanı (Repository Pattern).

Her repository tek bir modele odaklanır ve yalnızca SQLAlchemy
Session kullanır. Route'larda asla çıplak SQL yoktur.
"""
