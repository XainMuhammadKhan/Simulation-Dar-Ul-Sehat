// Local JS implementation removed — use C# backend via API.
export default function generateCummulativeProbability() {
  throw new Error('Local simulation removed; call backend API instead.');
}
function CP_LookUp(cummulativeProbabilities) {
      cpLookUp[0] = 0;
      for (let i = 0; i < cummulativeProbabilities.length - 1; i++) {
          cpLookUp.push(cummulativeProbabilities[i]);
      }
  }
  
  function genMinNoOfArrival() {
      for (let i = 0; i < cummulativeProbabilities.length; i++) {
          minNoOfArrival.push(i);
      }
  }
  
  function generateInterArrival(cpTable, cummulativeProbabilities, minNoOfArrival) {
      while (true) {
          let genIA = Number(Math.random().toFixed(4));
          for (let i = 1; i < cpTable.length; i++) {
              if (cpTable[i] <= genIA && genIA < cummulativeProbabilities[i]) {
                  return minNoOfArrival[i];
              }
          }
      }
  }
  
  function performanceMeasures(arrivalTime, serviceTime,ganttChart,selectedPriority) {
    if(selectedPriority ===1){
      let processedCustomersStart = new Set();
      let processedCustomersEnd = new Set();
  
      // Initialize arrays to ensure alignment with all customers
      startTime = Array(arrivalTime.length).fill(null);
      endingTime = Array(arrivalTime.length).fill(null);
      turnAroundTime = [];
      waitingTime = [];
      responseTime = [];
  
      // Filter ganttChart entries for all priorities (1, 2, 3)
      console.log("pfGantChart",ganttChart);
      const filteredGanttChart = ganttChart.filter(entry => 
        entry.priority === 1 || entry.priority === 2 || entry.priority === 3
      );
    //   console.log("FIltered",filteredGanttChart)
      // Process Start Time
      filteredGanttChart.forEach((entry) => {
        if (!processedCustomersStart.has(entry.customer_Id)) {
          startTime[entry.customer_Id] = entry.start_Time; // Store start time based on customer_Id
          processedCustomersStart.add(entry.customer_Id);
        }
      });
  
      // Process End Time in reverse order
      for (let i = filteredGanttChart.length - 1; i >= 0; i--) {
        let entry = filteredGanttChart[i];
        if (!processedCustomersEnd.has(entry.customer_Id)) {
          endingTime[entry.customer_Id] = entry.end_Time; // Store end time based on customer_Id
          processedCustomersEnd.add(entry.custome_Id);
        }
      }
  
      // Calculate Turnaround Time, Waiting Time, and Response Time
      for (let i = 0; i < arrivalTime.length; i++) {
        if (startTime[i] !== null && endingTime[i] !== null) { 
          turnAroundTime.push(endingTime[i] - arrivalTime[i]); // TAT = End Time - Arrival Time
          waitingTime.push(turnAroundTime[i] - serviceTime[i]); // WT = TAT - Service Time
          responseTime.push(startTime[i] - arrivalTime[i]); // RT = Start Time - Arrival Time
        } else {
          turnAroundTime.push(null); // For missing customers, push null
          waitingTime.push(null);
          responseTime.push(null);
        }
      }
    } 
  
    else{
      for (let i = 0; i < arrivalTime.length; i++) {
          startTime.push(i === 0 ? arrivalTime[i] : Math.max(arrivalTime[i], endingTime[i - 1]));
          endingTime.push(startTime[i] + serviceTime[i]);
          turnAroundTime.push(endingTime[i] - arrivalTime[i]);
          waitingTime.push(turnAroundTime[i] - serviceTime[i]);
          responseTime.push(startTime[i] - arrivalTime[i]);
      }
    }
  }
  
  export default generateCummulativeProbability;
  
  const genPriority = (a,b,xI) => {
    return (Math.round((b-a)*xI+a));
  }
  function PriorityGeneration (A,M,C,Z,len,a,b) {
      
      let minusZi = [];
      let zI = [];
      minusZi[0] = Z;
      for(let i = 0; i < len; i++){
          let mod = (A*minusZi[i]+C) % M;
          zI.push(mod)
          minusZi.push(zI[i]);
          let random = Number((zI[i]/M).toFixed(4));
          priority.push(genPriority(a,b,random));
      }
  
          console.log(priority);
  }

function calculateMultiServerSchedule(arrivalTimes, serviceTimes, priorities, numServers) {
    const ganttCharts = Array.from({ length: numServers }, () => []); // Separate Gantt chart for each server
    const combinedGanttChart = []; // Combined Gantt chart
    const queue = []; // Priority queue
    const serverEndTimes = Array(numServers).fill(0); // Tracks when each server will be free
    let currentTime = 0;
  
    // Create customers array
    const customers = arrivalTimes.map((arrival, index) => ({
      id: index,
      arrivalTime: arrival,
      serviceTime: serviceTimes[index],
      priority: priorities[index],
    }));
    // console.log(customers)
    // Sort customers by arrival time
    customers.sort((a, b) => a.arrivalTime - b.arrivalTime);
  
    // Function to add customers to the queue when they arrive
    const addToQueue = (currentTime) => {
      customers.forEach((customer) => {
        console.log(currentTime );
        if (
          customer.arrivalTime <= currentTime &&
          customer.serviceTime > 0 &&
          !queue.some((q) => q.id === customer.id)
        ) {
          queue.push(customer);
        }
      });
  
      // Sort the queue by priority (ascending) and arrival time
      queue.sort((a, b) =>
        a.priority === b.priority
          ? a.arrivalTime - b.arrivalTime
          : a.priority - b.priority
      );
    };
  
    while (
      queue.length > 0 ||
      customers.some((c) => c.serviceTime > 0) ||
      serverEndTimes.some((endTime) => endTime > currentTime)
    ) {
      addToQueue(currentTime);
  
      if (queue.length === 0) {
        const nextEventTime = Math.min(
          ...customers
            .filter((c) => c.serviceTime > 0)
            .map((c) => c.arrivalTime),
          ...serverEndTimes.filter((time) => time > currentTime)
        );
        if (nextEventTime === Infinity) break; // No more events
        currentTime = nextEventTime;
        continue;
      }
  
      for (let serverIndex = 0; serverIndex < numServers; serverIndex++) {
        if (queue.length === 0) break;
  
        if (currentTime >= serverEndTimes[serverIndex]) {
          const currentCustomer = queue.shift();
  
          // Serve the current customer
          const serviceDuration = currentCustomer.serviceTime;
          const startTime = currentTime;
          const endTime = currentTime + serviceDuration;
  
          ganttCharts[serverIndex].push({
            customer_Id: currentCustomer.id,
            priority: currentCustomer.priority,
            start_Time: startTime,
            end_Time: endTime,
          });
  
          combinedGanttChart.push({
            customer_Id: currentCustomer.id,
            priority: currentCustomer.priority,
            start_Time: startTime,
            end_Time: endTime,
            server: serverIndex,
          });
  
          currentCustomer.serviceTime = 0;
          serverEndTimes[serverIndex] = endTime;
        }
      }
  
      // Advance time to the next earliest event (if no progress is made)
      const nextEventTime = Math.min(
        ...customers
          .filter((c) => c.serviceTime > 0)
          .map((c) => c.arrivalTime),
        ...serverEndTimes.filter((time) => time > currentTime)
      );
  
      currentTime = Math.max(currentTime + 1, nextEventTime);
    }
  
    // Merge consecutive entries for the same customer in the combined Gantt chart
    const mergedCombinedChart = [];
    for (let i = 0; i < combinedGanttChart.length; i++) {
      const current = combinedGanttChart[i];
      if (
        mergedCombinedChart.length > 0 &&
        mergedCombinedChart[mergedCombinedChart.length - 1].customer_Id ===
          current.customer_Id &&
        mergedCombinedChart[mergedCombinedChart.length - 1].server === current.server
      ) {
        mergedCombinedChart[mergedCombinedChart.length - 1].end_Time =
          current.end_Time;
      } else {
        mergedCombinedChart.push({ ...current });
      }
    }
  
    return { ganttCharts, mergedCombinedChart };
  }


