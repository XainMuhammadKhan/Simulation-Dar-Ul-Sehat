using DLSimulator.Core.Models.Requests;
using DLSimulator.Core.Models.Results;

namespace DLSimulator.Core.Services;

/// <summary>
/// Calculates queue metrics for the G/G/1 and G/G/c models.
///
/// c = 1 → Kingman's Approximation:
///   ρ   = λ / μ
///   CA² = σ²_A / E[A]²
///   CS² = σ²_S / E[S]²
///   Wq  ≈ (ρ / (μ · (1 − ρ))) · (CA² + CS²) / 2
///
/// c > 1 → Extended Kingman (Whitt's G/G/c approximation):
///   ρ   = λ / (c · μ)
///   Wq_MMc = M/M/c waiting time baseline
///   Wq  ≈ Wq_MMc · (CA² + CS²) / 2
/// </summary>
public class GG1Calculator
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

        // Squared Coefficients of Variation
        double ca2 = arrivalVariance / (arrivalMean * arrivalMean);
        double cs2 = serviceVariance / (serviceMean * serviceMean);

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
                "The arrival rate must be less than the total service rate (c · μ).";
            return result;
        }

        result.IsStable = true;

        if (c == 1)
        {
            // ── Exact Kingman formula for G/G/1 ───────────────────────────────
            result.Wq = (rho / (mu * (1.0 - rho))) * ((ca2 + cs2) / 2.0);
        }
        else
        {
            // ── Extended Kingman (Whitt) for G/G/c ────────────────────────────
            // Step 1: Get Wq for equivalent M/M/c baseline
            var mmcReq    = CloneAsMMC(req, c, arrivalMean, serviceMean);
            var mmcResult = _mmcBase.Calculate(mmcReq);
            double wq_mmc = mmcResult.Wq;

            // Step 2: Apply variability correction
            result.Wq = wq_mmc * (ca2 + cs2) / 2.0;
        }

        result.Lq         = lambda * result.Wq;
        result.W          = result.Wq + (1.0 / mu);
        result.L          = lambda * result.W;
        result.IdleTime   = 1.0 - rho;
        result.Throughput = lambda * req.SimulationDuration;

        return result;
    }

    /// <summary>Builds an equivalent M/M/c request for the baseline Wq calculation.</summary>
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