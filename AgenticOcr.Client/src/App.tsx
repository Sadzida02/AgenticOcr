import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { ThemeProvider, CssBaseline, Box } from "@mui/material";  
import theme from "./theme";
import { AuthProvider } from "./services/AuthContext";
import Navbar, { DRAWER_WIDTH } from "./components/Navbar";
import HomePage from "./pages/HomePage";
import UploadPage from "./pages/UploadPage";
import HistoryPage from "./pages/HistoryPage";
import ComparisonPage from "./pages/ComparisonPage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import ProfilePage from "./pages/ProfilePage";
import ExplainabilityPage from './pages/ExplainabilityPage';
import "./App.css";

function AppLayout() {
    const location = useLocation();
    const isAuthPage =
        location.pathname === "/login" || location.pathname === "/register";

    if (isAuthPage) {
        return (
            <Routes>
                <Route path="/login" element={<LoginPage />} />
                <Route path="/register" element={<RegisterPage />} />
            </Routes>
        );
    }

    return (
        <Box sx={{ display: "flex", minHeight: "100vh" }}>
            <Navbar />
            <Box
                component="main"
                sx={{
                    flexGrow: 1,
                    p: { xs: 2, sm: 3, md: 4 },
                    maxWidth: `calc(100vw - ${DRAWER_WIDTH}px)`,
                    bgcolor: "background.default",
                    minHeight: "100vh",
                }}
            >
                <Routes>
                    <Route path="/" element={<HomePage />} />
                    <Route path="/upload" element={<UploadPage />} />
                    <Route path="/history" element={<HistoryPage />} />
                    <Route path="/comparison" element={<ComparisonPage />} />
                    <Route path="/profile" element={<ProfilePage />} />
                    <Route path="/explainability" element={<ExplainabilityPage />}
/>
                </Routes>
                
            </Box>
        </Box>
    );
}

export default function App() {
    return (
        <BrowserRouter>
            <ThemeProvider theme={theme}>  
                <CssBaseline />
                <AuthProvider>
                    <AppLayout />
                    
                </AuthProvider>
            </ThemeProvider>
        </BrowserRouter>
    );
}