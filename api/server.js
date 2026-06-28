console.log("MULTILINGUAL INDIAN RESTAURANT ENGINE v3 — Strict Language-Mirrored Output + Accurate Image Search");

const express = require("express");
const cors    = require("cors");
const Groq    = require("groq-sdk");
require("dotenv").config();

// Node < 18 doesn't have fetch built-in; use node-fetch if available
if (!globalThis.fetch) {
  try { globalThis.fetch = require("node-fetch"); } catch (_) { /* Node 18+ has it */ }
}


const app = express();
app.use(cors());
app.use(express.json());

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
const PIZZA_DB    = ["Margherita Pizza","Paneer Tikka Pizza","Chicken Tikka Pizza","Veggie Supreme Pizza","Pepperoni Pizza","BBQ Chicken Pizza","Mushroom & Corn Pizza","Cheese Burst Pizza"];
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
  sandwich:     [U("photo-1528735602780-2552fd46c7af"),U("photo-1485963631004-f2f00b1d6606"),U("photo-1481070414801-51fd732d7184"),U("photo-1509722747041-616f39b57569"),U("photo-1553909489-cd47e0907980")],
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
  Telugu:     { script:"Telugu",     examples:["మెయిన్ కోర్సు","బెస్ట్ సెల్లర్","ಘಾಟైన మరియు రుచಿಕరమైన","భారతీయ వంటకాలు","శాకాహారం"] },
  Kannada:    { script:"Kannada",    examples:["ಮುಖ್ಯ ಕೋರ್ಸ್","ಅತ್ಯುತ್ತಮ ಮಾರಾಟ","ಖಾರ ಮತ್ತು ರುಚಿಕರ","ಭಾರತೀಯ ಪಾಕಶಾಲೆ","ಶಾಕಾಹಾರ","ಉತ್ತರ ಭಾರತೀಯ","ವಿಶೇಷ ಕೊಡುಗೆ"] },
  Malayalam:  { script:"Malayalam",  examples:["മെയിൻ കോഴ്‌സ്","ഏറ്റവും കൂടുതൽ വിൽക്കുന്നത്","മൂർച്ചയേറിയതും രുചികരവും","ഇന്ത്യൻ ഭക്ഷണം","സസ്യാഹാരം"] },
  Marathi:    { script:"Devanagari", examples:["मुख्य जेवण","सर्वाधिक विकली जाणारी","तिखट आणि चवदार","भारतीय पाकशैली","शाकाहारी"] },
  Bengali:    { script:"Bengali",    examples:["মূল কোর্স","সবচেয়ে বেশি বিক্রি","ঝাল এবং সুস্বাদু","भारतीय রন্ধনশৈলী","নিরামিষ"] },
  Gujarati:   { script:"Gujarati",   examples:["મુખ્ય કોર્સ","સૌથી વધુ વેચાણ","તીખું અને સ્વાદಿષ્ટ","ભારતીય ભોજન","શાકાહારી"] },
  Punjabi:    { script:"Gurmukhi",   examples:["ਮੁੱਖ ਕੋਰਸ","ਸਭ ਤੋਂ ਵੱਧ ਵਿਕਣ ਵਾਲਾ","ਮਸਾਲੇਦาร ಮತ್ತು ਸੁਆਦੀ","ਭਾਰਤੀ ਪਕਵาน","ਸ਼ਾਕಾਹਾਰੀ"] },
  Odia:       { script:"Odia",       examples:["මୁଖ್ಯ ପଦ","ସර්ვაଧಿಕ ବିକ୍ରය","ଝಾଳ ଏବಂ ସୁସ୍ୱାଦು","ଭାରತୀಯ රೋಷေଇ","ନිରାମိଷ"] },
  Urdu:       { script:"Nastaliq",   examples:["مرکزی کورس","سب سے زیادہ فروخت","مسالیدار اور لذیذ","ہندوستانی کھانا","سبزی خور"] },
  Assamese:   { script:"Assamese",   examples:["মুখ্য পদ","সর্বাধিক বিক্রী","জলা আৰু সুস্বাদু","ভাৰতীয় ৰন্ধন","নিৰামিষ"] },
  Arabic:     { script:"Arabic",     examples:["الطبق الرئيسي","الأكثر مبيعاً","حار ولذيذ","المطبخ الهندي","نباتي"] },
  French:     { script:"Latin",      examples:["Plat principal","Meilleure vente","Épicé et délicieux","Cuisine indienne","Végétarien"] },
  German:     { script:"Latin",      examples:["Hauptgericht","Bestseller","Würzig und lecker","Indische Küche","Vegetarisch"] },
  Spanish:    { script:"Latin",      examples:["Plato principal","El más vendido","Picante y delicioso","Cocina india","Vegetariano"] },
  Italian:    { script:"Latin",      examples:["Piatto principale","Il più venduto","Piccante e delizioso","Cucina indiana","Vegetariano"] },
  Portuguese: { script:"Latin",      examples:["Prato principal","O mais vendido","Picante e delicioso","Cozinha indiana","Vegetariano"] },
  Chinese:    { script:"Chinese",    examples:["主菜","畅销","辛辣美味","印度料理","素食"] },
  Japanese:   { script:"Japanese",   examples:["メインコース","ベストセラー","スパイシーで美味しい","インド料理","ベジタリアン"] },
  Korean:     { script:"Korean",     examples:["메인 코스","베스트셀러","맵고 맛있는","인도 요리","채식주의자"] },
  Russian:    { script:"Cyrillic",   examples:["Основное блюдо","Хит продаж","Острое и вкусное","Индийская кухня","Вегетарианское"] },
  Turkish:    { script:"Latin",      examples:["Ana yemek","En çok satan","Baharatlı et lezzetli","Hint mutfağı","Vejetaryen"] },
};

// ─── Google Custom Search Image Fetch ─────────────────────────────────────────
async function googleImageSearch(dishName) {
  const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY || process.env.REACT_APP_GOOGLE_API_KEY || "";
  const GOOGLE_CX      = process.env.GOOGLE_CX      || process.env.REACT_APP_GOOGLE_CX      || "";

  if (!GOOGLE_API_KEY || !GOOGLE_CX) {
    console.log("⚠️  Google CSE keys not set — using curated Unsplash fallback");
    return null;
  }

  const searchQuery = encodeURIComponent(`${dishName} food restaurant dish professional photography`);
  const url = `https://www.googleapis.com/customsearch/v1?key=${GOOGLE_API_KEY}&cx=${GOOGLE_CX}&q=${searchQuery}&searchType=image&num=5&imgSize=large&imgType=photo&safe=active&fields=items(link)`;

  try {
    const res  = await fetch(url);
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
    console.log(`⚠️  Google CSE returned only ${urls.length} images — falling back`);
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
      if (lower.includes(term) || term.includes(lower)) {
        const score = term.length + (lower === term ? 50 : 0);
        if (score > bestScore) { bestScore = score; bestKey = rule.key; }
      }
    }
  }
  if (bestKey && DISH_SETS[bestKey]) return DISH_SETS[bestKey];

  let cat = "mainCourse";
  if (["beer","wine","whisky","whiskey","vodka","rum","gin","tequila","cocktail","mocktail"].some(k => lower.includes(k))) cat = "liquor";
  else if (["juice","lemonade","nimbu"].some(k => lower.includes(k))) cat = "juice";
  else if (["tea","chai","coffee","shake","lassi","soda","cola","water","milk"].some(k => lower.includes(k))) cat = "beverage";
  else if (["soup","shorba","rasam"].some(k => lower.includes(k))) cat = "soup";
  else if (["ice cream","kulfi","halwa","gulab jamun","jalebi","rasgulla","cake","brownie","dessert"].some(k => lower.includes(k))) cat = "dessert";
  else if (["biryani","pulao","fried rice","khichdi"].some(k => lower.includes(k))) cat = "rice";
  else if (["naan","roti","paratha","kulcha","puri","bhatura"].some(k => lower.includes(k))) cat = "bread";
  else if (["tikka","kebab","chaat","fry","manchurian","chilli","pakoda","samosa","momos"].some(k => lower.includes(k))) cat = "starter";

  const catKey = CATEGORY_SET[cat] || "premiumPlated";
  return DISH_SETS[catKey] || DISH_SETS.premiumPlated;
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
          {
            role: "system",
            content: `You are a language detector. Identify the primary language of the input text.
Choose EXACTLY ONE from this list: ${SUPPORTED_LANGUAGES.join(", ")}.
Return ONLY the language name. No punctuation, no explanation.
If unsure or standard English, return "English".`
          },
          { role: "user", content: text }
        ],
        model: "llama-3.1-8b-instant",
        temperature: 0.0,
        max_tokens: 10
      });
      const lang = (response.choices[0]?.message?.content || "English").trim();
      return SUPPORTED_LANGUAGES.includes(lang) ? lang : "English";
    } catch { return "English"; }
  }

  return "English";
}

// ─── Translation to English (for image lookups and category detection) ────────
async function translateToEnglish(text) {
  try {
    const response = await groq.chat.completions.create({
      messages: [
        { role:"system", content:"You are a translation utility for Indian and international food items. Translate the input dish/food name into standard English culinary terminology. Return ONLY the English name, no explanation, no punctuation beyond the name itself." },
        { role:"user",   content: text }
      ],
      model: "llama-3.1-8b-instant",
      temperature: 0.0,
      max_tokens: 30
    });
    return (response.choices[0]?.message?.content || text).trim();
  } catch { return text; }
}

// ─── Search endpoint ───────────────────────────────────────────────────────────
app.get("/search", async (req, res) => {
  const originalQuery = String(req.query.q || "").trim();
  if (originalQuery.length < 2) return res.json([]);

  const hasNonLatin    = /[^\x00-\x7F]/.test(originalQuery);
  const targetLanguage = await detectLanguage(originalQuery);
  const englishQuery   = hasNonLatin || targetLanguage !== "English"
    ? (await translateToEnglish(originalQuery)).toLowerCase()
    : originalQuery.toLowerCase();

  console.log(`Search: "${originalQuery}" → detected: ${targetLanguage}, english: "${englishQuery}"`);

  if (englishQuery === "pizza") return res.json(PIZZA_DB.map(n => ({ dishName: n, confidence: 100, inputLanguage: targetLanguage })));
  if (englishQuery.includes("ice cream") || englishQuery === "ice") return res.json(ICECREAM_DB.map(n => ({ dishName: n, confidence: 100, inputLanguage: targetLanguage })));

  const isBeverage = ["beer","vodka","rum","whiskey","whisky","gin","wine","liquor","drink","juice","lassi","shake","soda","cola","mango"].some(k => englishQuery.includes(k));
  const isDessert  = ["dessert","sweet","jamun","rasmalai","kulfi","halwa","ice cream","cake","ice"].some(k => englishQuery.includes(k));
  const isStarter  = ["starter","tikka","kebab","soup","fry","fries","chilli","manchurian","samosa","pakoda"].some(k => englishQuery.includes(k));

  let primaryPool = [], contextRule = "";
  if (isBeverage)     { primaryPool = BEVERAGES_DB; contextRule = "BEVERAGES, LIQUOR, and JUICES only."; }
  else if (isDessert) { primaryPool = DESSERTS_DB;  contextRule = "INDIAN DESSERTS and ICE CREAMS only."; }
  else if (isStarter) { primaryPool = STARTERS_DB;  contextRule = "INDIAN APPETIZERS and STARTERS only."; }
  else                { primaryPool = [...MAINS_DB,...STARTERS_DB,...DESSERTS_DB,...BEVERAGES_DB]; contextRule = "authentic Indian restaurant menu items."; }

  const localMatches = primaryPool.filter(item => item.toLowerCase().includes(englishQuery));
  if (localMatches.length >= 3) {
    return res.json(localMatches.map(n => ({ dishName: n, confidence: 100, inputLanguage: targetLanguage })).slice(0, 15));
  }

  try {
    const response = await groq.chat.completions.create({
      messages: [
        {
          role: "system",
          content: `You are an Indian Restaurant POS database. The user searched in "${targetLanguage}".
IMPORTANT: Return dish names in ENGLISH always for the search results.
STRICT: ${contextRule}
Return a valid JSON object with a "dishes" array.`
        },
        {
          role: "user",
          content: `Return up to 12 real Indian restaurant menu items matching "${originalQuery}" (English meaning: "${englishQuery}").
Each item: { "dishName": "<English name>", "confidence": <60-100> }.
Format: { "dishes": [...] }`
        }
      ],
      model: "llama-3.1-8b-instant",
      temperature: 0.0,
      response_format: { type: "json_object" }
    });

    const data     = JSON.parse(response.choices[0]?.message?.content || "{}");
    let aiDishes   = (data.dishes || []).map(d => ({ ...d, inputLanguage: targetLanguage }));
    if (englishQuery.includes("pizza")) aiDishes = aiDishes.filter(d => d.dishName.toLowerCase().includes("pizza"));
    return res.json(aiDishes);
  } catch (error) {
    console.error("Search error:", error.message);
    return res.json(localMatches.map(n => ({ dishName: n, confidence: 95, inputLanguage: targetLanguage })));
  }
});

// ─── Suggest-all endpoint ──────────────────────────────────────────────────────
app.post("/suggest-all", async (req, res) => {
  const { dishName, inputLanguage: clientLang } = req.body || {};
  if (!dishName) return res.status(400).json({ error: "dishName is required." });

  const targetLanguage = clientLang && SUPPORTED_LANGUAGES.includes(clientLang)
    ? clientLang
    : await detectLanguage(dishName);

  const englishName = targetLanguage !== "English"
    ? await translateToEnglish(dishName)
    : dishName;

  const lowerName = englishName.toLowerCase();
  console.log(`Suggest-all: "${dishName}" | lang: ${targetLanguage} | english: "${englishName}"`);

  let forcedCategory = null;
  if (["beer","vodka","rum","whiskey","whisky","gin","wine","liquor","cocktail","juice","shake","lassi","soda","tea","coffee"].some(k => lowerName.includes(k))) forcedCategory = "Beverage";
  else if (["ice cream","cake","pudding","sweet","dessert","gulab jamun","kulfi","rasgulla","halwa","rasmalai"].some(k => lowerName.includes(k))) forcedCategory = "Dessert";
  else if (["soup","tikka","kebab","wings","fry","fries","chilli","manchurian","samosa","pakoda","chaat","starter"].some(k => lowerName.includes(k))) forcedCategory = "Starter";
  else if (lowerName.includes("pizza")) forcedCategory = "Main Course";

  const finalImageUrls = await generateImageSuggestions(dishName, englishName);

  const langInfo    = LANGUAGE_SCRIPT_EXAMPLES[targetLanguage] || null;
  const isEnglish   = targetLanguage === "English";
  const scriptGuide = langInfo
    ? `SCRIPT: You MUST write EVERYTHING in ${langInfo.script} script. Example translations: ${langInfo.examples.join(", ")}`
    : isEnglish
      ? "Write in clear English."
      : `Write strictly in ${targetLanguage} language/script.`;

  const isLiquor   = ["beer","vodka","rum","whiskey","whisky","gin","wine","tequila","brandy","cognac","cocktail"].some(k => lowerName.includes(k));
  const isBeverage = forcedCategory === "Beverage";

  const defaultUom  = isLiquor ? "Peg" : isBeverage ? "Glass" : forcedCategory === "Dessert" ? "Serve" : "Plate";
  const defaultTax  = isLiquor ? "20% VAT" : "5% GST";
  const basePrice   = isLiquor ? 350 : isBeverage ? 120 : forcedCategory === "Dessert" ? 180 : 250;

  const uomVariants = isLiquor
    ? ["Peg","Pint","Glass","Bottle","Large Peg"]
    : isBeverage
      ? ["Glass","Cup","Bottle","Serve","Large Glass"]
      : forcedCategory === "Dessert"
        ? ["Serve","Plate","Bowl","Scoop","Piece"]
        : forcedCategory === "Starter"
          ? ["Plate","Portion","Piece","Half Plate","Skewer"]
          : ["Plate","Portion","Bowl","Half Plate","Family Pack"];

  const taxVariants = isLiquor
    ? ["20% VAT","25% VAT","18% GST","22% VAT","28% GST"]
    : ["5% GST","12% GST","18% GST","GST Inclusive","Tax Extra"];

  const priceVariants = [
    `Rs. ${basePrice}`,
    `Rs. ${Math.round(basePrice * 0.8)}`,
    `Rs. ${Math.round(basePrice * 1.2)}`,
    `Rs. ${Math.round(basePrice * 1.4)}`,
    `Rs. ${Math.round(basePrice * 0.6)}`,
  ];

  try {
    const prompt = `You are a multilingual restaurant menu content generator. Your ONLY job is to generate menu field values.

TARGET LANGUAGE: "${targetLanguage}"
${scriptGuide}

Dish name (as typed by user): "${dishName}"
English dish name: "${englishName}"
Dish department: ${forcedCategory || "auto-detect"}

═══════════════════════════════════════════════════════
ABSOLUTE RULES — VIOLATION = WRONG OUTPUT:
1. ALL text fields (shortName, description, menuGroup, cuisine, foodType, classification) MUST be written ENTIRELY in ${targetLanguage} language/script. Absolutely NO English characters or mixing allowed for these text fields.
2. "category" values MUST always be one of these EXACT English strings: "Beverages", "Desserts", "Starters", "Main Course"
3. "uom" values MUST be one of: "Portion","Plate","Glass","Pint","Peg","Cup","Bowl","Serve","Piece"
4. "prepTime" values like "15 mins", "price" like "Rs. 250", "tax" like "5% GST" — keep numeric format
5. Generate exactly 5 variations for every field inside the "variations" object block.
6. descriptions must be enticing, under 20 words each, fully in ${targetLanguage}.
═══════════════════════════════════════════════════════

Return ONLY a JSON object with this structure:
{
  "detectedCategory": "Beverage|Dessert|Starter|Main Course",
  "shortName":      "<dish display name in ${targetLanguage}>",
  "description":    "<enticing description in ${targetLanguage}, under 20 words>",
  "category":       "<ENGLISH: Beverages|Desserts|Starters|Main Course>",
  "menuGroup":      "<menu section name in ${targetLanguage}>",
  "cuisine":        "<cuisine type in ${targetLanguage}>",
  "foodType":       "<dietary type in ${targetLanguage}>",
  "classification": "<tag like Best Seller in ${targetLanguage}>",
  "uom":            "${defaultUom}",
  "prepTime":       "15 mins",
  "price":          "Rs. ${basePrice}",
  "tax":            "${defaultTax}",
  "variations": {
    "shortName":      ["<5 different display names for '${dishName}' in ${targetLanguage}>"],
    "description":    ["<5 different enticing descriptions in ${targetLanguage}, under 20 words each>"],
    "menuGroup":      ["<5 different menu section names in ${targetLanguage}>"],
    "cuisine":        ["<5 different cuisine type labels in ${targetLanguage}>"],
    "foodType":       ["<5 different dietary labels in ${targetLanguage}>"],
    "classification": ["<5 different promotional tags in ${targetLanguage}>"],
    "category":       ["Beverages","Desserts","Starters","Main Course","Chef's Special"],
    "uom":            ${JSON.stringify(uomVariants)},
    "prepTime":       ["5 mins","10 mins","15 mins","20 mins","25 mins"],
    "price":          ${JSON.stringify(priceVariants)},
    "tax":            ${JSON.stringify(taxVariants)}
  }
}`;

    const response = await groq.chat.completions.create({
      messages: [
        { role:"system", content:`You are a multilingual restaurant content engine. Target language: ${targetLanguage}. All text fields must be perfectly localized in ${targetLanguage} script.` },
        { role:"user",   content: prompt }
      ],
      model: "llama-3.1-70b-versatile",
      temperature: 0.1,
      response_format: { type: "json_object" }
    });

    const parsed = JSON.parse(response.choices[0]?.message?.content || "{}");
    const aiCategory = forcedCategory || parsed.detectedCategory || "Main Course";
    const englishCategory = aiCategory === "Beverage" ? "Beverages"
      : aiCategory === "Dessert" ? "Desserts"
      : aiCategory === "Starter" ? "Starters"
      : parsed.category || "Main Course";

    const variations = parsed.variations || {};

    const ensureFive = (arr, fallbacks) => {
      const safe = Array.isArray(arr) ? arr.filter(Boolean) : [];
      while (safe.length < 5) safe.push(fallbacks[safe.length % fallbacks.length]);
      return safe.slice(0, 5);
    };

    const finalProfile = {
      shortName:       parsed.shortName      || dishName,
      description:     parsed.description    || `Delicious ${englishName} prepared fresh.`,
      category:        englishCategory,
      menuGroup:       parsed.menuGroup      || (isBeverage ? "Beverages" : aiCategory === "Dessert" ? "Desserts" : "Main Course"),
      cuisine:         parsed.cuisine        || "North Indian",
      foodType:        parsed.foodType       || "Vegetarian",
      classification:  parsed.classification || "Best Seller",
      uom:             parsed.uom            || defaultUom,
      prepTime:        parsed.prepTime       || "15 mins",
      price:           parsed.price          || `Rs. ${basePrice}`,
      tax:             parsed.tax            || defaultTax,
      image:           finalImageUrls[0],
      detectedLanguage: targetLanguage,
      suggestions: {
        shortName:      ensureFive(variations.shortName,      [dishName,`${dishName} Special`,`Premium ${dishName}`,`Classic ${dishName}`,`Signature ${dishName}`]),
        description:    ensureFive(variations.description,    ["Freshly prepared.","Traditional recipe.","Chef's special blend.","Premium quality dish.","House favourite."]),
        category:       ["Beverages","Desserts","Starters","Main Course","Chef's Special"],
        menuGroup:      ensureFive(variations.menuGroup,      ["Main Course","Starters","Beverages","Desserts","Chef Special"]),
        cuisine:        ensureFive(variations.cuisine,        ["North Indian","South Indian","Mughlai","Indo-Chinese","Continental"]),
        foodType:       ensureFive(variations.foodType,       ["Vegetarian","Non-Vegetarian","Vegan","Eggetarian","Jain"]),
        classification: ensureFive(variations.classification, ["Best Seller","Chef Special","Trending","Popular","New Arrival"]),
        uom:            uomVariants,
        prepTime:       ["5 mins","10 mins","15 mins","20 mins","25 mins"],
        price:          priceVariants,
        tax:            ensureFive(variations.tax,            taxVariants),
        image:          finalImageUrls,
      }
    };

    // Strict rule adjustment for liquor items: wipe suggestions array to hide choices while keeping accept action functional
    if (isLiquor) {
      finalProfile.suggestions = {
        shortName: [], description: [], category: [], menuGroup: [],
        cuisine: [], foodType: [], classification: [], uom: [],
        prepTime: [], price: [], tax: [], image: finalImageUrls
      };
    }

    return res.json(finalProfile);

  } catch (error) {
    console.error("Suggest-all error:", error.message);
    const fallbackProfile = {
      shortName: dishName, description: `Delicious ${englishName} prepared fresh.`,
      category: "Main Course", menuGroup: "Main Course", cuisine: "North Indian",
      foodType: "Vegetarian", classification: "Popular", uom: defaultUom,
      prepTime: "15 mins", price: `Rs. ${basePrice}`, tax: defaultTax,
      image: finalImageUrls[0],
      detectedLanguage: targetLanguage,
      suggestions: {
        shortName:      [dishName,`${dishName} Special`,`Premium ${dishName}`,`Classic ${dishName}`,`Signature ${dishName}`],
        description:    ["Freshly prepared.","Traditional recipe.","Chef special.","Premium quality.","House favourite."],
        category:       ["Beverages","Desserts","Starters","Main Course","Chef's Special"],
        menuGroup:      ["Main Course","Starters","Beverages","Desserts","Chef Special"],
        cuisine:        ["North Indian","South Indian","Mughlai","Indo-Chinese","Continental"],
        foodType:       ["Vegetarian","Non-Vegetarian","Vegan","Eggetarian","Jain"],
        classification: ["Best Seller","Chef Special","Trending","Popular","New Arrival"],
        uom:            uomVariants,
        prepTime:       ["5 mins","10 mins","15 mins","20 mins","25 mins"],
        price:          priceVariants,
        tax:            taxVariants,
        image:          finalImageUrls,
      }
    };

    if (isLiquor) {
      fallbackProfile.suggestions = {
        shortName: [], description: [], category: [], menuGroup: [],
        cuisine: [], foodType: [], classification: [], uom: [],
        prepTime: [], price: [], tax: [], image: finalImageUrls
      };
    }
    return res.json(fallbackProfile);
  }
});

// ─── Decision endpoint ─────────────────────────────────────────────────────────
app.post("/decision", (req, res) => {
  const { decision, dishName, details } = req.body || {};
  res.json({ ok: true, decision, dish: { dishName, details: details || {} } });
});

// ─── Local dev: listen on PORT; Vercel: export the app ────────────────────────
if (require.main === module) {
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => console.log(`✅ Server running on http://localhost:${PORT}`));
}

module.exports = app;