using DLSimulator.Core.Models.Requests;
using DLSimulator.Core.Models.Results;

namespace DLSimulator.Core.Services;

/// <summary>
/// Calculates queue metrics for the M/G/1 and M/G/c models.
///
/// c = 1 → Pollaczek–Khinchine (P-K) exact formula:
///   ρ  = λ / μ
///   Lq = (ρ² + λ² · σ²_S) / (2 · (1 − ρ))
///
/// c > 1 → Cosmetatos approximation for M/G/c:
///   ρ   = λ / (c · μ)
///   Cs² = σ²_S · μ²   (squared CV of service)
///   Lq_MMc = M/M/c baseline queue length (Erlang-C)
///   Lq  ≈ Lq_MMc · (1 + Cs²) / 2
/// </summary>
public class MG1Calculator
{
    private readonly MM1Calculator _mmcBase = new();

    public QueueCalculationResult Calculate(QueueCalculationRequest req)
    {
        var (arrivalMean, arrivalVariance) = DistributionHelper.GetArrivalStats(req);
        var (serviceMean, serviceVariance) = DistributionHelper.GetServiceStats(req);

        double lambda = 1.0 / arrivalMean;
        double mu     = 1.0 / serviceMean;
        int    c      = Math.Max(1, req.NumberOfServers);
        double rho    = lambda / (c * mu);
        double cs2    = serviceVariance * mu * mu; // squared CV of service

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
                "Reduce the mean service time or add more servers.";
            return result;
        }

        result.IsStable = true;

        if (c == 1)
        {
            // ── Exact P-K formula ──────────────────────────────────────────────
            result.Lq = (rho * rho + lambda * lambda * serviceVariance) / (2.0 * (1.0 - rho));
        }
        else
        {
            // ── Cosmetatos approximation for M/G/c ─────────────────────────────
            // Step 1: Get Lq for equivalent M/M/c (same λ, μ, c)
            var mmcReq    = CloneAsMMC(req, c, arrivalMean, serviceMean);
            var mmcResult = _mmcBase.Calculate(mmcReq);

            // Step 2: Apply Cosmetatos correction factor
            result.Lq = mmcResult.Lq * (1.0 + cs2) / 2.0;
        }

        result.Wq         = result.Lq / lambda;
        result.W          = result.Wq + (1.0 / mu);
        result.L          = lambda * result.W;
        result.IdleTime   = 1.0 - rho;
        result.Throughput = lambda * req.SimulationDuration;

        return result;
    }

    /// <summary>Builds an equivalent M/M/c request for the baseline Lq calculation.</summary>
    private static QueueCalculationRequest CloneAsMMC(
        QueueCalculationRequest req, int c, double arrivalMean, double serviceMean)
    {
        return new QueueCalculationRequest
        {
            ModelType           = Core.Enums.QueueModelType.MM1,
            ArrivalDistribution = Core.Enums.DistributionType.Exponential,
            ArrivalMean         = arrivalMean,
            ServiceDistribution = Core.Enums.DistributionType.Exponential,
            ServiceMean         = serviceMean,
            NumberOfServers     = c,
            SimulationDuration  = req.SimulationDuration
        };
    }
}