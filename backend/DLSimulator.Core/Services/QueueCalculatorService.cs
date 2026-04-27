using DLSimulator.Core.Enums;
using DLSimulator.Core.Models.Requests;
using DLSimulator.Core.Models.Results;

namespace DLSimulator.Core.Services;

/// <summary>
/// Orchestrates the correct calculator based on the requested model type.
/// </summary>
public class QueueCalculatorService : IQueueCalculatorService
{
    private readonly MM1Calculator _mm1 = new();
    private readonly MG1Calculator _mg1 = new();
    private readonly GG1Calculator _gg1 = new();

    public QueueCalculationResult Calculate(QueueCalculationRequest request)
    {
        // Before delegating, enforce correct distributions per model contract
        EnforceModelConstraints(request);

        return request.ModelType switch
        {
            QueueModelType.MM1 => _mm1.Calculate(request),
            QueueModelType.MG1 => _mg1.Calculate(request),
            QueueModelType.GG1 => _gg1.Calculate(request),
            _ => throw new ArgumentException($"Unknown model type: {request.ModelType}")
        };
    }

    /// <summary>
    /// Enforces distribution constraints silently so the calculators
    /// never receive a malformed request from a misbehaving client.
    /// </summary>
    private static void EnforceModelConstraints(QueueCalculationRequest req)
    {
        switch (req.ModelType)
        {
            case QueueModelType.MM1:
                // Both arrival and service MUST be Exponential for M/M/1
                req.ArrivalDistribution = DistributionType.Exponential;
                req.ServiceDistribution = DistributionType.Exponential;
                break;

            case QueueModelType.MG1:
                // Arrival MUST be Exponential; Service is General
                req.ArrivalDistribution = DistributionType.Exponential;
                // ServiceDistribution is set by the user (Uniform / Normal / Gamma)
                break;

            case QueueModelType.GG1:
                // Both are General – nothing to force
                break;
        }

        // Default simulation duration
        if (req.SimulationDuration <= 0)
            req.SimulationDuration = 120;
    }
}