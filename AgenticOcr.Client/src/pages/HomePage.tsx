import { useNavigate } from "react-router-dom";
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  Avatar,
  Chip,
  Grid
} from "@mui/material";
import {
  CloudUpload,
  Psychology,
  ElderlyWoman,
  Shield,
  FavoriteBorder,
} from "@mui/icons-material";
import { motion } from "framer-motion";


/* ================= TYPES ================= */

interface Feature {
  icon: React.ReactElement;
  title: string;
  desc: string;
  color: string;
}

interface Step {
  num: string;
  title: string;
  desc: string;
}

/* ================= DATA ================= */

const features: Feature[] = [
  {
    icon: <CloudUpload sx={{ fontSize: 28 }} />,
    title: "Easy Upload",
    desc: "Drop your prescription, lab report, or any health document. We accept PDF, JPG, and PNG files.",
    color: "#A8D3A830",
  },
  {
    icon: <Psychology sx={{ fontSize: 28 }} />,
    title: "Smart Extraction",
    desc: "Our agentic OCR reads handwritten notes, printed text, and even faded documents with high accuracy.",
    color: "#e8d5a340",
  },
  {
    icon: <ElderlyWoman sx={{ fontSize: 28 }} />,
    title: "Simplified Results",
    desc: "Complex medical jargon is translated into simple, easy-to-understand language for you.",
    color: "#d5c8e840",
  },
  {
    icon: <Shield sx={{ fontSize: 28 }} />,
    title: "Secure & Private",
    desc: "Your health documents stay safe. All processing is done securely with full privacy protection.",
    color: "#c8dde840",
  },
];

const steps: Step[] = [
  { num: "1", title: "Upload", desc: "Choose your file" },
  { num: "2", title: "Process", desc: "Select OCR pipeline" },
  { num: "3", title: "Read", desc: "Get simplified results" },
];

/* ================= COMPONENT ================= */

export default function HomePage(): React.ReactElement {
  const navigate = useNavigate();

  return (
    <Box>
      {/* Hero */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }}>
        <Box
          sx={{
            background: "linear-gradient(135deg, #4a4d35 0%, #8f8e5d 50%, #3a2420 100%)",
            borderRadius: 5,
            p: { xs: 4, md: 6 },
            mb: 4,
            position: "relative",
            overflow: "hidden",
          }}
        >
          {/* Decorative circles */}
          <Box
            sx={{
              position: "absolute",
              top: -60,
              right: -60,
              width: 200,
              height: 200,
              borderRadius: "50%",
              bgcolor: "rgba(168,211,168,0.08)",
            }}
          />
          <Box
            sx={{
              position: "absolute",
              bottom: -40,
              left: "40%",
              width: 150,
              height: 150,
              borderRadius: "50%",
              bgcolor: "rgba(168,211,168,0.05)",
            }}
          />
          <Box
            sx={{
              position: "absolute",
              top: 30,
              right: 120,
              width: 60,
              height: 60,
              borderRadius: "50%",
              bgcolor: "rgba(168,211,168,0.1)",
              animation: "float 4s ease-in-out infinite",
              "@keyframes float": {
                "0%,100%": { transform: "translateY(0)" },
                "50%": { transform: "translateY(-8px)" },
              },
            }}
          />

          <motion.div
            initial={{ opacity: 0, y: 25 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15, duration: 0.6 }}
          >
            <Box sx={{ position: "relative", zIndex: 1, maxWidth: 600 }}>
              <Chip
                icon={<FavoriteBorder sx={{ fontSize: 14, color: "#A8D3A8 !important" }} />}
                label="Health Document Reader"
                size="small"
                sx={{
                  bgcolor: "rgba(168,211,168,0.15)",
                  color: "#A8D3A8",
                  fontWeight: 500,
                  mb: 2,
                  "& .MuiChip-icon": { ml: 0.5 },
                }}
              />

              <Typography
                variant="h2"
                sx={{
                  fontSize: { xs: "2rem", md: "2.8rem" },
                  color: "#fff",
                  lineHeight: 1.15,
                  mb: 1.5,
                }}
              >
                Understand your
                <br />
                health documents
                <br />
                <Box component="span" sx={{ color: "secondary.main" }}>
                  with ease
                </Box>
              </Typography>

              <Typography
                sx={{
                  color: "rgba(255,255,255,0.7)",
                  fontSize: "1.08rem",
                  lineHeight: 1.65,
                  mb: 3,
                  maxWidth: 480,
                }}
              >
                Upload any prescription, lab report, or medical record. Our intelligent OCR will
                extract and simplify the information so you can understand it clearly.
              </Typography>

              <Box sx={{ display: "flex", gap: 1.5, flexWrap: "wrap" }}>
                <Button
                  variant="contained"
                  color="secondary"
                  size="large"
                  onClick={() => navigate("/upload")}
                  sx={{ px: 3.5 }}
                >
                  Upload Document
                </Button>

                <Button
                  variant="outlined"
                  size="large"
                  onClick={() => navigate("/history")}
                  sx={{
                    color: "rgba(255,255,255,0.8)",
                    borderColor: "rgba(255,255,255,0.25)",
                    "&:hover": {
                      borderColor: "rgba(255,255,255,0.5)",
                      bgcolor: "rgba(255,255,255,0.05)",
                    },
                  }}
                >
                  View History
                </Button>
              </Box>
            </Box>
          </motion.div>
        </Box>
      </motion.div>

      {/* Features */}
      <Typography variant="h4" sx={{ fontSize: "1.6rem", mb: 2, mt: 4 }}>
        Features
      </Typography>
      {/* Features Grid - MUI v7 syntax */}
<Grid container spacing={2} sx={{ mb: 4 }}>
  {features.map((feature: Feature, index: number) => (
    <Grid size={{ xs: 12, sm: 6, md: 3 }} key={index}>
      {/* size prop instead of xs/sm/md props - the 'item' prop is removed entirely */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 * index + 0.3 }}
        style={{ height: "100%" }}
      >
        <Card
          sx={{
            height: "100%",
            transition: "0.25s",
            "&:hover": {
              transform: "translateY(-3px)",
              boxShadow: (theme) => theme.shadows[4],
            },
          }}
        >
          <CardContent>
            <Avatar 
              sx={{ 
                bgcolor: feature.color,
                mb: 1.5
              }} 
              variant="rounded"
            >
              {feature.icon}
            </Avatar>

            <Typography variant="h6" sx={{ mt: 1, mb: 0.5 }}>
              {feature.title}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {feature.desc}
            </Typography>
          </CardContent>
        </Card>
      </motion.div>
    </Grid>
  ))}
</Grid>

      {/* Steps */}
      <Typography variant="h4" sx={{ fontSize: "1.6rem", mb: 2 }}>
        Three simple steps
      </Typography>

      <Card sx={{ mb: 4 }}>
        <CardContent>
          <Box 
            sx={{ 
              display: "flex", 
              gap: 3, 
              flexWrap: "wrap",
              justifyContent: "space-around"
            }}
          >
            {steps.map((step: Step, index: number) => (
              <Box 
                key={index} 
                sx={{ 
                  textAlign: "center", 
                  flex: 1,
                  minWidth: 120
                }}
              >
                <Avatar
                  sx={{
                    width: 56,
                    height: 56,
                    bgcolor: "secondary.main",
                    color: "#fff",
                    mx: "auto",
                    mb: 1.5,
                    fontWeight: 600,
                    fontSize: "1.5rem"
                  }}
                >
                  {step.num}
                </Avatar>
                <Typography variant="h6" sx={{ fontWeight: 600, mb: 0.5 }}>
                  {step.title}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {step.desc}
                </Typography>
              </Box>
            ))}
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
}