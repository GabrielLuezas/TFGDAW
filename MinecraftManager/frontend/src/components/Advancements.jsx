import React, { useEffect, useState } from "react";
import { api } from "../services/api";
import { Search, CheckCircle, Lock, Trophy } from "lucide-react";

export default function Advancements() {
  const [players, setPlayers] = useState([]);
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [advancements, setAdvancements] = useState([]);
  const [rootAdvancements, setRootAdvancements] = useState([]);
  const [activeTab, setActiveTab] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.getPlayers().then((data) => {
      setPlayers(data);
      if (data.length > 0) setSelectedPlayer(data[0].uuid);
    });
  }, []);

  useEffect(() => {
    if (!selectedPlayer) return;
    setLoading(true);
    api.getAdvancements(selectedPlayer).then((data) => {
      const advs = data.advancements || [];
      setAdvancements(advs);

      const roots = advs.filter((a) => !a.parent);
      setRootAdvancements(roots);
      if (roots.length > 0) setActiveTab(roots[0].key);

      setLoading(false);
    });
  }, [selectedPlayer]);

  const getChildren = (parentId) => {
    return advancements.filter((a) => a.parent === parentId);
  };

  const AdvancementNode = ({ adv, depth = 0 }) => {
    const children = getChildren(adv.key);
    const isCompleted = adv.done;

    return (
      <div className="flex flex-col relative">
        <div className="flex items-center gap-4 p-4 rounded bg-[#E5E7EB] shadow-sm border border-gray-300">
           {/* Icon */}
           <div className={`w-12 h-12 flex items-center justify-center shrink-0 border-2 ${
               isCompleted ? 'bg-[#31AF7C] border-[#31AF7C] text-white' : 'bg-gray-400 border-gray-500 text-gray-700'
           }`}>
               {isCompleted ? <CheckCircle size={24} /> : <Lock size={24} />}
           </div>

           {/* Content */}
           <div className="flex-1 min-w-0">
              <h4 className="font-bold text-black truncate">
                  {adv.display.title}
              </h4>
              <p className="text-sm text-gray-600 truncate">{adv.display.description}</p>
           </div>

           {/* Badge for Frame Type */}
           {adv.display.frame === 'challenge' && (
               <div className="px-2 py-1 bg-[#D946EF] text-white text-[10px] font-bold uppercase rounded flex items-center gap-1">
                   <Trophy size={10} /> Challenge
               </div>
           )}
        </div>

        {/* Connector Line */}
        {children.length > 0 && (
            <div className="ml-6 pl-6 border-l-2 border-gray-400 py-4 space-y-4">
                {children.map(child => (
                    <AdvancementNode key={child.key} adv={child} depth={depth + 1} />
                ))}
            </div>
        )}
      </div>
    );
  };

  return (
    <div className="h-full flex flex-col p-8">
      <div className="flex justify-between items-center mb-8">
        <h2 className="text-4xl font-serif text-white">Logros</h2>
        
        <div className="relative">
            <select
              className="bg-[#E5E7EB] text-black px-4 py-2 rounded outline-none focus:ring-2 focus:ring-[#D946EF]"
              value={selectedPlayer || ""}
              onChange={(e) => setSelectedPlayer(e.target.value)}
            >
              <option value="" disabled>Seleccionar Jugador</option>
              {players.map((p) => (
                <option key={p.uuid} value={p.uuid}>
                  {p.name}
                </option>
              ))}
            </select>
        </div>
      </div>

      {loading ? (
        <div className="text-center mt-20 text-gray-400">Cargando logros...</div>
      ) : (
        <div className="flex-1 bg-[#1B193B] flex flex-col min-h-0 overflow-hidden"> {/* Added min-h-0 and overflow-hidden */}
          {/* Tabs */}
          <div className="flex overflow-x-auto bg-[#4B5563] p-0 shrink-0"> {/* Added shrink-0 */}
            {rootAdvancements.map((root) => (
              <button
                key={root.key}
                onClick={() => setActiveTab(root.key)}
                className={`px-6 py-3 text-sm font-bold transition-colors whitespace-nowrap ${
                  activeTab === root.key
                    ? "bg-[#D946EF] text-white" // Pink Active
                    : "text-gray-300 hover:bg-gray-600 hover:text-white"
                }`}
              >
                {root.display.title}
              </button>
            ))}
          </div>

          {/* Content Area */}
          <div className="flex-1 overflow-y-auto p-8 bg-[#D1D5DB]">
            {activeTab && advancements.find((a) => a.key === activeTab) ? (
                 <div className="max-w-4xl mx-auto pb-10">
                    <AdvancementNode
                        adv={advancements.find((a) => a.key === activeTab)}
                    />
                 </div>
              ) : (
                  <div className="text-center text-gray-600 mt-20">Selecciona una categoría</div>
              )}
          </div>
        </div>
      )}
    </div>
  );
}
