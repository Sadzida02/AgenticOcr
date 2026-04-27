using AgenticOcr.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace AgenticOcr.Infrastructure.Data;

public class OcrDbContext : DbContext
{
    public OcrDbContext(DbContextOptions<OcrDbContext> options) : base(options) { }

    public DbSet<Document> Documents => Set<Document>();
    public DbSet<OcrResult> OcrResults => Set<OcrResult>();
    public DbSet<EvaluationMetric> EvaluationMetrics => Set<EvaluationMetric>();
    public DbSet<MedicationEntity> Medications => Set<MedicationEntity>();
    public DbSet<GroundTruth> GroundTruths => Set<GroundTruth>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Document>(e =>
        {
            e.HasKey(d => d.Id);
            e.Property(d => d.FileName).IsRequired().HasMaxLength(255);
            e.Property(d => d.FilePath).IsRequired();
            e.HasMany(d => d.OcrResults)
             .WithOne(r => r.Document)
             .HasForeignKey(r => r.DocumentId)
             .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<OcrResult>(e =>
        {
            e.HasKey(r => r.Id);
            e.Property(r => r.PipelineType)
             .HasConversion<string>();
            e.HasOne(r => r.EvaluationMetric)
             .WithOne(m => m.OcrResult)
             .HasForeignKey<EvaluationMetric>(m => m.OcrResultId);
        });

        modelBuilder.Entity<EvaluationMetric>(e =>
        {
            e.HasKey(m => m.Id);
        });

        modelBuilder.Entity<MedicationEntity>(e =>
        {
            e.HasKey(m => m.Id);
            e.HasOne(m => m.OcrResult)
             .WithMany()
             .HasForeignKey(m => m.OcrResultId);
        });

        modelBuilder.Entity<GroundTruth>(e =>
        {
            e.HasKey(g => g.Id);
            e.HasOne(g => g.Document)
             .WithMany()
             .HasForeignKey(g => g.DocumentId);
        });
    }
}