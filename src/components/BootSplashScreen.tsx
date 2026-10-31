import React, { useEffect } from 'react';
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
      {/* Fullscreen Title Key Art */}
      <div className="absolute inset-0 z-0">
        <img
          src="/art/title_key_art.png"
          alt="USA Commander title key art: chibi strike team with tank, helicopter, jet and warship"
          className="w-full h-full object-fill object-center"
          referrerPolicy="no-referrer"
        />
      </div>

    </div>
  );
};
