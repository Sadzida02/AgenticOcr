import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  Avatar,
  Grid,
  Chip,
  Divider,
  CircularProgress,
} from "@mui/material";
import {
  Person,
  Logout,
  Description,
  Assessment,
  Schedule,
  CloudDone,
} from "@mui/icons-material";
import { motion } from "framer-motion";
import { useAuth } from "../services/AuthContext";
import { getAllDocuments, getDetailedSummary } from "../services/ocrService";

// ============ TYPES ============

// ✅ Use the same Document type that matches your backend
// Based on your backend, Document has id as string (Guid)
interface Document {
  id: string;  // Changed from number to string (Guid from backend)
  fileName: string;
  fileType: string;
  fileSizeBytes: number;
  uploadedAt: string;
  status: "Done" | "Failed" | "Processing";
  resultCount: number;
}

interface Stats {
  totalDocs: number;
  totalEvaluated: number;
  avgAccuracy: number;
  recentDocs: Document[];
}

interface StatCard {
  label: string;
  value: string | number;
  icon: React.ReactElement;
  color: string;
}

// ============ COMPONENT ============

export default function ProfilePage(): React.ReactElement {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [stats, setStats] = useState<Stats>({
    totalDocs: 0,
    totalEvaluated: 0,
    avgAccuracy: 0,
    recentDocs: [],
  });
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async (): Promise<void> => {
    try {
      const [docs, summary] = await Promise.all([
        getAllDocuments().catch((): Document[] => []),
        getDetailedSummary().catch(() => null),
      ]);
      setStats({
        totalDocs: docs.length,
        totalEvaluated: summary?.totalDocumentsEvaluated ?? 0,
        avgAccuracy: summary?.agentic?.avgCharAccuracy ?? summary?.baseline?.avgCharAccuracy ?? 0,
        recentDocs: docs.slice(0, 5),
      });
    } catch (error) {
      console.error("Failed to load stats:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = (): void => {
    logout();
    navigate("/login");
  };

  if (!user) {
    return (
      <Box sx={{ textAlign: "center", py: 8 }}>
        <Typography variant="h4" sx={{ fontSize: "1.5rem", mb: 2 }}>
          Please sign in
        </Typography>
        <Button variant="contained" color="primary" onClick={() => navigate("/login")}>
          Go to Sign In
        </Button>
      </Box>
    );
  }

  const statCards: StatCard[] = [
    {
      label: "Total Documents",
      value: stats.totalDocs,
      icon: <Description />,
      color: "secondary.main",
    },
    {
      label: "Evaluated",
      value: stats.totalEvaluated,
      icon: <Assessment />,
      color: "#e8d5a3",
    },
    {
      label: "Avg Accuracy",
      value: `${(stats.avgAccuracy * 100).toFixed(1)}%`,
      icon: <CloudDone />,
      color: "#c8dde8",
    },
    {
      label: "Recent Activity",
      value: stats.recentDocs.length,
      icon: <Schedule />,
      color: "#d5c8e8",
    },
  ];

  return (
    <Box>
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -15 }} animate={{ opacity: 1, y: 0 }}>
        <Typography variant="h3" sx={{ fontSize: "2rem", mb: 0.5 }}>
          Your Profile
        </Typography>
        <Typography color="text.secondary" sx={{ mb: 3, fontSize: "1.02rem" }}>
          Account overview and activity
        </Typography>
      </motion.div>

      {/* User Info Card */}
      <Card sx={{ mb: 2.5 }}>
        <CardContent sx={{ p: 3 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 2.5, flexWrap: "wrap" }}>
            <Avatar
              sx={{
                width: 72,
                height: 72,
                bgcolor: "secondary.main",
                color: "primary.main",
                fontFamily: "'DM Serif Display', serif",
                fontSize: "1.8rem",
              }}
            >
              {user.name?.[0]?.toUpperCase() || "U"}
            </Avatar>
            <Box sx={{ flex: 1 }}>
              <Typography variant="h4" sx={{ fontSize: "1.4rem", mb: 0.3 }}>
                {user.name}
              </Typography>
              <Typography color="text.secondary">{user.email}</Typography>
            </Box>
            <Button
              variant="outlined"
              color="error"
              startIcon={<Logout />}
              onClick={handleLogout}
            >
              Sign Out
            </Button>
          </Box>
        </CardContent>
      </Card>

      {/* Stats */}
      {loading ? (
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", py: 4, gap: 2 }}>
          <CircularProgress size={28} />
          <Typography color="text.secondary">Loading stats...</Typography>
        </Box>
      ) : (
        <Grid container spacing={2} sx={{ mb: 2.5 }}>
          {statCards.map((statCard: StatCard, index: number) => (
            <Grid size={{ xs: 6, md: 3 }} key={index}>
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.08 }}
                style={{ height: "100%" }}
              >
                <Card sx={{ height: "100%" }}>
                  <CardContent sx={{ p: 2.5 }}>
                    <Avatar
                      sx={{
                        width: 44,
                        height: 44,
                        bgcolor: `${statCard.color}30`,
                        color: "primary.main",
                        borderRadius: 2.5,
                        mb: 1.5,
                      }}
                      variant="rounded"
                    >
                      {statCard.icon}
                    </Avatar>
                    <Typography sx={{ fontSize: "1.5rem", fontWeight: 700, color: "primary.main" }}>
                      {statCard.value}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {statCard.label}
                    </Typography>
                  </CardContent>
                </Card>
              </motion.div>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Recent Activity */}
      <Card>
        <CardContent>
          <Typography variant="h5" sx={{ fontSize: "1.15rem", mb: 2 }}>
            Recent Documents
          </Typography>
          {stats.recentDocs.length === 0 ? (
            <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>
              No documents uploaded yet. Head to the Upload page to get started.
            </Typography>
          ) : (
            stats.recentDocs.map((doc: Document, index: number) => (
              <Box key={doc.id}>
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    py: 1.2,
                    gap: 2,
                    flexWrap: "wrap",
                  }}
                >
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, flex: 1, minWidth: 0 }}>
                    <Box
                      sx={{
                        width: 38,
                        height: 38,
                        borderRadius: 2,
                        bgcolor: "secondary.light",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: "0.65rem",
                        fontWeight: 700,
                        color: "primary.main",
                        flexShrink: 0,
                      }}
                    >
                      {doc.fileType?.replace(".", "").toUpperCase() || "FILE"}
                    </Box>
                    <Box sx={{ minWidth: 0 }}>
                      <Typography sx={{ fontWeight: 500, fontSize: "0.9rem" }} noWrap>
                        {doc.fileName}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {new Date(doc.uploadedAt).toLocaleDateString()} · {doc.resultCount} result(s)
                      </Typography>
                    </Box>
                  </Box>
                  <Chip
                    label={doc.status}
                    size="small"
                    color={
                      doc.status === "Done"
                        ? "success"
                        : doc.status === "Failed"
                        ? "error"
                        : "warning"
                    }
                  />
                </Box>
                {index < stats.recentDocs.length - 1 && <Divider />}
              </Box>
            ))
          )}
        </CardContent>
      </Card>
    </Box>
  );
}