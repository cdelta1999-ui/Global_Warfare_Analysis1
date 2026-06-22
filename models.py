from sqlalchemy import Column, Integer, String, Float, ForeignKey
from database import Base

class CountryStat(Base):
    __tablename__ = "country_stats"

    id = Column(Integer, primary_key=True, index=True)
    country_name = Column(String, unique=True, index=True)
    total_fatalities = Column(Float, default=0.0)
    wvi_index = Column(Integer, default=0)
    
    # Intelligence Telemetry Pillars
    cyber_score = Column(Integer, default=50)
    economic_score = Column(Integer, default=50)
    kinetic_score = Column(Integer, default=50)

class ConflictEvent(Base):
    __tablename__ = "conflict_events"

    id = Column(Integer, primary_key=True, index=True)
    country_name = Column(String, index=True)
    year = Column(Integer, index=True)
    fatalities = Column(Float, default=0.0)
    conflict_type = Column(String)

class MLForecast(Base):
    __tablename__ = "ml_forecasts"

    id = Column(Integer, primary_key=True, index=True)
    country_name = Column(String, unique=True, index=True)
    predicted_attack_type = Column(String)
    predictability_score = Column(Float)
    danger_risk_status = Column(String)
    forecasted_event_volume = Column(Integer)
