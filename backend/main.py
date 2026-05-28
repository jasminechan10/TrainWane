from fastapi import FastAPI, Depends, Query
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, timedelta

from database import engine, SessionLocal
from models import Base, TrainSighting
from zoneinfo import ZoneInfo


Base.metadata.create_all(bind=engine)

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


crossings = [
    {
        "id": 1,
        "name": "119th St x S Normantown Rd",
        "latitude": 41.66570,
        "longitude": -88.23357,
        "railroad": "CN",
        "city": "Plainfield",
        "state": "IL",
        "risk_level": "Medium",
    },
    {
        "id": 2,
        "name": "111th St x S Normantown Rd",
        "latitude": 41.68020,
        "longitude": -88.23416,
        "railroad": "CN",
        "city": "Naperville",
        "state": "IL",
        "risk_level": "Medium",
    },
    {
        "id": 3,
        "name": "W Diehl Rd",
        "latitude": 41.79907,
        "longitude": -88.23033,
        "railroad": "CN",
        "city": "Naperville",
        "state": "IL",
        "risk_level": "Low",
    },
    {
        "id": 4,
        "name": "W Wolfs Crossing Rd x S Normantown Rd",
        "latitude": 41.70350,
        "longitude": -88.23495,
        "railroad": "CN",
        "city": "Plainfield",
        "state": "IL",
        "risk_level": "Medium",
    },
    {
        "id": 5,
        "name": "E Illinois Ave x Aurora Ave",
        "latitude": 41.77106,
        "longitude": -88.30554,
        "railroad": "BNSF",
        "city": "Aurora",
        "state": "IL",
        "risk_level": "High",
    },
    {
        "id": 6,
        "name": "E Indian Trail x Aurora Ave",
        "latitude": 41.78213,
        "longitude": -88.31126,
        "railroad": "BNSF",
        "city": "Aurora",
        "state": "IL",
        "risk_level": "High",
    },
    {
        "id": 7,
        "name": "S Adams St x W Washington St",
        "latitude": 41.68396,
        "longitude": -88.35376,
        "railroad": "IR",
        "city": "Oswego",
        "state": "IL",
        "risk_level": "Low",
    },
    {
        "id": 8,
        "name": "W Hafenrichter Rd x Normantown Rd",
        "latitude": 41.71553,
        "longitude": -88.23535,
        "railroad": "CN",
        "city": "Aurora",
        "state": "IL",
        "risk_level": "Medium",
    },
    {
        "id": 9,
        "name": "Keating Dr x Normantown Rd",
        "latitude": 41.72492,
        "longitude": -88.23566,
        "railroad": "CN",
        "city": "Aurora",
        "state": "IL",
        "risk_level": "Medium",
    },
    {
        "id": 10,
        "name": "Montgomery Rd x Normantown Rd",
        "latitude": 41.73224,
        "longitude": -88.23465,
        "railroad": "CN",
        "city": "Aurora",
        "state": "IL",
        "risk_level": "Medium",
    },
]


class TrainSightingCreate(BaseModel):
    crossing_id: int
    crossing_name: str
    railroad: Optional[str] = None
    latitude: float
    longitude: float
    direction: Optional[str] = None
    train_type: Optional[str] = None


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def calculate_likelihood(crossing_id: int, db: Session):
    cutoff_time = datetime.utcnow() - timedelta(minutes=45)

    recent_count = (
        db.query(TrainSighting)
        .filter(TrainSighting.crossing_id == crossing_id)
        .filter(TrainSighting.timestamp >= cutoff_time)
        .count()
    )

    if recent_count >= 3:
        return "High"
    elif recent_count >= 1:
        return "Medium"
    else:
        return "Low"


@app.get("/")
def root():
    return {"message": "TrainWane backend running"}


@app.get("/crossings")
def get_crossings(db: Session = Depends(get_db)):
    crossings_with_likelihood = []

    for crossing in crossings:
        crossing_copy = crossing.copy()
        crossing_copy["train_likelihood"] = calculate_likelihood(crossing["id"], db)
        crossings_with_likelihood.append(crossing_copy)

    return crossings_with_likelihood


@app.post("/sightings")
def report_train(sighting: TrainSightingCreate, db: Session = Depends(get_db)):
    central_time = datetime.now(ZoneInfo("America/Chicago"))

    new_sighting = TrainSighting(
        crossing_id=sighting.crossing_id,
        crossing_name=sighting.crossing_name,
        railroad=sighting.railroad,
        latitude=sighting.latitude,
        longitude=sighting.longitude,
        direction=sighting.direction,
        train_type=sighting.train_type,
        local_hour=central_time.hour,
    )

    db.add(new_sighting)
    db.commit()
    db.refresh(new_sighting)

    return {
        "message": "Train sighting reported",
        "sighting": new_sighting,
    }


@app.get("/sightings")
def get_sightings(db: Session = Depends(get_db)):
    sightings = (
        db.query(TrainSighting)
        .order_by(TrainSighting.timestamp.desc())
        .all()
    )

    return sightings



def calculate_time_based_likelihood(railroad: str, selected_time: str, db: Session):
    selected_hour = int(selected_time.split(":")[0])

    sightings = (
        db.query(TrainSighting)
        .filter(TrainSighting.railroad == railroad)
        .all()
    )

    matching_sightings = []

    for sighting in sightings:
        sighting_hour = sighting.local_hour

        if sighting_hour == selected_hour:
            matching_sightings.append(sighting)

    count = len(matching_sightings)

    if count >= 4:
        likelihood = "High"
    elif count >= 1:
        likelihood = "Medium"
    else:
        likelihood = "Low"

    return {
        "railroad": railroad,
        "requested_time": selected_time,
        "hour_checked": selected_hour,
        "historical_sightings": count,
        "likelihood": likelihood,
        "message": f"{railroad} has {likelihood.lower()} train likelihood around {selected_time}.",
    }


@app.get("/predict/railroad")
def predict_railroad(
    railroad: str = Query(...),
    time: str = Query(...),
    db: Session = Depends(get_db),
):
    return calculate_time_based_likelihood(railroad, time, db)