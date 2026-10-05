import React, { useEffect } from 'react';
import steelLegionBg from '../assets/images/steel_legion_title_bobble_1791062351382.jpg';
import { CombatTheater, GameSettings, VehicleModelType } from '../types/game';
import { soundEngine } from '../audio/soundEngine';

interface BootSplashScreenProps {
  onStartGame: () => void;
  onOpenSettings: () => void;
  onOpenHangar?: () => void;
  onOpenTheaters?: () => void;
  cash?: number;
  activeTheater?: CombatTheater;
  activeVehicleId?: VehicleModelType;
  settings: GameSettings;
}

export const BootSplashScreen: React.FC<BootSplashScreenProps> = ({
  onStartGame
}) => {
  useEffect(() => {
    const handleStartPress = () => {
      soundEngine.playRadioClick();
      onStartGame();
    };

    window.addEventListener('keydown', handleStartPress);
    window.addEventListener('click', handleStartPress);
    return () => {
      window.removeEventListener('keydown', handleStartPress);
      window.removeEventListener('click', handleStartPress);
    };
  }, [onStartGame]);

  return (
    <div 
      onClick={() => {
        soundEngine.playRadioClick();
        onStartGame();
      }}
      className="fixed inset-0 w-full h-[100dvh] flex flex-col justify-end items-center pb-6 bg-black overflow-hidden select-none cursor-pointer"
    >
      {/* Fullscreen Title Picture with Big Bobblehead Trump */}
      <div className="absolute inset-0 z-0">
        <img
          src={steelLegionBg}
          alt="Steel Legion Joint Command Title Screen with Big Bobblehead Trump"
          className="w-full h-full object-fill object-center"
          referrerPolicy="no-referrer"
        />
      </div>

    </div>
  );
};
