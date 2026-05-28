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
            "name": "Chicago Crossing",
            "latitude": 41.8781,
            "longitude": -87.6298,
            "railroad": "BNSF"
        },
        {
            "id": 2,
            "name": "Aurora Crossing",
            "latitude": 41.7606,
            "longitude": -88.3201,
            "railroad": "Union Pacific"
        }
    ]