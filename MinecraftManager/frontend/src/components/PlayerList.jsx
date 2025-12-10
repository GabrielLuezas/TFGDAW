import React, { useEffect, useState } from "react";
import { api } from "../services/api";
import { Shield, Ban, Heart, MapPin, Globe } from "lucide-react";

export default function PlayerList() {
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPlayers = () => {
      api.getPlayers().then((data) => {
        setPlayers(data);
        setLoading(false);
      });
    };

    fetchPlayers();
    const interval = setInterval(fetchPlayers, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleCommand = async (cmd) => {
    await api.sendCommand(cmd);
  };

  return (
    <div className="h-full flex flex-col p-8">
      <h2 className="text-4xl font-serif text-white text-center mb-12">Jugadores conectados</h2>

      {loading ? (
        <div className="text-center text-gray-400">Cargando jugadores...</div>
      ) : players.length === 0 ? (
        <div className="text-center text-gray-500 text-xl mt-20">No hay jugadores conectados</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-6xl mx-auto w-full">
          {players.map((player) => (
            <div key={player.uuid} className="bg-[#E5E7EB] p-4 flex gap-6 shadow-lg"> {/* Light Gray Card */}
              
              {/* Left Column: Avatar + Actions */}
              <div className="flex flex-col items-center gap-4">
                <img
                  src={`https://minotar.net/avatar/${player.name}/100.png`}
                  alt={player.name}
                  className="w-24 h-24 border-4 border-[#31AF7C]" // Green Border
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => handleCommand(`op ${player.name}`)}
                    className="p-2 bg-[#31AF7C] hover:bg-[#258e64] text-white rounded transition-colors"
                    title="Dar Admin"
                  >
                    <Shield size={20} />
                  </button>
                  <button
                    onClick={() => handleCommand(`kick ${player.name}`)}
                    className="p-2 bg-[#E43A36] hover:bg-[#c0302c] text-white rounded transition-colors"
                    title="Expulsar"
                  >
                    <Ban size={20} />
                  </button>
                </div>
              </div>

              {/* Right Column: Stats */}
              <div className="flex-1 flex flex-col justify-center gap-2 text-black">
                <h3 className="text-2xl font-bold">{player.name}</h3>
                
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Heart className="text-[#E43A36]" size={16} fill="#E43A36" />
                  <span>{Math.ceil(player.health)} HP</span>
                </div>

                <div className="flex items-center gap-2 text-sm font-medium">
                  <MapPin className="text-[#2C2F66]" size={16} />
                  <span>
                    {Math.round(player.location.x)}, {Math.round(player.location.y)}, {Math.round(player.location.z)}
                  </span>
                </div>

                <div className="flex items-center gap-2 text-sm font-medium">
                  <Globe className="text-[#2C2F66]" size={16} />
                  <span className="capitalize">{player.location.world}</span>
                </div>
              </div>

            </div>
          ))}
        </div>
      )}
    </div>
  );
}
