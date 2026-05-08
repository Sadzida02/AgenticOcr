using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace AgenticOcr.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class RenameLayoutScoreToTokenOverlap : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.RenameColumn(
                name: "LayoutScore",
                table: "EvaluationMetrics",
                newName: "TokenOverlap");

            migrationBuilder.AddColumn<bool>(
                name: "ReviewRequired",
                table: "OcrResults",
                type: "boolean",
                nullable: false,
                defaultValue: false);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "ReviewRequired",
                table: "OcrResults");

            migrationBuilder.RenameColumn(
                name: "TokenOverlap",
                table: "EvaluationMetrics",
                newName: "LayoutScore");
        }
    }
}
