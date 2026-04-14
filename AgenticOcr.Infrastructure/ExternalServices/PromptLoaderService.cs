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
        throw new DirectoryNotFoundException(".claude folder not found.");
    }

    public string LoadPrompt(string fileName)
    {
        // Search recursively through all subfolders
        var promptsFolder = Path.Combine(_claudeFolder, "prompts");
        var found = FindFile(promptsFolder, fileName);
        if (found == null)
            throw new FileNotFoundException(
                $"Prompt '{fileName}' not found anywhere under {promptsFolder}");
        return File.ReadAllText(found);
    }

    public string LoadAgent(string fileName)
    {
        var agentsFolder = Path.Combine(_claudeFolder, "agents");
        var found = FindFile(agentsFolder, fileName);
        if (found == null)
            throw new FileNotFoundException(
                $"Agent '{fileName}' not found anywhere under {agentsFolder}");
        return File.ReadAllText(found);
    }

    private static string? FindFile(string rootFolder, string fileName)
    {
        if (!Directory.Exists(rootFolder))
            return null;

        // Check root first
        var direct = Path.Combine(rootFolder, fileName);
        if (File.Exists(direct))
            return direct;

        // Then search all subfolders
        foreach (var subDir in Directory.GetDirectories(rootFolder, "*", SearchOption.AllDirectories))
        {
            var path = Path.Combine(subDir, fileName);
            if (File.Exists(path))
                return path;
        }

        return null;
    }
}