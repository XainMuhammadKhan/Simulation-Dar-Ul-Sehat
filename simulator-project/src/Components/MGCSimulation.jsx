import React, { useState, useEffect } from "react";
import ExcelDataLoader from "./ExcelDataLoader";
import { runQueueSimulation } from "../utils/queueEngine";
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

function factorial(n) {
  if (n > 20) return Infinity;
  return n <= 1 ? 1 : n * factorial(n - 1);
}

// M/G/N Queue Simulator — generalized over any number of servers (FCFS)
function calculateScheduleMG(arr, serv, numServers = 1) {
  const gantt = [];
  let t = 0;
  const q = [];
  const cust = arr.map((a, i) => ({
    id: i,
    arr: a,
    rem: serv[i],
    completed: false,
    startTime: null
  }));

  const serverAvailableTime = Array(numServers).fill(0);
  const currentProcess = Array(numServers).fill(null);

  let iterations = 0;
  const maxIterations = 2000;

  while ((q.length > 0 || cust.some((c) => !c.completed)) && iterations < maxIterations) {
    iterations++;

    // Add newly arrived customers to queue
    cust
      .filter((c) => c.arr <= t && !c.completed && !q.some((x) => x.id === c.id))
      .forEach((c) => q.push(c));

    // Sort queue by arrival time (FCFS)
    q.sort((a, b) => a.arr - b.arr);

    // Check if any server is idle and can start a new process
    for (let s = 0; s < numServers; s++) {
      if (serverAvailableTime[s] <= t && !currentProcess[s] && q.length > 0) {
        const c = q.shift();

        if (c.startTime === null) {
          c.startTime = t;
        }

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

      for (let s = 0; s < numServers; s++) {
        if (currentProcess[s] && serverAvailableTime[s] <= t) currentProcess[s] = null;
      }
    } else if (q.length === 0) {
      const nextArrivals = cust.filter((c) => !c.completed && c.arr > t);
      if (nextArrivals.length > 0) {
        const nextArrivalTime = Math.min(...nextArrivals.map((c) => c.arr));
        for (let s = 0; s < numServers; s++) {
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

function performanceMeasures(arr, serv, gantt, startTime, endingTime, waitingTime, turnaroundTime, server) {
  const first = {};
  const last = {};

  gantt.forEach((s) => {
    if (s.id < 0) return;
    if (first[s.id] === undefined) first[s.id] = s.start;
    last[s.id] = s.end;
  });

  Object.keys(first).forEach((id) => {
    const i = +id;
    startTime[i] = first[id];
    endingTime[i] = last[id];
    const tat = last[id] - arr[i];
    waitingTime[i] = tat - serv[i];
    turnaroundTime[i] = tat;
    server[i] = gantt.find((g) => g.id === i)?.server || 1;
  });
}

function generateCummulativeProbability(lambda, type, distParams, numServers) {
  let cp = 0, cplookup = 0, count = 0;
  const cparray = [];
  const cplookuparray = [];

  while (cp <= 0.999999999999999) {
    const calc = (Math.exp(-lambda) * Math.pow(lambda, count)) / factorial(count);
    cplookup = cp;
    cplookuparray[count] = cplookup;
    cp = calc + cplookup;
    cparray[count] = cp;
    count++;
    if (count > 500) break;
  }

  const cpValues = [...cparray];
  const cpLookup = [...cplookuparray];

  const serviceTime = [];
  for (let i = 0; i < cpLookup.length; i++) {
    let st;
    if (type === "uniform") {
      st = distParams.a + Math.random() * (distParams.b - distParams.a);
    } else {
      const u1 = Math.random();
      const u2 = Math.random();
      const z0 = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
      st = distParams.u + distParams.sd * z0;
    }
    st = Math.round(Math.max(0.1, st));
    serviceTime.push(st < 1 ? 1 : st);
  }

  const inter = [0];
  for (let i = 1; i < cpLookup.length; i++) {
    const r = Math.random();
    let found = false;
    for (let j = 1; j < cpLookup.length; j++) {
      if (cpLookup[j - 1] <= r && r < cpLookup[j]) {
        inter.push(j);
        found = true;
        break;
      }
    }
    if (!found) inter.push(0);
  }

  const arrivalTime = inter.reduce((a, c, i) => [...a, i === 0 ? 0 : a[i - 1] + c], []);
  const interArrival = [...inter];
  const avgTimeBetweenArrival = arrivalTime.map((_, i) => i);

  const startTime = [], endingTime = [], waitingTime = [], turnaroundTime = [], server = [];
  const gantt = calculateScheduleMG(arrivalTime, serviceTime, numServers);
  performanceMeasures(arrivalTime, serviceTime, gantt, startTime, endingTime, waitingTime, turnaroundTime, server);

  const table = arrivalTime.map((at, i) => ({
    serialNumber: i + 1,
    cpLookup: cpLookup[i],
    cp: cpValues[i],
    avgTimeBetweenArrival: avgTimeBetweenArrival[i],
    interArrival: interArrival[i],
    arrivalTime: at,
    serviceTime: serviceTime[i],
    startTime: startTime[i] || 0,
    endTime: endingTime[i] || 0,
    turnaroundTime: turnaroundTime[i] || 0,
    waitTime: waitingTime[i] || 0,
    responseTime: (startTime[i] || 0) - at,
    server: `Server ${server[i] || 1}`
  }));

  const makespan = gantt.length > 0 ? Math.max(...gantt.map((g) => g.end)) : 1;
  const totalService = serviceTime.reduce((a, b) => a + b, 0);
  const utilization = +(((totalService / (makespan * numServers)) * 100).toFixed(1));

  const serverUtilizations = {};
  for (let s = 1; s <= numServers; s++) {
    const busy = gantt
      .filter((g) => g.server === s && !g.idle)
      .reduce((sum, g) => sum + g.dur, 0);
    serverUtilizations[`server${s}`] = +(((busy / makespan) * 100).toFixed(1));
  }

  return { table, ganttChart: gantt, utilization, serverUtilizations };
}

function computeSummary(table, utilization, serverUtilizations = {}) {
  if (!table || table.length === 0) return null;

  const avg = (arr) => (arr.reduce((a, b) => a + b, 0) / arr.length).toFixed(2);

  const overall = {
    utilization,
    serverUtilizations,
    avgWait: avg(table.map((t) => t.waitTime || 0)),
    avgTAT: avg(table.map((t) => t.turnaroundTime || 0)),
    avgService: avg(table.map((t) => t.serviceTime || 0)),
    avgResponse: avg(table.map((t) => t.responseTime || 0))
  };

  return {
    ...overall,
    totalCustomers: table.length,
    uniqueServers: [...new Set(table.map(t => t.server))].length
  };
}

// ===================== COMPONENT =====================

export default function MGCSimulation() {
  const [lambda, setLambda] = useState(3.96);
  const [distributionType, setDistributionType] = useState("uniform");
  const [uniformParams, setUniformParams] = useState({ a: 2, b: 8 });
  const [normalParams, setNormalParams] = useState({ u: 5, sd: 2 });
  const [numServers, setNumServers] = useState(2);
  const [result, setResult] = useState(null);
  const [tab, setTab] = useState("form");
  const [chartType, setChartType] = useState("bar");
  const [metric, setMetric] = useState("waiting");
  const [summary, setSummary] = useState(null);
  const [excelData, setExcelData] = useState(null);
  const [dataSource, setDataSource] = useState("random");

  const themeColors = ["#2C80D3", "#0C3E72", "#091d3a"];

  useEffect(() => {
    setTab("form")
  }, []);

  const runSimulation = () => {
    if (excelData) {
      // ---- Run from uploaded Excel data ----
      const priorities = Array(excelData.arrivalTimes.length).fill(1);
      const data = runQueueSimulation(
        excelData.arrivalTimes,
        excelData.serviceTimes,
        priorities,
        numServers
      );
      setResult(data);
      setDataSource("excel");
      setTab("table");
      setSummary(computeSummary(data.table, data.utilization, data.serverUtilizations));
      return;
    }

    // ---- Run from randomly generated data — fully local, no backend call ----
    const params = distributionType === "uniform" ? uniformParams : normalParams;
    const data = generateCummulativeProbability(
      lambda,
      distributionType,
      params,
      numServers
    );
    setResult(data);
    setDataSource("random");
    setTab("table");
    setSummary(computeSummary(data.table, data.utilization, data.serverUtilizations));
  };

  const clearExcelData = () => {
    setExcelData(null);
    setDataSource("random");
  };

  const isExcelMode = dataSource === "excel";

  const getGanttDataByServer = (ganttChart, serverCount) => {
    const serverData = Array(serverCount).fill(null).map(() => []);

    ganttChart.forEach((item) => {
      const serverIndex = item.server - 1;
      if (serverIndex < serverCount) {
        serverData[serverIndex].push(item);
      }
    });

    serverData.forEach(server => {
      server.sort((a, b) => a.start - b.start);
    });

    return serverData;
  };

  return (
    <div className="min-h-screen bg-[#f0f6ff]">

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
              {t === "form" ? "Input Params" : t === "gantt" ? "Gantt" : t === "table" ? "Table" : t === "graphs" ? "Graphs" : "Calculations"}
            </button>
          ))}
        </div>
      </nav>

      <main className="container mx-auto p-4 md:p-8">
        {/* =============== FORM =============== */}
        {tab === "form" && (
          <div className="max-w-4xl mx-auto space-y-8">
            {/* ---- Excel upload block ---- */}
            <div className="mt-8">
              <ExcelDataLoader onDataReady={setExcelData} />
              {excelData && (
                <div className="max-w-2xl mx-auto -mt-4 mb-6 flex items-center justify-between bg-[#2C80D3]/10 border border-[#2C80D3]/40 rounded-xl px-6 py-3">
                  <span className="text-sm font-semibold text-[#0C3E72]">
                    Excel data loaded — {excelData.arrivalTimes.length} customers. Running the
                    simulation will use this data instead of the fields below.
                  </span>
                  <button
                    onClick={clearExcelData}
                    className="ml-4 text-sm font-bold text-red-600 hover:text-red-800 whitespace-nowrap"
                  >
                    Clear & use random ✕
                  </button>
                </div>
              )}
            </div>

            <div className="bg-white rounded-3xl shadow-2xl p-8 border border-gray-100 mb-8">
              <h2 className="text-4xl font-extrabold text-center mb-10 text-[#0C3E72] tracking-tight">
                M/G/C Queue — Simulation Setup
              </h2>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                <div className="lg:col-span-7 space-y-8">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    <div className="group">
                      <label className="block text-sm font-bold text-[#091d3a] uppercase tracking-wider mb-3">
                        Arrival Rate (λ)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={lambda}
                        onChange={(e) => setLambda(+e.target.value)}
                        className="w-full px-8 py-6 text-2xl font-bold text-center bg-gradient-to-b from-gray-50 to-gray-100 
                               border-2 border-[#2C80D3]/30 rounded-2xl focus:border-[#2C80D3] focus:ring-4 focus:ring-[#2C80D3]/20 
                               transition-all duration-300 shadow-inner"
                        placeholder="3.96"
                      />
                      <p className="mt-2 text-xs text-gray-600 text-center font-medium">Customers arriving per unit time</p>
                    </div>

                    <div className="group">
                      <label className="block text-sm font-bold text-[#091d3a] uppercase tracking-wider mb-3">
                        Service Distribution
                      </label>
                      <select
                        value={distributionType}
                        onChange={(e) => setDistributionType(e.target.value)}
                        className="w-full px-8 py-6 text-2xl font-bold text-center bg-gradient-to-b from-gray-50 to-gray-100 
                               border-2 border-[#0C3E72]/30 rounded-2xl focus:border-[#0C3E72] focus:ring-4 focus:ring-[#0C3E72]/20 
                               transition-all duration-300 shadow-inner"
                      >
                        <option value="uniform">Uniform Distribution</option>
                        <option value="normal">Normal Distribution</option>
                      </select>
                      <p className="mt-2 text-xs text-gray-600 text-center font-medium">Select service time distribution</p>
                    </div>

                    {distributionType === "uniform" ? (
                      <>
                        <div className="group">
                          <label className="block text-sm font-bold text-[#091d3a] uppercase tracking-wider mb-3">
                            Service Min (a)
                          </label>
                          <input
                            type="number"
                            step="0.1"
                            value={uniformParams.a}
                            onChange={(e) => setUniformParams({...uniformParams, a: +e.target.value})}
                            className="w-full px-8 py-6 text-2xl font-bold text-center bg-gradient-to-b from-gray-50 to-gray-100 
                                   border-2 border-[#091d3a]/30 rounded-2xl focus:border-[#091d3a] focus:ring-4 focus:ring-[#091d3a]/20 
                                   transition-all duration-300 shadow-inner"
                            placeholder="2"
                          />
                          <p className="mt-2 text-xs text-gray-600 text-center font-medium">Minimum service time</p>
                        </div>
                        <div className="group">
                          <label className="block text-sm font-bold text-[#091d3a] uppercase tracking-wider mb-3">
                            Service Max (b)
                          </label>
                          <input
                            type="number"
                            step="0.1"
                            value={uniformParams.b}
                            onChange={(e) => setUniformParams({...uniformParams, b: +e.target.value})}
                            className="w-full px-8 py-6 text-2xl font-bold text-center bg-gradient-to-b from-gray-50 to-gray-100 
                                   border-2 border-[#091d3a]/30 rounded-2xl focus:border-[#091d3a] focus:ring-4 focus:ring-[#091d3a]/20 
                                   transition-all duration-300 shadow-inner"
                            placeholder="8"
                          />
                          <p className="mt-2 text-xs text-gray-600 text-center font-medium">Maximum service time</p>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="group">
                          <label className="block text-sm font-bold text-[#091d3a] uppercase tracking-wider mb-3">
                            Mean (μ)
                          </label>
                          <input
                            type="number"
                            step="0.1"
                            value={normalParams.u}
                            onChange={(e) => setNormalParams({...normalParams, u: +e.target.value})}
                            className="w-full px-8 py-6 text-2xl font-bold text-center bg-gradient-to-b from-gray-50 to-gray-100 
                                   border-2 border-[#091d3a]/30 rounded-2xl focus:border-[#091d3a] focus:ring-4 focus:ring-[#091d3a]/20 
                                   transition-all duration-300 shadow-inner"
                            placeholder="5"
                          />
                          <p className="mt-2 text-xs text-gray-600 text-center font-medium">Average service time</p>
                        </div>
                        <div className="group">
                          <label className="block text-sm font-bold text-[#091d3a] uppercase tracking-wider mb-3">
                            Std Dev (σ)
                          </label>
                          <input
                            type="number"
                            step="0.1"
                            value={normalParams.sd}
                            onChange={(e) => setNormalParams({...normalParams, sd: +e.target.value})}
                            className="w-full px-8 py-6 text-2xl font-bold text-center bg-gradient-to-b from-gray-50 to-gray-100 
                                   border-2 border-[#091d3a]/30 rounded-2xl focus:border-[#091d3a] focus:ring-4 focus:ring-[#091d3a]/20 
                                   transition-all duration-300 shadow-inner"
                            placeholder="2"
                          />
                          <p className="mt-2 text-xs text-gray-600 text-center font-medium">Standard deviation</p>
                        </div>
                      </>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="group">
                      <label className="block text-sm font-bold text-[#091d3a] uppercase tracking-wider mb-3">
                        Number of Servers
                      </label>
                      <input
                        type="number"
                        min="1"
                        step="1"
                        value={numServers}
                        onChange={(e) => setNumServers(Math.max(1, +e.target.value))}
                        className="w-full px-8 py-6 text-2xl font-bold text-center bg-gradient-to-b from-gray-50 to-gray-100 
                               border-2 border-[#2C80D3]/30 rounded-2xl focus:border-[#2C80D3] focus:ring-4 focus:ring-[#2C80D3]/20 
                               transition-all duration-300 shadow-inner"
                      />
                      <p className="mt-2 text-xs text-gray-600 text-center font-medium">Number of service desks open</p>
                    </div>
                  </div>
                </div>

                <div className="lg:col-span-5 space-y-8">
                  <div className="flex items-center justify-center h-full min-h-48">
                    <div className="w-full max-w-xl">
                      <button
                        onClick={runSimulation}
                        className="group relative w-full px-10 py-10 text-4xl font-extrabold text-white 
                             bg-gradient-to-r from-[#2C80D3] via-[#0C3E72] to-[#091d3a] 
                             rounded-3xl shadow-2xl hover:shadow-[#2C80D3]/60 
                             transform hover:scale-105 active:scale-95 transition-all duration-500 
                             overflow-hidden"
                      >
                        <span className="relative z-10 drop-shadow-2xl">RUN SIMULATION</span>
                        <div className="absolute inset-0 bg-gradient-to-l from-[#091d3a] to-[#2C80D3] 
                                  opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
                        <div className="absolute -inset-2 bg-gradient-to-r from-[#2C80D3] to-[#0C3E72] 
                                  blur-2xl opacity-30 group-hover:opacity-70 transition-opacity"></div>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* =============== GANTT CHART =============== */}
        {tab === "gantt" && result && result.ganttChart && result.ganttChart.length > 0 ? (
          <div className="bg-white rounded-2xl shadow-xl my-8 p-8 border overflow-auto max-w-7xl mx-auto">
            <h2 className="text-2xl font-bold text-center mb-8 text-[#0C3E72]">
              Gantt Chart
            </h2>

            {Array.from({ length: numServers }, (_, serverIndex) => {
              const serverNum = serverIndex + 1;
              const segments = result.ganttChart.filter(seg => seg.server === serverNum);
              const makespan = segments.length > 0 ? Math.max(...segments.map(s => s.end)) : 1;

              return (
                <div key={serverNum} className="mb-12">
                  <h3 className="text-xl font-bold text-center mb-6 text-white bg-[#2C80D3] py-3 rounded-lg">
                    Server {serverNum}
                  </h3>

                  <div className="flex gap-6 items-end justify-start min-w-max py-6 bg-gray-50 rounded-xl px-4">
                    {segments.map((seg, i) => {
                      const widthPercent = Math.max((seg.dur / makespan) * 100, 6);

                      return (
                        <div key={i} className="relative text-center" style={{ minWidth: `${widthPercent * 2}px` }}>
                          <div
                            className={`rounded-xl text-white font-bold flex flex-col items-center justify-center shadow-md transition-all ${seg.idle
                              ? "bg-gray-400 border-2 border-dashed border-gray-500"
                              : "bg-gradient-to-br from-[#2C80D3] to-[#0C3E72]"
                              } hover:scale-105 hover:shadow-lg`}
                            style={{ width: Math.max(widthPercent * 3, 80), height: 96 }}
                          >
                            <div className="text-2xl font-black">
                              {seg.idle ? "IDLE" : `P${seg.id + 1}`}
                            </div>
                            {!seg.idle && (
                              <div className="text-xl font-bold bg-black bg-opacity-40 px-4 py-1 rounded mt-2">{seg.dur}</div>
                            )}
                          </div>

                          <div className="mt-4">
                            <div className="text-sm text-[#0C3E72] font-semibold">{seg.start}</div>
                            <div className="w-1 h-8 bg-gray-300 mx-auto my-1"></div>
                            <div className="text-sm text-[#091d3a] font-semibold">{seg.end}</div>
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
          </div>
        ) : null}

        {/* =============== TABLE =============== */}
        {tab === "table" && result && result.table && result.table.length > 0 ? (
          <div className="bg-white rounded-xl shadow-2xl overflow-hidden my-8 border w-full max-w-8xl mx-auto">
            <div className="bg-[#0C3E72] text-white p-6 flex items-center justify-between">
              <h2 className="text-3xl font-bold">Results Table</h2>
              <span className="text-sm font-bold px-4 py-2 rounded-full bg-[#2C80D3] text-white">
                {isExcelMode ? "Source: Uploaded Excel Data" : "Source: Randomly Generated"}
              </span>
            </div>

            <div className="overflow-x-auto w-full">
              <table className="w-full text-center table-auto text-lg">
                <thead className="bg-[#2C80D3]/80">
                  <tr>
                    {[
                      "Serial Number",
                      ...(isExcelMode ? [] : ["Cp Lookup", "Cp", "Avg Time Between Arrival"]),
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
                      {!isExcelMode && (
                        <>
                          <td className="py-3 px-3">{r.cpLookup.toFixed(6)}</td>
                          <td className="py-3 px-3">{r.cp.toFixed(6)}</td>
                          <td className="py-3 px-3">{r.avgTimeBetweenArrival}</td>
                        </>
                      )}
                      <td className="py-3 px-3">{r.interArrival}</td>
                      <td className="py-3 px-3">{r.arrivalTime}</td>
                      <td className="py-3 px-3">{r.serviceTime}</td>
                      <td className="py-3 px-3 text-[#0C3E72] font-bold">{r.startTime.toFixed(2)}</td>
                      <td className="py-3 px-3 text-[#091d3a] font-bold">{r.endTime.toFixed(2)}</td>
                      <td className="py-3 px-3 text-[#2C80D3] font-bold">{r.turnaroundTime.toFixed(2)}</td>
                      <td className="py-3 px-3 text-[#2C80D3] font-bold">{r.waitTime.toFixed(2)}</td>
                      <td className="py-3 px-3 text-[#0C3E72] font-bold">{r.responseTime.toFixed(2)}</td>
                      <td className="py-3 px-3 font-bold">{r.server}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : null}

        {/* =============== GRAPHS =============== */}
        {tab === "graphs" && result && result.table && result.table.length > 0 ? (
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
              </div>

              <div className="col-span-9 bg-white p-10 min-h-[70vh]">
                <div className="w-full h-[65vh] bg-[#f0f6ff] rounded-2xl p-6 shadow-inner overflow-auto">
                  {(() => {
                    const labels = result.table.map((r) => `P${r.serialNumber}`);
                    let dataForMetric = result.table.map((r) =>
                      metric === "waiting"
                        ? r.waitTime
                        : metric === "response"
                        ? r.responseTime
                        : metric === "tat"
                        ? r.turnaroundTime
                        : r.endTime
                    );

                    const dataset = {
                      labels,
                      datasets: [
                        {
                          label: metric,
                          data: dataForMetric,
                          backgroundColor: themeColors[0],
                          borderColor: "#000",
                          borderWidth: 1
                        }
                      ]
                    };

                    const options = { responsive: true };

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
        ) : null}

        {/* =============== CALCULATIONS =============== */}
        {tab === "calc" && result && summary && (
          <div className="p-8 rounded-2xl shadow-2xl max-w-6xl mx-auto my-10">
            <h2 className="text-3xl font-bold text-center mb-8 text-[#0C3E72]">Performance Calculations</h2>

            <div className="mb-12">
              <h3 className="text-2xl font-bold mb-6 text-[#0C3E72]">Server Utilization</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {Array.from({ length: numServers }, (_, idx) => idx + 1).map((serverNum, i) => (
                  <div
                    key={serverNum}
                    className={`p-8 rounded-2xl text-white shadow-lg ${
                      i % 2 === 0
                        ? "bg-gradient-to-br from-[#2C80D3] to-[#0C3E72]"
                        : "bg-gradient-to-br from-[#0C3E72] to-[#091d3a]"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-2xl font-semibold">Server {serverNum} Utilization</h3>
                        <div className="text-5xl font-black mt-4">
                          {summary.serverUtilizations ? summary.serverUtilizations[`server${serverNum}`] : "0.0"}%
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

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