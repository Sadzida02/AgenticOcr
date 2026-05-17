import { createContext, useContext, useState } from "react";

const AuthContext = createContext(null);

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }) {
    const [user, setUser] = useState(() => {
        try {
            const saved = localStorage.getItem("healthlens_user");
            return saved ? JSON.parse(saved) : null;
        } catch {
            return null;
        }
    });

    const login = (userData) => {
        setUser(userData);
        localStorage.setItem("healthlens_user", JSON.stringify(userData));
    };

    const logout = () => {
        setUser(null);
        localStorage.removeItem("healthlens_user");
    };

    const register = (userData) => {
        setUser(userData);
        localStorage.setItem("healthlens_user", JSON.stringify(userData));
    };

    return (
        <AuthContext.Provider value={{ user, login, logout, register }}>
            {children}
        </AuthContext.Provider>
    );
}