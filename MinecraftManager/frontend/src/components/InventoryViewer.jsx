import React, { useEffect, useState } from "react";
import { api } from "../services/api";
import { Box, Shield, Search } from "lucide-react";

export default function InventoryViewer() {
  const [players, setPlayers] = useState([]);
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [inventory, setInventory] = useState([]);
  const [enderChest, setEnderChest] = useState([]);
  const [potionEffects, setPotionEffects] = useState([]);
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
    api.getInventory(selectedPlayer).then((data) => {
      setInventory(data.inventory || []);
      setEnderChest(data.enderChest || []);
      setPotionEffects(data.potionEffects || []);
      setLoading(false);
    });
  }, [selectedPlayer]);


  const [hoveredItem, setHoveredItem] = useState(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });

  const handleMouseEnter = (e, item) => {
    if (!item) return;
    const rect = e.currentTarget.getBoundingClientRect();
    setHoveredItem(item);
    setTooltipPos({
      x: rect.left + rect.width / 2,
      y: rect.top
    });
  };

  const handleMouseLeave = () => {
    setHoveredItem(null);
  };

  const renderSlot = (item, index) => {
    if (!item) return <div key={index} className="w-16 h-16 bg-[#9CA3AF] border-2 border-white/50" />; // Empty Slot (Gray)

    // Format item type for URL (e.g., DIAMOND_SWORD -> diamond_sword)
    // CRITICAL: Replace spaces AND underscores to ensure standard format
    const itemName = item.type.toLowerCase().replace(/\s+/g, '_');
    
    // Special cases mapping (Manual overrides for problematic items)
    const specialItems = {
        'ender_chest': 'https://assets.mcasset.cloud/1.21.1/assets/minecraft/textures/block/ender_chest_front.png',
        'enchanted_golden_apple': 'https://assets.mcasset.cloud/1.21.1/assets/minecraft/textures/item/golden_apple.png',
        // Use Misode's GitHub for 1.21 items (Reliable source)
        'mace': 'https://raw.githubusercontent.com/misode/mcmeta/1.21.1/assets/minecraft/textures/item/mace.png',
        'breeze_rod': 'https://raw.githubusercontent.com/misode/mcmeta/1.21.1/assets/minecraft/textures/item/breeze_rod.png',
        'chest': 'https://assets.mcasset.cloud/1.21.1/assets/minecraft/textures/block/chest_front.png',
        'trapped_chest': 'https://assets.mcasset.cloud/1.21.1/assets/minecraft/textures/block/trapped_chest_front.png',
        'shield': 'https://assets.mcasset.cloud/1.21.1/assets/minecraft/textures/item/shield_base_nbt.png',
    };

    // Determine base URL
    // PRIORITY 1: Local Custom Texture
    // We try this first. If it fails, onError will trigger the fallback chain.
    let primaryUrl = `/custom_textures/${itemName}.png`;
    
    // Fallback URLs for onError
    const internetUrl = specialItems[itemName] || (
        (itemName.includes('wool') || itemName.includes('log') || itemName.includes('planks') || itemName.includes('ore') || itemName.includes('block')) 
        ? `https://assets.mcasset.cloud/1.21.1/assets/minecraft/textures/block/${itemName}.png`
        : `https://assets.mcasset.cloud/1.21.1/assets/minecraft/textures/item/${itemName}.png`
    );

    return (
      <div
        key={index}
        className="w-16 h-16 bg-[#9CA3AF] border-2 border-white/50 flex items-center justify-center relative group cursor-pointer"
        onMouseEnter={(e) => handleMouseEnter(e, item)}
        onMouseLeave={handleMouseLeave}
      >
        <img
          src={primaryUrl}
          alt={item.type}
          className="w-10 h-10 object-contain pixelated"
          onError={(e) => {
             const currentSrc = e.target.src;
             
             // CHAIN: Custom (Primary) -> Internet URL -> Mineatar -> Block Fallback
             
             // 1. If Custom failed (currentSrc includes custom_textures), try Internet URL
             if (currentSrc.includes('custom_textures')) {
                 e.target.src = internetUrl;
             }
             // 2. If Internet URL failed, try Mineatar
             else if (currentSrc.includes('mcasset') || currentSrc.includes('mcmeta')) {
                 e.target.src = `https://api.mineatar.io/item/${itemName}`;
             }
             // 3. If Mineatar failed, try Block Texture (Last Resort)
             else if (currentSrc.includes('mineatar')) {
                 e.target.src = `https://assets.mcasset.cloud/1.21.1/assets/minecraft/textures/block/${itemName}.png`;
             }
             // 4. Give up
             else {
                 e.target.style.display = "none";
             }
          }}
        />
        {item.amount > 1 && (
          <span className="absolute bottom-0 right-0 text-white text-sm font-bold drop-shadow-md px-1">
            {item.amount}
          </span>
        )}
      </div>
    );
  };

  // Helper to create a grid of N slots starting from a specific index
  const renderGrid = (items, startSlot, endSlot) => {
    const slots = [];
    for (let i = startSlot; i < endSlot; i++) {
      const item = items.find((it) => it.slot === i);
      slots.push(renderSlot(item, i));
    }
    return slots;
  };

  return (
    <div className="h-full flex flex-col p-8 relative">
      <div className="flex justify-between items-center mb-8">
        <h2 className="text-4xl font-serif text-white">Inventario</h2>
        
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
        <div className="text-center mt-20 text-gray-400">Cargando inventario...</div>
      ) : (
        <div className="flex-1 flex gap-8 overflow-hidden">
            {/* Main Content (Inventory + Ender Chest) */}
            <div className="flex-1 flex flex-col items-center gap-12 overflow-auto pr-4">
            
            {/* Top Section: Armor + Main Inventory */}
            <div className="flex gap-8">
                {/* Armor Slots (Vertical) */}
                <div className="flex flex-col gap-2 p-2 bg-[#C6C6C6] border-4 border-[#555]">
                    {[39, 38, 37, 36].map(slot => { // Helmet, Chest, Leggings, Boots
                        const item = inventory.find(it => it.slot === slot);
                        return renderSlot(item, slot);
                    })}
                    <div className="mt-2">
                        {renderSlot(inventory.find(it => it.slot === 40), 40)} {/* Offhand */}
                    </div>
                </div>

                {/* Main Inventory Grid (9x3 + 9 Hotbar) */}
                <div className="p-2 bg-[#C6C6C6] border-4 border-[#555]">
                    <div className="grid grid-cols-9 gap-1 mb-4">
                        {/* Main Inventory: Slots 9 to 35 (27 slots) */}
                        {renderGrid(inventory, 9, 36)}
                    </div>
                    <div className="grid grid-cols-9 gap-1">
                        {/* Hotbar: Slots 0 to 8 (9 slots) */}
                        {renderGrid(inventory, 0, 9)}
                    </div>
                </div>
            </div>

            {/* Ender Chest */}
            <div className="flex flex-col items-center">
                <h3 className="text-2xl font-serif text-white mb-4">Ender Chest</h3>
                <div className="p-2 bg-[#C6C6C6] border-4 border-[#555]">
                    <div className="grid grid-cols-9 gap-1">
                        {/* Ender Chest: Slots 0 to 26 (27 slots) */}
                        {renderGrid(enderChest, 0, 27)}
                    </div>
                </div>
            </div>
            </div>

            {/* Potion Effects Sidebar */}
            <div className="w-72 bg-[#C6C6C6] border-4 border-[#555] p-4 flex flex-col gap-4 overflow-auto h-fit max-h-full">
                <h3 className="text-xl font-bold text-[#3f3f3f] border-b-2 border-[#9e9e9e] pb-2 mb-2">Efectos Activos</h3>
                {potionEffects.length === 0 ? (
                    <p className="text-[#3f3f3f] italic">Sin efectos</p>
                ) : (
                    potionEffects.map((effect, i) => {
                        // Mappings for Bukkit names to Texture/Display names
                        const potionMap = {
                            'SPEED': 'speed',
                            'SLOW': 'slowness',
                            'FAST_DIGGING': 'haste',
                            'SLOW_DIGGING': 'mining_fatigue',
                            'INCREASE_DAMAGE': 'strength',
                            'HEAL': 'instant_health',
                            'HARM': 'instant_damage',
                            'JUMP': 'jump_boost',
                            'CONFUSION': 'nausea',
                            'REGENERATION': 'regeneration',
                            'DAMAGE_RESISTANCE': 'resistance',
                            'FIRE_RESISTANCE': 'fire_resistance',
                            'WATER_BREATHING': 'water_breathing',
                            'INVISIBILITY': 'invisibility',
                            'BLINDNESS': 'blindness',
                            'NIGHT_VISION': 'night_vision',
                            'HUNGER': 'hunger',
                            'WEAKNESS': 'weakness',
                            'POISON': 'poison',
                            'WITHER': 'wither',
                            'HEALTH_BOOST': 'health_boost',
                            'ABSORPTION': 'absorption',
                            'SATURATION': 'saturation',
                            'GLOWING': 'glowing',
                            'LEVITATION': 'levitation',
                            'LUCK': 'luck',
                            'UNLUCK': 'bad_luck',
                            'SLOW_FALLING': 'slow_falling',
                            'CONDUIT_POWER': 'conduit_power',
                            'DOLPHINS_GRACE': 'dolphins_grace',
                            'BAD_OMEN': 'bad_omen',
                            'HERO_OF_THE_VILLAGE': 'hero_of_the_village'
                        };

                        const standardName = potionMap[effect.type] || effect.type.toLowerCase();
                        const displayName = standardName.replace(/_/g, ' ');
                        
                        // Roman Numeral Helper
                        const toRoman = (num) => {
                            if (num < 1) return "";
                            const roman = {M:1000,CM:900,D:500,CD:400,C:100,XC:90,L:50,XL:40,X:10,IX:9,V:5,IV:4,I:1};
                            let str = '';
                            for (let i of Object.keys(roman)) {
                                let q = Math.floor(num / roman[i]);
                                num -= q * roman[i];
                                str += i.repeat(q);
                            }
                            return str;
                        };

                        const level = effect.amplifier + 1;
                        const levelRoman = toRoman(level);

                        // Duration Formatting
                        let durationText = "";
                        if (effect.duration > 32000 || effect.duration < 0) {
                            durationText = "**:**"; // Infinite
                        } else {
                            const minutes = Math.floor(effect.duration / 20 / 60);
                            const seconds = Math.floor((effect.duration / 20) % 60).toString().padStart(2, '0');
                            durationText = `${minutes}:${seconds}`;
                        }

                        const iconUrl = `https://assets.mcasset.cloud/1.21.1/assets/minecraft/textures/mob_effect/${standardName}.png`;
                        
                        return (
                            <div key={i} className="flex items-center gap-3 bg-[#8b8b8b]/20 p-2 rounded border border-[#555]">
                                <img 
                                    src={iconUrl} 
                                    alt={standardName} 
                                    className="w-8 h-8 pixelated"
                                    onError={(e) => {
                                        // Fallback to a generic potion icon if specific effect icon fails
                                        if (!e.target.src.includes('potion_bottle_drinkable')) {
                                            e.target.src = "https://assets.mcasset.cloud/1.21.1/assets/minecraft/textures/item/potion_bottle_drinkable.png";
                                        } else {
                                            e.target.style.display = 'none';
                                        }
                                    }}
                                />
                                <div>
                                    <p className="font-bold text-[#3f3f3f] capitalize">
                                        {displayName} {levelRoman}
                                    </p>
                                    <p className="text-sm text-[#3f3f3f]">
                                        {durationText}
                                    </p>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
      )}

      {/* FIXED TOOLTIP OVERLAY */}
      {hoveredItem && (
        <div 
            className="fixed z-[9999] pointer-events-none bg-[#111827] text-white text-xs p-3 rounded border-2 border-[#2C2F66] shadow-xl min-w-[150px]"
            style={{ 
                left: tooltipPos.x, 
                top: tooltipPos.y, 
                transform: 'translate(-50%, -100%) translateY(-10px)' // Center horizontally, move above cursor
            }}
        >
            <p className="font-bold text-[#31AF7C] text-sm mb-1 capitalize">{hoveredItem.type.replace(/_/g, ' ').toLowerCase()}</p>
            
            {/* Enchantments */}
            {hoveredItem.enchantments && hoveredItem.enchantments.length > 0 ? (
                <div className="mb-2 space-y-0.5">
                    {hoveredItem.enchantments.map((ench, i) => (
                        <p key={i} className="text-[#D946EF] font-medium">
                            {ench.name.replace(/minecraft:/, '').replace(/_/g, ' ')} {ench.level}
                        </p>
                    ))}
                </div>
            ) : (
                (hoveredItem.type.toLowerCase().includes('enchanted') || hoveredItem.type.toLowerCase().includes('sword') || hoveredItem.type.toLowerCase().includes('pickaxe') || hoveredItem.type.toLowerCase().includes('axe') || hoveredItem.type.toLowerCase().includes('bow')) && (
                    <p className="text-gray-500 italic mb-1">(No enchant data)</p>
                )
            )}
            
            <p className="text-gray-400">Count: {hoveredItem.amount}</p>
        </div>
      )}
    </div>
  );
}
