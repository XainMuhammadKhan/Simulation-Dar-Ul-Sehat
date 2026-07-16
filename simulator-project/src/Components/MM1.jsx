import React, { useState } from "react";
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

// ===================== VARIABLES =====================

let arrivalTime = [],
  serviceTime = [],
  startTime = [],
  endingTime = [],
  waitingTime = [],
  turnAroundTime = [],
  table = [],
  cpValues = [],
  cpLookup = [],
  interArrival = [],
  avgTimeBetweenArrival = [];

// ===================== HELPER FUNCTIONS =====================

function factorial(n) {
  return n <= 1 ? 1 : n * factorial(n - 1);
}

function generateCummulativeProbability(lambda, mu) {
  [
    arrivalTime,
    serviceTime,
    startTime,
    endingTime,
    waitingTime,
    turnAroundTime,
    table,
    cpValues,
    cpLookup,
    interArrival,
    avgTimeBetweenArrival
  ] = Array(11)
    .fill()
    .map(() => []);

  let cp = 0,
    cplookup = 0,
    count = 0;
  let cparray = [];
  let cplookuparray = [];

  while (cp <= 0.999999999999999) {
    let calc = Math.exp(-lambda) * Math.pow(lambda, count) / factorial(count);
    cplookup = cp;
    cplookuparray[count] = cplookup;
    cp = calc + cplookup;
    cparray[count] = cp;
    count++;
  }

  cpValues = [...cparray];
  cpLookup = [...cplookuparray];

  for (let i = 0; i < cpLookup.length; i++) {
    let st = Math.round(-mu * Math.log(Math.random()));
    serviceTime.push(st < 1 ? 1 : st);
  }

  let inter = [0];
  for (let i = 1; i < cpLookup.length; i++) {
    let r = Math.random(),
      found = false;
    for (let j = 1; j < cpLookup.length; j++) {
      if (cpLookup[j - 1] <= r && r < cpLookup[j]) {
        inter.push(j);
        found = true;
        break;
      }
    }
    if (!found) inter.push(0);
  }

  arrivalTime = inter.reduce(
    (a, c, i) => [...a, i === 0 ? 0 : a[i - 1] + c],
    []
  );

  for (let i = 0; i < arrivalTime.length; i++) {
    avgTimeBetweenArrival.push(i);
  }

  interArrival = [...inter];

  const gantt = calculateSchedule(arrivalTime, serviceTime);
  performanceMeasures(arrivalTime, serviceTime, gantt);

  const total = serviceTime.reduce((a, b) => a + b, 0);
  const makespan = gantt[gantt.length - 1]?.end || 1;
  const util = ((total / makespan) * 100).toFixed(1);

  table = arrivalTime.map((at, i) => ({
    serialNumber: i + 1,
    cpLookup: cpLookup[i],
    cp: cpValues[i],
    avgTimeBetweenArrival: avgTimeBetweenArrival[i],
    interArrival: interArrival[i],
    arrivalTime: at,
    serviceTime: serviceTime[i],
    startTime: startTime[i] || 0,
    endTime: endingTime[i] || 0,
    turnaroundTime: turnAroundTime[i] || 0,
    waitTime: waitingTime[i] || 0,
    responseTime: (startTime[i] || 0) - at,
    server: "Server 1"
  }));

  return { table, ganttChart: gantt, utilization: util };
}

function calculateSchedule(arr, serv) {
  const gantt = [];
  let t = 0;
  const q = [];
  const cust = arr.map((a, i) => ({
    id: i,
    arr: a,
    rem: serv[i]
  }));

  while (q.length || cust.some((c) => c.rem > 0)) {
    cust
      .filter((c) => c.arr <= t && c.rem > 0 && !q.some((x) => x.id === c.id))
      .forEach((c) => q.push(c));

    // FCFS: sort by arrival time
    q.sort((a, b) => a.arr - b.arr);

    if (!q.length) {
      const nextArrival = Math.min(...cust.filter((c) => c.rem > 0).map((c) => c.arr));
      gantt.push({
        id: -1,
        start: +t.toFixed(2),
        end: +nextArrival.toFixed(2),
        dur: +(nextArrival - t).toFixed(2),
        preempted: false,
        idle: true
      });
      t = nextArrival;
      continue;
    }

    const c = q.shift();
    const start = t;
    const end = start + c.rem;

    gantt.push({
      id: c.id,
      start: +start.toFixed(2),
      end: +end.toFixed(2),
      dur: +c.rem.toFixed(2),
      preempted: false,
      idle: false
    });

    c.rem = 0;
    t = end;
  }
  return gantt;
}

function performanceMeasures(arr, serv, gantt) {
  const first = {},
    last = {};
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
    turnAroundTime[i] = tat;
  });
}

function computeSummary(table, utilization) {
  if (!table || table.length === 0) return null;

  const avg = (arr) => (arr.reduce((a, b) => a + b, 0) / arr.length).toFixed(2);

  const overall = {
    utilization,
    avgWait: avg(table.map((t) => t.waitTime)),
    avgTAT: avg(table.map((t) => t.turnaroundTime)),
    avgService: avg(table.map((t) => t.serviceTime)),
    avgResponse: avg(table.map((t) => t.responseTime))
  };

  return {
    ...overall,
    totalCustomers: table.length
  };
}

// ===================== COMPONENT =====================

export default function MM1() {
  const [lambda, setLambda] = useState(3.96);
  const [mu, setMu] = useState(5);
  const [result, setResult] = useState(null);
  const [tab, setTab] = useState("form");
  const [chartType, setChartType] = useState("bar");
  const [metric, setMetric] = useState("waiting");
  const [summary, setSummary] = useState(null);


  const themeColors = ["#2C80D3", "#0C3E72", "#091d3a"];

  const runSim = () => {
    const data = generateCummulativeProbability(lambda, mu);
    setResult(data);
    setTab("table");
    const s = computeSummary(data.table, data.utilization);
    setSummary(s);
  };

  return (
    <div className="min-h-screen bg-[#f0f6ff]">
      {/* TABS */}
        <nav className="bg-[#091d3a] border-b shadow-sm w-full">
          <div className="flex w-full">
            {['form', 'gantt', 'table', 'graphs', 'calc'].map((t) => (
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


            <div className="bg-white rounded-3xl shadow-2xl p-8 md:p-12 border border-gray-100 mb-8">
              <h2 className="text-4xl font-extrabold text-center mb-10 text-[#0C3E72] tracking-tight">
                M/M/1 Queue — Simulation Setup
              </h2>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
                {/* Left Side */}
                  <div className="lg:col-span-7 space-y-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
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
                        <p className="mt-2 text-xs text-gray-600 text-center font-medium">
                          Customers arriving per unit time
                        </p>
                      </div>

                      <div className="group">
                        <label className="block text-sm font-bold text-[#091d3a] uppercase tracking-wider mb-3">
                          Service Rate (μ)
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          value={mu}
                          onChange={(e) => setMu(+e.target.value)}
                          className="w-full px-8 py-6 text-2xl font-bold text-center bg-gradient-to-b from-gray-50 to-gray-100
                               border-2 border-[#0C3E72]/30 rounded-2xl focus:border-[#0C3E72] focus:ring-4 focus:ring-[#0C3E72]/20
                               transition-all duration-300 shadow-inner"
                          placeholder="5.00"
                        />
                        <p className="mt-2 text-xs text-gray-600 text-center font-medium">
                          Customers served per unit time
                        </p>
                      </div>
                    </div>
                  </div>

                {/* Right Side */}
                <div className="lg:col-span-5 space-y-8">
                  <div className="flex items-center justify-center h-full min-h-48">
                    <div className="w-full max-w-xl">
                      <button
                        onClick={runSim}
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
                      <p className="mt-4 text-center text-sm font-semibold text-[#0C3E72]">
                        Will run using the parameters above.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* =============== GANTT CHART =============== */}
        {tab === "gantt" && result && (
          <div className="bg-white rounded-2xl shadow-xl my-8 p-8 border overflow-auto max-w-7xl mx-auto">
            <h2 className="text-2xl font-bold text-center mb-8 text-[#0C3E72]">Gantt Chart</h2>

            <div className="flex gap-6 items-end justify-start min-w-max py-6">
              {result.ganttChart.map((seg, i) => {
                if (seg.dur === 0) return null;
                const makespan = result.ganttChart[result.ganttChart.length - 1]?.end || 1;
                const widthPercent = Math.max((seg.dur / makespan) * 100, 6);
                return (
                  <div key={i} className="relative text-center" style={{ minWidth: `${widthPercent * 2}px` }}>
                    <div
                      className={`rounded-xl text-white font-bold flex flex-col items-center justify-center shadow-md transition-all ${
                        seg.idle
                          ? "bg-gray-400 border-2 border-dashed border-gray-500"
                          : "bg-gradient-to-br from-[#2C80D3] to-[#0C3E72]"
                      } hover:scale-105 hover:shadow-lg`}
                      style={{ width: Math.max(widthPercent * 3, 80), height: 96 }}
                    >
                      <div className="text-2xl font-black">
                        {seg.idle ? "IDLE" : `P${seg.id + 1}`}
                      </div>
                      {!seg.idle && (
                        <div className="text-xl font-bold bg-black bg-opacity-40 px-4 py-1 rounded mt-2">
                          {seg.dur}
                        </div>
                      )}
                      {seg.idle && (
                        <div className="text-sm font-bold bg-black bg-opacity-40 px-3 py-1 rounded mt-2">
                          {seg.dur}
                        </div>
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
                      "Cp Lookup",
                      "Cp",
                      "Avg Time Between Arrival",
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
                      <td className="py-3 px-3">{r.cpLookup.toFixed(6)}</td>
                      <td className="py-3 px-3">{r.cp.toFixed(6)}</td>
                      <td className="py-3 px-3">{r.avgTimeBetweenArrival}</td>
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
        )}

        {/* =============== CALCULATIONS =============== */}
        {tab === "calc" && result && summary && (
          <div className="p-8 rounded-2xl shadow-2xl max-w-6xl mx-auto my-10">
            <h2 className="text-3xl font-bold text-center mb-8 text-[#0C3E72]">Performance Calculations</h2>

            <div className="mb-12">
              <h3 className="text-2xl font-bold mb-6 text-[#0C3E72]">Server Utilization</h3>
              <div className="p-8 rounded-2xl bg-gradient-to-br from-[#2C80D3] to-[#0C3E72] text-white shadow-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-2xl font-semibold">Server 1 Utilization</h3>
                    <div className="text-5xl font-black mt-4">{summary.utilization}%</div>
                    <p className="mt-2 text-lg opacity-90">Percentage of time Server 1 is busy</p>
                  </div>
                  <div className="text-right">
                    <div className="text-3xl font-bold">{summary.totalCustomers}</div>
                    <p className="text-lg">Total Customers</p>
                  </div>
                </div>
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