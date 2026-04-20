from sqlalchemy.orm import Session
from models import SystemSetting

def get_system_setting(db: Session, key: str, default: str = ""):
    setting = db.query(SystemSetting).filter(SystemSetting.key == key).first()
    return setting.value if setting else default
