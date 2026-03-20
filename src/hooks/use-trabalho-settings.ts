import { useLocalStorage } from "./use-local-storage";

export interface TrabalhoSettings {
  fontFamily: string;
  marginMm: number;
}

const defaults: TrabalhoSettings = {
  fontFamily: "Times New Roman",
  marginMm: 25,
};

export const useTrabalhoSettings = () => {
  const [settings, setSettings] = useLocalStorage<TrabalhoSettings>("wame-trabalho-settings", defaults);

  const updateSettings = (partial: Partial<TrabalhoSettings>) => {
    setSettings((prev) => ({ ...prev, ...partial }));
  };

  return { settings, updateSettings };
};
