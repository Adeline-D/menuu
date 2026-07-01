// node-fetch polyfill for Node < 18
if (!globalThis.fetch) {
  try { globalThis.fetch = require("node-fetch"); } catch (_) {}
}

console.log("MULTILINGUAL INDIAN RESTAURANT ENGINE v3 — Strict Language-Mirrored Output + Accurate Image Search");

// Safety net: log unexpected errors instead of letting them silently kill the
// whole server (which was causing "Connection sync dropped" on the very next request).
process.on("unhandledRejection", (err) => {
  console.error("Unhandled rejection (server kept alive):", err);
});
process.on("uncaughtException", (err) => {
  console.error("Uncaught exception (server kept alive):", err);
});

const express = require("express");
const cors    = require("cors");
const Groq    = require("groq-sdk");
require("dotenv").config();


const app = express();
app.use(cors());
app.use(express.json({ limit: "10mb" }));

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// ─── Static dish databases ────────────────────────────────────────────────────
const BEVERAGES_DB = [
  "Kingfisher Beer","Budweiser Beer","Heineken","Corona","Bira 91",
  "Smirnoff Vodka","Absolute Vodka","Grey Goose Vodka","Magic Moments Vodka",
  "Old Monk Rum","Bacardi Rum","Captain Morgan",
  "Johnnie Walker Whiskey","Jameson Irish Whiskey","Jack Daniels","Blenders Pride","Royal Stag",
  "Mango Lassi","Sweet Lassi","Salted Lassi","Fresh Mango Juice","Mango Shake",
  "Masala Chai","Filter Coffee","Fresh Lime Soda","Virgin Mojito",
  "Coca Cola","Thums Up","Sprite","Diet Coke"
];
const DESSERTS_DB = [
  "Gulab Jamun","Rasmalai","Mango Kulfi","Pista Kulfi","Gajar Ka Halwa",
  "Moong Dal Halwa","Rasgulla","Sizzling Brownie with Ice Cream",
  "Vanilla Ice Cream","Chocolate Ice Cream"
];
const STARTERS_DB = [
  "Paneer Tikka","Chicken Tikka","Malai Tikka","Tandoori Chicken",
  "Chicken Seekh Kebab","Mutton Seekh Kebab","Veg Samosa","Onion Pakoda",
  "Paneer Pakoda","Chilli Chicken","Veg Manchurian","Chicken G65","Crispy Corn",
  "Tomato Soup","Manchow Soup","Hot and Sour Soup","French Fries","Chicken Hot Wings"
];
const MAINS_DB = [
  "Butter Chicken","Chicken Tikka Masala","Mutton Rogan Josh","Dal Makhani","Dal Tadka",
  "Paneer Butter Masala","Kadhai Paneer","Palak Paneer","Mix Veg Curry","Chole Bhature",
  "Chicken Biryani","Hyderabadi Biryani","Mutton Biryani","Veg Biryani","Egg Biryani",
  "Jeera Rice","Plain Basmati Rice","Butter Naan","Garlic Naan","Plain Naan",
  "Tandoori Roti","Lacha Paratha","Rumali Roti"
];
const PIZZA_DB    = ["Margherita Pizza","Paneer Tikka Pizza","Chicken Pizza","Veggie Supreme Pizza","Pepperoni Pizza","BBQ Chicken Pizza","Mushroom & Corn Pizza","Cheese Burst Pizza"];
const ICECREAM_DB = ["Vanilla Ice Cream","Chocolate Ice Cream","Mango Ice Cream","Strawberry Ice Cream","Butterscotch Ice Cream","Pista Kulfi Ice Cream","Blackcurrent Ice Cream","Sizzling Brownie with Ice Cream"];

// ─── Curated Unsplash image sets ──────────────────────────────────────────────
const U = (id) => `https://images.unsplash.com/${id}?ixlib=rb-4.0.3&auto=format&fit=crop&w=700&q=85`;

const DISH_SETS = {
  biryani:      [U("photo-1563379091339-03b21ab4a4f8"),U("photo-1596797038530-2c107229654b"),U("photo-1633945274405-b6c8069047b0"),U("photo-1589302168068-964664d93dc0"),U("photo-1606491956689-2ea866880c84")],
  indianCurry:  [U("photo-1565557623262-b51c2513a641"),U("photo-1603894584373-5ac82b2ae398"),U("photo-1585937421612-70a008356fbe"),U("photo-1631515243349-e0cb75fb8d3a"),U("photo-1574653853027-5382a3d23a15")],
  paneer:       [U("photo-1631515243349-e0cb75fb8d3a"),U("photo-1565557623262-b51c2513a641"),U("photo-1574653853027-5382a3d23a15"),U("photo-1585937421612-70a008356fbe"),U("photo-16033894584373-5ac82b2ae398")],
  dal:          [U("photo-1546833999-b9f581a1996d"),U("photo-1585937421612-70a008356fbe"),U("photo-1631515243349-e0cb75fb8d3a"),U("photo-1574653853027-5382a3d23a15"),U("photo-1565557623262-b51c2513a641")],
  kebabTikka:   [U("photo-1599487488170-d11ec9c172f0"),U("photo-1529006557810-274b9b2fc783"),U("photo-1603360946369-dc9bb6258143"),U("photo-1545247181-516773cae754"),U("photo-1601050690597-df056fb4ce78")],
  indoChinese:  [U("photo-1563245372-f21724e3856d"),U("photo-1603133872878-684f208fb84b"),U("photo-1585032226651-759b368d7246"),U("photo-1617093727343-374698b1b08d"),U("photo-1455619452474-d2be8b1e70cd")],
  noodles:      [U("photo-1569718212165-3a8278d5f624"),U("photo-1617093727343-374698b1b08d"),U("photo-1555126634-323283e090fa"),U("photo-1563245372-f21724e3856d"),U("photo-1585032226651-759b368d7246")],
  friedRice:    [U("photo-1603133872878-684f208fb84b"),U("photo-1617093727343-374698b1b08d"),U("photo-1563245372-f21724e3856d"),U("photo-1455619452474-d2be8b1e70cd"),U("photo-1585032226651-759b368d7246")],
  southIndian:  [U("photo-1610192244261-3f33de3f55e4"),U("photo-1668236543090-82eba5ee5976"),U("photo-1589301760014-d929f3979dbc"),U("photo-1589301760014-d929f3979dbc"),U("photo-1601050690597-df056fb4ce78")],
  pizza:        [U("photo-1565299624946-b28f40a0ae38"),U("photo-1574071318508-1cdbab80d002"),U("photo-1593560708920-61dd98c46a4e"),U("photo-1513104890138-7c749659a591"),U("photo-1571407970349-bc81e71e2d3d")],
  pasta:        [U("photo-1473093295043-cdd812d0e601"),U("photo-1555949258-eb67b1ef0ceb"),U("photo-1621996346565-e3dbc646d9a9"),U("photo-1598866594230-a7c12756260f"),U("photo-1484723091739-30a097e8f929")],
  burger:       [U("photo-1568901346375-23c9450c58cd"),U("photo-1550547660-d9450f859349"),U("photo-1586190848861-99aa4a171e90"),U("photo-1571091718767-18b5b1457add"),U("photo-1553979459-d2229ba7433b")],
  sandwich:     [U("photo-1528735602780-2552fd46c7af"),U("photo-1485963631004-f2f00b1d6606"),U("photo-1481070414801-51fd732d7184"),U("photo-1509722747041-616f39b57569"),U("photo-1553090489-cd47e0907980")],
  chaat:        [U("photo-1601050690597-df056fb4ce78"),U("photo-1567337710282-00832b415979"),U("photo-1606491956689-2ea866880c84"),U("photo-1604908176997-125f25cc6f3d"),U("photo-1603133872878-684f208fb84b")],
  bread:        [U("photo-1534422298391-e4f8c172dddb"),U("photo-1608686207856-001b95cf60ca"),U("photo-1579912437714-a57751c39469"),U("photo-1585478259715-876acc5be8eb"),U("photo-1509440159596-0249088772ff")],
  soup:         [U("photo-1547592166-23ac45744acd"),U("photo-1476718406336-bb5a9690ee2a"),U("photo-1603105037880-880cd4edfb0d"),U("photo-1541832676-9b763b0239ab"),U("photo-1607532941433-304659e8198a")],
  salad:        [U("photo-1512621776951-a57141f2eefd"),U("photo-1540420773420-3366772f4999"),U("photo-1546069901-ba9599a7e63c"),U("photo-1515516969-d4008cc6241a"),U("photo-1607532941433-304659e8198a")],
  seafood:      [U("photo-1565680018434-b513d5e5fd47"),U("photo-1559737558-2f5a35f4523b"),U("photo-1519708227418-c8fd9a32b7a2"),U("photo-1467003909585-2f8a72700288"),U("photo-1579631542720-3a87824fff86")],
  indianSweet:  [U("photo-1571506165871-ee72a35bc9d4"),U("photo-1605197223202-29456024c18d"),U("photo-1578985545062-69928b1d9587"),U("photo-1563729784474-d77dbb933a9e"),U("photo-1587314168485-3236d6710814")],
  iceCream:     [U("photo-1563805042-7684c019e1cb"),U("photo-1501443762994-82bd5dace89a"),U("photo-1488900128323-21503983a07e"),U("photo-1560008581-09826d1de69e"),U("photo-1551024601-bec78aea704b")],
  dessert:      [U("photo-1551024601-bec78aea704b"),U("photo-1565958011703-44f9829ba187"),U("photo-1464349095431-e9a21285b5f3"),U("photo-1578985545062-69928b1d9587"),U("photo-1576618148400-f54bed99fcfd")],
  juice:        [U("photo-1613478223719-2ab802602423"),U("photo-1621506289937-a8e4df240d0b"),U("photo-1600271886742-f049cd451bba"),U("photo-1553530666-0c8e5c4f0e2a"),U("photo-1610970881699-44a55b4cfd87")],
  milkshake:    [U("photo-1461023058943-07fcbe16d735"),U("photo-1553530666-0c8e5c4f0e2a"),U("photo-1571934811356-5cc061b6d807"),U("photo-1544787219-7f47ccb76574"),U("photo-1613478223719-2ab802602423")],
  hotBeverage:  [U("photo-1509042239860-f550ce710b93"),U("photo-1495474472287-4d71bcdd2085"),U("photo-1544787219-7f47ccb76574"),U("photo-1514432324607-a09d9b4aefdd"),U("photo-1451167760496-1628856ab772")],
  coldCoffee:   [U("photo-1461023058943-07fcbe16d735"),U("photo-1509042239860-f550ce710b93"),U("photo-1495474472287-4d71bcdd2085"),U("photo-1498804103079-a6351b050096"),U("photo-1541167760496-1628856ab772")],
  cocktail:     [U("photo-1514362545857-3bc16c4c7d1b"),U("photo-1551538827-9c037cb4f32a"),U("photo-1470337458703-46ad1756a187"),U("photo-1587308831823-b1b7bfa0a8c0"),U("photo-1574096079513-d8259312b7a3")],
  beer:         [U("photo-1608270586620-248524c67de9"),U("photo-1532634922-8fe0b757fb13"),U("photo-1566633806327-68e152aaf26d"),U("photo-1571613316887-6f8d5cbf7ef7"),U("photo-1584225065152-4a1454aa3d4e")],
  wine:         [U("photo-1510812431401-41d2bd2722f3"),U("photo-1506377247377-2a5b3b417ebb"),U("photo-1553361371-9b22f78e8b1d"),U("photo-1578911373434-0cb395d2cbfb"),U("photo-1528823872057-9c018a7a72b5")],
  spirits:      [U("photo-1527281400683-1aae777175f8"),U("photo-1551538827-9c037cb4f32a"),U("photo-1510812431401-41d2bd2722f3"),U("photo-1470337458703-46ad1756a187"),U("photo-1574096079513-d8259312b7a3")],
  premiumPlated:[U("photo-1544025162-d76694265947"),U("photo-1498837167922-ddd27525d352"),U("photo-1476224203421-9ac39bcb3327"),U("photo-1484723091739-30a097e8f929"),U("photo-1473093295043-cdd812d0e601")],
};

const MATCH_RULES = [
  { key:"indianCurry", terms:["butter chicken","chicken tikka masala","makhani","rogan josh","korma","kadai","handi","bhuna","kofta","saag chicken","murgh"] },
  { key:"paneer",      terms:["paneer","shahi paneer","palak paneer","kadai paneer","matar paneer","paneer tikka","cottage cheese"] },
  { key:"dal",         terms:["dal makhani","dal tadka","dal fry","daal","rajma","chole","chana masala","lentil"] },
  { key:"biryani",     terms:["biryani","dum biryani","hyderabadi","awadhi","lucknowi"] },
  { key:"friedRice",   terms:["fried rice","pulao","pilaf","khichdi","tahri"] },
  { key:"kebabTikka",  terms:["tikka","seekh","galouti","boti","reshmi","hariyali","malai kebab","afghani","tangdi","tandoori chicken","tandoori fish","tandoori"] },
  { key:"indoChinese", terms:["manchurian","chilli chicken","chilli paneer","chilli fish","schezwan","spring roll","momos","dimsums","dumplings"] },
  { key:"noodles",     terms:["noodle","hakka","chow mein","chowmein","ramen","thukpa","soba","udon","lo mein"] },
  { key:"southIndian", terms:["dosa","masala dosa","idli","uttapam","vada","medu","appam","puttu","rasam","sambar"] },
  { key:"pizza",       terms:["pizza","margherita","pepperoni","quattro"] },
  { key:"pasta",       terms:["pasta","spaghetti","penne","fettuccine","rigatoni","alfredo","arrabbiata","carbonara","lasagna"] },
  { key:"burger",      terms:["burger","slider","whopper","zinger"] },
  { key:"sandwich",    terms:["sandwich","sub","wrap","frankie","kathi roll","roll","toast","grilled sandwich","club sandwich"] },
  { key:"chaat",       terms:["pani puri","bhel puri","dahi puri","papdi chaat","aloo tikki","ragda","chaat","sev puri","samosa chaat"] },
  { key:"bread",       terms:["naan","butter naan","garlic naan","roti","phulka","paratha","aloo paratha","kulcha","puri","bhatura","lachha","missi roti"] },
  { key:"soup",        terms:["soup","shorba","broth","rasam","congee"] },
  { key:"salad",       terms:["salad","caesar","greens","coleslaw","raita"] },
  { key:"seafood",     terms:["fish","prawn","shrimp","crab","lobster","squid","calamari","pomfret","surmai","rawas","seafood"] },
  { key:"indianSweet", terms:["gulab jamun","jalebi","rasgulla","rasmalai","kheer","halwa","kulfi","barfi","ladoo","pedha","mithai"] },
  { key:"iceCream",    terms:["ice cream","sundae","gelato","kulfi"] },
  { key:"dessert",     terms:["cake","pastry","brownie","cheesecake","mousse","tiramisu","waffle","pancake","dessert"] },
  { key:"milkshake",   terms:["milkshake","shake","smoothie","lassi","mango lassi","faluda","cold lassi"] },
  { key:"juice",       terms:["juice","fresh juice","cold press","nimbu pani","lemonade","aam panna"] },
  { key:"coldCoffee",  terms:["cold coffee","iced coffee","frappe","frappuccino","cold brew","iced latte"] },
  { key:"hotBeverage", terms:["coffee","espresso","latte","cappuccino","americano","mocha","tea","chai","masala chai","green tea","herbal"] },
  { key:"cocktail",    terms:["cocktail","mocktail","mojito","margarita","sangria","daiquiri"] },
  { key:"beer",        terms:["beer","lager","ale","stout","porter","cider"] },
  { key:"wine",        terms:["wine","champagne","prosecco","rosé","cabernet","merlot"] },
  { key:"spirits",     terms:["whisky","whiskey","scotch","bourbon","vodka","rum","gin","tequila","brandy","cognac","liqueur"] },
  { key:"indianCurry", terms:["curry","gravy","masala","korma","makhani","keema"] },
  { key:"kebabTikka",  terms:["chicken","mutton","lamb","beef","pork","gosht","meat","grill"] },
  { key:"seafood",     terms:["fish","prawn","shrimp"] },
];

const CATEGORY_SET = {
  liquor:"spirits", juice:"juice", beverage:"hotBeverage",
  soup:"soup", dessert:"dessert", rice:"biryani",
  bread:"bread", starter:"kebabTikka", mainCourse:"indianCurry",
};

// ─── Supported languages ───────────────────────────────────────────────────────
const SUPPORTED_LANGUAGES = [
  // Indian languages
  "Hindi","Tamil","Telugu","Kannada","Malayalam","Marathi","Bengali",
  "Gujarati","Punjabi","Odia","Urdu","Assamese","Sanskrit","Konkani",
  "Maithili","Santali","Sindhi","Dogri","Manipuri","Bodo",
  // Foreign / international
  "English","Arabic","French","German","Spanish","Italian",
  "Portuguese","Chinese","Japanese","Korean","Russian","Turkish",
  "Dutch","Greek","Hebrew","Persian","Swahili","Thai","Vietnamese",
  "Indonesian","Malay","Polish","Swedish","Norwegian","Danish"
];

// ─── Language → script examples for LLM prompting ─────────────────────────────
const LANGUAGE_SCRIPT_EXAMPLES = {
  Hindi:      { script:"Devanagari", examples:["मुख्य कोर्स","सर्वश्रेष्ठ विक्रेता","तीखा और स्वादिष्ट","भारतीय व्यंजन","शाकाहारी"] },
  Tamil:      { script:"Tamil",      examples:["முதன்மை உணவு","சிறந்த விற்பனையாளர்","காரமான மற்றும் சுவையான","இந்திய உணவு","சைவம்"] },
  Telugu:     { script:"Telugu",     examples:["మెయిన్ కోర్సు","బెస్ట్ సెల్లర్","ఘాటైన మరియు రుచికరమైన","భారతీయ వంటకాలు","శాకాహారం"] },
  Kannada:    { script:"Kannada",    examples:["ಮುಖ್ಯ ಕೋರ್ಸ್","ಅತ್ಯುತ್ತಮ ಮಾರಾಟ","ಖಾರ ಮತ್ತು ರುಚಿಕর","ಭారತೀಯ ಪಾಕಶಾಲೆ","శాకాహార","ಉತ್ತರ ಭಾರತೀಯ","ವಿಶೇಷ ಕೊಡುಗೆ"] },
  Malayalam:  { script:"Malayalam",  examples:["മെയിൻ കോഴ്‌സ്","ഏറ്റവും കൂടുതൽ വിൽക്കുന്നത്","മൂർച്ചയേറിയതും രുചികരവും","ഇന്ത്യൻ ഭക്ഷണം","സസ്യാഹാരം"] },
  Marathi:    { script:"Devanagari", examples:["मुख्य जेवण","सर्वाधिक विकली जाणारी","तिखट आणि चवदार","भारतीय पाकशैली","शाकाहारी"] },
  Bengali:    { script:"Bengali",    examples:["মূল কোর্স","সবচেয়ে বেশি বিক্রি","ঝাল এবং সুস্বাদু","भारतीय রন্ধনশৈলী","নিরামিষ"] },
  Gujarati:   { script:"Gujarati",   examples:["મુખ્ય કોર્સ","સૌથી વધુ વેચાણ","તીખું आणि સ્વાદિષ્ટ","ભારતીయ વાનગીઓ","શાકાહારી"] },
  Punjabi:    { script:"Gurmukhi",   examples:["ਮੁੱਖ ਕੋਰਸ","ਸਭ ਤੋਂ ਵੱਧ ਵਿਕਣ ਵਾਲਾ","ਮਸਾਲੇਦาร ਅਤੇ ਸੁਆਦੀ","ਭਾਰਤੀ ਪਕਵਾਨ","ਸ਼ਾਕਾਹਾਰੀ"] },
  Spanish:    { script:"Latin",      examples:["Plato principal","El más vendido","Picante y delicioso","Cocina india","Vegetariano"] },
  Italian:    { script:"Latin",      examples:["Piatto principale","Il più venduto","Picante e delizioso","Cucina indiana","Vegetariano"] },
  Portuguese: { script:"Latin",      examples:["Prato principal","O mais vendido","Picante e delicioso","Cozinha indiana","Vegetariano"] },
  Chinese:    { script:"Chinese",    examples:["主菜","畅销","辛辣美味","印度料理","素食"] },
  Japanese:   { script:"Japanese",   examples:["メインコース","ベストセラー","スパイシーで美味しい","インド料理","ベジタリアン"] },
  Korean:     { script:"Korean",     examples:["메인 코스","베스트셀러","맵고 맛있는","인도 요리","채식주의자"] },
  Russian:    { script:"Cyrillic",   examples:["Основное блюдо","Хит продаж","Острое и вкусное","Индийская кухня","Вегетарианское"] },
  Turkish:    { script:"Latin",      examples:["Ana yemek","En çok satan","Baharatlı ve lezzetli","Hint mutfağı","Vejetaryen"] },
};

// ─── Google Custom Search Image Fetch ─────────────────────────────────────────
async function googleImageSearch(dishName) {
  const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY || process.env.REACT_APP_GOOGLE_API_KEY || "";
  const GOOGLE_CX = process.env.GOOGLE_CX || process.env.REACT_APP_GOOGLE_CX || "";
  if (!GOOGLE_API_KEY || !GOOGLE_CX) {
    console.log("Google CSE keys not set — using curated Unsplash fallback");
    return null;
  }
  const searchQuery = encodeURIComponent(`${dishName} food restaurant dish professional photography`);
  const url = `https://www.googleapis.com/customsearch/v1?key=${GOOGLE_API_KEY}&cx=${GOOGLE_CX}&q=${searchQuery}&searchType=image&num=5&imgSize=large&imgType=photo&safe=active&fields=items(link)`;
  try {
    const res = await fetch(url);
    const data = await res.json();
    if (!res.ok) {
      console.error("Google CSE error:", data?.error?.message || res.status);
      return null;
    }
    const urls = (data.items || []).map(item => item.link).filter(Boolean);
    if (urls.length >= 3) {
      console.log(`✅ Google CSE returned ${urls.length} images for "${dishName}"`);
      return urls;
    }
    console.log(`⚠️ Google CSE returned only ${urls.length} images — falling back`);
    return null;
  } catch (e) {
    console.error("Google image fetch error:", e.message);
    return null;
  }
}

// ─── Curated Unsplash fallback ─────────────────────────────────────────────────
function curatedImageFallback(dishName) {
  const lower = (dishName || "").toLowerCase().trim();
  let bestKey = null, bestScore = 0;
  for (const rule of MATCH_RULES) {
    for (const term of rule.terms) {
      if (lower.includes(term) && term.length > bestScore) {
        bestScore = term.length;
        bestKey = rule.key;
      }
    }
  }
  if (!bestKey) {
    for (const [cat, key] of Object.entries(CATEGORY_SET)) {
      if (lower.includes(cat)) { bestKey = key; break; }
    }
  }
  return DISH_SETS[bestKey || "premiumPlated"];
}

// ─── Main image function: Google CSE → curated fallback, always 5 URLs ────────
async function generateImageSuggestions(dishName, englishName) {
  const lookupName = englishName || dishName;
  const googleResults = await googleImageSearch(lookupName);
  if (googleResults && googleResults.length > 0) {
    const fallback = curatedImageFallback(lookupName);
    while (googleResults.length < 5) googleResults.push(fallback[googleResults.length] || fallback[0]);
    return googleResults.slice(0, 5);
  }
  return curatedImageFallback(lookupName);
}

// ─── Language detection ────────────────────────────────────────────────────────
async function detectLanguage(text) {
  const hasNonLatin = /[^\x00-\x7F]/.test(text);
  if (/[\u0900-\u097F]/.test(text)) {
    if (/आहे|आहेत|नाही|मराठी/.test(text)) return "Marathi";
    return "Hindi";
  }
  if (/[\u0B80-\u0BFF]/.test(text)) return "Tamil";
  if (/[\u0C00-\u0C7F]/.test(text)) return "Telugu";
  if (/[\u0C80-\u0CFF]/.test(text)) return "Kannada";
  if (/[\u0D00-\u0D7F]/.test(text)) return "Malayalam";
  if (/[\u0980-\u09FF]/.test(text)) {
    if (/[\u09F0-\u09F1]/.test(text)) return "Assamese";
    return "Bengali";
  }
  if (/[\u0A80-\u0AFF]/.test(text)) return "Gujarati";
  if (/[\u0A00-\u0A7F]/.test(text)) return "Punjabi";
  if (/[\u0B00-\u0B7F]/.test(text)) return "Odia";
  if (/[\u0600-\u06FF]/.test(text)) {
    if (/[\u067E\u0686\u0698\u06AF]/.test(text)) return "Urdu";
    return "Arabic";
  }
  if (/[\u4E00-\u9FFF]/.test(text)) return "Chinese";
  if (/[\u3040-\u30FF]/.test(text)) return "Japanese";
  if (/[\uAC00-\uD7AF]/.test(text)) return "Korean";
  if (/[\u0400-\u04FF]/.test(text)) return "Russian";
  if (/[\u0E00-\u0E7F]/.test(text)) return "Thai";

  if (!hasNonLatin) {
    try {
      const response = await groq.chat.completions.create({
        messages: [
          { role: "system", content: `You are a language detector. Identify the primary language of the text. Respond with ONLY the language name from this list: ${SUPPORTED_LANGUAGES.join(", ")}. If unsure, respond with English.` },
          { role: "user", content: `Text: "${text}"` }
        ],
        model: "openai/gpt-oss-20b",
        temperature: 0,
        max_tokens: 10
      });
      const detected = response.choices[0]?.message?.content?.trim();
      if (SUPPORTED_LANGUAGES.includes(detected)) return detected;
    } catch (e) {
      console.error("Language detection model error:", e.message);
    }
  }
  return "English";
}

// ─── Translation helpers ───────────────────────────────────────────────────────
async function translateToEnglish(text) {
  try {
    const response = await groq.chat.completions.create({
      messages: [
        { role: "system", content: "You are an expert translator. Translate the restaurant item or text completely to standard English food terms. Return ONLY the English translation, no explanation, no quotation marks." },
        { role: "user", content: `Translate: "${text}"` }
      ],
      model: "openai/gpt-oss-20b",
      temperature: 0,
      max_tokens: 40
    });
    return response.choices[0]?.message?.content?.trim().replace(/^"|"$/g, '') || text;
  } catch (e) {
    return text;
  }
}

async function translateTerm(term, targetLanguage) {
  if (targetLanguage === "English") return term;
  try {
    const response = await groq.chat.completions.create({
      messages: [
        { role: "system", content: `Translate the short food category/tag/label to ${targetLanguage}. Keep it under 3 words. Return ONLY the translation, matching the native script accurately.` },
        { role: "user", content: `Translate "${term}" to ${targetLanguage}` }
      ],
      model: "openai/gpt-oss-20b",
      temperature: 0,
      max_tokens: 30
    });
    return response.choices[0]?.message?.content?.trim().replace(/^"|"$/g, '') || term;
  } catch (e) {
    return term;
  }
}

// ─── Batch translation helper (English dish names → target language, one call) ─
async function translateDishNamesBatch(englishNames, targetLanguage) {
  if (targetLanguage === "English" || englishNames.length === 0) return englishNames;
  try {
    const langInfo = LANGUAGE_SCRIPT_EXAMPLES[targetLanguage];
    const scriptNote = langInfo ? `Write strictly in ${langInfo.script} script.` : `Write strictly in ${targetLanguage}.`;
    const response = await groq.chat.completions.create({
      messages: [
        { role: "system", content: `You are an expert food menu translator. Translate each English dish name in the list to natural, native ${targetLanguage} (as it would appear on a real restaurant menu). ${scriptNote} Keep the same order. Return ONLY a valid JSON object: { "translations": ["<name1>", "<name2>", ...] } with exactly ${englishNames.length} entries.` },
        { role: "user", content: JSON.stringify(englishNames) }
      ],
      model: "openai/gpt-oss-20b",
      response_format: { type: "json_object" },
      temperature: 0
    });
    const parsed = JSON.parse(response.choices[0]?.message?.content || "{}");
    const translations = parsed.translations || parsed.items || [];
    if (Array.isArray(translations) && translations.length === englishNames.length) {
      return translations;
    }
    return englishNames;
  } catch (e) {
    console.error("Batch translation error:", e.message);
    return englishNames;
  }
}

// ─── Search endpoint ───────────────────────────────────────────────────────────
app.get("/search", async (req, res) => {
  const originalQuery = req.query.q || "";
  if (!originalQuery.trim()) return res.json([]);

  const targetLanguage = await detectLanguage(originalQuery);
  const englishQuery = targetLanguage !== "English" ? (await translateToEnglish(originalQuery)).toLowerCase() : originalQuery.toLowerCase();
  console.log(`Search: "${originalQuery}" → detected: ${targetLanguage}, english: "${englishQuery}"`);

  const respondWithDishes = async (englishDishNames, confidenceMap) => {
    const translatedNames = await translateDishNamesBatch(englishDishNames, targetLanguage);
    const results = englishDishNames.map((en, idx) => ({
      dishName: translatedNames[idx] || en,
      englishName: en,
      confidence: confidenceMap ? (confidenceMap[en] || 80) : 100,
      inputLanguage: targetLanguage
    }));
    return res.json(results.slice(0, 15));
  };

  if (englishQuery === "pizza") return respondWithDishes(PIZZA_DB, null);
  if (englishQuery.includes("ice cream") || englishQuery === "ice") return respondWithDishes(ICECREAM_DB, null);

  // FIX: Evaluate Dessert checks before Beverage checks so chocolate ice cream doesn't trip up on "cola"
  const isDessert = ["dessert","sweet","jamun","rasmalai","kulfi","halwa","ice cream","cake","ice"].some(k => englishQuery.includes(k));
  const isBeverage = !isDessert && ["beer","vodka","rum","whiskey","whisky","gin","wine","liquor","drink","juice","lassi","shake","soda","cola","mango"].some(k => englishQuery.includes(k));
  const isStarter = ["starter","tikka","kebab","soup","fry","fries","chilli","manchurian","samosa","pakoda"].some(k => englishQuery.includes(k));

  let primaryPool = [], contextRule = "";
  if (isDessert) {
    primaryPool = DESSERTS_DB;
    contextRule = "INDIAN DESSERTS and ICE CREAMS only.";
  } else if (isBeverage) {
    primaryPool = BEVERAGES_DB;
    contextRule = "BEVERAGES, LIQUOR, and JUICES only.";
  } else if (isStarter) {
    primaryPool = STARTERS_DB;
    contextRule = "INDIAN APPETIZERS and STARTERS only.";
  } else {
    primaryPool = [...MAINS_DB,...STARTERS_DB,...DESSERTS_DB,...BEVERAGES_DB];
    contextRule = "authentic Indian restaurant menu items.";
  }

  const localMatches = primaryPool.filter(item => item.toLowerCase().includes(englishQuery));
  if (localMatches.length >= 3) {
    return respondWithDishes(localMatches, null);
  }

  try {
    const response = await groq.chat.completions.create({
      messages: [
        { role: "system", content: `You are an Indian Restaurant POS database. The search term is "${englishQuery}" (originally typed in ${targetLanguage} as "${originalQuery}"). IMPORTANT: Every dish you return MUST actually contain or directly relate to "${englishQuery}" — do NOT return generic or loosely related dishes. Return dish names in ENGLISH only. STRICT: ${contextRule} Return a valid JSON object with a "dishes" array.` },
        { role: "user", content: `Return up to 12 real Indian restaurant menu items that genuinely contain or are direct variants of "${englishQuery}". Do not include unrelated dishes. Each item: { "dishName": "<English name>", "confidence": <60-100> }. Format: { "dishes": [...] }` } ],
      model: "openai/gpt-oss-20b",
      response_format: { type: "json_object" },
      temperature: 0
    });
    const parsed = JSON.parse(response.choices[0]?.message?.content || "{}");
    let items = parsed.dishes || parsed.items || [];
    items = items.map(item => ({
      dishName: item.dishName || item.name,
      confidence: item.confidence || 80
    })).filter(i => i.dishName);

    // Relevance guard: drop results that don't actually relate to the typed query
    const qTokens = englishQuery.split(/\s+/).filter(t => t.length >= 2);
    const relevant = items.filter(i => {
      const candidate = i.dishName.toLowerCase();
      return qTokens.some(t => candidate.includes(t)) || candidate.includes(englishQuery) || englishQuery.includes(candidate);
    });
    const finalItems = relevant.length > 0 ? relevant : items;

    const englishNames = finalItems.map(i => i.dishName);
    const confidenceMap = {};
    finalItems.forEach(i => { confidenceMap[i.dishName] = i.confidence; });
    return respondWithDishes(englishNames, confidenceMap);
  } catch (e) {
    console.error("Groq search error:", e.message);
    return respondWithDishes(primaryPool.slice(0, 6), null);
  }
});

// ─── Specifications profile builder endpoint ───────────────────────────────────
app.post("/specifications", async (req, res) => {
  const { dishName, inputLanguage } = req.body || {};
  if (!dishName) return res.status(400).json({ error: "dishName is required." });

  const targetLanguage = inputLanguage || "English";
  const englishName = targetLanguage !== "English" ? await translateToEnglish(dishName) : dishName;
  const lowerName = englishName.toLowerCase();
  const rawLower = (dishName || "").toLowerCase();

  const LIQUOR_KEYWORDS = ["beer","lager","ale","stout","vodka","rum","whiskey","whisky","scotch","bourbon","gin","tequila","brandy","cognac","wine","champagne","prosecco","cocktail","liqueur","liquor","spirit","budweiser","kingfisher","heineken","corona","bira","smirnoff","absolut","bacardi","johnnie","jameson","jack daniel","blenders","royal stag","old monk"];
  const isLiquor = LIQUOR_KEYWORDS.some(k => lowerName.includes(k)) || LIQUOR_KEYWORDS.some(k => rawLower.includes(k));

  // FIX: Dessert checked before Beverage to eliminate "chocolate" containing "cola" issue
  let forcedCategory = null;
  if (isLiquor) forcedCategory = "Beverage";
  else if (["ice cream","cake","pudding","dessert","gulab jamun","kulfi","rasgulla","halwa","rasmalai","brownie","pastry","jalebi"].some(k => lowerName.includes(k))) forcedCategory = "Dessert";
  else if (["juice","lassi","shake","milkshake","smoothie","soda","cola","tea","chai","coffee","lemonade","water","milk","buttermilk"].some(k => lowerName.includes(k))) forcedCategory = "Beverage";
  else if (["soup","tikka","kebab","wings","fry","fries","chilli","manchurian","samosa","pakoda","chaat","spring roll","momos"].some(k => lowerName.includes(k))) forcedCategory = "Starter";
  else if (["biryani","pulao","fried rice","curry","masala","korma","makhani","dal","naan","roti","paratha","pizza","pasta","burger","butter chicken"].some(k => lowerName.includes(k))) forcedCategory = "Main Course";

  const isBeverage = forcedCategory === "Beverage" && !isLiquor;
  const finalImageUrls = await generateImageSuggestions(dishName, englishName);

  const langInfo = LANGUAGE_SCRIPT_EXAMPLES[targetLanguage] || null;
  const isEnglish = targetLanguage === "English";
  const scriptGuide = langInfo ? `SCRIPT: You MUST write EVERYTHING in ${langInfo.script} script. Example translations: ${langInfo.examples.join(", ")}` : isEnglish ? "Write in clear English." : `Write strictly in ${targetLanguage} language/script.`;

  const basePrice = isLiquor ? 350 : isBeverage ? 120 : forcedCategory === "Dessert" ? 180 : forcedCategory === "Starter" ? 220 : 280;

  const uomVariants = isLiquor ? ["Peg (30ml)","Peg (60ml)","Pint","Bottle","Pitcher"] : isBeverage ? ["Glass","Cup","Serve","Bottle","Pint"] : ["Portion","Plate","Piece","Serve","Bowl"];
  const prepTimeVariants = isLiquor ? ["2 mins","3 mins","5 mins","4 mins","1 min"] : isBeverage ? ["5 mins","7 mins","10 mins","4 mins","6 mins"] : ["15 mins","20 mins","12 mins","18 mins","25 mins"];
  const priceVariants = [`Rs. ${basePrice}`,`Rs. ${basePrice + 20}`,`Rs. ${basePrice - 20}`,`Rs. ${basePrice + 50}`,`Rs. ${basePrice + 10}`];
  const taxVariants = isLiquor ? ["20% VAT","22% VAT","25% VAT","18% VAT","30% VAT"] : ["5% GST","12% GST","18% GST","0% GST","28% GST"];

  // DYNAMIC FALLBACK BUILDERS FOR TARGET FIELDS
  const words = englishName.toUpperCase().replace(/[^A-Z ]/g, "").split(/\s+/).filter(Boolean);
  let codeBase = words.map(w => w[0]).join("").slice(0, 4);
  if (codeBase.length < 2 && words[0]) codeBase = words[0].slice(0, 3);
  if (!codeBase) codeBase = "DN";
  const fbShortName = [
    codeBase,
    codeBase + "1",
    codeBase + "X",
    codeBase.slice(0, 2) + "M",
    "SPL"
  ];

  let initialCuisine = "North Indian";
  if (["dosa", "idli", "uttapam", "vada", "sambar", "rasam"].some(k => lowerName.includes(k))) initialCuisine = "South Indian";
  else if (["manchurian", "chilli", "noodles", "fried rice", "schezwan"].some(k => lowerName.includes(k))) initialCuisine = "Indo-Chinese";
  else if (["pizza", "pasta", "lasagna"].some(k => lowerName.includes(k))) initialCuisine = "Italian";
  else if (["burger", "fries", "sandwich"].some(k => lowerName.includes(k))) initialCuisine = "Continental";
  else if (isLiquor) initialCuisine = "International";

  const cuisineOptions = [initialCuisine, "Indian", "Mughlai", "Fusion", "Chef's Selection"];
  const fbCuisine = await Promise.all(cuisineOptions.map(async (c) => await translateTerm(c, targetLanguage)));

  let defaultDiet = "Vegetarian";
  if (["chicken", "mutton", "fish", "prawn", "egg", "lamb", "meat", "wings", "rogan josh", "keema"].some(k => lowerName.includes(k)) || ["chicken", "mutton", "fish", "prawn", "egg", "lamb", "meat", "wings"].some(k => rawLower.includes(k))) {
    defaultDiet = "Non-Vegetarian";
  } else if (isLiquor) {
    defaultDiet = "Alcoholic";
  }
  const foodTypeOptions = defaultDiet === "Vegetarian" 
    ? ["Vegetarian", "Pure Veg", "Vegan", "Jain Friendly", "Healthy Veg"] 
    : defaultDiet === "Alcoholic"
    ? ["Alcoholic", "Contains Alcohol", "Spirits", "Bar Special", "Premium Drink"]
    : ["Non-Vegetarian", "Egg / Meat", "Halal Certified", "High Protein", "Non-Veg Special"];
  const fbFoodType = await Promise.all(foodTypeOptions.map(async (f) => await translateTerm(f, targetLanguage)));

  // Preset translation keys used for deterministic hard-overrides downstream
  const translatedNonVeg = await translateTerm("Non-Vegetarian", targetLanguage);
  const translatedMainCourseGroup = await translateTerm("Main Course", targetLanguage);
  const translatedNonVegGroup = await translateTerm("Non-Vegetarian", targetLanguage);

  const trueNonVegKeywords = ["chicken", "mutton", "fish", "prawn", "egg", "lamb", "meat", "wings", "rogan josh"];

  // Moved outside try so it's also available inside the catch/fallback block below
  const ensureFive = (arr, fallbacks) => {
    const safe = Array.isArray(arr) ? arr.filter(Boolean) : [];
    while (safe.length < 5) safe.push(fallbacks[safe.length % fallbacks.length]);
    return safe.slice(0, 5);
  };

  try {
    const prompt = `You are an advanced AI restaurant engine. Generate menu parameters for "${dishName}" (English: "${englishName}") completely in the language/script of "${targetLanguage}".
    
    STRICT COMPLIANCE RULES:
    1. All values for shortName, description, menuGroup, cuisine, foodType, and classification MUST be written entirely in the native script of "${targetLanguage}".
    2. "category" MUST remain in English and be one of: "Beverages", "Desserts", "Starters", "Main Course", "Chef's Special".
    3. All arrays inside the "variations" object MUST contain exactly 5 distinct, high-quality choices.
    4. Provide specific short abbreviations for "shortName" (e.g., 2-4 uppercase characters).
    5. Ensure the dietary classification correctly labels items as Vegetarian or Non-Vegetarian.
    
    ${scriptGuide}

    Return ONLY a JSON block structured exactly as follows:
    {
      "detectedCategory": "Beverage|Dessert|Starter|Main Course",
      "shortName": "<native translated/abbreviated code>",
      "description": "<native alluring description under 20 words>",
      "category": "Main Course",
      "menuGroup": "<native group name>",
      "cuisine": "<native cuisine name>",
      "foodType": "<native dietary tag>",
      "classification": "<native promo tag>",
      "uom": "${uomVariants[0]}",
      "prepTime": "${prepTimeVariants[0]}",
      "price": "Rs. ${basePrice}",
      "tax": "${taxVariants[0]}",
      "variations": {
        "shortName": ["code1", "code2", "code3", "code4", "code5"],
        "description": ["desc1", "desc2", "desc3", "desc4", "desc5"],
        "menuGroup": ["g1", "g2", "g3", "g4", "g5"],
        "cuisine": ["c1", "c2", "c3", "c4", "c5"],
        "foodType": ["f1", "f2", "f3", "f4", "f5"],
        "classification": ["t1", "t2", "t3", "t4", "t5"],
        "category": ["Beverages", "Main Course", "Chef's Special", "Starters", "Desserts"],
        "uom": ${JSON.stringify(uomVariants)},
        "prepTime": ${JSON.stringify(prepTimeVariants)},
        "price": ${JSON.stringify(priceVariants)},
        "tax": ${JSON.stringify(taxVariants)}
      }
    }`;

    const response = await groq.chat.completions.create({
      messages: [{ role: "user", content: prompt }],
      model: "openai/gpt-oss-120b",
      response_format: { type: "json_object" },
      temperature: 0.3,
      max_tokens: 1000
    });

    const parsed = JSON.parse(response.choices[0]?.message?.content || "{}");
    const aiCategory = parsed.detectedCategory || forcedCategory || "Main Course";
    
    let finalCategory = aiCategory === "Beverage" ? "Beverages" : aiCategory === "Dessert" ? "Desserts" : aiCategory === "Starter" ? "Starters" : parsed.category || "Main Course";
    const variations = parsed.variations || {};

    const suggShortName      = ensureFive(variations.shortName, fbShortName);
    const suggCuisine        = ensureFive(variations.cuisine, fbCuisine);
    const suggFoodType       = ensureFive(variations.foodType, fbFoodType);

    const suggDescription = ensureFive(variations.description, [
      `Delicious ${englishName} prepared fresh.`,
      `Classic ${englishName} — a crowd favourite.`,
      `Premium ${englishName} crafted with care.`,
      `Authentic ${englishName} — must try!`,
      `Signature ${englishName} from our kitchen.`
    ]);
    const suggMenuGroup = ensureFive(variations.menuGroup, isLiquor ? ["Bar Menu","Alcoholic","Spirits","Premium Bar","Cocktails"] : isBeverage ? ["Beverages","Cold Drinks","Hot Drinks","Fresh Drinks","Mocktails"] : forcedCategory === "Dessert" ? ["Desserts","Indian Sweets","Ice Creams","Western Desserts","Pastries"] : forcedCategory === "Starter" ? ["Starters","Appetizers","Tandoor","Snacks","Kebabs"] : ["Main Course","Curries & Gravies","Chef's Special","Rice & Biryani","Signature Dishes"]);
    const suggClassification = ensureFive(variations.classification, ["Best Seller","Chef's Special","Must Try","Trending","New Arrival"]);

    const catFallback = isLiquor ? ["Beverages","Bar Menu","Spirits","Cocktails","Chef's Special"] : forcedCategory === "Dessert" ? ["Desserts","Pastries","Chef's Special","Ice Creams","Main Course"] : forcedCategory === "Starter" ? ["Starters","Appetizers","Chef's Special","Main Course","Beverages"] : ["Main Course","Chef's Special","Trending Items","Starters","Desserts"];
    const suggCategory = ensureFive(variations.category, catFallback);

    const profile = {
      dishName:        dishName,
      shortName:       parsed.shortName || suggShortName[0],
      description:     parsed.description || suggDescription[0],
      category:        finalCategory,
      menuGroup:       parsed.menuGroup || suggMenuGroup[0],
      cuisine:         parsed.cuisine || suggCuisine[0],
      foodType:        parsed.foodType || suggFoodType[0],
      classification:  parsed.classification || suggClassification[0],
      uom:             parsed.uom || uomVariants[0],
      prepTime:        parsed.prepTime || prepTimeVariants[0],
      price:           parsed.price || priceVariants[0],
      tax:             parsed.tax || taxVariants[0],
      image:           finalImageUrls[0],
      detectedLanguage: targetLanguage,
      suggestions: {
        shortName:      suggShortName,
        description:    suggDescription,
        category:       suggCategory,
        menuGroup:      suggMenuGroup,
        cuisine:        suggCuisine,
        foodType:       suggFoodType,
        classification: suggClassification,
        uom:            ensureFive(variations.uom, uomVariants),
        prepTime:       ensureFive(variations.prepTime, prepTimeVariants),
        price:          ensureFive(variations.price, priceVariants),
        tax:            ensureFive(variations.tax, taxVariants),
        image:          finalImageUrls,
      }
    };

    // ───────────────────────────────────────────────────────────────────────────
    // HARD RUNTIME OVERRIDES — PREVENTS AI LAPSES AND DRIFT
    // ───────────────────────────────────────────────────────────────────────────
    
    // Override 1: Fix Butter Chicken (and Indian Curries) Main Course placement & grouping
    if (lowerName.includes("butter chicken") || lowerName.includes("curry") || lowerName.includes("makhani") || rawLower.includes("butter chicken")) {
      profile.category = "Main Course";
      profile.menuGroup = translatedMainCourseGroup;
      if (!profile.suggestions.category.includes("Main Course")) {
        profile.suggestions.category[0] = "Main Course";
      }
      profile.suggestions.menuGroup[0] = translatedMainCourseGroup;
    }

    // Override 2: Fix Ice Cream category leak from matching 'cola' inside 'chocolate'
    if (lowerName.includes("ice cream") || lowerName.includes("kulfi") || rawLower.includes("ice cream")) {
      profile.category = "Desserts";
      if (!profile.suggestions.category.includes("Desserts")) {
        profile.suggestions.category[0] = "Desserts";
      }
    }

    // Override 3: Force complete Non-Vegetarian tag generation for known non-veg items
    if ((trueNonVegKeywords.some(k => lowerName.includes(k)) || trueNonVegKeywords.some(k => rawLower.includes(k))) && !lowerName.includes("paneer")) {
      profile.foodType = translatedNonVeg;
      profile.menuGroup = translatedNonVegGroup;
      profile.suggestions.menuGroup[0] = translatedNonVegGroup;
      profile.suggestions.foodType = [
        translatedNonVeg,
        await translateTerm("Egg / Meat", targetLanguage),
        await translateTerm("Halal Certified", targetLanguage),
        await translateTerm("High Protein", targetLanguage),
        await translateTerm("Non-Veg Special", targetLanguage)
      ];
    }

    return res.json(profile);

  } catch (err) {
    console.error("Core engine specifications exception:", err.message);

    const fbDescription = isLiquor 
      ? [`Premium ${dishName} served chilled.`,`Smooth ${dishName} for a perfect evening.`,`Classic ${dishName} — a bar favourite.`,`Expertly crafted ${dishName}.`,`${dishName} — on the rocks or neat.`] 
      : [`Delicious ${dishName} prepared fresh.`,`Classic ${dishName} — a crowd favourite.`,`Premium ${dishName} crafted with care.`,`Authentic ${dishName} — must try!`,`Signature ${dishName} from our kitchen.`];

    const fbMenuGroup = isLiquor ? ["Bar Menu","Alcoholic","Spirits","Premium Bar","Cocktails"] : isBeverage ? ["Beverages","Cold Drinks","Hot Drinks","Fresh Drinks","Mocktails"] : forcedCategory === "Dessert" ? ["Desserts","Indian Sweets","Ice Creams","Western Desserts","Pastries"] : forcedCategory === "Starter" ? ["Starters","Appetizers","Tandoor","Snacks","Kebabs"] : ["Main Course","Curries & Gravies","Chef's Special","Rice & Biryani","Signature Dishes"];
    const fbClassification = ["Best Seller","Chef's Special","Must Try","Trending","New Arrival"];
    const fbCategoryChips = isLiquor ? ["Beverages","Bar Menu","Spirits","Cocktails","Chef's Special"] : forcedCategory === "Dessert" ? ["Desserts","Pastries","Chef's Special","Ice Cream","Main Course"] : forcedCategory === "Starter" ? ["Starters","Appetizers","Chef's Special","Main Course","Beverages"] : ["Main Course","Chef's Special","Trending Items","Starters","Desserts"];

    // Translate fallback text fields into the target language (category stays English by design)
    const [fbDescriptionT, fbMenuGroupT, fbClassificationT] = await Promise.all([
      Promise.all(fbDescription.map(d => translateTerm(d, targetLanguage))),
      Promise.all(fbMenuGroup.map(g => translateTerm(g, targetLanguage))),
      Promise.all(fbClassification.map(c => translateTerm(c, targetLanguage)))
    ]);

    const fallbackProfile = {
      dishName:        dishName,
      shortName:       fbShortName[0],
      description:     fbDescriptionT[0],
      category:        forcedCategory ? (forcedCategory === "Beverage" ? "Beverages" : forcedCategory === "Dessert" ? "Desserts" : forcedCategory === "Starter" ? "Starters" : "Main Course") : "Main Course",
      menuGroup:       fbMenuGroupT[0],
      cuisine:         fbCuisine[0],
      foodType:        fbFoodType[0],
      classification:  fbClassificationT[0],
      uom:             uomVariants[0],
      prepTime:        prepTimeVariants[0],
      price:           priceVariants[0],
      tax:             taxVariants[0],
      image:           finalImageUrls[0],
      detectedLanguage: targetLanguage,
      suggestions: {
        shortName:      fbShortName,
        description:    fbDescriptionT,
        category:       fbCategoryChips,
        menuGroup:      fbMenuGroupT,
        cuisine:        fbCuisine,
        foodType:       fbFoodType,
        classification: fbClassificationT,
        uom:            uomVariants,
        prepTime:       ensureFive(null, prepTimeVariants),
        price:          priceVariants,
        tax:            taxVariants,
        image:          finalImageUrls,
      }
    };
    
    // Match fallback rules too
    if (lowerName.includes("butter chicken") || rawLower.includes("butter chicken")) {
      fallbackProfile.category = "Main Course";
      fallbackProfile.menuGroup = translatedMainCourseGroup;
      fallbackProfile.suggestions.category[0] = "Main Course";
      fallbackProfile.suggestions.menuGroup[0] = translatedMainCourseGroup;
    }

    if ((trueNonVegKeywords.some(k => lowerName.includes(k)) || trueNonVegKeywords.some(k => rawLower.includes(k))) && !lowerName.includes("paneer")) {
      fallbackProfile.foodType = translatedNonVeg;
      fallbackProfile.menuGroup = translatedNonVegGroup;
      fallbackProfile.suggestions.foodType[0] = translatedNonVeg;
      fallbackProfile.suggestions.menuGroup[0] = translatedNonVegGroup;
    }

    return res.json(fallbackProfile);
  }
});

// ─── Decision endpoint ─────────────────────────────────────────────────────────
app.post("/decision", (req, res) => {
  const { decision, dishName, details } = req.body || {};
  res.json({ ok: true, decision, dish: { dishName, details: details || {} } });
});


// Local dev: listen; Vercel: export
if (require.main === module) {
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
}
// Vercel serverless handler
module.exports = (req, res) => app(req, res);