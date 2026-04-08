namespace AgenticOcr.Infrastructure.ExternalServices;

public class FileStorageService
{
    private readonly string _uploadFolder;

    public FileStorageService()
    {
        _uploadFolder = Path.Combine(Directory.GetCurrentDirectory(), "uploads");
        Directory.CreateDirectory(_uploadFolder);
    }

    public async Task<string> SaveFileAsync(Stream fileStream, string fileName)
    {
        var uniqueName = $"{Guid.NewGuid()}_{fileName}";
        var filePath = Path.Combine(_uploadFolder, uniqueName);

        using var fileOut = new FileStream(filePath, FileMode.Create);
        await fileStream.CopyToAsync(fileOut);

        return filePath;
    }
}