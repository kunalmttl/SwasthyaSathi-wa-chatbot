import axios from 'axios'
import { getUserByPhone, createUserForOnboarding, updateUserByPhone, saveChatLog } from './db.js'
import { processChatMessage } from './chat.js';
import { getAddressFromCoords } from './services.js';

const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN
const PHONE_NUMBER_ID = process.env.PHONE_NUMBER_ID
const GRAPH_BASE = `https://graph.facebook.com/v23.0/${PHONE_NUMBER_ID}/messages`

// ===================================================================
// MULTI-LANGUAGE TRANSLATION SYSTEM
// ===================================================================
const translations = 
{
  en: {
    welcome: "Welcome to SwasthyaSathi! How would you like to start?",
    startSetup: "Start Setup",
    askQuestion: "Ask a Question", 
    later: "Later",
    namePrompt: "Great — what is your full name?",
    agePrompt: "Please enter your age (in years).",
    invalidAge: "Please enter a valid numeric age (e.g., 35).",
    genderPrompt: "Please select your gender",
    male: "Male",
    female: "Female", 
    other: "Other",
    locationPrompt: "To find nearby vaccination drives, please share your current location.\n\nTap the button below to send your location.",
    conditionsPrompt: "Any chronic conditions? (e.g., Diabetes, Hypertension). Reply \"None\" if none.",
    consentPrompt: "Do you consent to store your health data securely for personalized advice?",
    agree: "I Agree",
    disagree: "I Do Not Agree",
    setupComplete: "Thank you — setup complete. You can ask health questions anytime.",
    noConsent: "Understood. Your personal data will not be saved. You may still ask general questions.",
    skipSetup: "You can ask your health question now. (Tip: include symptoms & duration)",
    laterMessage: "No problem. Message anytime to get started.",
    locationReceived: "Received your location!",
    messageNotSupported: "Message type not supported for onboarding. Please reply with text.",
    gotIt: "Got it — please type or choose an option.",
    nextStep: "Thanks. Proceeding to the next step.",
    selectionReceived: "Selection received.",
    imageDescriptionPrompt: "Thanks for the picture. Please describe your symptoms or questions related to this picture for better analysis."
  },
  hi: {
    welcome: "SwasthyaSathi में आपका स्वागत है! आप कैसे शुरुआत करना चाहते हैं?",
    startSetup: "सेटअप शुरू करें",
    askQuestion: "प्रश्न पूछें",
    later: "बाद में",
    namePrompt: "बहुत अच्छा — आपका पूरा नाम क्या है?",
    agePrompt: "कृपया अपनी आयु (वर्षों में) दर्ज करें।",
    invalidAge: "कृपया एक वैध संख्यात्मक आयु दर्ज करें (जैसे, 35)।",
    genderPrompt: "कृपया अपना लिंग चुनें",
    male: "पुरुष",
    female: "महिला",
    other: "अन्य",
    locationPrompt: "नजदीकी टीकाकरण केंद्र खोजने के लिए, कृपया अपना वर्तमान स्थान साझा करें।\n\nअपना स्थान भेजने के लिए नीचे दिए गए बटन पर टैप करें।",
    conditionsPrompt: "कोई पुरानी बीमारी? (जैसे, मधुमेह, उच्च रक्तचाप)। यदि कोई नहीं है तो \"कोई नहीं\" उत्तर दें।",
    consentPrompt: "क्या आप व्यक्तिगत सलाह के लिए अपना स्वास्थ्य डेटा सुरक्षित रूप से संग्रहीत करने की सहमति देते हैं?",
    agree: "मैं सहमत हूं",
    disagree: "मैं सहमत नहीं हूं",
    setupComplete: "धन्यवाद — सेटअप पूरा हुआ। आप कभी भी स्वास्थ्य प्रश्न पूछ सकते हैं।",
    noConsent: "समझ गया। आपका व्यक्तिगत डेटा संग्रहीत नहीं किया जाएगा। आप फिर भी सामान्य प्रश्न पूछ सकते हैं।",
    skipSetup: "आप अब अपना स्वास्थ्य प्रश्न पूछ सकते हैं। (सुझाव: लक्षण और अवधि शामिल करें)",
    laterMessage: "कोई समस्या नहीं। शुरुआत करने के लिए कभी भी संदेश भेजें।",
    locationReceived: "आपका स्थान प्राप्त हुआ!",
    messageNotSupported: "ऑनबोर्डिंग के लिए संदेश प्रकार समर्थित नहीं है। कृपया टेक्स्ट के साथ उत्तर दें।",
    gotIt: "समझ गया — कृपया टाइप करें या कोई विकल्प चुनें।",
    nextStep: "धन्यवाद। अगले चरण पर जा रहे हैं।",
    selectionReceived: "चयन प्राप्त हुआ।"
  },
  bn: {
    welcome: "SwasthyaSathi-তে আপনাকে স্বাগতম! আপনি কীভাবে শুরু করতে চান?",
    startSetup: "সেটআপ শুরু করুন",
    askQuestion: "প্রশ্ন জিজ্ঞাসা করুন",
    later: "পরে",
    namePrompt: "দুর্দান্ত — আপনার পূর্ণ নাম কী?",
    agePrompt: "দয়া করে আপনার বয়স (বছরে) লিখুন।",
    invalidAge: "দয়া করে একটি বৈধ সংখ্যাসূচক বয়স লিখুন (যেমন, ৩৫)।",
    genderPrompt: "দয়া করে আপনার লিঙ্গ নির্বাচন করুন",
    male: "পুরুষ",
    female: "মহিলা",
    other: "অন্যান্য",
    locationPrompt: "কাছাকাছি টিকাদান কেন্দ্র খুঁজতে, দয়া করে আপনার বর্তমান অবস্থান শেয়ার করুন।\n\nআপনার অবস্থান পাঠাতে নিচের বোতামে ট্যাপ করুন।",
    conditionsPrompt: "কোনো দীর্ঘমেয়াদী রোগ? (যেমন, ডায়াবেটিস, উচ্চ রক্তচাপ)। কোনোটি না থাকলে \"কোনোটি নয়\" উত্তর দিন।",
    consentPrompt: "আপনি কি ব্যক্তিগতকৃত পরামর্শের জন্য আপনার স্বাস্থ্য ডেটা নিরাপদে সংরক্ষণ করতে সম্মতি দেন?",
    agree: "আমি সম্মত",
    disagree: "আমি সম্মত নই",
    setupComplete: "ধন্যবাদ — সেটআপ সম্পূর্ণ। আপনি যেকোনো সময় স্বাস্থ্য প্রশ্ন করতে পারেন।",
    noConsent: "বুঝেছি। আপনার ব্যক্তিগত ডেটা সংরক্ষণ করা হবে না। আপনি এখনও সাধারণ প্রশ্ন করতে পারেন।",
    skipSetup: "আপনি এখন আপনার স্বাস্থ্য প্রশ্ন করতে পারেন। (টিপ: লক্ষণ ও সময়কাল অন্তর্ভুক্ত করুন)",
    laterMessage: "কোনো সমস্যা নেই। শুরু করতে যেকোনো সময় মেসেজ করুন।",
    locationReceived: "আপনার অবস্থান পেয়েছি!",
    messageNotSupported: "অনবোর্ডিংয়ের জন্য বার্তার ধরন সমর্থিত নয়। দয়া করে টেক্সট দিয়ে উত্তর দিন।",
    gotIt: "বুঝেছি — দয়া করে টাইপ করুন বা একটি অপশন বেছে নিন।",
    nextStep: "ধন্যবাদ। পরবর্তী ধাপে এগিয়ে যাচ্ছি।",
    selectionReceived: "নির্বাচন পেয়েছি।"
  },
  te: {
    welcome: "SwasthyaSathi కు స్వాగతం! మీరు ఎలా ప్రారంభించాలని అనుకుంటున్নారు?",
    startSetup: "సెటప్ ప్రారంభించండి",
    askQuestion: "ప్రశ్న అడగండి",
    later: "తరువాత",
    namePrompt: "బాగుంది — మీ పూర్తి పేరు ఏమిటి?",
    agePrompt: "దయచేసి మీ వయస్సు (సంవత్సరాలలో) నమోదు చేయండి.",
    invalidAge: "దయచేసి చెల్లుబాటు అయ్యే సంఖ్యా వయస్సు నమోదు చేయండి (ఉదా, 35).",
    genderPrompt: "దయచేసి మీ లింగాన్ని ఎంచుకోండి",
    male: "పురుషుడు",
    female: "స్త్రీ",
    other: "ఇతర",
    locationPrompt: "సమీప టీకా కేంద్రాలను కనుగొనడానికి, దయచేసి మీ ప్రస్తుత స్థానాన్ని పంచుకోండి.\n\nమీ స్థానాన్ని పంపడానికి కింది బటన్‌పై ట్యాప్ చేయండి.",
    conditionsPrompt: "ఏదైనా దీర్ఘకాలిక వ్యాధులు? (ఉదా, మధుమేహం, అధిక రక్తపోటు). ఏవీ లేకపోతే \"ఏవీ లేవు\" అని సమాధానం ఇవ్వండి.",
    consentPrompt: "వ్యక్తిగత సలహా కోసం మీ ఆరోగ్య డేటాను సురక్షితంగా నిల్వ చేయడానికి మీరు సమ్మతిస్తారా?",
    agree: "నేను అంగీకరిస్తున్నాను",
    disagree: "నేను అంగీకరించను",
    setupComplete: "ధన్యవాదాలు — సెటప్ పూర్తయింది. మీరు ఎప్పుడైనా ఆరోగ్య ప్రశ్నలు అడగవచ్చు.",
    noConsent: "అర్థమైంది. మీ వ్యక్తిగత డేటా భద్రపరచబడదు. మీరు ఇప్పటికీ సాధారణ ప్రశ్నలు అడగవచ్చు.",
    skipSetup: "మీరు ఇప్పుడు మీ ఆరోగ్య ప్రశ్న అడగవచ్చు. (చిట్కా: లక్షణాలు & వ్యవధిని చేర్చండి)",
    laterMessage: "పర్వాలేదు. ప్రారంభించడానికి ఎప్పుడైనా మెసేజ్ చేయండి.",
    locationReceived: "మీ స్థానం అందుకున్నాను!",
    messageNotSupported: "ఆన్‌బోర్డింగ్ కోసం సందేశ రకం మద్దతు లేదు. దయచేసి టెక్స్ట్‌తో సమాధానం ఇవ్వండి.",
    gotIt: "అర్థమైంది — దయచేసి టైప్ చేయండి లేదా ఎంపిక ఎంచుకోండి.",
    nextStep: "ధన్యవాదాలు. తదుపరి దశకు వెళుతున్నాను.",
    selectionReceived: "ఎంపిక అందుకున్నాను."
  },
  ta: {
    welcome: "SwasthyaSathi க்கு வரவேற்கிறோம்! நீங்கள் எப்படி தொடங்க விரும்புகிறீர்கள்?",
    startSetup: "அமைப்பைத் தொடங்கு",
    askQuestion: "கேள்வி கேளுங்கள்",
    later: "பின்னர்",
    namePrompt: "சிறப்பு — உங்கள் முழுப் பெயர் என்ன?",
    agePrompt: "தயவுசெய்து உங்கள் வயதை (வருடங்களில்) உள்ளிடுங்கள்.",
    invalidAge: "தயவுசெய்து சரியான எண் வயதை உள்ளிடுங்கள் (உதா, 35).",
    genderPrompt: "தயவுசெய்து உங்கள் பாலினத்தைத் தேர்ந்தெடுக்கவும்",
    male: "ஆண்",
    female: "பெண்",
    other: "மற்றவை",
    locationPrompt: "அருகிலுள்ள தடுப்பூசி மையங்களைக் கண்டறிய, தயவுசெய்து உங்கள் தற்போதைய இருப்பிடத்தைப் பகிரவும்.\n\nஉங்கள் இருப்பிடத்தை அனுப்ப கீழே உள்ள பொத்தானைத் தட்டவும்.",
    conditionsPrompt: "ஏதேனும் நாள்பட்ட நோய்கள்? (உதா, நீரிழிவு, உயர் இரத்த அழுத்தம்). எதுவும் இல்லையென்றால் \"எதுவும் இல்லை\" என்று பதிலளிக்கவும்.",
    consentPrompt: "தனிப்பயனாக்கப்பட்ட ஆலோசனைக்காக உங்கள் சுகாதார தரவை பாதுகாப்பாக சேமிக்க ஒப்புக்கொள்கிறீர்களா?",
    agree: "நான் ஒப்புக்கொள்கிறேன்",
    disagree: "நான் ஒப்புக்கொள்ளவில்லை",
    setupComplete: "நன்றி — அமைப்பு முடிந்தது. நீங்கள் எப்போது வேண்டுமானாலும் சுகாதார கேள்விகள் கேட்கலாம்.",
    noConsent: "புரிந்தது. உங்கள் தனிப்பட்ட தரவு சேமிக்கப்படாது. நீங்கள் இன்னும் பொதுவான கேள்விகள் கேட்கலாம்.",
    skipSetup: "நீங்கள் இப்போது உங்கள் சுகாதார கேள்வியைக் கேட்கலாம். (குறிப்பு: அறிகுறிகள் & கால அளவு சேர்க்கவும்)",
    laterMessage: "பரவாயில்லை. தொடங்க எப்போது வேண்டுமானாலும் செய்தி அனுப்புங்கள்.",
    locationReceived: "உங்கள் இருப்பிடம் பெறப்பட்டது!",
    messageNotSupported: "ஆன்போர்டிங்கிற்கு செய்தி வகை ஆதரிக்கப்படவில்லை. தயவுசெய்து உரையுடன் பதிலளிக்கவும்.",
    gotIt: "புரிந்தது — தயவுசெய்து டைப் செய்யுங்கள் அல்லது ஒரு விருப்பத்தைத் தேர்ந்தெடுக்கவும்.",
    nextStep: "நன்றி. அடுத்த படிக்குச் செல்கிறோம்.",
    selectionReceived: "தேர்வு பெறப்பட்டது."
  },
  gu: {
    welcome: "SwasthyaSathi માં આપનું સ્વાગત છે! તમે કેવી રીતે શરૂ કરવા માંગો છો?",
    startSetup: "સેટઅપ શરૂ કરો",
    askQuestion: "પ્રશ્ન પૂછો",
    later: "પછી",
    namePrompt: "સરસ — તમારું પૂરું નામ શું છે?",
    agePrompt: "કૃપા કરીને તમારી ઉંમર (વર્ષોમાં) દાખલ કરો.",
    invalidAge: "કૃપા કરીને માન્ય સંખ્યાત્મક ઉંમર દાખલ કરો (જેમ કે, 35).",
    genderPrompt: "કૃપા કરીને તમારું લિંગ પસંદ કરો",
    male: "પુરુષ",
    female: "સ્ત્રી",
    other: "અન્ય",
    locationPrompt: "નજીકના રસીકરણ કેન્દ્રો શોધવા માટે, કૃપા કરીને તમારું વર્તમાન સ્થાન શેર કરો.\n\nતમારું સ્થાન મોકલવા માટે નીચેના બટન પર ટેપ કરો.",
    conditionsPrompt: "કોઈ લાંબા ગાળાની બિમારીઓ? (જેમ કે, મધુમેહ, ઉચ્ચ બ્લડ પ્રેશર). જો કોઈ નહીં હોય તો \"કોઈ નહીં\" જવાબ આપો.",
    consentPrompt: "શું તમે વ્યક્તિગત સલાહ માટે તમારો આરોગ્ય ડેટા સુરક્ષિત રીતે સંગ્રહ કરવા માટે સંમતિ આપો છો?",
    agree: "હું સંમત છું",
    disagree: "હું સંમત નથી",
    setupComplete: "આભાર — સેટઅપ પૂર્ણ. તમે કોઈપણ સમયે આરોગ્ય પ્રશ્નો પૂછી શકો છો.",
    noConsent: "સમજાયું. તમારો વ્યક્તિગત ડેટા સાચવવામાં આવશે નહીં. તમે હજી પણ સામાન્ય પ્રશ્નો પૂછી શકો છો.",
    skipSetup: "તમે હવે તમારો આરોગ્ય પ્રશ્ન પૂછી શકો છો. (ટીપ: લક્ષણો અને સમયગાળો શામેલ કરો)",
    laterMessage: "કોઈ વાંધો નહીં. શરૂ કરવા માટે કોઈપણ સમયે મેસેજ કરો.",
    locationReceived: "તમારું સ્થાન મળ્યું!",
    messageNotSupported: "ઓનબોર્ડિંગ માટે સંદેશ પ્રકાર સપોર્ટેડ નથી. કૃપા કરીને ટેક્સ્ટ સાથે જવાબ આપો.",
    gotIt: "સમજાયું — કૃપા કરીને ટાઇપ કરો અથવા વિકલ્પ પસંદ કરો.",
    nextStep: "આભાર. આગલા પગલા પર જઈ રહ્યા છીએ.",
    selectionReceived: "પસંદગી મળી."
  },
  mr: {
    welcome: "SwasthyaSathi मध्ये आपले स्वागत आहे! आपण कसे सुरुवात करू इच्छिता?",
    startSetup: "सेटअप सुरू करा",
    askQuestion: "प्रश्न विचारा",
    later: "नंतर",
    namePrompt: "उत्तम — आपले पूर्ण नाव काय आहे?",
    agePrompt: "कृपया आपले वय (वर्षांमध्ये) प्रविष्ट करा.",
    invalidAge: "कृपया वैध संख्यात्मक वय प्रविष्ट करा (उदा., 35).",
    genderPrompt: "कृपया आपले लिंग निवडा",
    male: "पुरुष",
    female: "स्त्री",
    other: "इतर",
    locationPrompt: "जवळील लसीकरण केंद्रे शोधण्यासाठी, कृपया आपले वर्तमान स्थान सामायिक करा.\n\nआपले स्थान पाठवण्यासाठी खाली दिलेल्या बटणावर टॅप करा.",
    conditionsPrompt: "काही दीर्घकालीन आजार? (उदा., मधुमेह, उच्च रक्तदाब). जर कोणतेही नसेल तर \"कोणतेही नाही\" उत्तर द्या.",
    consentPrompt: "वैयक्तिक सल्ल्यासाठी आपला आरोग्य डेटा सुरक्षितपणे संचयित करण्यास आपण संमती देता का?",
    agree: "मी सहमत आहे",
    disagree: "मी सहमत नाही",
    setupComplete: "धन्यवाद — सेटअप पूर्ण. आपण कधीही आरोग्य प्रश्न विचारू शकता.",
    noConsent: "समजले. आपला वैयक्तिक डेटा जतन केला जाणार नाही. आपण तरीही सामान्य प्रश्न विचारू शकता.",
    skipSetup: "आपण आता आपला आरोग्य प्रश्न विचारू शकता. (टिप: लक्षणे आणि कालावधी समाविष्ट करा)",
    laterMessage: "काही हरकत नाही. सुरुवात करण्यासाठी कधीही संदेश पाठवा.",
    locationReceived: "आपले स्थान मिळाले!",
    messageNotSupported: "ऑनबोर्डिंगसाठी संदेश प्रकार समर्थित नाही. कृपया मजकूरासह उत्तर द्या.",
    gotIt: "समजले — कृपया टाइप करा किंवा पर्याय निवडा.",
    nextStep: "धन्यवाद. पुढील पायरीकडे जात आहोत.",
    selectionReceived: "निवड मिळाली."
  },
  pa: {
    welcome: "SwasthyaSathi ਵਿੱਚ ਤੁਹਾਡਾ ਸਵਾਗਤ ਹੈ! ਤੁਸੀਂ ਕਿਵੇਂ ਸ਼ੁਰੂਆਤ ਕਰਨਾ ਚਾਹੁੰਦੇ ਹੋ?",
    startSetup: "ਸੈਟਅਪ ਸ਼ੁਰੂ ਕਰੋ",
    askQuestion: "ਸਵਾਲ ਪੁੱਛੋ",
    later: "ਬਾਅਦ ਵਿੱਚ",
    namePrompt: "ਬਹੁਤ ਵਧੀਆ — ਤੁਹਾਡਾ ਪੂਰਾ ਨਾਮ ਕੀ ਹੈ?",
    agePrompt: "ਕਿਰਪਾ ਕਰਕੇ ਆਪਣੀ ਉਮਰ (ਸਾਲਾਂ ਵਿੱਚ) ਦਾਖਲ ਕਰੋ।",
    invalidAge: "ਕਿਰਪਾ ਕਰਕੇ ਇੱਕ ਵੈਧ ਸੰਖਿਆਤਮਕ ਉਮਰ ਦਾਖਲ ਕਰੋ (ਜਿਵੇਂ, 35)।",
    genderPrompt: "ਕਿਰਪਾ ਕਰਕੇ ਆਪਣਾ ਲਿੰਗ ਚੁਣੋ",
    male: "ਮਰਦ",
    female: "ਔਰਤ",
    other: "ਹੋਰ",
    locationPrompt: "ਨੇੜਲੇ ਟੀਕਾਕਰਨ ਕੇਂਦਰ ਲੱਭਣ ਲਈ, ਕਿਰਪਾ ਕਰਕੇ ਆਪਣਾ ਮੌਜੂਦਾ ਸਥਾਨ ਸਾਂਝਾ ਕਰੋ।\n\nਆਪਣਾ ਸਥਾਨ ਭੇਜਣ ਲਈ ਹੇਠਾਂ ਦਿੱਤੇ ਬਟਨ 'ਤੇ ਟੈਪ ਕਰੋ।",
    conditionsPrompt: "ਕੋਈ ਪੁਰਾਣੀ ਬਿਮਾਰੀਆਂ? (ਜਿਵੇਂ, ਸ਼ੂਗਰ, ਹਾਈ ਬਲੱਡ ਪ੍ਰੈਸ਼ਰ)। ਜੇਕਰ ਕੋਈ ਨਹੀਂ ਤਾਂ \"ਕੋਈ ਨਹੀਂ\" ਜਵਾਬ ਦਿਓ।",
    consentPrompt: "ਕੀ ਤੁਸੀਂ ਵਿਅਕਤੀਗਤ ਸਲਾਹ ਲਈ ਆਪਣਾ ਸਿਹਤ ਡਾਟਾ ਸੁਰੱਖਿਅਤ ਰੂਪ ਵਿੱਚ ਸਟੋਰ ਕਰਨ ਦੀ ਸਹਿਮਤੀ ਦਿੰਦੇ ਹੋ?",
    agree: "ਮੈਂ ਸਹਿਮਤ ਹਾਂ",
    disagree: "ਮੈਂ ਸਹਿਮਤ ਨਹੀਂ ਹਾਂ",
    setupComplete: "ਧੰਨਵਾਦ — ਸੈਟਅਪ ਪੂਰਾ ਹੋਇਆ। ਤੁਸੀਂ ਕਿਸੇ ਵੀ ਸਮੇਂ ਸਿਹਤ ਸਵਾਲ ਪੁੱਛ ਸਕਦੇ ਹੋ।",
    noConsent: "ਸਮਝ ਗਿਆ। ਤੁਹਾਡਾ ਨਿੱਜੀ ਡਾਟਾ ਸੇਵ ਨਹੀਂ ਕੀਤਾ ਜਾਵੇਗਾ। ਤੁਸੀਂ ਫਿਰ ਵੀ ਆਮ ਸਵਾਲ ਪੁੱਛ ਸਕਦੇ ਹੋ।",
    skipSetup: "ਤੁਸੀਂ ਹੁਣ ਆਪਣਾ ਸਿਹਤ ਸਵਾਲ ਪੁੱਛ ਸਕਦੇ ਹੋ। (ਟਿੱਪ: ਲੱਛਣ ਅਤੇ ਸਮਾਂ ਸ਼ਾਮਲ ਕਰੋ)",
    laterMessage: "ਕੋਈ ਗੱਲ ਨਹੀਂ। ਸ਼ੁਰੂਆਤ ਕਰਨ ਲਈ ਕਿਸੇ ਵੀ ਸਮੇਂ ਮੈਸੇਜ ਕਰੋ।",
    locationReceived: "ਤੁਹਾਡਾ ਸਥਾਨ ਮਿਲ ਗਿਆ!",
    messageNotSupported: "ਔਨਬੋਰਡਿੰਗ ਲਈ ਮੈਸੇਜ ਕਿਸਮ ਸਹਾਇਤਾ ਨਹੀਂ ਹੈ। ਕਿਰਪਾ ਕਰਕੇ ਟੈਕਸਟ ਨਾਲ ਜਵਾਬ ਦਿਓ।",
    gotIt: "ਸਮਝ ਗਿਆ — ਕਿਰਪਾ ਕਰਕੇ ਟਾਈਪ ਕਰੋ ਜਾਂ ਇੱਕ ਵਿਕਲਪ ਚੁਣੋ।",
    nextStep: "ਧੰਨਵਾਦ। ਅਗਲੇ ਕਦਮ ਵੱਲ ਜਾ ਰਹੇ ਹਾਂ।",
    selectionReceived: "ਚੋਣ ਮਿਲੀ।"
  },
  ur: {
    welcome: "SwasthyaSathi میں آپ کا خوش آمدید! آپ کیسے شروعات کرنا چاہتے ہیں؟",
    startSetup: "سیٹ اپ شروع کریں",
    askQuestion: "سوال پوچھیں",
    later: "بعد میں",
    namePrompt: "بہت اچھا — آپ کا پورا نام کیا ہے؟",
    agePrompt: "براہ کرم اپنی عمر (سالوں میں) درج کریں۔",
    invalidAge: "براہ کرم ایک صحیح عددی عمر درج کریں (جیسے، 35)۔",
    genderPrompt: "براہ کرم اپنا جنس منتخب کریں",
    male: "مرد",
    female: "عورت",
    other: "دیگر",
    locationPrompt: "قریبی ویکسینیشن سنٹر تلاش کرنے کے لیے، براہ کرم اپنا موجودہ مقام شیئر کریں۔\n\nاپنا مقام بھیجنے کے لیے نیچے دیے گئے بٹن پر ٹیپ کریں۔",
    conditionsPrompt: "کوئی دائمی بیماریاں؟ (جیسے، ذیابیطس، ہائی بلڈ پریشر)۔ اگر کوئی نہیں تو \"کوئی نہیں\" جواب دیں۔",
    consentPrompt: "کیا آپ ذاتی مشورے کے لیے اپنا صحت کا ڈیٹا محفوظ طریقے سے محفوظ کرنے کی رضامندی دیتے ہیں؟",
    agree: "میں متفق ہوں",
    disagree: "میں متفق نہیں ہوں",
    setupComplete: "شکریہ — سیٹ اپ مکمل۔ آپ کبھی بھی صحت کے سوالات پوچھ سکتے ہیں۔",
    noConsent: "سمجھ گیا۔ آپ کا ذاتی ڈیٹا محفوظ نہیں کیا جائے گا۔ آپ پھر بھی عام سوالات پوچھ سکتے ہیں۔",
    skipSetup: "آپ اب اپنا صحت کا سوال پوچھ سکتے ہیں۔ (ٹپ: علامات اور مدت شامل کریں)",
    laterMessage: "کوئی بات نہیں۔ شروعات کرنے کے لیے کبھی بھی پیغام بھیجیں۔",
    locationReceived: "آپ کا مقام موصول ہوا!",
    messageNotSupported: "آن بورڈنگ کے لیے پیغام کی قسم تعاون یافتہ نہیں ہے۔ براہ کرم ٹیکسٹ کے ساتھ جواب دیں۔",
    gotIt: "سمجھ گیا — براہ کرم ٹائپ کریں یا ایک آپشن منتخب کریں۔",
    nextStep: "شکریہ۔ اگلے قدم کی طرف بڑھ رہے ہیں۔",
    selectionReceived: "انتخاب موصول ہوا۔"
  }
};

function getTranslatedText(languageCode, key, fallback = 'en') {
  const lang = languageCode || fallback;
  if (translations[lang] && translations[lang][key]) {
    return translations[lang][key];
  }
  return translations[fallback][key] || key;
}

// ===================================================================
// WHATSAPP MESSAGE SENDING FUNCTIONS
// ===================================================================

function headers() {
  return {
    Authorization: `Bearer ${WHATSAPP_TOKEN}`,
    'Content-Type': 'application/json'
  }
}

export async function sendText(to, text) {
  const payload = {
    messaging_product: 'whatsapp',
    to,
    text: { body: text }
  }
  try {
    const r = await axios.post(GRAPH_BASE, payload, { headers: headers() })
    return r.data
  } catch (e) {
    console.error('sendText error', e?.response?.data || e.message)
  }
}

// --- Onboarding Messages ---

export async function sendStartButtons(to) {
  const payload = {
    messaging_product: 'whatsapp',
    to,
    type: 'interactive',
    interactive: {
      type: 'button',
      body: { text: getTranslatedText('en', 'welcome') },
      action: {
        buttons: [
          { type: 'reply', reply: { id: 'start_setup', title: getTranslatedText('en', 'startSetup') } },
          { type: 'reply', reply: { id: 'ask_question', title: getTranslatedText('en', 'askQuestion') } },
          { type: 'reply', reply: { id: 'later', title: getTranslatedText('en', 'later') } }
        ]
      }
    }
  }
  try {
    return await axios.post(GRAPH_BASE, payload, { headers: headers() })
  } catch (e) { console.error('sendStartButtons error', e?.response?.data || e.message) }
}

export async function sendLanguageListPage1(to) {
  const payload = {
    messaging_product: 'whatsapp',
    to,
    type: 'interactive',
    interactive: {
      type: 'list',
      header: { type: 'text', text: 'Language Preference (1/3)' },
      body: { text: 'Choose your preferred language' },
      action: {
        button: 'Choose Language',
        sections: [{
          title: 'Languages',
          rows: [
            { id: 'as', title: 'অসমীয়া (Assamese)' },
            { id: 'ml', title: 'മലയാളം (Malayalam)' },
            { id: 'doi', title: 'डोगरी (Dogri)' },
            { id: 'mai', title: 'मैथिली (Maithili)' },
            { id: 'kn', title: 'ಕನ್ನಡ (Kannada)' },
            { id: 'sd', title: 'सिन्धी (Sindhi)' },
            { id: 'ks', title: 'कश्मीरी (Kashmiri)' },
            { id: 'bn', title: 'বাংলা (Bengali)' },
            { id: 'te', title: 'తెలుగు (Telugu)' },
            { id: 'lang_page_2', title: '➡️ More Languages' }
          ]
        }]
      }
    }
  };
  try {
    return await axios.post(GRAPH_BASE, payload, { headers: headers() });
  } catch (e) { console.error('sendLanguageListPage1 error', e?.response?.data || e.message); }
}

export async function sendLanguageListPage2(to) {
  const payload = {
    messaging_product: 'whatsapp',
    to,
    type: 'interactive',
    interactive: {
      type: 'list',
      header: { type: 'text', text: 'Language Preference (2/3)' },
      body: { text: 'Choose your preferred language' },
      action: {
        button: 'Choose Language',
        sections: [{
          title: 'Languages',
          rows: [
            { id: 'sat', title: 'संताली (Santali)' },
            { id: 'brx', title: 'बोड़ो (Bodo)' },
            { id: 'ta', title: 'தமிழ் (Tamil)' },
            { id: 'en', title: 'English' },
            { id: 'sa', title: 'संस्कृतम् (Sanskrit)' },
            { id: 'or', title: 'ଓଡ଼ିଆ (Odia)' },
            { id: 'gu', title: 'ગુજરાતી (Gujarati)' },
            { id: 'hi', title: 'हिन्दी (Hindi)' },
            { id: 'mni', title: 'মৈতৈ (Manipuri)' },
            { id: 'lang_page_3', title: '➡️ More Languages' }
          ]
        }]
      }
    }
  };
  try {
    return await axios.post(GRAPH_BASE, payload, { headers: headers() });
  } catch (e) { console.error('sendLanguageListPage2 error', e?.response?.data || e.message); }
}

export async function sendLanguageListPage3(to) {
    const payload = {
        messaging_product: 'whatsapp',
        to,
        type: 'interactive',
        interactive: {
            type: 'list',
            header: { type: 'text', text: 'Language Preference (3/3)' },
            body: { text: 'Choose your preferred language' },
            action: {
                button: 'Choose Language',
                sections: [{
                  title: 'Languages',
                  rows: [
                    { id: 'gom', title: 'कोंकणी (Konkani)' },
                    { id: 'ne', title: 'नेपाली (Nepali)' },
                    { id: 'mr', title: 'मराठी (Marathi)' },
                    { id: 'pa', title: 'ਪੰਜਾਬੀ (Punjabi)' },
                    { id: 'ur', title: 'اردو (Urdu)' }
                    ]
                  }]
            }
        }
    };
    try {
        return await axios.post(GRAPH_BASE, payload, { headers: headers() });
    } catch (e) { console.error('sendLanguageListPage3 error', e?.response?.data || e.message); }
}

export async function sendGenderButtons(to, userLang = 'en') {
  const payload = {
    messaging_product: 'whatsapp',
    to,
    type: 'interactive',
    interactive: {
      type: 'button',
      body: { text: getTranslatedText(userLang, 'genderPrompt') },
      action: {
        buttons: [
          { type: 'reply', reply: { id: 'gender_m', title: getTranslatedText(userLang, 'male') } },
          { type: 'reply', reply: { id: 'gender_f', title: getTranslatedText(userLang, 'female') } },
          { type: 'reply', reply: { id: 'gender_o', title: getTranslatedText(userLang, 'other') } }
        ]
      }
    }
  }
  try {
    return await axios.post(GRAPH_BASE, payload, { headers: headers() })
  } catch (e) { console.error('sendGenderButtons error', e?.response?.data || e.message) }
}

export async function sendLocationRequest(to, userLang = 'en') {
  const payload = {
    messaging_product: 'whatsapp',
    to,
    type: 'interactive',
    interactive: {
      type: 'location_request_message',
      body: { text: getTranslatedText(userLang, 'locationPrompt') },
      action: { name: 'send_location' }
    }
  };
  try {
    return await axios.post(GRAPH_BASE, payload, { headers: headers() });
  } catch (e) {
    console.error('sendLocationRequest error', e?.response?.data || e.message);
  }
}

export async function sendConsentButtons(to, userLang = 'en') {
  const payload = {
    messaging_product: 'whatsapp',
    to,
    type: 'interactive',
    interactive: {
      type: 'button',
      body: { text: getTranslatedText(userLang, 'consentPrompt') },
      action: {
        buttons: [
          { type: 'reply', reply: { id: 'consent_yes', title: getTranslatedText(userLang, 'agree') } },
          { type: 'reply', reply: { id: 'consent_no', title: getTranslatedText(userLang, 'disagree') } }
        ]
      }
    }
  }
  try {
    return await axios.post(GRAPH_BASE, payload, { headers: headers() })
  } catch (e) { console.error('sendConsentButtons error', e?.response?.data || e.message) }
}

// --- Proactive Alert Messages ---

export async function sendVaccinationList(to, sessionData) {
  const centers = sessionData.centers.slice(0, 10);
  if (centers.length === 0) return;

  const payload = {
    messaging_product: 'whatsapp',
    to,
    type: 'interactive',
    interactive: {
      type: 'list',
      header: { type: 'text', text: `💉 Vaccination Drives` },
      body: { text: `Select a center from the list below to see more details. (Pincode: ${sessionData.pincode})` },
      footer: { text: 'Please contact the center for more details.' },
      action: {
        button: 'Choose a Center',
        sections: [{
          title: `${sessionData.district}, ${sessionData.state}`,
          rows: centers.map((center, index) => ({
            id: `vaccine_center_${index + 1}`,
            title: center.name.substring(0, 24),
            description: `📍 ${center.address} | 🕒 ${center.timing}`.substring(0, 72)
          }))
        }]
      }
    }
  };
  try {
    console.log(`Sending vaccination list to ${to}`);
    return await axios.post(GRAPH_BASE, payload, { headers: headers() });
  } catch (e) {
    console.error('sendVaccinationList error', e?.response?.data || e.message);
  }
}

export async function sendOutbreakList(to, outbreakData) {
  const outbreaks = outbreakData.outbreaks.slice(0, 10);
  if (outbreaks.length === 0) return;

  const payload = {
    messaging_product: 'whatsapp',
    to,
    type: 'interactive',
    interactive: {
      type: 'list',
      header: { type: 'text', text: '🚨 Public Health Alert' },
      body: { text: `Active public health alerts have been reported in your state: *${outbreakData.state}*.` },
      footer: { text: 'Please take necessary precautions.' },
      action: {
        button: 'View Alerts',
        sections: [{
          title: `Reported on ${new Date().toLocaleDateString('en-IN')}`,
          rows: outbreaks.map((outbreak, index) => ({
            id: `outbreak_alert_${index + 1}`,
            title: outbreak.disease.substring(0, 24),
            description: `📍 ${outbreak.district} | 😷 Cases: ${outbreak.cases} | ⚠️ Status: ${outbreak.status}`.substring(0, 72)
          }))
        }]
      }
    }
  };
  try {
    console.log(`Sending outbreak alert to ${to}`);
    return await axios.post(GRAPH_BASE, payload, { headers: headers() });
  } catch (e) {
    console.error('sendOutbreakList error', e?.response?.data || e.message);
  }
}

// ===================================================================
// ONBOARDING LOGIC AND HANDLERS
// ===================================================================

export async function processOnboardingMessage(rawMessage) 
{
  const from = rawMessage.from;
  let user = await getUserByPhone(from);

  if (!user) {
    user = await createUserForOnboarding(from);
    await sendStartButtons(from);
    return;
  }

  const msgType = rawMessage.type;
  if (msgType === 'image') 
  {
    // If a user sends an image, handle it with a dedicated function
    await handleImageMessage(user, from, rawMessage.image);
    return; // Stop further processing
  }
  
  if (user.onboarding_step === 'done' || user.verified) {
    await processChatMessage(rawMessage);
    return;
  }
  

  try {
    if (msgType === 'interactive') {
      const interactive = rawMessage.interactive;
      if (interactive.type === 'button_reply') {
        await handleButtonReply(user, from, interactive.button_reply.id, rawMessage);
      } else if (interactive.type === 'list_reply') {
        await handleListReply(user, from, interactive.list_reply.id, rawMessage);
      } else {
        const userLang = user.native_language;
        await sendText(from, getTranslatedText(userLang, 'gotIt'));
      }
    } else if (msgType === 'text') {
      const text = rawMessage.text?.body?.trim();
      await handleTextReply(user, from, text);
    } else if (msgType === 'location') {
      const location = rawMessage.location;
      await handleLocationReply(user, from, location.latitude, location.longitude);
    } else {
      const userLang = user.native_language;
      await sendText(from, getTranslatedText(userLang, 'messageNotSupported'));
    }
  } catch (err) {
    console.error('processOnboardingMessage error', err);
  }
}

async function handleLocationReply(user, from, latitude, longitude) {
  const userLang = user.native_language;
  if (user.onboarding_step === 'location') {
    console.log(`Received location from ${from}: Lat=${latitude}, Long=${longitude}`);
    const locationDetails = await getAddressFromCoords(latitude, longitude);
    const updates = {
      latitude: latitude,
      longitude: longitude,
      onboarding_step: 'conditions'
    };
    if (locationDetails) {
      updates.pincode = locationDetails.pincode || null;
      updates.district = locationDetails.district || null;
      updates.subdistrict = locationDetails.subdistrict || null;
      updates.city = locationDetails.city || null;
      updates.state = locationDetails.state || null;
    }
    await updateUserByPhone(from, updates);
    await sendText(from, getTranslatedText(userLang, 'conditionsPrompt'));
  } else {
    await sendText(from, getTranslatedText(userLang, 'locationReceived'));
  }
}

async function handleButtonReply(user, from, btnId, rawMessage) {
  const userLang = user.native_language;
  switch (btnId) {
    case 'start_setup':
      await updateUserByPhone(from, { onboarding_step: 'language' });
      await sendLanguageListPage1(from);
      break;
    case 'ask_question':
      await updateUserByPhone(from, { onboarding_step: 'done', verified: true });
      await sendText(from, getTranslatedText(userLang, 'skipSetup'));
      break;
    case 'later':
      await updateUserByPhone(from, { onboarding_step: null });
      await sendText(from, getTranslatedText(userLang, 'laterMessage'));
      break;
    case 'gender_m':
    case 'gender_f':
    case 'gender_o': {
      const gender = btnId === 'gender_m' ? 'Male' : (btnId === 'gender_f' ? 'Female' : 'Other');
      await updateUserByPhone(from, { gender, onboarding_step: 'location' });
      await sendLocationRequest(from, userLang);
      break;
    }
    case 'consent_yes':
      await updateUserByPhone(from, { consent: true, onboarding_step: 'done', verified: true });
      await sendText(from, getTranslatedText(userLang, 'setupComplete'));
      break;
    case 'consent_no':
      await updateUserByPhone(from, { consent: false, onboarding_step: 'done', verified: false });
      await sendText(from, getTranslatedText(userLang, 'noConsent'));
      break;
    default:
      await sendText(from, getTranslatedText(userLang, 'nextStep'));
      break;
  }
}

async function handleListReply(user, from, listId) {
  if (user.onboarding_step === 'language') {
    if (listId === 'lang_page_2') {
      await sendLanguageListPage2(from);
      return;
    }
    if (listId === 'lang_page_3') {
      await sendLanguageListPage3(from);
      return;
    }
    await updateUserByPhone(from, { native_language: listId, onboarding_step: 'name' });
    await sendText(from, getTranslatedText(listId, 'namePrompt'));
  } else {
    const userLang = user.native_language;
    await sendText(from, getTranslatedText(userLang, 'selectionReceived'));
  }
}

async function handleTextReply(user, from, text) {
  const step = user.onboarding_step;
  const userLang = user.native_language;
  if (!step || step === 'start') {
    await updateUserByPhone(from, { onboarding_step: 'start' });
    await sendStartButtons(from);
    return;
  }
  if (step === 'name') {
    await updateUserByPhone(from, { full_name: text, onboarding_step: 'age' });
    await sendText(from, getTranslatedText(userLang, 'agePrompt'));
    return;
  }
  if (step === 'age') {
    const age = parseInt(text, 10);
    if (!age || age <= 0 || age > 120) {
      await sendText(from, getTranslatedText(userLang, 'invalidAge'));
      return;
    }
    await updateUserByPhone(from, { age, onboarding_step: 'gender' });
    await sendGenderButtons(from, userLang);
    return;
  }
  if (step === 'location') {
    const cleaned = text;
    let updates = {};
    if (/^\d{6}$/.test(cleaned)) {
      updates = { pincode: cleaned };
    } else {
      const parts = cleaned.split(',').map(s => s.trim());
      updates.city = parts[0] || null;
      updates.state = parts[1] || null;
    }
    updates.onboarding_step = 'conditions';
    await updateUserByPhone(from, updates);
    await sendText(from, getTranslatedText(userLang, 'conditionsPrompt'));
    return;
  }
  if (step === 'conditions') {
    const lowerText = text.toLowerCase();
    const noneKeywords = ['none', 'कोई नहीं', 'কোনোটি নয়', 'ఏవీ లేవు', 'எதுவும் இல்லை', 'કોઈ નહીં', 'कोणतेही नाही', 'ਕੋਈ ਨਹੀਂ', 'کوئی نہیں'];
    const cond = noneKeywords.includes(lowerText) ? [] : text.split(',').map(s => s.trim());
    await updateUserByPhone(from, { chronic_conditions: cond, onboarding_step: 'consent' });
    await sendConsentButtons(from, userLang);
    return;
  }
  await sendText(from, getTranslatedText(userLang, 'nextStep'));
}



/**
 * Handles an incoming image message.
 * It saves the media ID and prompts the user for a text description.
 * @param {object} user - The user profile from the database.
 * @param {string} from - The user's phone number.
 * @param {object} imageObject - The image object from the webhook payload.
 */
async function handleImageMessage(user, from, imageObject) {
  const mediaId = imageObject.id;
  const userLang = user.native_language || 'en';

  console.log(`Received image from ${from} with Media ID: ${mediaId}`);

  // Save the media ID to the user's profile to indicate we are waiting for a description
  await updateUserByPhone(from, { pending_media_id: mediaId });

  // Prompt the user for more details
  // TODO: Add this new key to your translations object
  const promptText = getTranslatedText(userLang, 'imageDescriptionPrompt', "Thank you for the image. Please describe your symptoms or question related to this image.");
  await sendText(from, promptText);
}



