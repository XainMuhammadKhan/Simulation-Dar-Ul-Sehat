// src/Components/ExcelDataLoader.jsx
//
// Drop this into any simulator page's "form" tab. It lets the user upload
// simulation.xlsx, pick which Day to run, and hands back plain
// { arrivalTimes, serviceTimes, priorities } arrays via onDataReady.

import React, { useState } from "react";
import { parseExcelWorkbook, buildInputsFromDayRows } from "../utils/queueEngine";

export default function ExcelDataLoader({ onDataReady }) {
  const [byDay, setByDay] = useState(null);
  const [selectedDay, setSelectedDay] = useState("");
  const [fileName, setFileName] = useState("");
  const [error, setError] = useState("");

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError("");
    setFileName(file.name);

    try {
      const grouped = await parseExcelWorkbook(file);
      setByDay(grouped);
      const firstDay = Object.keys(grouped)[0] || "";
      setSelectedDay(firstDay);
      if (firstDay) {
        const inputs = buildInputsFromDayRows(grouped[firstDay]);
        onDataReady(inputs);
      }
    } catch (err) {
      console.error(err);
      setError("Could not read that file. Make sure it's a valid .xlsx.");
      setByDay(null);
    }
  };

  const handleDayChange = (day) => {
    setSelectedDay(day);
    if (byDay && byDay[day]) {
      onDataReady(buildInputsFromDayRows(byDay[day]));
    }
  };

  return (
    <div className="bg-white rounded-xl shadow p-6 border max-w-2xl mx-auto mb-6">
      <h3 className="text-lg font-semibold mb-3">Load real data from Excel (optional)</h3>

      <input
        type="file"
        accept=".xlsx,.xls"
        onChange={handleFile}
        className="block w-full text-sm mb-3"
      />

      {fileName && <p className="text-sm text-gray-600 mb-2">Loaded: {fileName}</p>}
      {error && <p className="text-sm text-red-600 mb-2">{error}</p>}

      {byDay && (
        <div className="flex items-center gap-3">
          <label className="text-sm font-medium">Day:</label>
          <select
            value={selectedDay}
            onChange={(e) => handleDayChange(e.target.value)}
            className="border rounded px-3 py-1"
          >
            {Object.keys(byDay).map((day) => (
              <option key={day} value={day}>
                Day {day} ({byDay[day].length} patients)
              </option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
}