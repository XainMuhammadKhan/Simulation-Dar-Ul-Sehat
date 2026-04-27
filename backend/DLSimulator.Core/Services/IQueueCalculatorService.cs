using DLSimulator.Core.Models.Requests;
using DLSimulator.Core.Models.Results;

namespace DLSimulator.Core.Services;

public interface IQueueCalculatorService
{
    QueueCalculationResult Calculate(QueueCalculationRequest request);
}
