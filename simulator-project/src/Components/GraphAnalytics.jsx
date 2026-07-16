import React, { useState, useEffect } from "react";
import { Bar, Line, Pie } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  PointElement,
  LineElement,
  ArcElement
} from "chart.js";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  PointElement,
  LineElement,
  ArcElement
);

// ===================== HELPER FUNCTIONS =====================

function generateRandomFromDistribution(distributionType, params) {
  if (distributionType === "uniform") {
    return Math.max(0.1, params.a + (params.b - params.a) * Math.random());
  } else if (distributionType === "normal") {
    const u1 = Math.random();
    const u2 = Math.random();
    const z0 = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
    return Math.max(0.1, params.mean + params.stdDev * z0);
  } else if (distributionType === "exponential") {
    return Math.max(0.1, -Math.log(1 - Math.random()) / params.lambda);
  }
  return 0.1;
}

function generateArrivalTimes(inputType, inputData, arrivalDistribution, arrivalParams) {
  let arrivalTimes = [0];
  let interArrivalTimes = [0];

  if (inputType === "customerCount") {
    const numCustomers = parseInt(inputData.count) || 10;
    for (let i = 1; i < numCustomers; i++) {
      const interArrival = generateRandomFromDistribution(arrivalDistribution, arrivalParams);
      interArrivalTimes.push(interArrival);
      arrivalTimes.push(arrivalTimes[i - 1] + interArrival);
    }
  } else {
    const totalDuration =
      parseInt(inputData.endHours) * 60 +
      parseInt(inputData.endMinutes) -
      (parseInt(inputData.startHours) * 60 + parseInt(inputData.startMinutes));

    let currentTime = 0;
    let customerCount = 1;

    while (currentTime <= totalDuration && customerCount < 1000) {
      const interArrival = generateRandomFromDistribution(arrivalDistribution, arrivalParams);
      currentTime += interArrival;
      if (currentTime <= totalDuration) {
        interArrivalTimes.push(interArrival);
        arrivalTimes.push(currentTime);
        customerCount++;
      } else {
        break;
      }
    }
  }

  return { arrivalTimes, interArrivalTimes };
}

function generateServiceTimes(numCustomers, serviceDistribution, serviceParams) {
  const serviceTimes = [];
  for (let i = 0; i < numCustomers; i++) {
    const serviceTime = generateRandomFromDistribution(serviceDistribution, serviceParams);
    serviceTimes.push(Math.max(0.1, Math.round(serviceTime * 100) / 100));
  }
  return serviceTimes;
}

function calculateScheduleMG1(arr, serv) {
  const gantt = [];
  let t = 0;
  const q = [];
  const cust = arr.map((a, i) => ({
    id: i,
    arr: a,
    rem: serv[i],
    completed: false,
    firstStartTime: null
  }));

  let serverAvailableTime = 0;
  let currentProcess = null;
  let iterations = 0;

  while ((q.length > 0 || cust.some((c) => !c.completed)) && iterations < 1000) {
    iterations++;

    cust
      .filter((c) => c.arr <= t && !c.completed && !q.some((x) => x.id === c.id))
      .forEach((c) => q.push(c));

    q.sort((a, b) => a.arr - b.arr);

    if (serverAvailableTime <= t && !currentProcess && q.length > 0) {
      const c = q.shift();
      if (c.firstStartTime === null) c.firstStartTime = t;
      const serve = c.rem;

      gantt.push({
        id: c.id,
        server: 1,
        start: +t.toFixed(2),
        end: +(t + serve).toFixed(2),
        dur: +serve.toFixed(2),
        preempted: false,
        idle: false
      });

      serverAvailableTime = t + serve;
      currentProcess = c;
      c.completed = true;
      c.rem = 0;
    }

    if (currentProcess) {
      const nextArrival = cust.find((c) => !c.completed && c.arr > t)?.arr || Infinity;
      t = Math.min(serverAvailableTime, nextArrival);
      if (serverAvailableTime <= t) currentProcess = null;
    } else if (q.length === 0) {
      const nextArrivals = cust.filter((c) => !c.completed && c.arr > t);
      if (nextArrivals.length > 0) {
        const nextArrivalTime = Math.min(...nextArrivals.map((c) => c.arr));
        if (nextArrivalTime > t) {
          gantt.push({
            id: -1,
            server: 1,
            start: +t.toFixed(2),
            end: +nextArrivalTime.toFixed(2),
            dur: +(nextArrivalTime - t).toFixed(2),
            preempted: false,
            idle: true
          });
        }
        t = nextArrivalTime;
      } else {
        break;
      }
    }
  }

  return gantt;
}

function calculateScheduleMG2(arr, serv) {
  const gantt = [];
  let t = 0;
  const q = [];
  const cust = arr.map((a, i) => ({
    id: i,
    arr: a,
    rem: serv[i],
    completed: false,
    firstStartTime: null
  }));

  let serverAvailableTime = [0, 0];
  let currentProcess = [null, null];
  let iterations = 0;

  while ((q.length > 0 || cust.some((c) => !c.completed)) && iterations < 1000) {
    iterations++;

    cust
      .filter((c) => c.arr <= t && !c.completed && !q.some((x) => x.id === c.id))
      .forEach((c) => q.push(c));

    q.sort((a, b) => a.arr - b.arr);

    for (let s = 0; s < 2; s++) {
      if (serverAvailableTime[s] <= t && !currentProcess[s] && q.length > 0) {
        const c = q.shift();
        if (c.firstStartTime === null) c.firstStartTime = t;
        const serve = c.rem;

        gantt.push({
          id: c.id,
          server: s + 1,
          start: +t.toFixed(2),
          end: +(t + serve).toFixed(2),
          dur: +serve.toFixed(2),
          preempted: false,
          idle: false
        });

        serverAvailableTime[s] = t + serve;
        currentProcess[s] = c;
        c.completed = true;
        c.rem = 0;
      }
    }

    if (currentProcess.some((p) => p !== null)) {
      const nextCompletion = Math.min(
        ...currentProcess.map((p, i) => (p ? serverAvailableTime[i] : Infinity))
      );
      const nextArrival = cust.find((c) => !c.completed && c.arr > t)?.arr || Infinity;
      t = Math.min(nextCompletion, nextArrival);

      for (let s = 0; s < 2; s++) {
        if (currentProcess[s] && serverAvailableTime[s] <= t) currentProcess[s] = null;
      }
    } else if (q.length === 0) {
      const nextArrivals = cust.filter((c) => !c.completed && c.arr > t);
      if (nextArrivals.length > 0) {
        const nextArrivalTime = Math.min(...nextArrivals.map((c) => c.arr));
        for (let s = 0; s < 2; s++) {
          if (nextArrivalTime > t && serverAvailableTime[s] <= t) {
            gantt.push({
              id: -1,
              server: s + 1,
              start: +t.toFixed(2),
              end: +nextArrivalTime.toFixed(2),
              dur: +(nextArrivalTime - t).toFixed(2),
              preempted: false,
              idle: true
            });
          }
        }
        t = nextArrivalTime;
      } else {
        break;
      }
    }
  }

  return gantt;
}

function performanceMeasures(arr, serv, gantt) {
  const first = {};
  const last = {};
  const startTime = [];
  const endingTime = [];
  const waitingTime = [];
  const turnAroundTime = [];
  const server = [];
  const firstStartTime = [];

  const processSegments = gantt.filter((seg) => !seg.idle && seg.id >= 0);

  processSegments.forEach((s) => {
    if (first[s.id] === undefined || s.start < first[s.id]) {
      first[s.id] = s.start;
      if (firstStartTime[s.id] === undefined) firstStartTime[s.id] = s.start;
    }
    if (last[s.id] === undefined || s.end > last[s.id]) last[s.id] = s.end;
  });

  Object.keys(first).forEach((id) => {
    const i = +id;
    startTime[i] = first[id];
    firstStartTime[i] = firstStartTime[id] ?? first[id];
    endingTime[i] = last[id];
    const tat = last[id] - arr[i];
    waitingTime[i] = tat - serv[i];
    turnAroundTime[i] = tat;
    server[i] = gantt.find((g) => g.id === i)?.server || 1;
  });

  return { startTime, endingTime, waitingTime, turnAroundTime, server, firstStartTime };
}

function calculateServerUtilizations(gantt, numServers, makespan) {
  const utilizations = {};
  for (let s = 1; s <= numServers; s++) {
    const busy = gantt
      .filter((seg) => seg.server === s && !seg.idle)
      .reduce((sum, seg) => sum + seg.dur, 0);
    utilizations[`server${s}`] = ((busy / makespan) * 100).toFixed(1);
  }
  return utilizations;
}

function computeSummary(table, utilization, serverUtilizations = {}) {
  if (!table || table.length === 0) return null;
  const avg = (arr) => (arr.reduce((a, b) => a + b, 0) / arr.length).toFixed(2);
  return {
    utilization,
    serverUtilizations,
    avgWait: avg(table.map((t) => t.waitTime || 0)),
    avgTAT: avg(table.map((t) => t.turnaroundTime || 0)),
    avgService: avg(table.map((t) => t.serviceTime || 0)),
    avgResponse: avg(table.map((t) => t.responseTime || 0))
  };
}

const getGanttDataByServer = (ganttChart, serverCount) => {
  const serverData = Array(serverCount)
    .fill(null)
    .map(() => []);
  ganttChart.forEach((item) => {
    const idx = item.server - 1;
    if (idx < serverCount) serverData[idx].push(item);
  });
  serverData.forEach((s) => s.sort((a, b) => a.start - b.start));
  return serverData;
};

const buildInterArrivalTimes = (arrivalTimes) =>
  arrivalTimes.map((time, index) => {
    if (index === 0) return 0;
    return +(time - arrivalTimes[index - 1]).toFixed(2);
  });

// ===================== COMPONENT =====================

export default function GGC() {
  const [inputType, setInputType] = useState("customerCount");
  const [customerCount, setCustomerCount] = useState(10);
  const [timeRange, setTimeRange] = useState({
    startHours: 9,
    startMinutes: 0,
    endHours: 17,
    endMinutes: 0
  });

  const [arrivalDistribution, setArrivalDistribution] = useState("uniform");
  const [serviceDistribution, setServiceDistribution] = useState("uniform");

  const [arrivalParams, setArrivalParams] = useState({
    uniform: { a: 2, b: 8 },
    normal: { mean: 5, stdDev: 2 },
    exponential: { lambda: 0.2 }
  });

  const [serviceParams, setServiceParams] = useState({
    uniform: { a: 3, b: 10 },
    normal: { mean: 6, stdDev: 1.5 },
    exponential: { lambda: 0.15 }
  });

  const [numServers, setNumServers] = useState(2);

  const [result, setResult] = useState(null);
  const [tab, setTab] = useState("form");
  const [chartType, setChartType] = useState("bar");
  const [metric, setMetric] = useState("waiting");
  const [summary, setSummary] = useState(null);

  const themeColors = ["#2C80D3", "#0C3E72", "#091d3a"];

  useEffect(() => {
    setTab("form");
  }, []);

  const runSimulation = () => {
    try {
      const randomInputs = generateArrivalTimes(
        inputType,
        inputType === "customerCount" ? { count: customerCount } : timeRange,
        arrivalDistribution,
        arrivalParams[arrivalDistribution]
      );

      const arrivalTimes = randomInputs.arrivalTimes;
      const interArrivalTimes = randomInputs.interArrivalTimes;

      const serviceTimes = generateServiceTimes(
            arrivalTimes.length,
            serviceDistribution,
            serviceParams[serviceDistribution]
          );

      const gantt =
        numServers === 1
          ? calculateScheduleMG1(arrivalTimes, serviceTimes)
          : calculateScheduleMG2(arrivalTimes, serviceTimes);

      const measures = performanceMeasures(arrivalTimes, serviceTimes, gantt);

      const makespan = gantt.length > 0 ? gantt[gantt.length - 1]?.end || 1 : 1;
      const totalServiceTime = serviceTimes.reduce((a, b) => a + b, 0);
      const overallUtil = ((totalServiceTime / makespan) * 100).toFixed(1);
      const serverUtilizations = calculateServerUtilizations(gantt, numServers, makespan);

      const table = arrivalTimes.map((at, i) => ({
        serialNumber: i + 1,
        interArrival: +interArrivalTimes[i].toFixed(2) || 0,
        arrivalTime: +at.toFixed(2),
        serviceTime: +serviceTimes[i].toFixed(2),
        startTime: +(measures.startTime[i] || 0).toFixed(2),
        endTime: +(measures.endingTime[i] || 0).toFixed(2),
        turnaroundTime: +(measures.turnAroundTime[i] || 0).toFixed(2),
        waitTime: +(measures.waitingTime[i] || 0).toFixed(2),
        responseTime: +((measures.firstStartTime[i] || measures.startTime[i] || 0) - at).toFixed(2),
        server: `Server ${measures.server[i] || 1}`
      }));

      setResult({
        table,
        ganttChart: gantt,
        utilization: overallUtil,
        serverUtilizations,
        source: "random"
      });
      setTab("table");
      setSummary(computeSummary(table, overallUtil, serverUtilizations));
    } catch (error) {
      console.error("Simulation error:", error);
      alert("Error in simulation: " + error.message);
    }
  };

  const TimePicker = ({ value, onChange, label }) => (
    <div className="space-y-2">
      <label className="block text-sm font-semibold text-[#091d3a]">{label}</label>
      <div className="flex gap-2">
        <select
          value={value.hours}
          onChange={(e) => onChange({ ...value, hours: +e.target.value })}
          className="flex-1 px-3 py-2 border-2 border-[#2C80D3]/30 rounded-lg focus:border-[#2C80D3]"
        >
          {Array.from({ length: 24 }, (_, i) => (
            <option key={i} value={i}>
              {i.toString().padStart(2, "0")}h
            </option>
          ))}
        </select>
        <span className="self-center text-gray-600">:</span>
        <select
          value={value.minutes}
          onChange={(e) => onChange({ ...value, minutes: +e.target.value })}
          className="flex-1 px-3 py-2 border-2 border-[#2C80D3]/30 rounded-lg focus:border-[#2C80D3]"
        >
          {[0, 15, 30, 45].map((min) => (
            <option key={min} value={min}>
              {min.toString().padStart(2, "0")}m
            </option>
          ))}
        </select>
      </div>
    </div>
  );

  const DistributionParams = ({ distribution, params, onParamsChange }) => (
    <div className="grid grid-cols-2 gap-4">
      {distribution === "uniform" && (
        <>
          <div>
            <label className="block text-sm font-bold text-[#091d3a] mb-2">Min (a) minutes</label>
            <input
              type="number"
              step="0.1"
              value={params.a}
              onChange={(e) => onParamsChange({ ...params, a: +e.target.value })}
              className="w-full px-4 py-3 text-center bg-gray-50 border-2 border-[#2C80D3]/30 rounded-xl focus:border-[#2C80D3] transition-all"
              min="0.1"
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-[#091d3a] mb-2">Max (b) minutes</label>
            <input
              type="number"
              step="0.1"
              value={params.b}
              onChange={(e) => onParamsChange({ ...params, b: +e.target.value })}
              className="w-full px-4 py-3 text-center bg-gray-50 border-2 border-[#2C80D3]/30 rounded-xl focus:border-[#2C80D3] transition-all"
              min={params.a || 0.1}
            />
          </div>
        </>
      )}
      {distribution === "normal" && (
        <>
          <div>
            <label className="block text-sm font-bold text-[#091d3a] mb-2">Mean (μ) minutes</label>
            <input
              type="number"
              step="0.1"
              value={params.mean}
              onChange={(e) => onParamsChange({ ...params, mean: +e.target.value })}
              className="w-full px-4 py-3 text-center bg-gray-50 border-2 border-[#2C80D3]/30 rounded-xl focus:border-[#2C80D3] transition-all"
              min="0.1"
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-[#091d3a] mb-2">Std Dev (σ) minutes</label>
            <input
              type="number"
              step="0.1"
              value={params.stdDev}
              onChange={(e) => onParamsChange({ ...params, stdDev: +e.target.value })}
              className="w-full px-4 py-3 text-center bg-gray-50 border-2 border-[#2C80D3]/30 rounded-xl focus:border-[#2C80D3] transition-all"
              min="0.1"
            />
          </div>
        </>
      )}
      {distribution === "exponential" && (
        <>
          <div>
            <label className="block text-sm font-bold text-[#091d3a] mb-2">Rate (λ) per minute</label>
            <input
              type="number"
              step="0.01"
              value={params.lambda}
              onChange={(e) => onParamsChange({ ...params, lambda: +e.target.value })}
              className="w-full px-4 py-3 text-center bg-gray-50 border-2 border-[#2C80D3]/30 rounded-xl focus:border-[#2C80D3] transition-all"
              min="0.01"
            />
          </div>
        </>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-[#f0f6ff]">
      {/* TABS */}
      <nav className="bg-[#091d3a] border-b shadow-sm w-full">
        <div className="flex w-full">
          {["form", "gantt", "table", "graphs", "calc"].map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 py-5 md:py-4 text-center font-semibold text-lg uppercase ${
                tab === t ? "bg-[#2C80D3] text-white" : "bg-[#091d3a] text-gray-200 hover:bg-[#0C3E72]"
              } transition`}
            >
              {t === "form"
                ? "Input Params"
                : t === "gantt"
                ? "Gantt"
                : t === "table"
                ? "Table"
                : t === "graphs"
                ? "Graphs"
                : "Calculations"}
            </button>
          ))}
        </div>
      </nav>

      <main className="container mx-auto p-4 md:p-8">
        {/* =============== INPUT PARAMETERS FORM =============== */}
        {tab === "form" && (
          <div className="max-w-4xl mx-auto space-y-8">
            <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
              <h2 className="text-3xl font-bold text-center mb-8 text-[#0C3E72]">
                G/G/C Simulation Setup
              </h2>

              <div className="space-y-6">
                {/* Input Type Selector */}
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-[#091d3a]">Arrival Mode</label>
                  <div className="flex gap-4">
                    <button
                      onClick={() => setInputType("customerCount")}
                      className={`flex-1 py-3 px-4 rounded-xl font-bold border-2 transition-all ${
                        inputType === "customerCount"
                          ? "bg-[#2C80D3] text-white border-[#2C80D3]"
                          : "border-gray-200 text-[#091d3a] hover:bg-gray-50"
                      }`}
                    >
                      By Customer Count
                    </button>
                    <button
                      onClick={() => setInputType("timeLimit")}
                      className={`flex-1 py-3 px-4 rounded-xl font-bold border-2 transition-all ${
                        inputType === "timeLimit"
                          ? "bg-[#2C80D3] text-white border-[#2C80D3]"
                          : "border-gray-200 text-[#091d3a] hover:bg-gray-50"
                      }`}
                    >
                      By Time Range
                    </button>
                  </div>
                </div>

                {/* Conditional Inputs */}
                {inputType === "customerCount" ? (
                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-[#091d3a]">
                      Number of Customers
                    </label>
                    <input
                      type="number"
                      value={customerCount}
                      onChange={(e) => setCustomerCount(Math.max(1, +e.target.value))}
                      className="w-full px-4 py-3 border-2 border-[#2C80D3]/30 rounded-xl focus:border-[#2C80D3]"
                      min="1"
                    />
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-4">
                    <TimePicker
                      value={timeRange}
                      onChange={(val) =>
                        setTimeRange({
                          ...timeRange,
                          startHours: val.hours,
                          startMinutes: val.minutes
                        })
                      }
                      label="Start Time"
                    />
                    <TimePicker
                      value={{ hours: timeRange.endHours, minutes: timeRange.endMinutes }}
                      onChange={(val) =>
                        setTimeRange({
                          ...timeRange,
                          endHours: val.hours,
                          endMinutes: val.minutes
                        })
                      }
                      label="End Time"
                    />
                  </div>
                )}

                <hr className="border-gray-100" />

                {/* Distributions */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {/* Arrival Distribution */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-bold text-[#0C3E72]">Arrival Distribution</h3>
                    <select
                      value={arrivalDistribution}
                      onChange={(e) => setArrivalDistribution(e.target.value)}
                      className="w-full px-4 py-3 border-2 border-[#2C80D3]/30 rounded-xl focus:border-[#2C80D3]"
                    >
                      <option value="uniform">Uniform</option>
                      <option value="normal">Normal</option>
                      <option value="exponential">Exponential</option>
                    </select>

                    <DistributionParams
                      distribution={arrivalDistribution}
                      params={arrivalParams[arrivalDistribution]}
                      onParamsChange={(newParams) =>
                        setArrivalParams({ ...arrivalParams, [arrivalDistribution]: newParams })
                      }
                    />
                  </div>

                  {/* Service Distribution */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-bold text-[#0C3E72]">Service Distribution</h3>
                    <select
                      value={serviceDistribution}
                      onChange={(e) => setServiceDistribution(e.target.value)}
                      className="w-full px-4 py-3 border-2 border-[#2C80D3]/30 rounded-xl focus:border-[#2C80D3]"
                    >
                      <option value="uniform">Uniform</option>
                      <option value="normal">Normal</option>
                      <option value="exponential">Exponential</option>
                    </select>

                    <DistributionParams
                      distribution={serviceDistribution}
                      params={serviceParams[serviceDistribution]}
                      onParamsChange={(newParams) =>
                        setServiceParams({ ...serviceParams, [serviceDistribution]: newParams })
                      }
                    />
                  </div>
                </div>

                <hr className="border-gray-100" />

                {/* Servers */}
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-[#091d3a]">
                    Select Server Configuration
                  </label>
                  <select
                    value={numServers}
                    onChange={(e) => setNumServers(Math.max(1, +e.target.value))}
                    className="w-full px-4 py-3 border-2 border-[#2C80D3]/30 rounded-xl focus:border-[#2C80D3]"
                  >
                    <option value={1}>Single Server (G/G/1)</option>
                    <option value={2}>Two Servers (G/G/2)</option>
                  </select>
                  <p className="text-sm text-gray-600 mt-2">Number of servers available</p>
                </div>
              </div>



              {/* Run Button */}
              <div className="text-center pt-6">
                <button
                  onClick={runSimulation}
                  className="bg-gradient-to-r from-[#2C80D3] to-[#0C3E72] text-white px-16 py-4 rounded-2xl font-bold text-xl hover:shadow-2xl transform hover:scale-105 transition-all duration-300 shadow-lg"
                >
                  Run Simulation
                </button>
              </div>
            </div>
          </div>
        )}

        {/* =============== GANTT CHART =============== */}
        {tab === "gantt" && result && result.ganttChart && result.ganttChart.length > 0 && (
          <div className="bg-white rounded-2xl shadow-xl my-8 p-8 border overflow-auto max-w-7xl mx-auto">
            <h2 className="text-2xl font-bold text-center mb-8 text-[#0C3E72]">Gantt Chart</h2>

            {Array.from({ length: numServers }, (_, serverIndex) => {
              const serverData = getGanttDataByServer(result.ganttChart, numServers)[serverIndex] || [];
              const makespan = serverData.length > 0 ? Math.max(...serverData.map((s) => s.end)) : 1;

              return (
                <div key={serverIndex} className="mb-12">
                  <h3 className="text-xl font-bold text-center mb-6 bg-[#2C80D3] text-white py-3 rounded-lg">
                    Server {serverIndex + 1}
                  </h3>

                  <div className="flex gap-4 items-end justify-start min-w-max py-6 bg-gray-50 rounded-xl px-4">
                    {serverData.map((seg, i) => {
                      if (seg.dur === 0) return null;
                      const widthPercent = Math.max((seg.dur / makespan) * 100, 4);
                      return (
                        <div
                          key={i}
                          className="relative text-center"
                          style={{ minWidth: `${widthPercent * 3}px` }}
                        >
                          <div
                            className={`rounded-xl text-white font-bold flex flex-col items-center justify-center shadow-md transition-all ${
                              seg.idle
                                ? "bg-gray-400 border-2 border-dashed border-gray-500"
                                : "bg-gradient-to-br from-[#2C80D3] to-[#0C3E72]"
                            } hover:scale-105 hover:shadow-lg`}
                            style={{
                              width: Math.max(widthPercent * 4, 80),
                              height: seg.idle ? 70 : 96
                            }}
                          >
                            <div className="text-2xl font-black">
                              {seg.idle ? "IDLE" : `P${seg.id + 1}`}
                            </div>
                            {!seg.idle && (
                              <div className="text-xl font-bold bg-black bg-opacity-40 px-4 py-1 rounded mt-2">
                                {Math.round(seg.dur)}
                              </div>
                            )}
                            {seg.idle && (
                              <div className="text-sm font-bold bg-black bg-opacity-40 px-3 py-1 rounded mt-2">
                                {Math.round(seg.dur)}
                              </div>
                            )}
                          </div>

                          <div className="mt-4">
                            <div className="text-sm text-[#0C3E72] font-semibold">
                              {Math.round(seg.start)}
                            </div>
                            <div className="w-1 h-8 bg-gray-300 mx-auto my-1"></div>
                            <div className="text-sm text-[#091d3a] font-semibold">
                              {Math.round(seg.end)}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}

            <div className="mt-8 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <h4 className="text-lg font-bold text-blue-800 mb-2">Legend:</h4>
              <div className="flex flex-wrap gap-4">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 bg-gradient-to-br from-[#2C80D3] to-[#0C3E72] rounded"></div>
                  <span className="text-sm">Active Process</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 bg-gray-400 border-2 border-dashed border-gray-500 rounded"></div>
                  <span className="text-sm">Idle Time</span>
                </div>
              </div>
            </div>

            <p className="text-center text-gray-500 mt-4 text-sm">
              Scroll horizontally to see all processes →
            </p>
          </div>
        )}

        {/* =============== TABLE =============== */}
        {tab === "table" && result && result.table && result.table.length > 0 && (
          <div className="bg-white rounded-xl shadow-2xl overflow-hidden my-8 border w-full max-w-8xl mx-auto">
            <div className="bg-[#0C3E72] text-white p-6">
              <h2 className="text-3xl font-bold">Results Table</h2>
              <p className="mt-2 text-sm text-white/80">
                Source: Randomly Generated
              </p>
            </div>

            <div className="overflow-x-auto w-full">
              <table className="w-full text-center table-auto text-lg">
                <thead className="bg-[#2C80D3]/80">
                  <tr>
                    {[
                      "Serial Number",
                      "Inter Arrival",
                      "Arrival Time",
                      "Service Time",
                      "Start Time",
                      "End Time",
                      "Turnaround Time",
                      "Wait Time",
                      "Response Time",
                      "Server"
                    ].map((h) => (
                      <th key={h} className="py-4 px-3 font-bold text-lg border border-[#0C3E72] text-white">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {result.table.map((r, i) => (
                    <tr key={i} className="border-b hover:bg-[#2C80D3]/10 transition text-lg">
                      <td className="py-3 px-3 font-bold text-lg text-[#0C3E72]">{r.serialNumber}</td>
                      <td className="py-3 px-3">{Math.round(r.interArrival)}</td>
                      <td className="py-3 px-3">{Math.round(r.arrivalTime)}</td>
                      <td className="py-3 px-3">{Math.round(r.serviceTime)}</td>
                      <td className="py-3 px-3 text-[#0C3E72] font-bold">{Math.round(r.startTime)}</td>
                      <td className="py-3 px-3 text-[#091d3a] font-bold">{Math.round(r.endTime)}</td>
                      <td className="py-3 px-3 text-[#2C80D3] font-bold">
                        {Math.round(r.turnaroundTime)}
                      </td>
                      <td className="py-3 px-3 text-[#2C80D3] font-bold">{Math.round(r.waitTime)}</td>
                      <td className="py-3 px-3 text-[#0C3E72] font-bold">
                        {Math.round(r.responseTime)}
                      </td>
                      <td className="py-3 px-3 font-bold">{r.server}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* =============== GRAPHS =============== */}
        {tab === "graphs" && result && result.table && result.table.length > 0 && (
          <div className="bg-white rounded-xl shadow-2xl my-10 border w-full max-w-7xl mx-auto overflow-hidden">
            <div className="bg-gradient-to-r from-[#2C80D3] to-[#0C3E72] text-white p-8">
              <h2 className="text-3xl font-bold">Performance Analytics</h2>
            </div>

            <div className="grid grid-cols-12">
              <div className="col-span-3 bg-[#091d3a] text-white p-10 border-r min-h-[70vh]">
                <h3 className="text-xl font-bold mb-6">Graph Options</h3>

                <label className="text-lg font-semibold">Graph Type</label>
                <select
                  value={chartType}
                  onChange={(e) => setChartType(e.target.value)}
                  className="mt-3 w-full px-6 py-4 rounded-xl bg-[#2C80D3] text-white shadow"
                >
                  <option value="bar">Bar Chart</option>
                  <option value="line">Line Chart</option>
                  <option value="pie">Pie Chart</option>
                </select>

                <label className="text-lg font-semibold mt-10 block">Select Metric</label>
                <select
                  value={metric}
                  onChange={(e) => setMetric(e.target.value)}
                  className="mt-3 w-full px-6 py-4 rounded-xl bg-[#2C80D3] text-white shadow"
                >
                  <option value="waiting">Waiting Time</option>
                  <option value="response">Response Time</option>
                  <option value="tat">Turnaround Time</option>
                  <option value="endTime">End Time</option>
                </select>

                <div className="mt-8 text-sm text-gray-100">
                  <p>
                    <strong>Note:</strong> Response Time = First Start - Arrival
                  </p>
                </div>
              </div>

              <div className="col-span-9 bg-white p-10 min-h-[70vh]">
                <div className="w-full h-[65vh] bg-[#f0f6ff] rounded-2xl p-6 shadow-inner overflow-auto">
                  {(() => {
                    const labels = result.table.map((r) => `P${r.serialNumber}`);

                    let dataForMetric;
                    if (metric === "waiting") {
                      dataForMetric = result.table.map((r) => Math.round(r.waitTime));
                    } else if (metric === "response") {
                      dataForMetric = result.table.map((r) => Math.round(r.responseTime));
                    } else if (metric === "tat") {
                      dataForMetric = result.table.map((r) => Math.round(r.turnaroundTime));
                    } else {
                      dataForMetric = result.table.map((r) => Math.round(r.endTime));
                    }

                    const maxVal = Math.max(...dataForMetric) + 2;

                    const dataset = {
                      labels,
                      datasets: [
                        {
                          label:
                            metric === "endTime"
                              ? "End Time"
                              : metric === "waiting"
                              ? "Waiting Time"
                              : metric === "response"
                              ? "Response Time"
                              : "Turnaround Time",
                          data: dataForMetric,
                          backgroundColor: themeColors[0],
                          borderColor: "#000",
                          borderWidth: 1
                        }
                      ]
                    };

                    const options = {
                      responsive: true,
                      scales: {
                        y: {
                          beginAtZero: true,
                          max: maxVal,
                          ticks: { stepSize: 1 },
                          title: {
                            display: true,
                            text:
                              metric === "endTime"
                                ? "End Time"
                                : metric === "waiting"
                                ? "Waiting Time"
                                : metric === "response"
                                ? "Response Time"
                                : "Turnaround Time",
                            font: { size: 16, weight: "bold" }
                          }
                        },
                        x: {
                          title: {
                            display: true,
                            text: "Processes",
                            font: { size: 16, weight: "bold" }
                          }
                        }
                      }
                    };

                    return chartType === "bar" ? (
                      <Bar data={dataset} options={options} />
                    ) : chartType === "line" ? (
                      <Line data={dataset} options={options} />
                    ) : (
                      <Pie
                        data={{
                          labels,
                          datasets: [
                            {
                              data: dataForMetric,
                              backgroundColor: result.table.map((_, i) =>
                                i % 3 === 0 ? themeColors[0] : i % 3 === 1 ? themeColors[1] : themeColors[2]
                              )
                            }
                          ]
                        }}
                        options={{ responsive: true }}
                      />
                    );
                  })()}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* =============== CALCULATIONS =============== */}
        {tab === "calc" && result && summary && (
          <div className="p-8 rounded-2xl shadow-2xl max-w-6xl mx-auto my-10">
            <h2 className="text-3xl font-bold text-center mb-8 text-[#0C3E72]">
              Performance Calculations
            </h2>

            {/* Server Utilization */}
            <div className="mb-12">
              <h3 className="text-2xl font-bold mb-6 text-[#0C3E72]">Server Utilization</h3>
              <div className="grid grid-cols-1 gap-6">
                <div className="p-8 rounded-2xl bg-gradient-to-br from-[#2C80D3] to-[#0C3E72] text-white shadow-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-2xl font-semibold">Server 1 Utilization</h3>
                      <div className="text-5xl font-black mt-4">
                        {summary.serverUtilizations.server1 || "0.0"}%
                      </div>
                      <p className="mt-2 text-lg opacity-90">Percentage of time Server 1 is busy</p>
                    </div>
                    <div className="text-right">
                      <div className="text-3xl font-bold">{result.table?.length || 0}</div>
                      <p className="text-lg">Total Customers</p>
                    </div>
                  </div>
                </div>

                {numServers >= 2 && (
                  <div className="p-8 rounded-2xl bg-gradient-to-br from-[#0C3E72] to-[#091d3a] text-white shadow-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-2xl font-semibold">Server 2 Utilization</h3>
                        <div className="text-5xl font-black mt-4">
                          {summary.serverUtilizations.server2 || "0.0"}%
                        </div>
                        <p className="mt-2 text-lg opacity-90">Percentage of time Server 2 is busy</p>
                      </div>
                      <div className="text-right">
                        <div className="text-3xl font-bold">{result.table?.length || 0}</div>
                        <p className="text-lg">Total Customers</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Overall Performance Metrics */}
            <div className="mb-12">
              <h3 className="text-2xl font-bold mb-6 text-[#0C3E72]">Overall Performance Metrics</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                <div className="p-6 rounded-2xl bg-gradient-to-br from-[#0C3E72] to-[#091d3a] text-white shadow-lg">
                  <h3 className="text-lg font-semibold">Avg Waiting Time</h3>
                  <div className="text-4xl font-black mt-4">{summary.avgWait}</div>
                  <p className="mt-2 text-sm opacity-90">Average wait time</p>
                </div>
                <div className="p-6 rounded-2xl bg-gradient-to-br from-[#2C80D3] to-[#091d3a] text-white shadow-lg">
                  <h3 className="text-lg font-semibold">Avg Turnaround Time</h3>
                  <div className="text-4xl font-black mt-4">{summary.avgTAT}</div>
                  <p className="mt-2 text-sm opacity-90">Average completion time</p>
                </div>
                <div className="p-6 rounded-2xl bg-gradient-to-br from-[#091d3a] to-[#0C3E72] text-white shadow-lg">
                  <h3 className="text-lg font-semibold">Avg Service Time</h3>
                  <div className="text-4xl font-black mt-4">{summary.avgService}</div>
                  <p className="mt-2 text-sm opacity-90">Average service time</p>
                </div>
                <div className="p-6 rounded-2xl bg-gradient-to-br from-[#2C80D3] to-[#0C3E72] text-white shadow-lg">
                  <h3 className="text-lg font-semibold">Avg Response Time</h3>
                  <div className="text-4xl font-black mt-4">{summary.avgResponse}</div>
                  <p className="mt-2 text-sm opacity-90">Average response time</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}