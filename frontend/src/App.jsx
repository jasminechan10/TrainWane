import { useEffect, useState } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup
} from "react-leaflet";

import "leaflet/dist/leaflet.css";

function App() {
  const [crossings, setCrossings] = useState([]);

  useEffect(() => {
    fetch("http://127.0.0.1:8000/crossings")
      .then((response) => response.json())
      .then((data) => setCrossings(data))
      .catch((error) => console.error(error));
  }, []);

  return (
    <div style={{ height: "100vh", width: "100%" }}>
      <MapContainer
        center={[41.8781, -87.6298]}
        zoom={8}
        style={{ height: "100%", width: "100%" }}
      >
        <TileLayer
          attribution="&copy; OpenStreetMap contributors"
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {crossings.map((crossing) => (
          <Marker
            key={crossing.id}
            position={[crossing.latitude, crossing.longitude]}
          >
            <Popup>
              <strong>{crossing.name}</strong>
              <br />
              Railroad: {crossing.railroad}
              <br />
              Train Likelihood: {crossing.risk_level}
              <br />
              <button
                onClick={() => reportTrain(crossing)}
              >
                Report Train
              </button>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}

const reportTrain = async (crossing) => {
  const response = await fetch("http://127.0.0.1:8000/sightings", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      crossing_id: crossing.id,
      crossing_name: crossing.name,
      railroad: crossing.railroad,
      timestamp: new Date().toISOString(),
      confidence_score: 1.0,
    }),
  });

  const data = await response.json();
  console.log(data);
  alert("Train reported!");
};

export default App;