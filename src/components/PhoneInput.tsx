import { useMemo, useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AsYouType,
  getCountries,
  getCountryCallingCode,
  isValidPhoneNumber,
  type CountryCode,
} from "libphonenumber-js";

const COUNTRY_NAMES: Partial<Record<CountryCode, string>> = {
  AO: "Angola",
  PT: "Portugal",
  BR: "Brasil",
  MZ: "Moçambique",
  CV: "Cabo Verde",
  GW: "Guiné-Bissau",
  ST: "São Tomé e Príncipe",
  TL: "Timor-Leste",
  US: "Estados Unidos",
  GB: "Reino Unido",
  FR: "França",
  ES: "Espanha",
  ZA: "África do Sul",
  NA: "Namíbia",
  CD: "RD Congo",
  CG: "Congo",
};

interface PhoneInputProps {
  value: string;
  onChange: (e164: string, isValid: boolean) => void;
  id?: string;
  className?: string;
  placeholder?: string;
}

export const PhoneInput = ({ value, onChange, id, className, placeholder }: PhoneInputProps) => {
  const [country, setCountry] = useState<CountryCode>("AO");
  const [local, setLocal] = useState("");

  // Initialize local from value if provided
  useEffect(() => {
    if (value && !local) {
      setLocal(value.replace(`+${getCountryCallingCode(country)}`, "").trim());
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const countries = useMemo(() => {
    const all = getCountries();
    const preferred: CountryCode[] = ["AO", "PT", "BR", "MZ", "CV", "GW", "ST", "TL"];
    const rest = all.filter((c) => !preferred.includes(c)).sort();
    return [...preferred, ...rest];
  }, []);

  const formatter = useMemo(() => new AsYouType(country), [country]);

  const handleLocalChange = (raw: string) => {
    formatter.reset();
    const digits = raw.replace(/[^\d]/g, "");
    const formatted = formatter.input(digits);
    setLocal(formatted);
    const e164 = `+${getCountryCallingCode(country)}${digits}`;
    onChange(e164, isValidPhoneNumber(e164, country));
  };

  const handleCountryChange = (c: string) => {
    const code = c as CountryCode;
    setCountry(code);
    const digits = local.replace(/[^\d]/g, "");
    const e164 = `+${getCountryCallingCode(code)}${digits}`;
    onChange(e164, isValidPhoneNumber(e164, code));
  };

  return (
    <div className={`flex gap-2 ${className ?? ""}`}>
      <Select value={country} onValueChange={handleCountryChange}>
        <SelectTrigger className="h-12 w-[130px] rounded-xl border-border/60 shrink-0">
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="max-h-[300px]">
          {countries.map((c) => (
            <SelectItem key={c} value={c}>
              {c} +{getCountryCallingCode(c)} {COUNTRY_NAMES[c] ? `· ${COUNTRY_NAMES[c]}` : ""}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Input
        id={id}
        type="tel"
        inputMode="tel"
        autoComplete="tel"
        placeholder={placeholder ?? "923 456 789"}
        value={local}
        onChange={(e) => handleLocalChange(e.target.value)}
        className="h-12 rounded-xl border-border/60 flex-1"
      />
    </div>
  );
};

export default PhoneInput;
