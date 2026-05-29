from fastapi import FastAPI, Depends, Query
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, timedelta, timezone
from zoneinfo import ZoneInfo

from database import engine, SessionLocal
from models import Base, TrainSighting


Base.metadata.create_all(bind=engine)

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

railroad_line_orders = {
    "CN_NORMANTOWN": [
        3,   # W Diehl Rd
        10,  # Montgomery Rd x Normantown Rd
        9,   # Keating Dr x Normantown Rd
        8,   # W Hafenrichter Rd x Normantown Rd
        4,   # W Wolfs Crossing Rd x S Normantown Rd
        2,   # 111th St x S Normantown Rd
        1,   # 119th St x S Normantown Rd
    ],
    "BNSF_AURORA": [
        6,   # E Indian Trail x Aurora Ave
        5,   # E Illinois Ave x Aurora Ave
    ],
}

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


def get_utc_now():
    return datetime.now(timezone.utc)


def get_central_now():
    return datetime.now(ZoneInfo("America/Chicago"))


def normalize_timestamp_to_utc(timestamp):
    if timestamp is None:
        return None

    if timestamp.tzinfo is None:
        return timestamp.replace(tzinfo=timezone.utc)

    return timestamp.astimezone(timezone.utc)


def normalize_timestamp_to_central(timestamp):
    utc_time = normalize_timestamp_to_utc(timestamp)

    if utc_time is None:
        return None

    return utc_time.astimezone(ZoneInfo("America/Chicago"))


def parse_time_to_minutes(time_string: str):
    try:
        hour, minute = time_string.split(":")
        hour = int(hour)
        minute = int(minute)

        if hour < 0 or hour > 23 or minute < 0 or minute > 59:
            return None

        return hour * 60 + minute
    except:
        return None


def minutes_apart(time1, time2):
    difference = abs(time1 - time2)
    return min(difference, 1440 - difference)


def get_sighting_central_minutes(sighting):
    central_time = normalize_timestamp_to_central(sighting.timestamp)

    if central_time is not None:
        return central_time.hour * 60 + central_time.minute

    if sighting.local_hour is not None:
        return sighting.local_hour * 60

    return None


def calculate_likelihood(crossing_id: int, db: Session):
    recent_cutoff = get_utc_now() - timedelta(minutes=45)

    sightings = (
        db.query(TrainSighting)
        .filter(TrainSighting.crossing_id == crossing_id)
        .all()
    )

    recent_count = 0

    for sighting in sightings:
        sighting_time = normalize_timestamp_to_utc(sighting.timestamp)

        if sighting_time is not None and sighting_time >= recent_cutoff:
            recent_count += 1

    if recent_count >= 3:
        return "High"
    elif recent_count >= 1:
        return "Medium"
    else:
        return "Low"


def calculate_time_based_likelihood(railroad: str, selected_time: str, db: Session):
    selected_minutes = parse_time_to_minutes(selected_time)

    if selected_minutes is None:
        return {"detail": "Invalid time format. Use HH:MM, like 17:30"}

    recent_cutoff = get_utc_now() - timedelta(minutes=45)

    sightings = (
        db.query(TrainSighting)
        .filter(TrainSighting.railroad == railroad)
        .all()
    )

    recent_count = 0
    historical_count = 0

    for sighting in sightings:
        sighting_utc_time = normalize_timestamp_to_utc(sighting.timestamp)
        sighting_central_minutes = get_sighting_central_minutes(sighting)

        is_recent = (
            sighting_utc_time is not None
            and sighting_utc_time >= recent_cutoff
        )

        is_near_selected_time = (
            sighting_central_minutes is not None
            and minutes_apart(sighting_central_minutes, selected_minutes) <= 30
        )

        if is_recent:
            recent_count += 1
        elif is_near_selected_time:
            historical_count += 1

    score = recent_count + historical_count

    if recent_count >= 3 or score >= 4:
        likelihood = "High"
    elif recent_count >= 1 or historical_count >= 1:
        likelihood = "Medium"
    else:
        likelihood = "Low"

    return {
        "railroad": railroad,
        "requested_time": selected_time,
        "recent_sightings": recent_count,
        "historical_sightings_near_time": historical_count,
        "likelihood": likelihood,
        "message": f"{railroad} has {likelihood.lower()} train likelihood around {selected_time}.",
    }


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
    utc_time = get_utc_now()
    central_time = utc_time.astimezone(ZoneInfo("America/Chicago"))

    new_sighting = TrainSighting(
        crossing_id=sighting.crossing_id,
        crossing_name=sighting.crossing_name,
        railroad=sighting.railroad,
        latitude=sighting.latitude,
        longitude=sighting.longitude,
        direction=sighting.direction,
        train_type=sighting.train_type,
        timestamp=utc_time.replace(tzinfo=None),
        local_hour=central_time.hour,
    )

    db.add(new_sighting)
    db.commit()
    db.refresh(new_sighting)

    return {
        "message": "Train sighting reported",
        "sighting": {
            "id": new_sighting.id,
            "crossing_id": new_sighting.crossing_id,
            "crossing_name": new_sighting.crossing_name,
            "railroad": new_sighting.railroad,
            "latitude": new_sighting.latitude,
            "longitude": new_sighting.longitude,
            "direction": new_sighting.direction,
            "train_type": new_sighting.train_type,
            "timestamp": new_sighting.timestamp,
            "local_hour": new_sighting.local_hour,
        },
    }


@app.get("/sightings")
def get_sightings(db: Session = Depends(get_db)):
    sightings = (
        db.query(TrainSighting)
        .order_by(TrainSighting.timestamp.desc())
        .all()
    )

    results = []

    for sighting in sightings:
        results.append(
            {
                "id": sighting.id,
                "crossing_id": sighting.crossing_id,
                "crossing_name": sighting.crossing_name,
                "railroad": sighting.railroad,
                "latitude": sighting.latitude,
                "longitude": sighting.longitude,
                "direction": sighting.direction,
                "train_type": sighting.train_type,
                "timestamp": sighting.timestamp,
                "local_hour": sighting.local_hour,
            }
        )

    return results


@app.get("/predict/railroad")
def predict_railroad(
    railroad: str = Query(...),
    time: str = Query(...),
    db: Session = Depends(get_db),
):
    return calculate_time_based_likelihood(railroad, time, db)


@app.get("/crossings/{crossing_id}/risk")
def predict_crossing_risk(
    crossing_id: int,
    time: str = Query(...),
    db: Session = Depends(get_db),
):
    selected_minutes = parse_time_to_minutes(time)

    if selected_minutes is None:
        return {"detail": "Invalid time format. Use HH:MM, like 17:30"}

    crossing = find_crossing_by_id(crossing_id)

    if crossing is None:
        return {"detail": "Crossing not found"}

    recent_cutoff = get_utc_now() - timedelta(minutes=45)

    sightings = (
        db.query(TrainSighting)
        .filter(TrainSighting.crossing_id == crossing_id)
        .all()
    )

    recent_count = 0
    historical_count = 0

    for sighting in sightings:
        sighting_utc_time = normalize_timestamp_to_utc(sighting.timestamp)
        sighting_central_minutes = get_sighting_central_minutes(sighting)

        is_recent = (
            sighting_utc_time is not None
            and sighting_utc_time >= recent_cutoff
        )

        is_near_selected_time = (
            sighting_central_minutes is not None
            and minutes_apart(sighting_central_minutes, selected_minutes) <= 30
        )

        if is_recent:
            recent_count += 1
        elif is_near_selected_time:
            historical_count += 1

    approaching_signal = get_approaching_train_signal(crossing_id, db)
    approaching_train = approaching_signal["approaching_train"]

    score = recent_count + historical_count

    if recent_count >= 3 or score >= 4:
        likelihood = "High"
    elif approaching_train:
        likelihood = "Medium"
    elif recent_count >= 1 or historical_count >= 1:
        likelihood = "Medium"
    else:
        likelihood = "Low"

    reasons = []

    if recent_count > 0:
        reasons.append("Recent train activity reported at this crossing")

    if approaching_train:
        reasons.append(approaching_signal["reason"])

    if historical_count > 0:
        reasons.append("Historical sightings exist around this time at this crossing")

    if not reasons:
        reasons.append("No recent, approaching, or historical train activity found for this crossing at this time")

    return {
        "crossing_id": crossing_id,
        "crossing_name": crossing["name"],
        "railroad": crossing["railroad"],
        "requested_time": time,
        "recent_sightings": recent_count,
        "historical_sightings_near_time": historical_count,
        "approaching_train": approaching_train,
        "approaching_source_crossing": approaching_signal["source_crossing"],
        "likelihood": likelihood,
        "reasons": reasons,
    }


def find_crossing_by_id(crossing_id: int):
    for crossing in crossings:
        if crossing["id"] == crossing_id:
            return crossing

    return None


def find_line_for_crossing(crossing_id: int):
    for line_name, crossing_ids in railroad_line_orders.items():
        if crossing_id in crossing_ids:
            return line_name, crossing_ids

    return None, None


def get_approaching_train_signal(crossing_id: int, db: Session):
    line_name, line_crossing_ids = find_line_for_crossing(crossing_id)

    if line_crossing_ids is None:
        return {
            "approaching_train": False,
            "source_crossing": None,
            "reason": None,
        }

    target_index = line_crossing_ids.index(crossing_id)
    recent_cutoff = get_utc_now() - timedelta(minutes=30)

    recent_sightings = (
        db.query(TrainSighting)
        .filter(TrainSighting.crossing_id.in_(line_crossing_ids))
        .all()
    )

    for sighting in recent_sightings:
        sighting_time = normalize_timestamp_to_utc(sighting.timestamp)

        if sighting_time is None or sighting_time < recent_cutoff:
            continue

        if sighting.crossing_id == crossing_id:
            continue

        if sighting.direction is None:
            continue

        direction = sighting.direction.lower()
        source_index = line_crossing_ids.index(sighting.crossing_id)

        train_is_heading_toward_target = False

        if direction == "southbound" and source_index < target_index:
            train_is_heading_toward_target = True

        if direction == "northbound" and source_index > target_index:
            train_is_heading_toward_target = True

        if train_is_heading_toward_target:
            source_crossing = find_crossing_by_id(sighting.crossing_id)

            return {
                "approaching_train": True,
                "source_crossing": source_crossing["name"] if source_crossing else "Unknown crossing",
                "reason": f"A {sighting.direction.lower()} train was recently reported at {source_crossing['name'] if source_crossing else 'another crossing'} and may be heading toward this crossing.",
            }

    return {
        "approaching_train": False,
        "source_crossing": None,
        "reason": None,
    }