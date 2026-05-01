import { useLocalStorage } from "./use-local-storage";

export interface TrabalhoSettings {
  fontFamily: string;
  fontSize: number;       // pt
  marginMm: number;       // mm
  incluirCitacoes: boolean;
}

export const TRABALHO_DEFAULTS: TrabalhoSettings = {
  fontFamily: "Times New Roman",
  fontSize: 12,
  marginMm: 25,
  incluirCitacoes: true,
};

export const FONT_OPTIONS = [
  "Times New Roman",
  "Arial",
  "Calibri",
  "Georgia",
  "Verdana",
  "Tahoma",
  "Cambria",
  "Garamond",
];

export const useTrabalhoSettings = () => {
  const [settings, setSettings] = useLocalStorage<TrabalhoSettings>(
    "delle-trabalho-settings",
    TRABALHO_DEFAULTS,
  );

  const updateSettings = (partial: Partial<TrabalhoSettings>) => {
    setSettings((prev) => ({ ...TRABALHO_DEFAULTS, ...prev, ...partial }));
  };

  const resetSettings = () => setSettings(TRABALHO_DEFAULTS);

  return { settings: { ...TRABALHO_DEFAULTS, ...settings }, updateSettings, resetSettings };
};
