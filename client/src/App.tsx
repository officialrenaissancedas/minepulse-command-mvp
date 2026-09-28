import { Toaster } from "sonner";
import { MotionConfig } from "motion/react";
import { ThemeProvider, useTheme } from "./contexts/ThemeContext";
import Home from "./pages/Home";

function AppContent() {
  const { theme } = useTheme();
  return <MotionConfig reducedMotion="user"><><Home /><Toaster theme={theme} position="top-right" richColors /></></MotionConfig>;
}

export default function App() {
  return <ThemeProvider defaultTheme="light" switchable><AppContent /></ThemeProvider>;
}
