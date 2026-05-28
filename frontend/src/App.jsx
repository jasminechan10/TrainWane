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
  const [sightings, setSightings] = useState([]);

  const getLikelihoodColor = (likelihood) => {
    if (likelihood === "High") return "#ef4444";
    if (likelihood === "Medium") return "#f59e0b";
    return "#22c55e";
  };

  const fetchCrossings = async () => {
    try {
      const response = await fetch("http://127.0.0.1:8000/crossings");
      const data = await response.json();
      setCrossings(data);
    } catch (error) {
      console.error("Error fetching crossings:", error);
    }
  };

  const fetchSightings = async () => {
    try {
      const response = await fetch("http://127.0.0.1:8000/sightings");
      const data = await response.json();
      setSightings(data);
    } catch (error) {
      console.error("Error fetching sightings:", error);
    }
  };

  const reportTrain = async (crossing) => {
    try {
      const response = await fetch("http://127.0.0.1:8000/sightings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          crossing_id: crossing.id,
          crossing_name: crossing.name,
          railroad: crossing.railroad,
          latitude: crossing.latitude,
          longitude: crossing.longitude,
          direction: "Unknown",
          train_type: "Freight",
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to report train");
      }

      await response.json();

      await fetchSightings();
      await fetchCrossings();

      alert("Train reported!");
    } catch (error) {
      console.error("Error reporting train:", error);
      alert("Failed to report train.");
    }
  };

  useEffect(() => {
    fetchCrossings();
    fetchSightings();
  }, []);

  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: "#0f172a",
        color: "#f8fafc",
        fontFamily: "Arial, sans-serif",
        padding: "24px",
        boxSizing: "border-box",
      }}
    >
      <header style={{ marginBottom: "20px" }}>
        <h1 style={{ margin: 0, fontSize: "40px" }}>TrainWane</h1>
        <p style={{ marginTop: "8px", color: "#94a3b8" }}>
          Passenger and Freight Train Tracking System
        </p>
      </header>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "2fr 1fr",
          gap: "20px",
          alignItems: "start",
        }}
      >
        <div
          style={{
            height: "75vh",
            borderRadius: "16px",
            overflow: "hidden",
            border: "1px solid #334155",
            boxShadow: "0 20px 40px rgba(0, 0, 0, 0.35)",
          }}
        >
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
                  <div style={{ minWidth: "210px" }}>
                    <strong>{crossing.name}</strong>

                    <p style={{ margin: "8px 0 4px" }}>
                      Railroad: {crossing.railroad}
                    </p>

                    <p style={{ margin: "4px 0" }}>
                      City: {crossing.city}, {crossing.state}
                    </p>

                    <p style={{ margin: "8px 0" }}>
                      Train Likelihood:{" "}
                      <span
                        style={{
                          backgroundColor: getLikelihoodColor(
                            crossing.train_likelihood
                          ),
                          color: "white",
                          padding: "4px 8px",
                          borderRadius: "999px",
                          fontWeight: "bold",
                          fontSize: "12px",
                        }}
                      >
                        {crossing.train_likelihood}
                      </span>
                    </p>

                    <button
                      onClick={() => reportTrain(crossing)}
                      style={{
                        backgroundColor: "#2563eb",
                        color: "white",
                        border: "none",
                        padding: "8px 12px",
                        borderRadius: "8px",
                        cursor: "pointer",
                        fontWeight: "bold",
                        marginTop: "8px",
                        width: "100%",
                      }}
                    >
                      Report Train
                    </button>
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        </div>

        <aside
          style={{
            backgroundColor: "#1e293b",
            border: "1px solid #334155",
            borderRadius: "16px",
            padding: "20px",
            boxShadow: "0 20px 40px rgba(0, 0, 0, 0.25)",
            height: "75vh",
            boxSizing: "border-box",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <div style={{ marginBottom: "12px" }}>
            <h2 style={{ margin: 0 }}>Recent Sightings</h2>
            <p
              style={{
                margin: "6px 0 0",
                color: "#94a3b8",
                fontSize: "14px",
              }}
            >
              Newest reports appear first.
            </p>
          </div>

          <div
            style={{
              flex: 1,
              overflowY: "auto",
              paddingRight: "6px",
            }}
          >
            {sightings.length === 0 ? (
              <p style={{ color: "#94a3b8" }}>
                No train sightings reported yet.
              </p>
            ) : (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "12px",
                }}
              >
                {[...sightings]
                  .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
                  .map((sighting) => (
                    <div
                      key={sighting.id}
                      style={{
                        backgroundColor: "#0f172a",
                        border: "1px solid #334155",
                        borderRadius: "12px",
                        padding: "12px",
                      }}
                    >
                      <strong>{sighting.crossing_name}</strong>

                      <p style={{ margin: "6px 0", color: "#cbd5e1" }}>
                        Railroad: {sighting.railroad || "Unknown"}
                      </p>

                      <p style={{ margin: "6px 0", color: "#cbd5e1" }}>
                        Type: {sighting.train_type || "Unknown"}
                      </p>

                      <p
                        style={{
                          margin: 0,
                          color: "#94a3b8",
                          fontSize: "14px",
                        }}
                      >
                        {new Date(sighting.timestamp).toLocaleString()}
                      </p>
                    </div>
                  ))}
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}

export default App;