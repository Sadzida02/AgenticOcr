import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
    Box,
    Typography,
    Card,
    CardContent,
    Button,
    TextField,
    Alert,
    Avatar,
} from "@mui/material";
import { FavoriteBorder } from "@mui/icons-material";
import { motion } from "framer-motion";
import { useAuth } from "../services/AuthContext";

export default function LoginPage() {
    const navigate = useNavigate();
    const { login } = useAuth();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");

    const handleLogin = () => {
        if (!email || !password) {
            setError("Please fill in all fields");
            return;
        }
        // Simulated login � replace with real API call
        login({ name: email.split("@")[0], email });
        navigate("/");
    };

    const handleKeyDown = (e) => {
        if (e.key === "Enter") handleLogin();
    };

    return (
        <Box
            sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                minHeight: "100vh",
                bgcolor: "background.default",
                p: 2,
            }}
        >
            <motion.div
                initial={{ opacity: 0, y: 25 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
                style={{ width: "100%", maxWidth: 420 }}
            >
                {/* Logo */}
                <Box sx={{ textAlign: "center", mb: 4 }}>
                    <Avatar
                        sx={{
                            width: 64,
                            height: 64,
                            mx: "auto",
                            mb: 1.5,
                            background: "linear-gradient(135deg, #A8D3A8, #7ab87a)",
                            boxShadow: "0 4px 15px rgba(168,211,168,0.4)",
                        }}
                    >
                        <FavoriteBorder sx={{ fontSize: 32 }} />
                    </Avatar>
                    <Typography variant="h3" sx={{ fontSize: "1.8rem" }}>
                        Welcome back
                    </Typography>
                    <Typography color="text.secondary" sx={{ mt: 0.5 }}>
                        Sign in to access your health documents
                    </Typography>
                </Box>

                <Card>
                    <CardContent sx={{ p: 3 }}>
                        <Box sx={{ display: "flex", flexDirection: "column", gap: 2.5 }}>
                            <TextField
                                label="Email address"
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                onKeyDown={handleKeyDown}
                                placeholder="your@email.com"
                                fullWidth
                            />
                            <TextField
                                label="Password"
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                onKeyDown={handleKeyDown}
                                placeholder="Enter your password"
                                fullWidth
                            />
                            {error && (
                                <Alert severity="error" sx={{ borderRadius: 2.5 }}>
                                    {error}
                                </Alert>
                            )}
                            <Button
                                variant="contained"
                                color="primary"
                                size="large"
                                fullWidth
                                onClick={handleLogin}
                                sx={{ py: 1.3, fontSize: "1rem" }}
                            >
                                Sign In
                            </Button>
                        </Box>
                        <Typography
                            sx={{ textAlign: "center", mt: 2.5, fontSize: "0.88rem", color: "text.secondary" }}
                        >
                            Don't have an account?{" "}
                            <Box
                                component="span"
                                onClick={() => navigate("/register")}
                                sx={{
                                    color: "primary.main",
                                    fontWeight: 600,
                                    cursor: "pointer",
                                    textDecoration: "underline",
                                    "&:hover": { color: "primary.dark" },
                                }}
                            >
                                Sign up
                            </Box>
                        </Typography>
                    </CardContent>
                </Card>
            </motion.div>
        </Box>
    );
}