import React, { createContext, useContext, useState } from 'react';

// 1. The Language Map
const languages = {
  en: "English", hi: "हिन्दी", bn: "বাংলা", te: "తెలుగు", mr: "मराठी", 
  ta: "தமிழ்", gu: "ગુજરાતી", kn: "ಕನ್ನಡ", ml: "മലയാളം", pa: "ਪੰਜਾਬੀ",
  es: "Español", fr: "Français", de: "Deutsch", ja: "日本語"
};

// 2. The Dictionary (Add your app text here)
const dictionary = {
  hi: { "Menu Builder": "मेनू बिल्डर", "Search a master item": "मास्टर आइटम खोजें" },
  es: { "Menu Builder": "Constructor de menús", "Search a master item": "Buscar un artículo maestro" },
  // Add other languages following this pattern
};

const TranslationContext = createContext();

export const TranslationProvider = ({ children }) => {
  const [lang, setLang] = useState("en");
  const t = (key) => (dictionary[lang] && dictionary[lang][key]) ? dictionary[lang][key] : key;

  return (
    <TranslationContext.Provider value={{ lang, setLang, t }}>
      {children}
      {/* Floating Dropdown */}
      <select 
        value={lang} 
        onChange={(e) => setLang(e.target.value)}
        style={{ position: "fixed", bottom: 20, right: 20, zIndex: 9999, padding: "10px" }}
      >
        {Object.entries(languages).map(([code, name]) => (
          <option key={code} value={code}>{name}</option>
        ))}
      </select>
    </TranslationContext.Provider>
  );
};

export const useTranslation = () => useContext(TranslationContext);