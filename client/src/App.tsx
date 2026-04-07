import { BrowserRouter, Routes, Route, Link } from "react-router-dom";
import CoachPage from "./CoachPage";
import PremiumCockpitMock from "./PremiumCockpitMock";

export default function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-slate-950 text-white">
        <nav className="p-4 flex gap-4 border-b border-slate-800">
          <Link to="/coach">🧠 Coach</Link>
          <Link to="/cockpit">📈 Cockpit</Link>
        </nav>

        <Routes>
          <Route path="/" element={<CoachPage />} />
          <Route path="/coach" element={<CoachPage />} />
          <Route path="/cockpit" element={<PremiumCockpitMock />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}