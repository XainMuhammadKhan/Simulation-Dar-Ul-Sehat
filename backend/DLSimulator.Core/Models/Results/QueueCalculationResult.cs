using DLSimulator.Core.Enums;

namespace DLSimulator.Core.Models.Results;

/// <summary>
/// Output DTO returned to the frontend after queue metric calculation.
/// </summary>
public class QueueCalculationResult
{
    // ── Echo back inputs for display ───────────────────────────────────────────
    public QueueModelType ModelType { get; set; }
    public int NumberOfServers { get; set; }

    // ── Derived rates ──────────────────────────────────────────────────────────
    /// <summary>λ — Arrival rate (patients/min) = 1 / E[A]</summary>
    public double Lambda { get; set; }

    /// <summary>μ — Service rate (patients/min) = 1 / E[S]</summary>
    public double Mu { get; set; }

    /// <summary>ρ — Server utilization = λ / (c · μ)</summary>
    public double Rho { get; set; }

    // ── Core Queue Metrics ─────────────────────────────────────────────────────
    /// <summary>Lq — Average number of patients waiting in queue</summary>
    public double Lq { get; set; }

    /// <summary>L — Average number of patients in the system</summary>
    public double L { get; set; }

    /// <summary>Wq — Average waiting time in queue (minutes)</summary>
    public double Wq { get; set; }

    /// <summary>W — Average total time in system (minutes)</summary>
    public double W { get; set; }

    // ── Throughput ─────────────────────────────────────────────────────────────
    /// <summary>Expected number of patients served during simulation window</summary>
    public double Throughput { get; set; }

    // ── Variances (for display/transparency) ──────────────────────────────────
    public double? VarianceArrival { get; set; }
    public double? VarianceService { get; set; }

    /// <summary>Idle time proportion = 1 − ρ</summary>
    public double IdleTime { get; set; }

    // ── Stability flag ─────────────────────────────────────────────────────────
    public bool IsStable { get; set; }
    public string? StabilityMessage { get; set; }
}