namespace AgenticOcr.Application.Interfaces;

public interface ILlmService
{
    Task<string> CallWithImageAsync(
        string promptFileName,
        string imagePath,
        bool isAgentFile = false);

    Task<string> CallWithTextAsync(
        string promptFileName,
        string inputText,
        bool isAgentFile = false);
}