import React from "react";
import { BrowserRouter as Router, Routes, Route, NavLink } from "react-router-dom";
import { Users, MessageSquare, Award, Box } from "lucide-react";
import PlayerList from "./components/PlayerList";
import Chat from "./components/Chat";
import Advancements from "./components/Advancements";
import InventoryViewer from "./components/InventoryViewer";

// Welcome Component
const Welcome = () => (
  <div className="flex-1 flex items-center justify-center bg-[#1B193B]">
    <h1 className="text-6xl text-white font-serif tracking-wider">Bienvenida</h1>
  </div>
);

const NavItem = ({ to, label }) => (
  <NavLink
    to={to}
    className={({ isActive }) =>
      `block px-6 py-4 text-lg font-medium transition-colors ${
        isActive
          ? "bg-[#D946EF] text-white" // Magenta active state
          : "text-black hover:bg-gray-200"
      }`
    }
  >
    {label}
  </NavLink>
);

export default function App() {
  return (
    <Router>
      <div className="flex h-screen overflow-hidden">
        {/* Sidebar */}
        <aside className="w-64 flex flex-col bg-[#E5E7EB]"> {/* Light Gray Body */}
          {/* Header */}
          <div className="h-24 bg-[#2C2F66] flex items-center px-6"> {/* Primary Blue Header */}
            <h1 className="text-2xl text-white font-serif">DashBoard</h1>
          </div>

          {/* Navigation */}
          <nav className="flex-1 py-4">
            <NavItem to="/players" label="Jugadores" />
            <NavItem to="/chat" label="Chat" />
            <NavItem to="/advancements" label="Logros" />
            <NavItem to="/inventory" label="Inventarios" />
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 flex flex-col min-w-0 overflow-hidden bg-[#1B193B]">
          <Routes>
            <Route path="/" element={<Welcome />} />
            <Route path="/players" element={<PlayerList />} />
            <Route path="/chat" element={<Chat />} />
            <Route path="/advancements" element={<Advancements />} />
            <Route path="/inventory" element={<InventoryViewer />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}
