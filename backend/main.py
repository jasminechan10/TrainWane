from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def root():
    return {"message": "TrainWane backend running"}

@app.get("/crossings")
def get_crossings():
    return [
        {
            "id": 1,
            "name": "119th St x S Normantown Rd",
            "latitude": 41.66570,
            "longitude": -88.23357,
            "railroad": "CN",
            "city": "Plainfield",
            "state": "IL",
            "risk_level": "Medium"
        },
        {
            "id": 2,
            "name": "111th St x S Normantown Rd",
            "latitude": 41.68020,
            "longitude": -88.23416,
            "railroad": "CN",
            "city": "Naperville",
            "state": "IL",
            "risk_level": "Medium"
        },
        {
            "id": 3,
            "name": "W Diehl Rd",
            "latitude": 41.79907,
            "longitude": -88.23033,
            "railroad": "CN",
            "city": "Naperville",
            "state": "IL",
            "risk_level": "Low"
        },
        {
            "id": 4,
            "name": "W Wolfs Crossing Rd x S Normantown Rd",
            "latitude": 41.70350,
            "longitude": -88.23495,
            "railroad": "CN",
            "city": "Plainfield",
            "state": "IL",
            "risk_level": "Medium"
        },
        {
            "id": 5,
            "name": "E Illinois Ave x Aurora Ave",
            "latitude": 41.77106,
            "longitude": -88.30554,
            "railroad": "BNSF",
            "city": "Aurora",
            "state": "IL",
            "risk_level": "High"
        },
        {
            "id": 6,
            "name": "E Indian Trail x Aurora Ave",
            "latitude": 41.78213,
            "longitude": -88.31126,
            "railroad": "BNSF",
            "city": "Aurora",
            "state": "IL",
            "risk_level": "High"
        },
        {
            "id": 7,
            "name": "S Adams St x W Washington St",
            "latitude": 41.68396,
            "longitude": -88.35376,
            "railroad": "IR",
            "city": "Oswego",
            "state": "IL",
            "risk_level": "Low"
        },
        {
            "id": 8,
            "name": "W Hafenrichter Rd x Normantown Rd",
            "latitude": 41.71553,
            "longitude": -88.23535,
            "railroad": "CN",
            "city": "Aurora",
            "state": "IL",
            "risk_level": "Medium"
        },
        {
            "id": 9,
            "name": "Keating Dr x Normantown Rd",
            "latitude": 41.72492,
            "longitude": -88.23566,
            "railroad": "CN",
            "city": "Aurora",
            "state": "IL",
            "risk_level": "Medium"
        },
        {
            "id": 10,
            "name": "Montgomery Rd x Normantown Rd",
            "latitude": 41.73224,
            "longitude": -88.23465,
            "railroad": "CN",
            "city": "Aurora",
            "state": "IL",
            "risk_level": "Medium"
        }
    ]


train_sightings = []

@app.post("/sightings")
def report_train(sighting: dict):
    train_sightings.append(sighting)
    return {
        "message": "Train sighting reported",
        "sighting": sighting
    }

@app.get("/sightings")
def get_sightings():
    return train_sightings