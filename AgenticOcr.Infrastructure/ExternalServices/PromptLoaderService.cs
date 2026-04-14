namespace AgenticOcr.Infrastructure.ExternalServices;

public class PromptLoaderService
{
    private readonly string _claudeFolder;

    public PromptLoaderService()
    {
        var dir = Directory.GetCurrentDirectory();
        while (dir != null)
        {
            var candidate = Path.Combine(dir, ".claude");
            if (Directory.Exists(candidate))
            {
                _claudeFolder = candidate;
                return;
            }
            dir = Directory.GetParent(dir)?.FullName;
        }
        throw new DirectoryNotFoundException(
            ".claude folder not found. Make sure it exists at the solution root.");
    }

    public string LoadPrompt(string fileName)
    {
        var path = Path.Combine(_claudeFolder, "prompts", fileName);
        if (!File.Exists(path))
            throw new FileNotFoundException($"Prompt file not found: {path}");
        return File.ReadAllText(path);
    }

    public string LoadAgent(string fileName)
    {
        var path = Path.Combine(_claudeFolder, "agents", fileName);
        if (!File.Exists(path))
            throw new FileNotFoundException($"Agent file not found: {path}");
        return File.ReadAllText(path);
    }
}