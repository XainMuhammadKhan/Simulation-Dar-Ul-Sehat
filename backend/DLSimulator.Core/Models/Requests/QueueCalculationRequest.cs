using DLSimulator.Core.Enums;

namespace DLSimulator.Core.Models.Requests;

/// <summary>
/// Input DTO sent from the frontend to calculate queue metrics.
/// </summary>
public class QueueCalculationRequest
{
    // ── Model Selection ────────────────────────────────────────────────────────
    public QueueModelType ModelType { get; set; }

    // ── Arrival Distribution ───────────────────────────────────────────────────
    /// <summary>Always Exponential for M/M/1 and M/G/1. General for G/G/1.</summary>
    public DistributionType ArrivalDistribution { get; set; } = DistributionType.Exponential;

    /// <summary>Mean interarrival time (minutes). Used for Exponential, Normal, Gamma.</summary>
    public double? ArrivalMean { get; set; }

    /// <summary>Variance of interarrival time. Used for Normal and Gamma in G/G/1.</summary>
    public double? ArrivalVariance { get; set; }

    /// <summary>Minimum interarrival time (minutes). Used for Uniform in G/G/1.</summary>
    public double? ArrivalMin { get; set; }

    /// <summary>Maximum interarrival time (minutes). Used for Uniform in G/G/1.</summary>
    public double? ArrivalMax { get; set; }

    // ── Front Desk Service Distribution ───────────────────────────────────────
    /// <summary>Always Exponential for M/M/1. General for M/G/1 and G/G/1.</summary>
    public DistributionType ServiceDistribution { get; set; } = DistributionType.Exponential;

    /// <summary>Mean service time (minutes). Used for Exponential, Normal, Gamma.</summary>
    public double? ServiceMean { get; set; }

    /// <summary>Variance of service time. Used for Normal and Gamma.</summary>
    public double? ServiceVariance { get; set; }

    /// <summary>Minimum service time (minutes). Used for Uniform.</summary>
    public double? ServiceMin { get; set; }

    /// <summary>Maximum service time (minutes). Used for Uniform.</summary>
    public double? ServiceMax { get; set; }

    // ── Multi-Server (M/M/1 only) ──────────────────────────────────────────────
    /// <summary>Number of servers at the Front Desk. Defaults to 1.</summary>
    public int NumberOfServers { get; set; } = 1;

    // ── Simulation Window ──────────────────────────────────────────────────────
    /// <summary>Total simulation time in minutes. Default = 120 (9 AM – 11 AM).</summary>
    public double SimulationDuration { get; set; } = 120;
}
