import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
    Drawer,
    Box,
    List,
    ListItemButton,
    ListItemIcon,
    ListItemText,
    Typography,
    Avatar,
    IconButton,
    Divider,
    Button,
    Tooltip,
} from "@mui/material";
import {
    Home,
    CloudUpload,
    History,
    BarChart,
    Person,
    Logout,
    FavoriteBorder,
} from "@mui/icons-material";
import { useAuth } from "../services/AuthContext";

// ============ CONSTANTS ============

export const DRAWER_WIDTH = 250;

// ============ TYPES ============

interface NavItem {
    path: string;
    label: string;
    icon: React.ReactElement;
}

// ============ NAVIGATION ITEMS ============

const navItems: NavItem[] = [
    { path: "/", label: "Home", icon: <Home /> },
    { path: "/upload", label: "Upload", icon: <CloudUpload /> },
    { path: "/history", label: "History", icon: <History /> },
    { path: "/comparison", label: "Compare", icon: <BarChart /> },
    { path: "/profile", label: "Profile", icon: <Person /> },
];

// ============ COMPONENT ============

export default function Navbar(): React.ReactElement {
    const navigate = useNavigate();
    const location = useLocation();
    const { user, logout } = useAuth();

    const handleLogout = (): void => {
        logout();
        navigate("/login");
    };

    return (
        <Drawer
            variant="permanent"
            sx={{
                width: DRAWER_WIDTH,
                flexShrink: 0,
                "& .MuiDrawer-paper": {
                    width: DRAWER_WIDTH,
                    boxSizing: "border-box",
                    bgcolor: "primary.main",
                    borderRight: "none",
                    display: "flex",
                    flexDirection: "column",
                },
            }}
        >
            {/* Logo */}
            <Box sx={{ px: 2.5, py: 3, display: "flex", alignItems: "center", gap: 1.5 }}>
                <Box
                    sx={{
                        width: 42,
                        height: 42,
                        borderRadius: 2.5,
                        background: "linear-gradient(135deg, #A8D3A8, #7ab87a)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        boxShadow: "0 2px 10px rgba(168,211,168,0.4)",
                    }}
                >
                    <FavoriteBorder sx={{ color: "#fff", fontSize: 22 }} />
                </Box>
                <Box>
                    <Typography
                        sx={{
                            fontFamily: "'DM Serif Display', serif",
                            fontSize: "1.15rem",
                            color: "#fff",
                            lineHeight: 1.1,
                        }}
                    >
                        HealthLens
                    </Typography>
                    <Typography sx={{ fontSize: "0.68rem", color: "secondary.main", letterSpacing: "0.04em", mt: 0.3 }}>
                        OCR Document Reader
                    </Typography>
                </Box>
            </Box>

            {/* Nav Items */}
            <List sx={{ flex: 1, px: 1.5, mt: 1 }}>
                {navItems.map((item: NavItem) => {
                    const isActive: boolean = location.pathname === item.path;
                    return (
                        <ListItemButton
                            key={item.path}
                            onClick={() => navigate(item.path)}
                            sx={{
                                borderRadius: 2.5,
                                mb: 0.4,
                                px: 2,
                                py: 1,
                                position: "relative",
                                bgcolor: isActive ? "rgba(168,211,168,0.15)" : "transparent",
                                "&:hover": { bgcolor: "rgba(168,211,168,0.1)" },
                                "&::before": isActive
                                    ? {
                                        content: '""',
                                        position: "absolute",
                                        left: -6,
                                        top: "50%",
                                        transform: "translateY(-50%)",
                                        width: 4,
                                        height: 28,
                                        borderRadius: 1,
                                        bgcolor: "secondary.main",
                                    }
                                    : {},
                            }}
                        >
                            <ListItemIcon
                                sx={{
                                    minWidth: 36,
                                    color: isActive ? "secondary.main" : "rgba(255,255,255,0.45)",
                                }}
                            >
                                {item.icon}
                            </ListItemIcon>
                            {/* ✅ FIX: Use slotsProps instead of primaryTypographyProps */}
                            <ListItemText
                                primary={item.label}
                                slotProps={{
                                    primary: {
                                      sx: {
                                        fontSize: "0.92rem",
                                        fontWeight: isActive ? 600 : 400,
                                        color: isActive ? "#fff" : "rgba(255,255,255,0.55)",
                                      },
                                    },
                                  }}
                            />
                        </ListItemButton>
                    );
                })}
            </List>

            {/* User Footer */}
            <Box sx={{ px: 2, pb: 2.5, pt: 1.5, borderTop: "1px solid rgba(255,255,255,0.1)" }}>
                {user ? (
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1.2 }}>
                        <Avatar
                            sx={{
                                width: 36,
                                height: 36,
                                bgcolor: "secondary.main",
                                color: "primary.main",
                                fontWeight: 700,
                                fontSize: "0.9rem",
                            }}
                        >
                            {user.name?.[0]?.toUpperCase() || "U"}
                        </Avatar>
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                            <Typography
                                sx={{ color: "#fff", fontSize: "0.85rem", fontWeight: 500 }}
                                noWrap
                            >
                                {user.name}
                            </Typography>
                            <Typography
                                sx={{ color: "rgba(255,255,255,0.4)", fontSize: "0.7rem" }}
                                noWrap
                            >
                                {user.email}
                            </Typography>
                        </Box>
                        <Tooltip title="Sign out">
                            <IconButton
                                onClick={handleLogout}
                                size="small"
                                sx={{
                                    bgcolor: "rgba(255,255,255,0.08)",
                                    "&:hover": { bgcolor: "rgba(255,255,255,0.15)" },
                                }}
                            >
                                <Logout sx={{ color: "rgba(255,255,255,0.5)", fontSize: 18 }} />
                            </IconButton>
                        </Tooltip>
                    </Box>
                ) : (
                    <Button
                        variant="contained"
                        color="secondary"
                        fullWidth
                        onClick={() => navigate("/login")}
                        sx={{ fontWeight: 600 }}
                    >
                        Sign In
                    </Button>
                )}
            </Box>
        </Drawer>
    );
}