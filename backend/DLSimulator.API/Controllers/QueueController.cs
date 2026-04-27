using DLSimulator.Core.Models.Requests;
using DLSimulator.Core.Models.Results;
using DLSimulator.Core.Services;
using Microsoft.AspNetCore.Mvc;

namespace DLSimulator.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class QueueController : ControllerBase
{
    private readonly IQueueCalculatorService _calculator;
    private readonly ILogger<QueueController> _logger;

    public QueueController(IQueueCalculatorService calculator, ILogger<QueueController> logger)
    {
        _calculator = calculator;
        _logger     = logger;
    }

    /// <summary>
    /// POST /api/queue/calculate
    /// Accepts queue model parameters and returns performance metrics.
    /// </summary>
    [HttpPost("calculate")]
    [ProducesResponseType(typeof(QueueCalculationResult), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status500InternalServerError)]
    public ActionResult<QueueCalculationResult> Calculate([FromBody] QueueCalculationRequest request)
    {
        if (!ModelState.IsValid)
            return BadRequest(ModelState);

        try
        {
            var result = _calculator.Calculate(request);
            return Ok(result);
        }
        catch (ArgumentException ex)
        {
            _logger.LogWarning(ex, "Invalid queue calculation request.");
            return BadRequest(new ProblemDetails
            {
                Title  = "Invalid Input",
                Detail = ex.Message,
                Status = StatusCodes.Status400BadRequest
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Unexpected error during queue calculation.");
            return StatusCode(StatusCodes.Status500InternalServerError, new ProblemDetails
            {
                Title  = "Calculation Error",
                Detail = "An unexpected error occurred. Please check your inputs and try again.",
                Status = StatusCodes.Status500InternalServerError
            });
        }
    }
}
