import { createTheme } from "@mui/material/styles";

const theme = createTheme({
    palette: {
        primary: {
            main: "#4a4d35",
            light: "#9da371",
            dark: "#343627",
            contrastText: "#ffffff",
        },
        secondary: {
            main: "#edeca6",
            light: "#f5f4cb",
            dark: "#69684d",
            contrastText: "#553832",
        },
        background: {
            default: "#f5faf5",
            paper: "#ffffff",
        },
        text: {
            primary: "#2a2a2a",
            secondary: "#666666",
        },
        error: {
            main: "#dc2626",
        },
        warning: {
            main: "#f59e0b",
        },
        success: {
            main: "#2d6a2d",
            light: "#d4ecd4",
        },
        divider: "#dde8dd",
        grey: {
            100: "#f5faf5",
            200: "#dde8dd",
            300: "#c4d4c4",
        },
    },
    typography: {
        fontFamily: "'Outfit', sans-serif",
        h1: {
            fontFamily: "'DM Serif Display', serif",
            fontWeight: 400,
            color: "#553832",
        },
        h2: {
            fontFamily: "'DM Serif Display', serif",
            fontWeight: 400,
            color: "#553832",
        },
        h3: {
            fontFamily: "'DM Serif Display', serif",
            fontWeight: 400,
            color: "#553832",
        },
        h4: {
            fontFamily: "'DM Serif Display', serif",
            fontWeight: 400,
            color: "#553832",
        },
        h5: {
            fontFamily: "'DM Serif Display', serif",
            fontWeight: 400,
            color: "#553832",
        },
        h6: {
            fontFamily: "'DM Serif Display', serif",
            fontWeight: 400,
            color: "#553832",
        },
        button: {
            fontFamily: "'Outfit', sans-serif",
            textTransform: "none",
            fontWeight: 600,
        },
    },
    shape: {
        borderRadius: 12,
    },
    components: {
        MuiButton: {
            // ✅ styleOverrides only for root and other internal classes
            styleOverrides: {
                root: ( ) => ({
                    borderRadius: 10,
                    padding: "8px 20px",
                    fontSize: "0.92rem",
                }),
                
            },
        
            variants: [
                {
                    props: { variant: "contained", color: "primary" },
                    style: {
                        "&:hover": { 
                            backgroundColor: "#3a2420" 
                        },
                    },
                },
                {
                    props: { variant: "contained", color: "secondary" },
                    style: {
                        color: "#553832",
                        "&:hover": { 
                            backgroundColor: "#7ab87a" 
                        },
                    },
                },
            ],
        },
        MuiCard: {
            styleOverrides: {
                root: {
                    borderRadius: 14,
                    border: "1px solid #dde8dd",
                    boxShadow: "0 2px 12px rgba(85,56,50,0.06)",
                },
            },
        },
        MuiChip: {
            styleOverrides: {
                root: { 
                    fontWeight: 600, 
                    fontSize: "0.8rem" 
                },
            },
        },
        MuiTab: {
            styleOverrides: {
                root: {
                    textTransform: "none",
                    fontWeight: 500,
                    fontSize: "0.9rem",
                    minHeight: 42,
                },
            },
        },
        MuiTabs: {
            styleOverrides: {
                indicator: { 
                    backgroundColor: "#553832", 
                    height: 3, 
                    borderRadius: 2 
                },
            },
        },
        MuiTextField: {
            styleOverrides: {
                root: {
                    "& .MuiOutlinedInput-root": {
                        borderRadius: 10,
                        "&:hover .MuiOutlinedInput-notchedOutline": {
                            borderColor: "#A8D3A8",
                        },
                        "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
                            borderColor: "#A8D3A8",
                        },
                    },
                },
            },
        },
        MuiPaper: {
            styleOverrides: {
                root: { 
                    backgroundImage: "none" 
                },
            },
        },
    },
});

export default theme;