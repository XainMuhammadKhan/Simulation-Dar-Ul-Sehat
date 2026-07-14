// src/utils/queueEngine.js
//
// One shared engine that turns arrival/service/priority data — whether it
// came from your random generators or from simulation.xlsx — into the same
// { table, ganttChart, utilization, serverUtilizations } shape that
// MM1.jsx, MMCSimulation.jsx, MGCSimulation.jsx and GraphAnalytics.jsx (GGC)
// all already know how to render.
//
// Nothing in here talks to the backend. It's pure client-side JS.

import * as XLSX from "xlsx";

// ============================================================
// 1. EXCEL PARSING
// ============================================================

// Excel stores "time of day" cells as a JS Date anchored at 1899-12-30
// (when read with cellDates:true) OR as a raw fraction-of-a-day number.
// This normalizes either into "minutes since midnight".
function excelTimeToMinutes(value) {
  if (value == null) return null;
  if (value instanceof Date) {
    return value.getHours() * 60 + value.getMinutes() + value.getSeconds() / 60;
  }
  if (typeof value === "number") {
    // Plain numbers under ~1 are Excel's fraction-of-a-day time format.
    // Numbers already in "minutes" (e.g. the *_Int helper columns) are
    // left untouched.
    return value < 1 ? value * 24 * 60 : value;
  }
  return null;
}

function normalizePriority(value) {
  if (value == null) return 1;
  const v = String(value).trim().toLowerCase();
  if (v === "high") return 1;
  if (v === "medium" || v === "med") return 2;
  if (v === "low") return 3;
  const n = Number(value);
  return Number.isFinite(n) ? n : 1;
}

/**
 * Reads an uploaded workbook (e.g. simulation.xlsx) and groups rows by
 * the "Day" column, so the caller can let the user pick which day to run.
 *
 * Expected columns (matches simulation.xlsx):
 *   Day, Patient, Arrival_Time, Service_Start_Time, Service_End_Time,
 *   Interarrival, Interarrival Int, Service Duration, Service Int, Priority
 *
 * Returns: { "1": [rawRow, ...], "2": [...], ... }
 */
export async function parseExcelWorkbook(file) {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "array", cellDates: true });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json(sheet, { defval: null });

  const byDay = {};
  rows.forEach((row) => {
    const day = row.Day;
    if (day == null) return;
    if (!byDay[day]) byDay[day] = [];
    byDay[day].push(row);
  });

  return byDay;
}

/**
 * Converts one day's raw Excel rows into the plain numeric arrays every
 * scheduler needs: arrivalTimes (elapsed minutes from that day's first
 * arrival), serviceTimes (minutes), priorities (1 = High, 2/3 = Low etc).
 */
export function buildInputsFromDayRows(dayRows) {
  const sorted = [...dayRows].sort((a, b) => {
    const ta = excelTimeToMinutes(a.Arrival_Time) ?? 0;
    const tb = excelTimeToMinutes(b.Arrival_Time) ?? 0;
    return ta - tb;
  });

  const firstArrival = excelTimeToMinutes(sorted[0]?.Arrival_Time) ?? 0;

  const arrivalTimes = [];
  const serviceTimes = [];
  const priorities = [];

  sorted.forEach((row) => {
    const arrivalMinutes = excelTimeToMinutes(row.Arrival_Time);
    if (arrivalMinutes == null) return;

    arrivalTimes.push(+(arrivalMinutes - firstArrival).toFixed(2));

    // "Service Int" is already a plain number of minutes in your sheet;
    // fall back to parsing "Service Duration" as a time value if needed.
    const service =
      row["Service Int"] != null
        ? Number(row["Service Int"])
        : excelTimeToMinutes(row["Service Duration"]);
    serviceTimes.push(+(service || 1).toFixed(2));

    priorities.push(normalizePriority(row.Priority));
  });

  return { arrivalTimes, serviceTimes, priorities };
}

// ============================================================
// 2. GENERALIZED N-SERVER PRIORITY SCHEDULER
// ============================================================
// Non-preemptive: once a customer starts service they run to completion.
// Ties within the same priority are broken by arrival order (FCFS).
// This is deliberately general over numServers, unlike GGC's existing
// calculateScheduleMG2 (hardcoded to 2) — so MMC/MGC can pass any count.

function scheduleMultiServer(arrivalTimes, serviceTimes, priorities, numServers) {
  const customers = arrivalTimes.map((arrival, id) => ({
    id,
    arrivalTime: arrival,
    serviceTime: serviceTimes[id],
    priority: priorities[id],
    done: false
  }));

  const queue = [];
  const serverFreeAt = Array(numServers).fill(0);
  const ganttChart = [];
  let currentTime = 0;
  let guard = 0;

  const enqueueArrived = (time) => {
    customers.forEach((c) => {
      if (!c.done && c.arrivalTime <= time && !queue.some((q) => q.id === c.id)) {
        queue.push(c);
      }
    });
    queue.sort((a, b) =>
      a.priority === b.priority ? a.arrivalTime - b.arrivalTime : a.priority - b.priority
    );
  };

  while (
    (queue.length > 0 || customers.some((c) => !c.done)) &&
    guard < 100000
  ) {
    guard++;
    enqueueArrived(currentTime);

    if (queue.length === 0) {
      const nextArrival = Math.min(
        ...customers.filter((c) => !c.done).map((c) => c.arrivalTime)
      );
      if (!Number.isFinite(nextArrival)) break;
      currentTime = nextArrival;
      continue;
    }

    let assignedSomeone = false;
    for (let s = 0; s < numServers; s++) {
      if (queue.length === 0) break;
      if (serverFreeAt[s] <= currentTime) {
        const customer = queue.shift();
        const start = currentTime;
        const end = start + customer.serviceTime;

        ganttChart.push({
          id: customer.id,
          customer_Id: customer.id,
          priority: customer.priority,
          server: s + 1,
          start,
          end,
          start_Time: start,
          end_Time: end,
          dur: customer.serviceTime
        });

        serverFreeAt[s] = end;
        customer.done = true;
        assignedSomeone = true;
      }
    }

    const nextFree = Math.min(...serverFreeAt.filter((t) => t > currentTime));
    const nextArrival = Math.min(
      ...customers.filter((c) => !c.done).map((c) => c.arrivalTime).filter((t) => t > currentTime)
    );
    const candidates = [nextFree, nextArrival].filter(Number.isFinite);

    if (!assignedSomeone && candidates.length === 0) break;
    currentTime = candidates.length > 0 ? Math.min(...candidates) : currentTime + 1;
  }

  return ganttChart;
}

function computePerformanceMeasures(arrivalTimes, ganttChart) {
  const startTime = [];
  const endingTime = [];

  ganttChart.forEach((seg) => {
    startTime[seg.id] = seg.start;
    endingTime[seg.id] = seg.end;
  });

  const serviceTimeById = {};
  ganttChart.forEach((seg) => {
    serviceTimeById[seg.id] = seg.dur;
  });

  const turnaroundTime = [];
  const waitingTime = [];
  const responseTime = [];
  const server = [];

  arrivalTimes.forEach((arrival, i) => {
    if (startTime[i] != null && endingTime[i] != null) {
      turnaroundTime[i] = endingTime[i] - arrival;
      waitingTime[i] = turnaroundTime[i] - (serviceTimeById[i] || 0);
      responseTime[i] = startTime[i] - arrival;
    } else {
      turnaroundTime[i] = null;
      waitingTime[i] = null;
      responseTime[i] = null;
    }
    const seg = ganttChart.find((g) => g.id === i);
    server[i] = seg ? seg.server : 1;
  });

  return { startTime, endingTime, turnaroundTime, waitingTime, responseTime, server };
}

// ============================================================
// 3. PUBLIC ENTRY POINT
// ============================================================

/**
 * Runs the scheduler and builds the exact table/row shape MM1, MMC, MGC
 * and GGC's existing table/graph/calc tabs already expect — including the
 * cpLookup/cp/avgTimeBetweenArrival fields the table headers ask for
 * (they're not meaningful for real empirical data, so they're set to a
 * plain 0 / mean value rather than left undefined, which would crash the
 * `.toFixed()` calls already in those components).
 */
export function runQueueSimulation(arrivalTimes, serviceTimes, priorities, numServers = 1) {
  const ganttChart = scheduleMultiServer(arrivalTimes, serviceTimes, priorities, numServers);
  const measures = computePerformanceMeasures(arrivalTimes, ganttChart);

  const interArrivals = arrivalTimes.map((t, i) => (i === 0 ? 0 : +(t - arrivalTimes[i - 1]).toFixed(2)));
  const meanInterArrival = +(interArrivals.reduce((a, b) => a + b, 0) / interArrivals.length).toFixed(2);

  const table = arrivalTimes.map((at, i) => ({
    serialNumber: i + 1,
    cpLookup: 0, // not applicable to real/empirical data — kept for UI compatibility
    cp: 0, // not applicable to real/empirical data — kept for UI compatibility
    avgTimeBetweenArrival: meanInterArrival,
    interArrival: interArrivals[i],
    arrivalTime: +at.toFixed(2),
    priority: priorities[i],
    serviceTime: +serviceTimes[i].toFixed(2),
    startTime: +(measures.startTime[i] ?? at).toFixed(2),
    endTime: +(measures.endingTime[i] ?? at + serviceTimes[i]).toFixed(2),
    turnaroundTime: +(measures.turnaroundTime[i] ?? serviceTimes[i]).toFixed(2),
    waitTime: +(measures.waitingTime[i] ?? 0).toFixed(2),
    responseTime: +(measures.responseTime[i] ?? 0).toFixed(2),
    server: `Server ${measures.server[i] || 1}`
  }));

  const makespan = ganttChart.length > 0 ? Math.max(...ganttChart.map((g) => g.end)) : 1;
  const totalServiceTime = serviceTimes.reduce((a, b) => a + b, 0);
  const utilization = +(((totalServiceTime / (makespan * numServers)) * 100).toFixed(1));

  const serverUtilizations = {};
  for (let s = 1; s <= numServers; s++) {
    const busy = ganttChart
      .filter((g) => g.server === s)
      .reduce((sum, g) => sum + g.dur, 0);
    serverUtilizations[`server${s}`] = +(((busy / makespan) * 100).toFixed(1));
  }

  return { table, ganttChart, utilization, serverUtilizations };
}