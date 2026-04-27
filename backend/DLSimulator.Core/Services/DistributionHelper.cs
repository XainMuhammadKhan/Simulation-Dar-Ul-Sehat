using DLSimulator.Core.Enums;
using DLSimulator.Core.Models.Requests;

namespace DLSimulator.Core.Services;

/// <summary>
/// Computes E[X] (mean) and Var[X] (variance) from distribution parameters
/// supplied in the request.
/// </summary>
public static class DistributionHelper
{
    /// <summary>
    /// Returns (mean, variance) for the arrival process.
    /// </summary>
    public static (double Mean, double Variance) GetArrivalStats(QueueCalculationRequest req)
    {
        return req.ArrivalDistribution switch
        {
            DistributionType.Exponential => GetExponentialStats(req.ArrivalMean),
            DistributionType.Uniform     => GetUniformStats(req.ArrivalMin, req.ArrivalMax),
            DistributionType.Normal      => GetNormalStats(req.ArrivalMean, req.ArrivalVariance),
            DistributionType.Gamma       => GetGammaStats(req.ArrivalMean, req.ArrivalVariance),
            _ => throw new ArgumentException($"Unsupported distribution: {req.ArrivalDistribution}")
        };
    }

    /// <summary>
    /// Returns (mean, variance) for the service process.
    /// </summary>
    public static (double Mean, double Variance) GetServiceStats(QueueCalculationRequest req)
    {
        return req.ServiceDistribution switch
        {
            DistributionType.Exponential => GetExponentialStats(req.ServiceMean),
            DistributionType.Uniform     => GetUniformStats(req.ServiceMin, req.ServiceMax),
            DistributionType.Normal      => GetNormalStats(req.ServiceMean, req.ServiceVariance),
            DistributionType.Gamma       => GetGammaStats(req.ServiceMean, req.ServiceVariance),
            _ => throw new ArgumentException($"Unsupported distribution: {req.ServiceDistribution}")
        };
    }

    // ── Private helpers ────────────────────────────────────────────────────────

    /// <summary>
    /// Exponential: E[X] = mean, Var[X] = mean²
    /// </summary>
    private static (double, double) GetExponentialStats(double? mean)
    {
        if (mean is null or <= 0)
            throw new ArgumentException("Exponential distribution requires a positive mean.");

        double m = mean.Value;
        return (m, m * m);
    }

    /// <summary>
    /// Uniform(a, b): E[X] = (a+b)/2, Var[X] = (b-a)²/12
    /// </summary>
    private static (double, double) GetUniformStats(double? min, double? max)
    {
        if (min is null || max is null)
            throw new ArgumentException("Uniform distribution requires min and max values.");
        if (min.Value >= max.Value)
            throw new ArgumentException("Uniform distribution: min must be less than max.");

        double a = min.Value, b = max.Value;
        double mean = (a + b) / 2.0;
        double variance = (b - a) * (b - a) / 12.0;
        return (mean, variance);
    }

    /// <summary>
    /// Normal(μ, σ²): E[X] = mean, Var[X] = variance (directly provided)
    /// </summary>
    private static (double, double) GetNormalStats(double? mean, double? variance)
    {
        if (mean is null or <= 0)
            throw new ArgumentException("Normal distribution requires a positive mean.");
        if (variance is null or <= 0)
            throw new ArgumentException("Normal distribution requires a positive variance.");

        return (mean.Value, variance.Value);
    }

    /// <summary>
    /// Gamma(α, β): parameterized by mean and variance.
    /// E[X] = α·β = mean, Var[X] = α·β² = variance
    /// (Both mean and variance are directly supplied by the user, same as Normal.)
    /// </summary>
    private static (double, double) GetGammaStats(double? mean, double? variance)
    {
        if (mean is null or <= 0)
            throw new ArgumentException("Gamma distribution requires a positive mean.");
        if (variance is null or <= 0)
            throw new ArgumentException("Gamma distribution requires a positive variance.");

        return (mean.Value, variance.Value);
    }
}
