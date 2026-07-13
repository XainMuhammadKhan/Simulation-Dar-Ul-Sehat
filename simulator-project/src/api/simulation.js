// Wrapper integrating with DLSimulator API (/api/queue/calculate)
const API_BASE = import.meta.env.VITE_API_URL || '';

/**
 * Call the DLSimulator queue calculator.
 * frontendParams should include modelType ('MM1'|'MG1'|'GG1'),
 * lambda, mu, numServers, distributionType and distribution params as needed.
 */
export async function runDLQueueCalculation(frontendParams) {
  const { modelType = 'MM1', lambda, mu, numServers = 1, distributionType, params = {} } = frontendParams;

  const request = {
    modelType,
    arrivalDistribution: 'Exponential',
    arrivalMean: lambda ? 1 / Number(lambda) : undefined,
    serviceDistribution: 'Exponential',
    serviceMean: mu ? 1 / Number(mu) : undefined,
    numberOfServers: numServers,
    simulationDuration: 120
  };

  // For M/G/1 or G/G/1 map service distribution params
  if (distributionType === 'uniform' && params.a !== undefined && params.b !== undefined) {
    request.serviceDistribution = 'Uniform';
    request.serviceMin = params.a;
    request.serviceMax = params.b;
    request.serviceMean = (params.a + params.b) / 2;
  }
  if (distributionType === 'normal' && params.u !== undefined) {
    request.serviceDistribution = 'Normal';
    request.serviceMean = params.u;
    request.serviceVariance = params.sd ? params.sd * params.sd : undefined;
  }
  console.log("VITE_API_URL:", import.meta.env.VITE_API_URL);
  console.log("Request URL:", `${API_BASE}/api/queue/calculate`);
  const res = await fetch(`${API_BASE}/api/queue/calculate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request)

  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error('Queue API error: ' + res.status + ' ' + text);
  }

  const result = await res.json();

  // Convert to shape components expect (best-effort): keep summary in `summary`
  return {
    table: [],
    ganttChart: [],
    utilization: (result.Rho ?? result.rho ?? 0) * 100,
    summary: result
  };
}

export default runDLQueueCalculation;
