import "@/App.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import Home from "@/pages/Home";
import Admin from "@/pages/Admin";
import { LogoProvider } from "@/lib/logo";

export default function App() {
  return (
    <div className="App grain">
      <LogoProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/admin" element={<Admin />} />
          </Routes>
        </BrowserRouter>
      </LogoProvider>
      <Toaster theme="dark" position="top-center" richColors />
    </div>
  );
}
