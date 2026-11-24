"use client";

export type Lang = "en" | "hi" | "bn";

export const CROPS_META: Record<string, { icon: string; en: string; hi: string; bn: string; color: string; defaultPrice: number }> = {
  tomato: { icon: "🍅", en: "Tomato", hi: "टमाटर", bn: "টমেটো", color: "bg-red-100 border-red-300 text-red-900", defaultPrice: 24 },
  potato: { icon: "🥔", en: "Potato", hi: "आलू", bn: "আলু", color: "bg-amber-100 border-amber-300 text-amber-900", defaultPrice: 18 },
  onion: { icon: "🧅", en: "Onion", hi: "प्याज", bn: "পেঁয়াজ", color: "bg-purple-100 border-purple-300 text-purple-900", defaultPrice: 32 },
  spinach: { icon: "🥬", en: "Spinach", hi: "पालक", bn: "পালং শাক", color: "bg-emerald-100 border-emerald-300 text-emerald-900", defaultPrice: 20 },
  wheat: { icon: "🌾", en: "Wheat", hi: "गेहूं", bn: "গম", color: "bg-yellow-100 border-yellow-300 text-yellow-900", defaultPrice: 28 },
};

export const TRANSLATIONS = {
  en: {
    appName: "FarmPool Rural",
    tagline: "Group Selling for Village Farmers & Buyers",
    listenAudio: "Listen",
    stopAudio: "Stop",
    speakMic: "Speak Harvest",
    listening: "Listening... Speak now",
    offlineMode: "Offline Mode (No Internet)",
    offlineMsg: "Working offline. Your harvests & actions are saved safely on your phone and will sync once connected.",
    syncNow: "Sync Now",
    syncSuccess: "Synced successfully with mandi server!",
    unsyncedCount: "actions waiting to sync",
    
    // Farmer
    myFarm: "My Farm & Harvests",
    addHarvestTitle: "Add Harvest (फसल जोड़ें)",
    selectCrop: "1. Tap Your Crop",
    selectQuantity: "2. How Much Produce?",
    sacks: "Sacks (50 kg each)",
    totalKg: "Total kg",
    selectQuality: "3. Produce Quality",
    gradeA: "Grade A (Top Quality)",
    gradeB: "Grade B (Standard Market)",
    gradeC: "Grade C (Regular / Local)",
    whenHarvest: "4. When is it ready?",
    today: "Today",
    tomorrow: "Tomorrow",
    in2Days: "In 2 Days",
    in1Week: "In 1 Week",
    saveHarvestBtn: "Save My Harvest",
    saving: "Saving...",
    
    // Pools & Invitations
    buyerInvitations: "Buyer Group Invitations",
    noInvitations: "No group invitations yet. When a buyer order matches your crop, it will appear here with high earnings!",
    myShare: "My Share",
    joinPool: "Accept & Join Pool",
    decline: "Decline",
    joinedSuccess: "You Joined this Group!",
    seeEarnings: "Check My Rupees & Profit",
    netEarnings: "Net Rupee in Pocket",
    extraProfit: "Extra profit by pooling!",
    
    // Buyer
    procurementTitle: "Buyer Procurement",
    newRequirement: "Post What You Want to Buy",
    buyerPriceBand: "Your Price Offer (₹/kg)",
    findPoolBtn: "Find Farmer Group",
    confirmOrderBtn: "Confirm Group Order",
    
    // Auth & Navigation
    login: "Log In",
    demoLogins: "Quick One-Tap Demo Access",
    farmerRole: "Farmer (किसान)",
    buyerRole: "Buyer (खरीदार)",
    adminRole: "Mandi Manager (प्रबंधक)",
    logout: "Log Out",
    orders: "My Orders & Vehicle",
    dashboard: "Home",
  },
  hi: {
    appName: "फार्मपूल ग्रामीण",
    tagline: "गांव के किसानों और खरीदारों का समूह मंच",
    listenAudio: "सुनिए",
    stopAudio: "बंद करें",
    speakMic: "बोलकर फसल बताएं",
    listening: "सुन रहे हैं... अभी बोलिए",
    offlineMode: "बिना इंटरनेट मोड (ऑफलाइन)",
    offlineMsg: "इंटरनेट नहीं है, फिर भी सब काम करेगा! आपकी फसल फोन में सुरक्षित दर्ज हो गई है, नेटवर्क आने पर अपने आप सर्वर पर पहुंच जाएगी।",
    syncNow: "अभी सिंक करें",
    syncSuccess: "मंडी सर्वर से पूरा डेटा जुड़ गया!",
    unsyncedCount: "बदलाव सिंक होने बाकी हैं",

    // Farmer
    myFarm: "मेरा खेत और फसलें",
    addHarvestTitle: "अपनी फसल दर्ज करें",
    selectCrop: "1. अपनी फसल चुनिए",
    selectQuantity: "2. कितनी मात्रा है?",
    sacks: "बोरी (50 किलो की)",
    totalKg: "कुल किलो (kg)",
    selectQuality: "3. फसल की गुणवत्ता (क्वालिटी)",
    gradeA: "ग्रेड A (एकदम बढ़िया माल ⭐⭐⭐)",
    gradeB: "ग्रेड B (मध्यम मंडी माल ⭐⭐)",
    gradeC: "ग्रेड C (साधारण माल ⭐)",
    whenHarvest: "4. फसल कब तैयार होगी?",
    today: "आज",
    tomorrow: "कल",
    in2Days: "2 दिन में",
    in1Week: "1 हफ्ते में",
    saveHarvestBtn: "फसल सुरक्षित दर्ज करें",
    saving: "सहेज रहे हैं...",

    // Pools & Invitations
    buyerInvitations: "खरीदार के समूह आमंत्रण (ज्यादा मुनाफा)",
    noInvitations: "अभी कोई समूह आमंत्रण नहीं है। जैसे ही खरीदार का आर्डर मिलेगा, यहां दिखेगा!",
    myShare: "मेरा हिस्सा",
    joinPool: "हाँ, समूह में शामिल हों",
    decline: "मना करें",
    joinedSuccess: "आप समूह में जुड़ चुके हैं!",
    seeEarnings: "अपना मुनाफा और रुपये देखें",
    netEarnings: "जेब में आने वाले कुल रुपये",
    extraProfit: "अकेले बेचने से ज्यादा मुनाफा!",

    // Buyer
    procurementTitle: "खरीदार मांग (खरीद)",
    newRequirement: "खरीद की नई मांग दर्ज करें",
    buyerPriceBand: "खरीद भाव (₹ प्रति किलो)",
    findPoolBtn: "किसान समूह खोजें",
    confirmOrderBtn: "आर्डर पक्का करें",

    // Auth & Navigation
    login: "लॉग इन करें",
    demoLogins: "एक टच में डेमो खोलें",
    farmerRole: "किसान (Farmer)",
    buyerRole: "खरीदार (Buyer)",
    adminRole: "मंडी प्रबंधक (Admin)",
    logout: "बाहर निकलें",
    orders: "गाड़ी और आर्डर ट्रैकिंग",
    dashboard: "मुख्य पृष्ठ",
  },
  bn: {
    appName: "ফার্মপুল গ্রামীণ",
    tagline: "কৃষক ও ক্রেতাদের যৌথ সমবায় প্ল্যাটফর্ম",
    listenAudio: "শুনুন",
    stopAudio: "থামান",
    speakMic: "মুখে বলে ফসল জানান",
    listening: "শুনছি... এখন বলুন",
    offlineMode: "ইন্টারনেট ছাড়া মোড (অফলাইন)",
    offlineMsg: "ইন্টারনেট নেই, তবুও কাজ চলবে! আপনার ফসল ফোনে সংরক্ষিত হয়েছে, নেটওয়ার্ক আসলেই সিঙ্ক হয়ে যাবে।",
    syncNow: "এখনই সিঙ্ক করুন",
    syncSuccess: "মণ্ডি সার্ভারের সাথে সফলভাবে যুক্ত হয়েছে!",
    unsyncedCount: "টি তথ্য জমা আছে",

    // Farmer
    myFarm: "আমার খামার ও ফসল",
    addHarvestTitle: "আপনার ফসল যুক্ত করুন",
    selectCrop: "১. ফসল বেছে নিন",
    selectQuantity: "২. কত পরিমাণ আছে?",
    sacks: "বস্তা (৫০ কেজি প্রতিটি)",
    totalKg: "মোট কেজি (kg)",
    selectQuality: "৩. ফসলের মান (গুণমান)",
    gradeA: "গ্রেড A (সেরা মান ⭐⭐⭐)",
    gradeB: "গ্রেড B (মাঝারি মান ⭐⭐)",
    gradeC: "গ্রেড C (সাধারণ মান ⭐)",
    whenHarvest: "৪. ফসল কখন তৈরি হবে?",
    today: "আজ",
    tomorrow: "কাল",
    in2Days: "২ দিনের মধ্যে",
    in1Week: "১ সপ্তাহের মধ্যে",
    saveHarvestBtn: "ফসল সংরক্ষণ করুন",
    saving: "সংরক্ষণ হচ্ছে...",

    // Pools & Invitations
    buyerInvitations: "ক্রেতার যৌথ দল থেকে প্রস্তাব",
    noInvitations: "এখনও কোনও যৌথ প্রস্তাব আসেনি। ক্রেতার চাহিদা মিললে এখানে দেখতে পাবেন!",
    myShare: "আমার অংশ",
    joinPool: "হ্যাঁ, যৌথ দলে যোগ দিন",
    decline: "বাতিল করুন",
    joinedSuccess: "আপনি যৌথ দলে যোগ দিয়েছেন!",
    seeEarnings: "লাভ ও টাকার হিসেব দেখুন",
    netEarnings: "পকেটে আসার মোট টাকা",
    extraProfit: "একা বিক্রির চেয়ে বেশি লাভ!",

    // Buyer
    procurementTitle: "ক্রেতার চাহিদা",
    newRequirement: "নতুন চাহিদার তালিকা তৈরি করুন",
    buyerPriceBand: "দর (টাকা প্রতি কেজি)",
    findPoolBtn: "কৃষক দল খুঁজুন",
    confirmOrderBtn: "অর্ডার নিশ্চিত করুন",

    // Auth & Navigation
    login: "লগ ইন",
    demoLogins: "এক স্পর্শে ডেমো খুলুন",
    farmerRole: "কৃষক (Farmer)",
    buyerRole: "ক্রেতা (Buyer)",
    adminRole: "ম্যানেজার (Admin)",
    logout: "লগ আউট",
    orders: "অর্ডার ও গাড়ি ট্র্যাকিং",
    dashboard: "হোম",
  },
};

export function getLang(): Lang {
  if (typeof window === "undefined") return "hi";
  return (localStorage.getItem("fp_lang") as Lang) || "hi";
}

export function setLang(lang: Lang) {
  if (typeof window !== "undefined") {
    localStorage.setItem("fp_lang", lang);
    window.dispatchEvent(new Event("fp_lang_change"));
  }
}

export function t(key: keyof typeof TRANSLATIONS["en"], lang?: Lang): string {
  const l = lang || getLang();
  return (TRANSLATIONS[l] && TRANSLATIONS[l][key]) || TRANSLATIONS.en[key] || key;
}
