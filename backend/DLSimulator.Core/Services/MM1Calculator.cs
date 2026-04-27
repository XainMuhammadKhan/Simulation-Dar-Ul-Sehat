using DLSimulator.Core.Models.Requests;
using DLSimulator.Core.Models.Results;

namespace DLSimulator.Core.Services;

/// <summary>
/// Calculates queue metrics for the M/M/1 (and M/M/c) model.
///
/// M/M/1 formulas (c = 1):
///   ρ  = λ / μ
///   Lq = ρ² / (1 − ρ)
///   Wq = Lq / λ
///   W  = Wq + 1/μ
///   L  = λ · W
///
/// M/M/c formulas (c > 1):
///   ρ  = λ / (c · μ)           (per-server utilisation)
///   P0 = 1 / [ Σ_{n=0}^{c-1} (cρ)^n/n!  +  (cρ)^c / (c! · (1−ρ)) ]
///   Lq = P0 · (cρ)^c · ρ / (c! · (1−ρ)²)
///   Wq = Lq / λ
///   W  = Wq + 1/μ
///   L  = λ · W
/// </summary>
public class MM1Calculator
{
    public QueueCalculationResult Calculate(QueueCalculationRequest req)
    {
        var (arrivalMean, arrivalVariance) = DistributionHelper.GetArrivalStats(req);
        var (serviceMean, serviceVariance) = DistributionHelper.GetServiceStats(req);

        double lambda = 1.0 / arrivalMean;   // arrival rate
        double mu     = 1.0 / serviceMean;   // service rate
        int    c      = Math.Max(1, req.NumberOfServers);

        double rho = lambda / (c * mu);      // per-server utilisation

        var result = new QueueCalculationResult
        {
            ModelType       = req.ModelType,
            NumberOfServers = c,
            Lambda          = lambda,
            Mu              = mu,
            Rho             = rho,
            VarianceArrival = arrivalVariance,
            VarianceService = serviceVariance
        };

        if (rho >= 1.0)
        {
            result.IsStable        = false;
            result.StabilityMessage =
                $"System is unstable (ρ = {rho:F4} ≥ 1). " +
                "Increase the service rate or add more servers.";
            return result;
        }

        result.IsStable = true;

        if (c == 1)
        {
            // ── M/M/1 ──────────────────────────────────────────────────────────
            result.Lq = (rho * rho) / (1.0 - rho);
        }
        else
        {
            // ── M/M/c ──────────────────────────────────────────────────────────
            double cRho = c * rho; // = λ / μ = traffic intensity

            // P0: probability the system is empty
            double sumPart = 0.0;
            double factorial = 1.0;
            for (int n = 0; n < c; n++)
            {
                if (n > 0) factorial *= n;
                sumPart += Math.Pow(cRho, n) / factorial;
            }
            double cFactorial = factorial * c; // c!
            double p0Denom    = sumPart + Math.Pow(cRho, c) / (cFactorial * (1.0 - rho));
            double p0         = 1.0 / p0Denom;

            result.Lq = p0 * Math.Pow(cRho, c) * rho / (cFactorial * Math.Pow(1.0 - rho, 2));
        }

        result.Wq         = result.Lq / lambda;
        result.W          = result.Wq + (1.0 / mu);
        result.L          = lambda * result.W;
        result.IdleTime   = 1.0 - rho;
        result.Throughput = lambda * req.SimulationDuration;

        return result;
    }
}