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

  const [crossingSearch, setCrossingSearch] = useState("");
  const [selectedCrossingId, setSelectedCrossingId] = useState("");
  const [showCrossingSuggestions, setShowCrossingSuggestions] = useState(false);

  const [selectedHour, setSelectedHour] = useState("5");
  const [selectedMinute, setSelectedMinute] = useState("30");
  const [selectedPeriod, setSelectedPeriod] = useState("PM");

  const [crossingRisk, setCrossingRisk] = useState(null);
  const [pendingReportCrossing, setPendingReportCrossing] = useState(null);

  const filteredCrossings = crossings.filter((crossing) =>
    `${crossing.name} ${crossing.railroad} ${crossing.city}`
      .toLowerCase()
      .includes(crossingSearch.toLowerCase())
  );

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

  const selectCrossing = (crossing) => {
    setSelectedCrossingId(crossing.id);
    setCrossingSearch(`${crossing.name} — ${crossing.railroad}`);
    setCrossingRisk(null);
    setShowCrossingSuggestions(false);
  };

  const openReportModal = (crossing) => {
    setPendingReportCrossing(crossing);
  };

  const confirmReportTrain = async () => {
    if (!pendingReportCrossing) return;

    const crossing = pendingReportCrossing;

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

      setPendingReportCrossing(null);
    } catch (error) {
      console.error("Error reporting train:", error);
      alert("Failed to report train.");
    }
  };

  const handleCrossingInputChange = (value) => {
    setCrossingSearch(value);
    setCrossingRisk(null);
    setShowCrossingSuggestions(true);

    const matchedCrossing = crossings.find(
      (crossing) =>
        `${crossing.name} — ${crossing.railroad}`.toLowerCase() ===
        value.toLowerCase()
    );

    if (matchedCrossing) {
      setSelectedCrossingId(matchedCrossing.id);
    } else {
      setSelectedCrossingId("");
    }
  };

  const convertToMilitaryTime = () => {
    let hour = parseInt(selectedHour, 10);
    const minute = selectedMinute.padStart(2, "0");

    if (selectedPeriod === "AM" && hour === 12) {
      hour = 0;
    }

    if (selectedPeriod === "PM" && hour !== 12) {
      hour += 12;
    }

    return `${String(hour).padStart(2, "0")}:${minute}`;
  };

  const checkCrossingRisk = async () => {
    if (!selectedCrossingId) {
      alert("Please type or click a crossing first.");
      return;
    }

    const backendTime = convertToMilitaryTime();

    try {
      const response = await fetch(
        `http://127.0.0.1:8000/crossings/${selectedCrossingId}/risk?time=${backendTime}`
      );

      const data = await response.json();
      setCrossingRisk(data);
    } catch (error) {
      console.error("Error checking crossing risk:", error);
      alert("Failed to check crossing risk.");
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
      <header
        style={{
          maxWidth: "1400px",
          margin: "0 auto 22px",
        }}
      >
        <h1 style={{ margin: 0, fontSize: "38px" }}>TrainWane</h1>
        <p style={{ marginTop: "6px", color: "#94a3b8", fontSize: "16px" }}>
          Train-aware crossing reports and delay risk estimates
        </p>
      </header>

      <main
        style={{
          maxWidth: "1400px",
          margin: "0 auto",
          display: "grid",
          gridTemplateColumns: "minmax(0, 2fr) 420px",
          gap: "22px",
          alignItems: "start",
        }}
      >
        <section
          style={{
            height: "78vh",
            borderRadius: "18px",
            overflow: "hidden",
            border: "1px solid #334155",
            boxShadow: "0 20px 40px rgba(0, 0, 0, 0.35)",
          }}
        >
          <MapContainer
            center={[41.7606, -88.3201]}
            zoom={11}
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
                eventHandlers={{
                  click: () => selectCrossing(crossing),
                }}
              >
                <Popup>
                  <div style={{ minWidth: "220px" }}>
                    <strong>{crossing.name}</strong>

                    <p style={{ margin: "8px 0 4px" }}>
                      Railroad: {crossing.railroad}
                    </p>

                    <p style={{ margin: "4px 0" }}>
                      City: {crossing.city}, {crossing.state}
                    </p>

                    <p style={{ margin: "8px 0" }}>
                      Current likelihood:{" "}
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
                      onClick={() => openReportModal(crossing)}
                      style={{
                        backgroundColor: "#2563eb",
                        color: "white",
                        border: "none",
                        padding: "9px 12px",
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
        </section>

        <aside
          style={{
            backgroundColor: "#1e293b",
            border: "1px solid #334155",
            borderRadius: "18px",
            padding: "18px",
            boxShadow: "0 20px 40px rgba(0, 0, 0, 0.25)",
            height: "78vh",
            boxSizing: "border-box",
            overflowY: "auto",
          }}
        >
          <section
            style={{
              backgroundColor: "#0f172a",
              border: "1px solid #334155",
              borderRadius: "14px",
              padding: "16px",
              marginBottom: "18px",
            }}
          >
            <h2 style={{ margin: "0 0 6px", fontSize: "22px" }}>
              Check Train Risk
            </h2>

            <p
              style={{
                margin: "0 0 14px",
                color: "#94a3b8",
                fontSize: "14px",
                lineHeight: 1.4,
              }}
            >
              Enter a railroad crossing and time in order to determine the risk of there being a train.
            </p>

            <label
              style={{
                display: "block",
                marginBottom: "6px",
                color: "#cbd5e1",
                fontSize: "14px",
              }}
            >
              Crossing
            </label>

            <div style={{ position: "relative", marginBottom: "12px" }}>
              <input
                value={crossingSearch}
                onChange={(e) => handleCrossingInputChange(e.target.value)}
                onFocus={() => setShowCrossingSuggestions(true)}
                placeholder="Search by street, railroad, or city..."
                style={{
                  width: "100%",
                  padding: "10px",
                  borderRadius: "8px",
                  border: "1px solid #475569",
                  backgroundColor: "#f8fafc",
                  color: "#0f172a",
                  boxSizing: "border-box",
                }}
              />

              {showCrossingSuggestions && crossingSearch && (
                <div
                  style={{
                    position: "absolute",
                    top: "46px",
                    left: 0,
                    right: 0,
                    backgroundColor: "#f8fafc",
                    border: "1px solid #cbd5e1",
                    borderRadius: "12px",
                    boxShadow: "0 16px 32px rgba(0, 0, 0, 0.35)",
                    zIndex: 1000,
                    maxHeight: "240px",
                    overflowY: "auto",
                    padding: "6px",
                  }}
                >
                  {filteredCrossings.length === 0 ? (
                    <div
                      style={{
                        padding: "12px",
                        color: "#64748b",
                        fontSize: "14px",
                      }}
                    >
                      No crossings found.
                    </div>
                  ) : (
                    filteredCrossings.map((crossing) => (
                      <button
                        key={crossing.id}
                        onClick={() => selectCrossing(crossing)}
                        style={{
                          width: "100%",
                          textAlign: "left",
                          padding: "11px",
                          border: "none",
                          borderRadius: "9px",
                          backgroundColor: "white",
                          cursor: "pointer",
                          marginBottom: "4px",
                        }}
                      >
                        <div
                          style={{
                            color: "#0f172a",
                            fontWeight: "bold",
                            fontSize: "14px",
                          }}
                        >
                          {crossing.name}
                        </div>

                        <div
                          style={{
                            color: "#64748b",
                            fontSize: "13px",
                            marginTop: "3px",
                          }}
                        >
                          {crossing.railroad} • {crossing.city},{" "}
                          {crossing.state}
                        </div>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>

            <label
              style={{
                display: "block",
                marginBottom: "6px",
                color: "#cbd5e1",
                fontSize: "14px",
              }}
            >
              Time
            </label>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr 1fr",
                gap: "8px",
                marginBottom: "12px",
              }}
            >
              <select
                value={selectedHour}
                onChange={(e) => {
                  setSelectedHour(e.target.value);
                  setCrossingRisk(null);
                }}
                style={{
                  padding: "10px",
                  borderRadius: "8px",
                  border: "1px solid #475569",
                  backgroundColor: "#f8fafc",
                  color: "#0f172a",
                }}
              >
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((hour) => (
                  <option key={hour} value={hour}>
                    {hour}
                  </option>
                ))}
              </select>

              <select
                value={selectedMinute}
                onChange={(e) => {
                  setSelectedMinute(e.target.value);
                  setCrossingRisk(null);
                }}
                style={{
                  padding: "10px",
                  borderRadius: "8px",
                  border: "1px solid #475569",
                  backgroundColor: "#f8fafc",
                  color: "#0f172a",
                }}
              >
                {["00", "15", "30", "45"].map((minute) => (
                  <option key={minute} value={minute}>
                    {minute}
                  </option>
                ))}
              </select>

              <select
                value={selectedPeriod}
                onChange={(e) => {
                  setSelectedPeriod(e.target.value);
                  setCrossingRisk(null);
                }}
                style={{
                  padding: "10px",
                  borderRadius: "8px",
                  border: "1px solid #475569",
                  backgroundColor: "#f8fafc",
                  color: "#0f172a",
                }}
              >
                <option value="AM">AM</option>
                <option value="PM">PM</option>
              </select>
            </div>

            <button
              onClick={checkCrossingRisk}
              style={{
                width: "100%",
                padding: "11px",
                border: "none",
                borderRadius: "9px",
                backgroundColor: "#2563eb",
                color: "white",
                cursor: "pointer",
                fontWeight: "bold",
                fontSize: "15px",
              }}
            >
              Check Risk
            </button>

            {crossingRisk && (
              <div
                style={{
                  marginTop: "14px",
                  padding: "12px",
                  backgroundColor: "#1e293b",
                  border: "1px solid #334155",
                  borderRadius: "12px",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: "10px",
                    alignItems: "flex-start",
                    marginBottom: "8px",
                  }}
                >
                  <div>
                    <strong style={{ display: "block", fontSize: "15px" }}>
                      {crossingRisk.crossing_name}
                    </strong>
                    <span style={{ color: "#94a3b8", fontSize: "13px" }}>
                      {crossingRisk.railroad} • {selectedHour}:{selectedMinute}{" "}
                      {selectedPeriod}
                    </span>
                  </div>

                  <span
                    style={{
                      backgroundColor: getLikelihoodColor(
                        crossingRisk.likelihood
                      ),
                      color: "white",
                      padding: "5px 9px",
                      borderRadius: "999px",
                      fontWeight: "bold",
                      fontSize: "12px",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {crossingRisk.likelihood}
                  </span>
                </div>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: "8px",
                    marginTop: "10px",
                  }}
                >
                  <div
                    style={{
                      backgroundColor: "#0f172a",
                      borderRadius: "10px",
                      padding: "10px",
                    }}
                  >
                    <div style={{ color: "#94a3b8", fontSize: "12px" }}>
                      Recent
                    </div>
                    <strong>{crossingRisk.recent_sightings}</strong>
                  </div>

                  <div
                    style={{
                      backgroundColor: "#0f172a",
                      borderRadius: "10px",
                      padding: "10px",
                    }}
                  >
                    <div style={{ color: "#94a3b8", fontSize: "12px" }}>
                      Historical
                    </div>
                    <strong>
                      {crossingRisk.historical_sightings_near_time}
                    </strong>
                  </div>
                </div>

                {crossingRisk.reasons && crossingRisk.reasons.length > 0 && (
                  <p
                    style={{
                      margin: "10px 0 0",
                      color: "#94a3b8",
                      fontSize: "13px",
                      lineHeight: 1.4,
                    }}
                  >
                    {crossingRisk.reasons[0]}
                  </p>
                )}
              </div>
            )}
          </section>

          <section
            style={{
              backgroundColor: "#0f172a",
              border: "1px solid #334155",
              borderRadius: "14px",
              padding: "16px",
            }}
          >
            <div style={{ marginBottom: "12px" }}>
              <h2 style={{ margin: 0, fontSize: "22px" }}>Recent Sightings</h2>
              <p
                style={{
                  margin: "5px 0 0",
                  color: "#94a3b8",
                  fontSize: "14px",
                }}
              >
                Newest reports appear first.
              </p>
            </div>

            <div
              style={{
                maxHeight: "330px",
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
                    gap: "10px",
                  }}
                >
                  {[...sightings]
                    .sort(
                      (a, b) => new Date(b.timestamp) - new Date(a.timestamp)
                    )
                    .map((sighting) => (
                      <div
                        key={sighting.id}
                        style={{
                          backgroundColor: "#1e293b",
                          border: "1px solid #334155",
                          borderRadius: "12px",
                          padding: "11px",
                        }}
                      >
                        <strong style={{ fontSize: "14px" }}>
                          {sighting.crossing_name}
                        </strong>

                        <p style={{ margin: "5px 0", color: "#cbd5e1" }}>
                          {sighting.railroad || "Unknown"} •{" "}
                          {sighting.train_type || "Unknown"}
                        </p>

                        <p
                          style={{
                            margin: 0,
                            color: "#94a3b8",
                            fontSize: "13px",
                          }}
                        >
                          {new Date(sighting.timestamp).toLocaleString()}
                        </p>
                      </div>
                    ))}
                </div>
              )}
            </div>
          </section>
        </aside>
      </main>

      {pendingReportCrossing && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(15, 23, 42, 0.78)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 3000,
            padding: "20px",
          }}
        >
          <div
            style={{
              position: "relative",
              width: "100%",
              maxWidth: "430px",
              backgroundColor: "#f8fafc",
              color: "#0f172a",
              borderRadius: "22px",
              padding: "24px",
              boxShadow: "0 30px 80px rgba(0, 0, 0, 0.45)",
            }}
          >
            <button
              onClick={() => setPendingReportCrossing(null)}
              style={{
                position: "absolute",
                top: "14px",
                right: "16px",
                border: "none",
                background: "transparent",
                color: "#475569",
                fontSize: "34px",
                cursor: "pointer",
                padding: 0,
                lineHeight: 1,
                fontWeight: "400",
              }}
            >
              ×
            </button>

            <h2
              style={{
                margin: "8px 0 18px",
                color: "#475569",
                fontSize: "32px",
                textAlign: "center",
              }}
            >
              Report a train?
            </h2>

            <div
              style={{
                backgroundColor: "#e2e8f0",
                borderRadius: "14px",
                padding: "14px",
                marginBottom: "20px",
                textAlign: "center",
                fontWeight: "bold",
              }}
            >
              <strong style={{ fontSize: "18px" }}>
                {pendingReportCrossing.name}
              </strong>
              <p
                style={{
                  margin: "6px 0 0",
                  color: "#475569",
                  fontSize: "16px",
                }}
              >
                {pendingReportCrossing.railroad} •{" "}
                {pendingReportCrossing.city}, {pendingReportCrossing.state}
              </p>
            </div>

            <div
              style={{
                display: "flex",
                gap: "10px",
                justifyContent: "flex-end",
              }}
            >
              <button
                onClick={() => setPendingReportCrossing(null)}
                style={{
                  padding: "10px 16px",
                  borderRadius: "10px",
                  border: "1px solid #cbd5e1",
                  backgroundColor: "white",
                  color: "#334155",
                  cursor: "pointer",
                  fontWeight: "bold",
                }}
              >
                Cancel
              </button>

              <button
                onClick={confirmReportTrain}
                style={{
                  padding: "10px 16px",
                  borderRadius: "10px",
                  border: "none",
                  backgroundColor: "#2563eb",
                  color: "white",
                  cursor: "pointer",
                  fontWeight: "bold",
                }}
              >
                Report
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;