import React, { useEffect, useMemo, useRef, useState } from "react";
import "./App.css";

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || "";

const fetchJson = async (url, options = {}) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000);
  try {
    const response = await fetch(url, { ...options, signal: options.signal || controller.signal });
    const contentType = response.headers.get("content-type") || "";

    if (!contentType.includes("application/json")) {
      const text = await response.text();
      throw new Error(
        response.status === 413
          ? "Image too large to upload. Please try a smaller image."
          : `Server error (${response.status}): ${text.slice(0, 100)}`
      );
    }

    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Request failed.");
    return data;
  } finally {
    clearTimeout(timeout);
  }
};

// Master detail fields configuration layout — category removed (same as foodType)
const baseDetailFields = [
  { key: "image",          label: "Image URL",      placeholder: "Paste or choose an image URL", type: "image" },
  { key: "shortName",      label: "Short Name",     placeholder: "Short menu name" },
  { key: "description",    label: "Description",    placeholder: "Menu description" },
  { key: "menuGroup",      label: "Menu Group",     placeholder: "e.g. Veg / Non-Veg" },
  { key: "cuisine",        label: "Cuisine",        placeholder: "e.g. Indian, Chinese" },
  { key: "foodType",       label: "Food Type",      placeholder: "e.g. Vegetarian" },
  { key: "classification", label: "Classification", placeholder: "e.g. Best Seller" },
  { key: "uom",            label: "UOM",            placeholder: "e.g. Plate, Bowl" },
  { key: "prepTime",       label: "Prep Time",      placeholder: "e.g. 15 mins" },
  { key: "price",          label: "Price",          placeholder: "e.g. Rs. 249" },
  { key: "tax",            label: "Tax",            placeholder: "e.g. 5% GST / 20% VAT" },
];

function detectCategory(name) {
  const n = (name || "").toLowerCase();
  const has = (list) => list.some((k) => n.includes(k));

  // 1. Liquor (checked first — no conflict with dessert words)
  if (has(["beer","lager","ale","stout","wine","champagne","prosecco","cider","whisky","whiskey","scotch",
            "bourbon","vodka","rum","gin","tequila","brandy","cognac","liqueur","liquor",
            "spirit","cocktail","sangria","mimosa","margarita","highball","mocktail","mojito"]))
    return "liquor";

  // 2. Desserts & Sweets — MUST be checked before Beverages, since
  //    "chocolate" contains the substring "cola" and would otherwise
  //    falsely match the beverage keyword list.
  if (has(["ice cream","kulfi","kheer","halwa","gulab jamun","jalebi","rasgulla",
            "cake","pastry","fudge","dessert","brownie","मिठाई","हलवा","खीर","कुल्फी","आисक्रीम"]))
    return "dessert";

  if (has(["juice","रस","fresh juice","cold pressed"]))
    return "juice";

  if (has(["shake","milkshake","smoothie","lassi","लस्सी","tea","chai","चाय","coffee",
            "espresso","latte","cappuccino","कॉफी","soda","cola","lemonade","squash",
            "water","mineral water","milk","buttermilk","छाछ"]))
    return "beverage";

  if (has(["soup","shorba","rasam","सूप","शोरबा"]))
    return "soup";

  // 3. Rice & Bread Carbohydrate Sets
  if (has(["biryani","pulao","fried rice","khichdi","बिरयानी","पुलाव","चावल"]))
    return "rice";

  if (has(["naan","roti","paratha","kulcha","bread","puri","bhatura",
            "नान","روטی","पराठा","पूरी"]))
    return "bread";

  // 4. Wet Main Dishes
  if (has(["curry","gravy","masala","korma","handi","kadai","makhani","rara","bhuna"]))
    return "mainCourse";

  // 5. Starters & Finger Foods
  if (has(["tikka","kebab","kebob","chaat","fry","manchurian","chilli","65","pakoda",
            "pakora","samosa","spring roll","dumpling","momos","टिक्का","कबाब","चाट",
            "wing","lollipop","crispy","strip","nugget","bite","dry","popcorn"]))
    return "starter";

  if (has(["chicken","beef","pork","mutton","lamb","fish","prawn","shrimp","squid"]))
    return "starter";

  return "mainCourse";
}

const normalizeForCompare = (s) =>
  (s || "").toLowerCase().trim().replace(/\s+/g, " ");

const bigrams = (s) => {
  const arr = [];
  for (let i = 0; i < s.length - 1; i++) arr.push(s.substring(i, i + 2));
  return arr;
};

const diceSimilarity = (a, b) => {
  const biA = bigrams(a);
  const biB = bigrams(b);
  if (biA.length === 0 && biB.length === 0) return 1;
  if (biA.length === 0 || biB.length === 0) return 0;
  const counts = new Map();
  for (const bg of biA) counts.set(bg, (counts.get(bg) || 0) + 1);
  let matches = 0;
  for (const bg of biB) {
    const c = counts.get(bg) || 0;
    if (c > 0) { matches++; counts.set(bg, c - 1); }
  }
  return (2 * matches) / (biA.length + biB.length);
};

const tokenOverlap = (query, candidate) => {
  const qTokens = query.split(" ").filter(Boolean);
  const cStr    = candidate;
  if (qTokens.length === 0) return 0;
  const hits = qTokens.filter((t) => t.length >= 2 && cStr.includes(t));
  return hits.length / qTokens.length;
};

function computeConfidence(query, candidate) {
  const a = normalizeForCompare(query);
  const b = normalizeForCompare(candidate);
  if (!a || !b) return 0;
  if (a === b) return 100;
  const tokScore    = tokenOverlap(a, b);
  const containsBonus = (b.includes(a) || a.includes(b)) ? 1 : 0;
  const dice        = diceSimilarity(a, b);
  const prefixBonus = b.startsWith(a) ? 0.8
    : a.split(" ")[0].length >= 3 && b.startsWith(a.split(" ")[0]) ? 0.5 : 0;
  const raw =
    tokScore      * 0.45 +
    dice          * 0.30 +
    prefixBonus   * 0.15 +
    containsBonus * 0.10;
  return Math.round(Math.min(1, raw) * 100);
}

const getConfidenceClass = (confidence = 0) => {
  if (confidence >= 70) return "confidence-high";
  if (confidence >= 45) return "confidence-medium";
  return "confidence-low";
};

const U = (id) =>
  `https://images.unsplash.com/${id}?ixlib=rb-4.0.3&auto=format&fit=crop&w=700&q=85`;

const DISH_SETS = {
  biryani: [
    U("photo-1563379091339-03b21ab4a4f8"),
    U("photo-1596797038530-2c107229654b"),
    U("photo-1633945274405-b6c8069047b0"),
    U("photo-1589302168068-964664d93dc0"),
    U("photo-1606491956689-2ea866880c84"),
  ],
  indianCurry: [
    U("photo-1565557623262-b51c2513a641"),
    U("photo-1603894584373-5ac82b2ae398"),
    U("photo-1585937421612-70a008356fbe"),
    U("photo-1631452180519-c014fe946bc7"),
    U("photo-1546833999-b9f581a1996d"),
  ],
  paneer: [
    U("photo-1631452180519-c014fe946bc7"),
    U("photo-1565557623262-b51c2513a641"),
    U("photo-1585937421612-70a008356fbe"),
    U("photo-1603894584373-5ac82b2ae398"),
    U("photo-1546833999-b9f581a1996d"),
  ],
  dal: [
    U("photo-1546833999-b9f581a1996d"),
    U("photo-1585937421612-70a008356fbe"),
    U("photo-1565557623262-b51c2513a641"),
    U("photo-1631452180519-c014fe946bc7"),
    U("photo-1512058564366-18510be2db19"),
  ],
  kebabTikka: [
    U("photo-1599487488170-d11ec9c172f0"),
    U("photo-1567188040759-fb8a883dc6d8"),
    U("photo-1544025162-d76694265947"),
    U("photo-1604908176997-125f25cc6f3d"),
    U("photo-1598514983318-2f64f8f4796c"),
  ],
  friedRice: [
    U("photo-1512058564366-18510be2db19"),
    U("photo-1603133872878-684f208fb84b"),
    U("photo-1596797038530-2c107229654b"),
    U("photo-1547592180-85f173990554"),
    U("photo-1608897013039-887f21d8c804"),
  ],
  indoChinese: [
    U("photo-1563245372-f21724e3856d"),
    U("photo-1603133872878-684f208fb84b"),
    U("photo-1547592180-85f173990554"),
    U("photo-1569718212165-3a8278d5f624"),
    U("photo-1585032226651-759b368d7246"),
  ],
  noodles: [
    U("photo-1569718212165-3a8278d5f624"),
    U("photo-1555126634-323283e090fa"),
    U("photo-1585032226651-759b368d7246"),
    U("photo-1612929633738-8fe44f7ec841"),
    U("photo-1563245372-f21724e3856d"),
  ],
  pizza: [
    U("photo-1565299624946-b28f40a0ae38"),
    U("photo-1513104890138-7c749659a591"),
    U("photo-1574071318508-1cdbab80d002"),
    U("photo-1594007654729-407eedc4be65"),
    U("photo-1571997478779-2adcbbe9ab2f"),
  ],
  pasta: [
    U("photo-1551183053-bf91798d792e"),
    U("photo-1473093295043-cdd812d0e601"),
    U("photo-1621996346565-e3dbc646d9a9"),
    U("photo-1556761223-4c4282c73f77"),
    U("photo-1481931098730-318b6f776db0"),
  ],
  burger: [
    U("photo-1568901346375-23c9450c58cd"),
    U("photo-1550547660-d9450f859349"),
    U("photo-1571091718767-18b5b1457add"),
    U("photo-1594212699903-ec8a3eca50f5"),
    U("photo-1606755962773-d324e2e5a2aa"),
  ],
  sandwich: [
    U("photo-1528735602780-2552fd46c7af"),
    U("photo-1509722747041-616f39b57569"),
    U("photo-1553979459-d2229ba7433b"),
    U("photo-1626700051175-6818013e1d4f"),
    U("photo-1481070414801-51fd732d7184"),
  ],
  southIndian: [
    U("photo-1630383249896-424e482df921"),
    U("photo-1668236543090-82eba5ee5976"),
    U("photo-1589301760014-d929f3979dbc"),
    U("photo-1589302168068-964664d93dc0"),
    U("photo-1601050690597-df056fb4ce78"),
  ],
  bread: [
    U("photo-1534422298391-e4f8c172dddb"),
    U("photo-1608686207856-001b95cf60ca"),
    U("photo-1579912437714-a57751c39469"),
    U("photo-1585478259715-876acc5be8eb"),
    U("photo-1509440159596-0249088772ff"),
  ],
  chaat: [
    U("photo-1601050690597-df056fb4ce78"),
    U("photo-1567337710282-00832b415979"),
    U("photo-1606491956689-2ea866880c84"),
    U("photo-1604908176997-125f25cc6f3d"),
    U("photo-1603133872878-684f208fb84b"),
  ],
  salad: [
    U("photo-1512621776951-a57141f2eefd"),
    U("photo-1540420773420-3366772f4999"),
    U("photo-1546069901-ba9599a7e63c"),
    U("photo-1515516969-d4008cc6241a"),
    U("photo-1607532941433-304659e8198a"),
  ],
  soup: [
    U("photo-1547592166-23ac45744acd"),
    U("photo-1476718406336-bb5a9690ee2a"),
    U("photo-1603105037880-880cd4edfb0d"),
    U("photo-1541832676-9b763b0239ab"),
    U("photo-1607532941433-304659e8198a"),
  ],
  seafood: [
    U("photo-1565680018434-b513d5e5fd47"),
    U("photo-1559737558-2f5a35f4523b"),
    U("photo-1519708227418-c8fd9a32b7a2"),
    U("photo-1467003909585-2f8a72700288"),
    U("photo-1579631542720-3a87824fff86"),
  ],
  indianSweet: [
    U("photo-1571506165871-ee72a35bc9d4"),
    U("photo-1605197223202-29456024c18d"),
    U("photo-1578985545062-69928b1d9587"),
    U("photo-1563729784474-d77dbb933a9e"),
    U("photo-1587314168485-3236d6710814"),
  ],
  iceCream: [
    U("photo-1563805042-7684c019e1cb"),
    U("photo-1501443762994-82bd5dace89a"),
    U("photo-1488900128323-21503983a07e"),
    U("photo-1560008581-09826d1de69e"),
    U("photo-1551024601-bec78aea704b"),
  ],
  dessert: [
    U("photo-1551024601-bec78aea704b"),
    U("photo-1565958011703-44f9829ba187"),
    U("photo-1464349095431-e9a21285b5f3"),
    U("photo-1578985545062-69928b1d9587"),
    U("photo-1576618148400-f54bed99fcfd"),
  ],
  juice: [
    U("photo-1613478223719-2ab802602423"),
    U("photo-1621506289937-a8e4df240d0b"),
    U("photo-1600271886742-f049cd451bba"),
    U("photo-1553530666-0c8e5c4f0e2a"),
    U("photo-1610970881699-44a55b4cfd87"),
  ],
  milkshake: [
    U("photo-1461023058943-07fcbe16d735"),
    U("photo-1553530666-0c8e5c4f0e2a"),
    U("photo-1571934811356-5cc061b6d807"),
    U("photo-1544787219-7f47ccb76574"),
    U("photo-1613478223719-2ab802602423"),
  ],
  hotBeverage: [
    U("photo-1509042239860-f550ce710b93"),
    U("photo-1495474472287-4d71bcdd2085"),
    U("photo-1544787219-7f47ccb76574"),
    U("photo-1514432324607-a09d9b4aefdd"),
    U("photo-1541167760496-1628856ab772"),
  ],
  coldCoffee: [
    U("photo-1461023058943-07fcbe16d735"),
    U("photo-1509042239860-f550ce710b93"),
    U("photo-1495474472287-4d71bcdd2085"),
    U("photo-1498804103079-a6351b050096"),
    U("photo-1541167760496-1628856ab772"),
  ],
  cocktail: [
    U("photo-1514362545857-3bc16c4c7d1b"),
    U("photo-1551538827-9c037cb4f32a"),
    U("photo-1470337458703-46ad1756a187"),
    U("photo-1587308831823-b1b7bfa0a8c0"),
    U("photo-1574096079513-d8259312b7a3"),
  ],
  beer: [
    U("photo-1608270586620-248524c67de9"),
    U("photo-1532634922-8fe0b757fb13"),
    U("photo-1566633806327-68e152aaf26d"),
    U("photo-1571613316887-6f8d5cbf7ef7"),
    U("photo-1584225065152-4a1454aa3d4e"),
  ],
  wine: [
    U("photo-1510812431401-41d2bd2722f3"),
    U("photo-1506377247377-2a5b3b417ebb"),
    U("photo-1553361371-9b22f78e8b1d"),
    U("photo-1578911373434-0cb395d2cbfb"),
    U("photo-1528823872057-9c018a7a72b5"),
  ],
  spirits: [
    U("photo-1527281400683-1aae777175f8"),
    U("photo-1551538827-9c037cb4f32a"),
    U("photo-1510812431401-41d2bd2722f3"),
    U("photo-1470337458703-46ad1756a187"),
    U("photo-1574096079513-d8259312b7a3"),
  ],
  premiumPlated: [
    U("photo-1544025162-d76694265947"),
    U("photo-1498837167922-ddd27525d352"),
    U("photo-1476224203421-9ac39bcb3327"),
    U("photo-1484723091739-30a097e8f929"),
    U("photo-1473093295043-cdd812d0e601"),
  ],
};

const MATCH_RULES = [
  { key: "indianCurry",  terms: ["butter chicken","chicken tikka masala","makhani","rogan josh","korma","kadai","handi","bhuna","kofta","saag chicken","murgh"] },
  { key: "paneer",       terms: ["paneer","shahi paneer","palak paneer","kadai paneer","matar paneer","paneer tikka","cottage cheese","पनीर"] },
  { key: "dal",          terms: ["dal makhani","dal tadka","dal fry","daal","rajma","chole","chana masala","पनीर","दाल","छोले","lentil"] },
  { key: "biryani",      terms: ["biryani","dum biryani","hyderabadi","awadhi","lucknowi","बिरयानी"] },
  { key: "friedRice",    terms: ["fried rice","pulao","pilaf","khichdi","tahri","पुलाव","चावल"] },
  { key: "kebabTikka",   terms: ["tikka","seekh","galouti","boti","reshmi","hariyali","malai kebab","afghani","tangdi","टिक्का","कबाब","tandoori chicken","tandoori fish","tandoori","तंदूरी"] },
  { key: "indoChinese",  terms: ["manchurian","chilli chicken","chilli paneer","chilli fish","chilli prawn","schezwan","spring roll","momos","dimsums","dumplings","मंचूरियन"] },
  { key: "noodles",      terms: ["noodle","hakka","chow mein","chowmein","ramen","thukpa","soba","udon","lo mein","नूडल्स"] },
  { key: "southIndian",  terms: ["dosa","masala dosa","idli","uttapam","vada","medu","appam","puttu","rasam","sambar","डोसा","इडली"] },
  { key: "pizza",        terms: ["pizza","margherita","pepperoni","quattro","पिज्जा"] },
  { key: "pasta",        terms: ["pasta","spaghetti","penne","fettuccine","rigatoni","alfredo","arrabbiata","carbonara","lasagna","पास्ता"] },
  { key: "burger",       terms: ["burger","slider","whopper","zinger","बर्गर"] },
  { key: "sandwich",     terms: ["sandwich","sub","wrap","frankie","kathi roll","roll","toast","grilled sandwich","club sandwich","सैंडविच"] },
  { key: "chaat",        terms: ["pani puri","bhel puri","dahi puri","papdi chaat","aloo tikki","ragda","chaat","sev puri","samosa chaat","पानी पूरी","भेल","चाट","समोसा"] },
  { key: "bread",        terms: ["naan","butter naan","garlic naan","roti","phulka","paratha","aloo paratha","kulcha","puri","bhatura","lachha","missi roti","नान","रोटी","पराठा","पूरी"] },
  { key: "soup",         terms: ["soup","shorba","broth","rasam","congee","सूप","शोरबा"] },
  { key: "salad",        terms: ["salad","caesar","greens","coleslaw","raita","सलाद"] },
  { key: "indianSweet",  terms: ["gulab jamun","jalebi","rasgulla","rasmalai","kheer","halwa","kulfi","barfi","ladoo","pedha","mithai","गुलाब जामुन","जलेबी","खीर","हलवा","कुल्फी"] },
  { key: "iceCream",     terms: ["ice cream","sundae","gelato","kulfi","आइसक्रीम"] },
  { key: "dessert",      terms: ["cake","pastry","brownie","cheesecake","mousse","tiramisu","waffle","pancake","dessert","मिठाई"] },
  { key: "milkshake",    terms: ["milkshake","shake","smoothie","lassi","mango lassi","faluda","cold lassi","लस्सी"] },
  { key: "juice",        terms: ["juice","fresh juice","cold press","nimbu pani","lemonade","aam panna","जूस","रस"] },
  { key: "coldCoffee",   terms: ["cold coffee","iced coffee","frappe","frappuccino","cold brew","iced latte"] },
  { key: "hotBeverage",  terms: ["coffee","espresso","latte","cappuccino","americano","mocha","tea","chai","masala chai","green tea","herbal","कॉफी","चाय","लट्टे"] },
  { key: "cocktail",     terms: ["cocktail","mocktail","mojito","margarita","sangria","daiquiri","piña colada","gin tonic","कॉकटेल","मॉकटेल"] },
  { key: "beer",         terms: ["beer","lager","ale","stout","porter","cider","बियर"] },
  { key: "wine",         terms: ["wine","champagne","prosecco","rosé","cabernet","merlot","वाइन","शैम्पेน"] },
  { key: "spirits",      terms: ["whisky","whiskey","scotch","bourbon","vodka","rum","gin","tequila","brandy","cognac","liqueur","व्हिस्की","वोदका"] },
  { key: "indianCurry",  terms: ["curry","gravy","masala","korma","makhani","keema","करी","मसाला","ग्रेवी"] },
  { key: "kebabTikka",   terms: ["chicken","mutton","lamb","beef","pork","gosht","meat","grill","चिकन","मटन"] },
  { key: "seafood",      terms: ["fish","prawn","shrimp","crab","lobster","squid","calamari","pomfret","surmai","rawas","seafood","मछلى","झींगा"] },
];

const CATEGORY_SET = {
  liquor:     "spirits",
  juice:      "juice",
  beverage:   "hotBeverage",
  soup:       "soup",
  dessert:    "dessert",
  rice:       "biryani",
  bread:      "bread",
  starter:    "kebabTikka",
  mainCourse: "indianCurry",
};

const STATIC_FALLBACK_IMAGES = DISH_SETS.premiumPlated;

async function searchDishImages(dishName) {
  const lower = dishName.toLowerCase().trim();
  let bestKey = null;
  let bestScore = 0;

  for (const rule of MATCH_RULES) {
    for (const term of rule.terms) {
      if (lower.includes(term) || term.includes(lower)) {
        const score = term.length + (lower === term ? 50 : 0);
        if (score > bestScore) {
          bestScore = score;
          bestKey = rule.key;
        }
      }
    }
  }

  if (bestKey && DISH_SETS[bestKey]) return DISH_SETS[bestKey];
  const cat = detectCategory(dishName);
  const catKey = CATEGORY_SET[cat] || "premiumPlated";
  return DISH_SETS[catKey] || DISH_SETS.premiumPlated;
}

function buildShortNames(dishName) {
  const words   = dishName.split(/[\s\-_]+/).filter(Boolean);
  const acronym = words.length > 1
    ? words.map((w) => w[0]).join("").toUpperCase()
    : dishName.slice(0, 3).toUpperCase();
  
  // Create 5 fully unique variations instead of repeating the base name at the end
  return [
    dishName,
    words.slice(0, 2).join(" "),
    words[0] || dishName,
    acronym,
    words.length > 1 ? `${words[0]} ${words[1]?.slice(0,3) || ""}.` : dishName.slice(0, 6).toUpperCase()
  ].slice(0, 5);
}

function FieldCard({ field, value, suggestions, loadingField, onChange, onChoose }) {
  const isImage    = field.type === "image";
  const displayValue = typeof value === "string" ? value : "";
  const fileInputRef = useRef(null);

  const handleUploadClick = (e) => {
    e.preventDefault();
    fileInputRef.current?.click();
  };

  const handleFileChange = (e) => {
  const file = e.target.files && e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (event) => {
    const img = new Image();
    img.onload = () => {
      const MAX_DIM = 800;
      let { width, height } = img;
      if (width > height && width > MAX_DIM) {
        height = Math.round((height * MAX_DIM) / width);
        width = MAX_DIM;
      } else if (height > MAX_DIM) {
        width = Math.round((width * MAX_DIM) / height);
        height = MAX_DIM;
      }

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0, width, height);

      const compressedDataUrl = canvas.toDataURL("image/jpeg", 0.7);
      onChange(field.key, compressedDataUrl);
    };
    img.src = event.target.result;
  };
  reader.readAsDataURL(file);
  e.target.value = "";
};

  return (
    <div className={`field-card ${displayValue ? "field-card--filled" : ""}`}>
      <div className="field-card__header">
        <span className="field-card__label">{field.label}</span>
        {displayValue && <span className="field-card__check">✓ Verified</span>}
      </div>

      <div className="field-card__input-wrap">
        <input
          type="text"
          className="field-card__input"
          placeholder={field.placeholder}
          value={displayValue}
          onChange={(e) => onChange(field.key, e.target.value)}
        />
        {loadingField && <span className="field-spinner" />}
      </div>

      <div className="field-card__chips">
        {loadingField ? (
          <span className="chip chip--skeleton" />
        ) : (
          <>
            {suggestions && suggestions.length > 0 ? (
              suggestions.map((s, idx) => {
                const chipStr  = typeof s === "string" ? s : "";
                const isSelected = displayValue === chipStr;
                return (
                  <button
  key={`${field.key}-chip-${idx}`}
  type="button"
  className={`chip ${isSelected ? "chip--active" : ""}`}
  onClick={(e) => { e.preventDefault(); onChoose(field.key, chipStr); }}
  style={isImage ? {
    padding: "2px",
    width: "85px",
    height: "60px",
    overflow: "hidden",
    background: "#e2e8f0",
    border: isSelected ? "2px solid var(--accent)" : "1px solid var(--border)",
  } : field.key === "description" ? {
    whiteSpace: "normal",
    overflow: "visible",
    textOverflow: "unset",
    height: "auto",
    maxWidth: "100%",
    textAlign: "left",
    lineHeight: "1.4",
    padding: "8px 10px",
  } : {}}
>
                    {isImage ? (
                      <span style={{ width: "100%", height: "100%", display: "block" }}>
                        <img
                          src={chipStr}
                          alt="Option"
                          style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "4px" }}
                          onError={(e) => {
                            e.target.onerror = null;
                            e.target.src = STATIC_FALLBACK_IMAGES[idx] || STATIC_FALLBACK_IMAGES[0];
                            if (isSelected) onChange(field.key, STATIC_FALLBACK_IMAGES[idx] || STATIC_FALLBACK_IMAGES[0]);
                          }}
                        />
                      </span>
                    ) : chipStr}
                  </button>
                );
              })
            ) : (
              !isImage && <span className="chip chip--empty">No variations available</span>
            )}

            {isImage && (
              <>
                <button
                  type="button"
                  className="chip chip--upload"
                  onClick={handleUploadClick}
                  title="Upload your own image"
                  style={{
                    padding: "2px",
                    width: "85px",
                    height: "60px",
                    overflow: "hidden",
                    background: "#e2e8f0",
                    border: "1px dashed var(--border)",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: "pointer",
                  }}
                >
                  <span style={{ fontSize: "18px", lineHeight: 1 }}>📤</span>
                  <span style={{ fontSize: "10px", marginTop: "2px" }}>Upload</span>
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  style={{ display: "none" }}
                  onChange={handleFileChange}
                />
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function ProfessionalMenuView({ acceptedItems, onEditItem, onRemoveItem }) {
  const [selectedGroup, setSelectedGroup] = useState("All");

  const menuGroups = useMemo(() => {
    const groups = new Set(["All"]);
    acceptedItems.forEach((item) => {
      if (item.menuGroup) groups.add(item.menuGroup);
    });
    return Array.from(groups);
  }, [acceptedItems]);

  const filteredItems = useMemo(() => {
    if (selectedGroup === "All") return acceptedItems;
    return acceptedItems.filter(
      (item) => (item.menuGroup || "").toLowerCase() === selectedGroup.toLowerCase()
    );
  }, [acceptedItems, selectedGroup]);

  const categorizedItems = useMemo(() => {
    const groups = {};
    filteredItems.forEach((item) => {
      const cat = item.category || "General Selection";
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(item);
    });
    return groups;
  }, [filteredItems]);

  if (acceptedItems.length === 0) {
    return (
      <div className="professional-menu-empty-state">
        <div className="empty-state-card">
          <span className="empty-icon">🍽️</span>
          <h2>Your Menu is Empty</h2>
          <p>You haven't accepted or verified any dish profiles yet. Search for dishes, complete their specifications, and click "Accept & Save" to populate your digital catalog.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="professional-menu-layout">
      <div className="menu-header-banner">
        <span className="menu-eyebrow">House Specialties</span>
        <h2 className="menu-title">Digital Restaurant Menu</h2>
        <div className="menu-divider"></div>
      </div>

      {menuGroups.length > 1 && (
        <div className="menu-filter-bar">
          {menuGroups.map((group) => (
            <button
              key={group}
              className={`menu-filter-btn ${selectedGroup === group ? "menu-filter-btn--active" : ""}`}
              onClick={() => setSelectedGroup(group)}
            >
              {group}
            </button>
          ))}
        </div>
      )}

      {Object.keys(categorizedItems).map((category) => (
        <div key={category} className="menu-category-section" style={{ marginBottom: "48px" }}>
          <div className="category-header-wrap" style={{ display: "flex", alignItems: "center", gap: "20px", margin: "32px 0 20px 0" }}>
            <h3 className="category-section-title" style={{ fontFamily: "var(--font-display)", fontSize: "26px", fontWeight: "400", color: "var(--text)", textTransform: "capitalize", letterSpacing: "0.02em" }}>
              {category}
            </h3>
            <div style={{ flex: 1, height: "1px", background: "var(--border)", opacity: 0.8 }}></div>
          </div>

          <div className="professional-menu-grid">
            {categorizedItems[category].map((item, idx) => (
              <div key={item.id || idx} className="professional-menu-card">
                <div className="menu-card__image-wrap">
                  <img
                    src={item.image || STATIC_FALLBACK_IMAGES[0]}
                    alt={item.shortName}
                    onError={(e) => { e.target.src = STATIC_FALLBACK_IMAGES[0]; }}
                  />
                  {item.classification && (
                    <span className="menu-card__tag">{item.classification}</span>
                  )}
                  
                  <div className="menu-card__actions-overlay">
                    <button 
                      className="card-action-btn card-action-btn--edit"
                      onClick={() => onEditItem(item)}
                      title="Modify this dish specification"
                    >
                      ✏️ Edit
                    </button>
                    <button 
                      className="card-action-btn card-action-btn--delete"
                      onClick={() => onRemoveItem(item.id || idx)}
                      title="Remove from dynamic menu"
                    >
                      🗑️ Delete
                    </button>
                  </div>
                </div>
                <div className="menu-card__body">
                  <div className="menu-card__row">
                    <h3 className="menu-card__name">{item._originName || item.shortName}</h3>
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
                      <span className="menu-card__price">{item.price}</span>
                      {item.tax && <span style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "2px" }}>+ {item.tax} Tax</span>}
                    </div>
                  </div>
                  <p className="menu-card__desc">{item.description}</p>
                  <div className="menu-card__footer">
                    <span className="menu-tag-item">🏷️ {item.category}</span>
                    <span className="menu-tag-item">⏱️ {item.prepTime}</span>
                    <span className="menu-tag-item">📦 {item.uom}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function App() {
  const [activeView, setActiveView]             = useState("builder");
  const [acceptedItems, setAcceptedItems]       = useState([]);
  const [dishName, setDishName]                 = useState("");
  const [dishSuggestions, setDishSuggestions]   = useState([]);
  const [selectedDish, setSelectedDish]         = useState(null);
  const [details, setDetails]                   = useState({});
  const [fieldSuggestions, setFieldSuggestions] = useState({});
  const [loadingDish, setLoadingDish]           = useState(false);
  const [loadingDetails, setLoadingDetails]     = useState(false);
  const [error, setError]                       = useState("");
  const [decisionMessage, setDecisionMessage]   = useState({ text: "", type: "" });
  const [editingId, setEditingId]               = useState(null);
  const dropdownRef                             = useRef(null);

  // Dynamic Category Extraction — derived from dish name (category card removed)
  const currentCategory = useMemo(() => {
    return selectedDish ? detectCategory(selectedDish.dishName) : "mainCourse";
  }, [selectedDish]);

  // All fields shown for all categories including liquor
  const activeDetailFields = useMemo(() => baseDetailFields, []);

  const completedCount = useMemo(
    () => activeDetailFields.filter((f) => String(details[f.key] || "").trim()).length,
    [details, activeDetailFields]
  );
  const canDecide = selectedDish && completedCount === activeDetailFields.length;
  const progress  = (completedCount / activeDetailFields.length) * 100;

  useEffect(() => {
    if (!dishName.trim() || dishName.trim().length < 2) { setDishSuggestions([]); return; }
    if (selectedDish && selectedDish.dishName === dishName) return;

    const controller = new AbortController();
    const fetch_ = async () => {
      setLoadingDish(true); setError("");
      try {
        const data = await fetchJson(
          `${API_BASE_URL}/search?q=${encodeURIComponent(dishName.trim())}`,
          { signal: controller.signal }
        );
        const sorted = (data || []).sort(
          (a, b) => computeConfidence(dishName, b.dishName) - computeConfidence(dishName, a.dishName)
        );
        setDishSuggestions(sorted);
      } catch (e) {
        if (e.name !== "AbortError") { setError("Connection sync dropped."); setDishSuggestions([]); }
      } finally { setLoadingDish(false); }
    };
    const t = setTimeout(fetch_, 400);
    return () => { clearTimeout(t); controller.abort(); };
  }, [dishName, selectedDish]);

  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target))
        setDishSuggestions([]);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // --- TRANSLATION AND GENERIC CHIP GENERATOR MAPPING FOR MULTILINGUAL FIELDS ---
  const generateDynamicSuggestions = async (name) => {
    const detectedCat = detectCategory(name);
    const imageChips = await searchDishImages(name);
    const shortNames = buildShortNames(name);

    // Dynamic localization mapping helper by detecting the alphabet used in input name
    let isHindi = /[\u0900-\u097F]/.test(name);
    let isBengali = /[\u0980-\u09FF]/.test(name);
    let isTamil = /[\u0B80-\u0BFF]/.test(name);
    let isTelugu = /[\u0C00-\u0C7F]/.test(name);

    let labels = {
      chilled: "served chilled", mins: "mins", min: "min", instant: "Instant",
      veg: "Vegetarian", nonVeg: "Non-Vegetarian", premium: "Premium", classic: "Classic",
      bestSeller: "Best Seller", special: "Chef's Special", plate: "Plate", cup: "Cup", bowl: "Bowl"
    };

    if (isHindi) {
      labels = {
        chilled: "ठंडा परोसा गया", mins: "मिनट", min: "मिनट", instant: "तुरंत",
        veg: "शाकाहारी (Veg)", nonVeg: "मांसाहारी (Non-Veg)", premium: "प्रीमियम", classic: "क्लासिक",
        bestSeller: "सबसे ज्यादा बिकने वाला", special: "शेफ का विशेष", plate: "प्लेट", cup: "कप", bowl: "कटोरी"
      };
    } else if (isBengali) {
      labels = {
        chilled: "ঠান্ডা পরিবেশন করা হয়", mins: "মিনিট", min: "মিনিট", instant: "তাৎক্ষণিক",
        veg: "নিরামিষ (Veg)", nonVeg: "আমিষ (Non-Veg)", premium: "প্রিমিয়াম", classic: "ক্লাসিক",
        bestSeller: "সেরা বিক্রেতা", special: "শেফের বিশেষ", plate: "প্লেট", cup: "কাপ", bowl: "বাটি"
      };
    } else if (isTamil) {
      labels = {
        chilled: "குளிர்ந்த நிலையில்", mins: "நிமிடங்கள்", min: "நிமிடம்", instant: "உடனடி",
        veg: "சைவம் (Veg)", nonVeg: "அசைவம் (Non-Veg)", premium: "பிரிமியம்", classic: "கிளாசிக்",
        bestSeller: "பிரபலமான தேர்வு", special: "செஃப் ஸ்பெஷல்", plate: "பிளேட்", cup: "கப்", bowl: "பவுல்"
      };
    } else if (isTelugu) {
      labels = {
        chilled: "చల్లగా వడ్డించబడుతుంది", mins: "నిమిషాలు", min: "నిమిషం", instant: "తక్షణమే",
        veg: "శాకాహారం (Veg)", nonVeg: "మాంసాహారం (Non-Veg)", premium: "ప్రీమియం", classic: "క్లాసిక్",
        bestSeller: "బెస్ట్ సెల్లర్", special: "షెఫ్ స్పెషల్", plate: "ప్లేట్", cup: "కప్పు", bowl: "గిన్నె"
      };
    }

    // Dynamic, distinct taxonomies based on contextual categories translated accordingly
    if (detectedCat === "liquor") {
      return {
        image:          imageChips.slice(0, 5),
        shortName:      shortNames,
        description:    [`${labels.premium} ${name} ${labels.chilled}.`, `${name}.`, `${labels.classic} ${name}.`, `${labels.special} ${name}.`, `${name}`],
        menuGroup:      ["Bar Menu", "Liquor", "Spirits", "Premium Bar", "Cocktails"],
        cuisine:        ["International", "Continental", "American", "European", "British"],
        foodType:       [labels.nonVeg, "Alcoholic", "Spirits", "Beer & Wine", "Cocktail"],
        classification: ["Premium Blend", "Signature Select", "Top Shelf", "House Special", "New Arrival"],
        uom:            ["Peg (30ml)", "Large Peg (60ml)", labels.cup, "Bottle", "Pint"],
        prepTime:       [labels.instant, `1 ${labels.min}`, `2 ${labels.mins}`, `3 ${labels.mins}`, `5 ${labels.mins}`],
        price:          ["Rs. 350", "Rs. 450", "Rs. 550", "Rs. 250", "Rs. 650"],
        tax:            ["20% VAT", "22% VAT", "25% VAT", "28% VAT", "30% VAT"],
      };
    } else if (detectedCat === "dessert") {
      return {
        image:          imageChips.slice(0, 5),
        shortName:      shortNames,
        description:    [`${labels.chilled} ${name}.`, `${labels.premium} ${name}.`, `${labels.classic} ${name}.`, `${labels.special} ${name}.`, `${name}.`],
        menuGroup:      ["Desserts", "Sweets", "Ice Cream Parlour", "Confectionery", "After Dinner"],
        cuisine:        ["Desserts", "Continental", "Indian Sweet", "Italian", "Fusion Sweet"],
        foodType:       [labels.veg, "Eggless", "Contains Egg", "Dairy Dessert", "Vegan Option"],
        classification: ["Sweet Treat", labels.special, "Kids Favourite", "Must Try Dessert", labels.bestSeller],
        uom:            ["Scoop", "Double Scoop", labels.cup, labels.bowl, "Portion"],
        prepTime:       [labels.instant, `2 ${labels.mins}`, `3 ${labels.mins}`, `5 ${labels.mins}`, `7 ${labels.mins}`],
        price:          ["Rs. 99", "Rs. 149", "Rs. 189", "Rs. 79", "Rs. 229"],
        tax:            ["5% GST", "12% GST", "18% GST", "0% TAX", "14% GST"],
      };
    } else if (detectedCat === "juice" || detectedCat === "beverage") {
      return {
        image:          imageChips.slice(0, 5),
        shortName:      shortNames,
        description:    [`${name}.`, `${labels.chilled} ${name}.`, `${labels.classic} ${name}.`, `${labels.special} ${name}.`, `${labels.premium} ${name}.`],
        menuGroup:      ["Beverages", "Cold Drinks", "Hot Drinks", "Healthy Shakes", "Mocktails"],
        cuisine:        ["Beverages", "Continental", "Fusion Drinks", "Healthy", "International"],
        foodType:       [labels.veg, "Vegan", "Dairy Drink", "Non-Alcoholic", "Fresh Brew"],
        classification: [labels.bestSeller, "Freshly Squeezed", "Healthy Choice", "Refreshing Drink", "House Special"],
        uom:            ["Glass (300ml)", "Large Glass (500ml)", labels.cup, "Mug", "Bottle"],
        prepTime:       [`3 ${labels.mins}`, `5 ${labels.mins}`, `7 ${labels.mins}`, `10 ${labels.mins}`, labels.instant],
        price:          ["Rs. 99", "Rs. 149", "Rs. 79", "Rs. 129", "Rs. 199"],
        tax:            ["5% GST", "12% GST", "18% GST", "0% TAX", "14% GST"],
      };
    } else if (detectedCat === "starter") {
      return {
        image:          imageChips.slice(0, 5),
        shortName:      shortNames,
        description:    [`${labels.classic} ${name}.`, `${labels.premium} ${name}.`, `${labels.special} ${name}.`, `${name}.`, `${labels.bestSeller} ${name}.`],
        menuGroup:      ["Starters", "Appetizers", "Quick Bites", "Tandoor Grills", "Bar Snacks"],
        cuisine:        ["Indian Platter", "Indo-Chinese", "Continental Starter", "Mughlai Appetizer", "Asian Fusion"],
        foodType:       [labels.veg, labels.nonVeg, "Egg", "Vegan Capable", "Halal"],
        classification: [labels.bestSeller, labels.special, "Perfect Companion", "Signature Starter", "Trending Bite"],
        uom:            [labels.plate, "Portion", "Half Plate", "Full (6 Pcs)", "Large (10 Pcs)"],
        prepTime:       [`10 ${labels.mins}`, `12 ${labels.mins}`, `15 ${labels.mins}`, `18 ${labels.mins}`, `20 ${labels.mins}`],
        price:          ["Rs. 199", "Rs. 249", "Rs. 299", "Rs. 149", "Rs. 349"],
        tax:            ["5% GST", "12% GST", "18% GST", "0% TAX", "14% GST"],
      };
    } else {
      // General Mains, Rice, and Breads
      return {
        image:          imageChips.slice(0, 5),
        shortName:      shortNames,
        description:    [`${labels.premium} ${name}.`, `${labels.classic} ${name}.`, `${name}.`, `${labels.special} ${name}.`, `${labels.bestSeller} ${name}.`],
        menuGroup:      ["Main Course", "Rice & Biryani", "Indian Breads", "Veg Main Course", "Non-Veg Main Course"],
        cuisine:        ["North Indian", "Mughlai", "South Indian", "Punjabi", "Hyderabadi"],
        foodType:       [labels.veg, labels.nonVeg, "Vegan", "Eggetarian", "Jain Menu"],
        classification: [labels.bestSeller, labels.special, "Must Try Dish", "Signature Entry", "Classic Entrée"],
        uom:            [labels.plate, labels.bowl, "Full Serving", "Serves 2", "Single Piece"],
        prepTime:       [`15 ${labels.mins}`, `20 ${labels.mins}`, `25 ${labels.mins}`, `30 ${labels.mins}`, `35 ${labels.mins}`],
        price:          ["Rs. 249", "Rs. 299", "Rs. 199", "Rs. 349", "Rs. 179"],
        tax:            ["5% GST", "12% GST", "18% GST", "0% TAX", "14% GST"],
      };
    }
  };

  const handleDishClick = async (dish) => {
    setSelectedDish(dish);
    setDishName(dish.dishName);
    setDishSuggestions([]);
    setDetails({});
    setFieldSuggestions({});
    setDecisionMessage({ text: "", type: "" });
    setError("");
    setLoadingDetails(true);
    setEditingId(null);

    try {
      const response = await fetch(`${API_BASE_URL}/suggest-all`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dishName: dish.dishName }),
      });

      let aiSuggestions = {};
      let isLiquor = detectCategory(dish.dishName) === "liquor";

      if (response.ok) {
        const ai = await response.json();
        aiSuggestions = ai.suggestions || {};
        if (ai.isLiquor === true) isLiquor = true;
      }

      const fallbackSet = await generateDynamicSuggestions(dish.dishName);

      const dynamicSuggestions = {
        image:          (aiSuggestions.image && aiSuggestions.image.length === 5) ? aiSuggestions.image : fallbackSet.image,
        shortName:      (aiSuggestions.shortName && aiSuggestions.shortName.length === 5) ? aiSuggestions.shortName : fallbackSet.shortName,
        description:    (aiSuggestions.description && aiSuggestions.description.length === 5) ? aiSuggestions.description : fallbackSet.description,
        menuGroup:      (aiSuggestions.menuGroup && aiSuggestions.menuGroup.length === 5) ? aiSuggestions.menuGroup : fallbackSet.menuGroup,
        cuisine:        (aiSuggestions.cuisine && aiSuggestions.cuisine.length === 5) ? aiSuggestions.cuisine : fallbackSet.cuisine,
        foodType:       (aiSuggestions.foodType && aiSuggestions.foodType.length === 5) ? aiSuggestions.foodType : fallbackSet.foodType,
        classification: (aiSuggestions.classification && aiSuggestions.classification.length === 5) ? aiSuggestions.classification : fallbackSet.classification,
        uom:            (aiSuggestions.uom && aiSuggestions.uom.length === 5) ? aiSuggestions.uom : fallbackSet.uom,
        prepTime:       (aiSuggestions.prepTime && aiSuggestions.prepTime.length === 5) ? aiSuggestions.prepTime : fallbackSet.prepTime,
        price:          (aiSuggestions.price && aiSuggestions.price.length === 5) ? aiSuggestions.price : fallbackSet.price,
        tax:            isLiquor ? ["20% VAT", "22% VAT", "25% VAT", "28% VAT", "30% VAT"] : fallbackSet.tax,
      };

      const baseDetails = {
        image:          dynamicSuggestions.image[0]          || "",
        shortName:      dynamicSuggestions.shortName[0]      || "",
        description:    dynamicSuggestions.description[0]    || "",
        menuGroup:      dynamicSuggestions.menuGroup[0]      || "",
        cuisine:        dynamicSuggestions.cuisine[0]        || "",
        foodType:       dynamicSuggestions.foodType[0]       || "",
        classification: dynamicSuggestions.classification[0] || "",
        uom:            dynamicSuggestions.uom[0]            || "",
        prepTime:       dynamicSuggestions.prepTime[0]       || "",
        price:          dynamicSuggestions.price[0]          || "",
        tax:            dynamicSuggestions.tax[0],
      };

      setDetails(baseDetails);
      setFieldSuggestions(dynamicSuggestions);
    } catch (err) {
      setError("AI framework synching layer missed. Recovering context suggestions.");
    } finally {
      setLoadingDetails(false);
    }
  };

  const updateDetail = (fieldKey, value) => {
    setDetails((prev) => ({ ...prev, [fieldKey]: value }));
    setDecisionMessage({ text: "", type: "" });
  };

  const chooseChip = (fieldKey, value) => updateDetail(fieldKey, value);

  const submitDecision = async (decision) => {
    if (!selectedDish) return;
    setError("");
    try {
      await fetchJson(`${API_BASE_URL}/decision`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decision, dishName: selectedDish.dishName, details }),
      });
      
      if (decision === "accepted") {
        if (editingId !== null) {
          setAcceptedItems((prev) =>
            prev.map((item) => (item.id === editingId ? { ...details, id: editingId, _originName: selectedDish.dishName } : item))
          );
        } else {
          const newItemId = Date.now();
          setAcceptedItems((prev) => [...prev, { ...details, id: newItemId, _originName: selectedDish.dishName }]);
        }
      }

      setDecisionMessage({
        text: decision === "accepted"
          ? `✓ ${selectedDish.dishName} successfully compiled and published!`
          : `✗ ${selectedDish.dishName} entry rejected.`,
        type: decision,
      });

      if (decision === "accepted") {
        setTimeout(() => {
          setActiveView("menu");
          setSelectedDish(null);
          setDishName("");
          setDetails({});
          setEditingId(null);
          setDecisionMessage({ text: "", type: "" });
        }, 800);
      }
    } catch (e) {
      setError(e.message);
    }
  };

  const handleEditFromMenu = async (item) => {
    setLoadingDetails(true);
    setActiveView("builder");
    setEditingId(item.id);
    const dishRefName = item._originName || item.shortName;
    setSelectedDish({ dishName: dishRefName });
    setDishName(dishRefName);
    setDetails(item);

    const fallbackSet = await generateDynamicSuggestions(dishRefName);
    const isLiquorEdit = detectCategory(dishRefName) === "liquor";
    const vatOptions = ["20% VAT", "22% VAT", "25% VAT", "28% VAT", "30% VAT"];

    setFieldSuggestions({
      image:          [item.image, ...fallbackSet.image].slice(0, 5),
      shortName:      fallbackSet.shortName,
      description:    fallbackSet.description,
      menuGroup:      fallbackSet.menuGroup,
      cuisine:        fallbackSet.cuisine,
      foodType:       fallbackSet.foodType,
      classification: fallbackSet.classification,
      uom:            fallbackSet.uom,
      prepTime:       fallbackSet.prepTime,
      price:          [item.price, ...fallbackSet.price].slice(0, 5),
      tax:            isLiquorEdit ? vatOptions : fallbackSet.tax,
    });
    setLoadingDetails(false);
  };

  const handleRemoveFromMenu = (id) => {
    if (window.confirm("Are you sure you want to completely remove this dish from the published menu catalog?")) {
      setAcceptedItems((prev) => prev.filter((item, idx) => (item.id !== undefined ? item.id !== id : idx !== id)));
    }
  };

  return (
    <main className="app-shell">
      <div className="app-header">
        <div className="app-header__text">
          <span className="eyebrow">Data Pipeline Production</span>
          <h1>Menu Builder</h1>
          <p className="subtitle">
            {activeView === "builder" 
              ? (editingId ? `Currently editing dynamic item ID: ${editingId}` : "Search a master item profile below to adjust specifications")
              : "Customer-facing deployment display snapshot"}
          </p>
        </div>

        {selectedDish && activeView === "builder" && (
          <div className="progress-ring-wrap">
            <svg className="progress-ring" viewBox="0 0 56 56">
              <circle cx="28" cy="28" r="24" className="progress-ring__track" />
              <circle
                cx="28" cy="28" r="24"
                className="progress-ring__fill"
                strokeDasharray={`${2 * Math.PI * 24}`}
                strokeDashoffset={`${2 * Math.PI * 24 * (1 - progress / 100)}`}
              />
            </svg>
            <span className="progress-ring__label">{completedCount}/{activeDetailFields.length}</span>
          </div>
        )}
      </div>

      {activeView === "menu" ? (
        <ProfessionalMenuView 
          acceptedItems={acceptedItems} 
          onEditItem={handleEditFromMenu}
          onRemoveItem={handleRemoveFromMenu}
        />
      ) : (
        <>
          <div className="search-wrap" ref={dropdownRef}>
            <div className="search-box">
              <span className="search-icon">🔍</span>
              <input
                type="text"
                className="search-input"
                placeholder="Type a dish name to begin review..."
                value={dishName}
                onChange={(e) => {
                  setDishName(e.target.value);
                  if (selectedDish && e.target.value !== selectedDish.dishName) {
                    setSelectedDish(null);
                    setDetails({});
                    setFieldSuggestions({});
                    setDecisionMessage({ text: "", type: "" });
                    setError("");
                    setEditingId(null);
                  }
                }}
                autoComplete="off"
              />
              {loadingDish && <span className="search-spinner" />}
            </div>

            {dishSuggestions.length > 0 && (
              <div className="dish-dropdown">
                {dishSuggestions.map((dish) => {
                  const confidence = computeConfidence(dishName, dish.dishName);
                  return (
                    <button
                      key={`${dish.dishName}-${confidence}`}
                      className="dish-option"
                      type="button"
                      onClick={() => handleDishClick(dish)}
                    >
                      <span className="dish-option__name">{dish.dishName}</span>
                      <span className={`badge ${getConfidenceClass(confidence)}`}>
                        {confidence}% Match
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {error && <div className="alert">{error}</div>}

          {selectedDish && (
            <>
              <div className="dish-banner">
                <span className="dish-banner__label">
                  {editingId ? "✏️ Modifying Saved Entry for:" : "Automated Profile Review for:"}
                </span>
                <strong className="dish-banner__name">{selectedDish.dishName}</strong>
                {editingId && (
                  <button className="cancel-edit-btn" onClick={() => {
                    setSelectedDish(null);
                    setDishName("");
                    setDetails({});
                    setEditingId(null);
                  }}>Cancel Edit</button>
                )}
              </div>

              {(details.image || loadingDetails) && (
                <div className="preview-hero" style={{ opacity: loadingDetails ? 0.5 : 1 }}>
                  {details.image
                    ? <img src={details.image} alt={selectedDish.dishName}
                        onError={(e) => { e.target.src = STATIC_FALLBACK_IMAGES[0]; }} />
                    : <div style={{ width: 240, height: 180, background: "#f8fafc" }} />
                  }
                  <div className="preview-hero__info">
                    <h2>{details.shortName || selectedDish.dishName}</h2>
                    <p>{details.description}</p>
                    <div className="preview-hero__meta">
                      {details.price    && <span className="meta-badge">{details.price}</span>}
                      {details.tax      && <span className="meta-badge">Tax: {details.tax}</span>}
                      {details.cuisine  && <span className="meta-badge">{details.cuisine}</span>}
                      {details.prepTime && <span className="meta-badge">⏱ {details.prepTime}</span>}
                      {details.foodType && <span className="meta-badge">{details.foodType}</span>}
                    </div>
                  </div>
                </div>
              )}

              <div className="fields-grid">
                {activeDetailFields.map((field) => (
                  <FieldCard
                    key={field.key}
                    field={field}
                    value={details[field.key]}
                    suggestions={fieldSuggestions[field.key]}
                    loadingField={loadingDetails}
                    onChange={updateDetail}
                    onChoose={chooseChip}
                  />
                ))}
              </div>

              <div className="decision-bar">
                <div className="decision-bar__status">
                  {canDecide
                    ? (editingId ? "Modifications verified and ready" : "Profile complete and verified")
                    : `${activeDetailFields.length - completedCount} fields remaining for review`}
                </div>
                <div className="decision-bar__actions">
                  <button className="btn btn--reject" type="button"
                    disabled={!canDecide} onClick={() => submitDecision("rejected")}>
                    ✗ Reject Profile
                  </button>
                  <button className="btn btn--accept" type="button"
                    disabled={!canDecide} onClick={() => submitDecision("accepted")}>
                    {editingId ? "✨ Update Changes" : "✓ Accept & Save"}
                  </button>
                </div>
              </div>

              {decisionMessage.text && (
                <div className={`decision-result decision-result--${decisionMessage.type}`}>
                  {decisionMessage.text}
                </div>
              )}
            </>
          )}
        </>
      )}

      <button 
        className={`floating-view-toggle ${activeView === "menu" ? "floating-view-toggle--back" : ""}`}
        onClick={() => {
          setActiveView(activeView === "builder" ? "menu" : "builder");
          if(activeView === "menu") {
            setEditingId(null);
          }
        }}
        title={activeView === "builder" ? "View Customer Menu Board" : "Return to Specification Editor"}
      >
        {activeView === "builder" ? (
          <>
            <span className="floating-view-toggle__icon">🍽️</span>
            <span className="floating-view-toggle__text">
              View Menu <span className="floating-badge-count">{acceptedItems.length}</span>
            </span>
          </>
        ) : (
          <>
            <span className="floating-view-toggle__icon">🔧</span>
            <span className="floating-view-toggle__text">Back to Editor</span>
          </>
        )}
      </button>
    </main>
  );
}

export default App;