/* Ping · lens
 * Split out of apps/ping.html. These files are classic scripts, not modules:
 * top-level bindings are shared across them, so LOAD ORDER IS THE CONTRACT.
 * The order is fixed in ping.html and must not be rearranged.
 */

/* ========== MIRRORFLOW ASSIST ENGINE (inlined) ========== */
(function () {
  "use strict";

  const APP_NAME = "MirrorFlow Assist";
  const APP_VERSION = "shell-v1";
  const ENGINE_ID = "mirrorflow-assist-local-v1";
  const ENGINE_CONTRACT_VERSION = "assist-engine-contract-v1";
  const RULE_PROFILE_ID = "mirrorflow-assist-local-default";
  const RULE_PROFILE_SCHEMA_VERSION = "1.2.0";
  const TEST_REPORT_SCHEMA_VERSION = "1.0.0";
  const RULE_CATEGORIES = ["grammar", "clarity", "tone"];
  const RULE_SEVERITIES = ["high", "medium", "low"];
  const CLARITY_MODEL_VERSION = "clarity-score-v3";
  const CLARITY_SCORE_WEIGHTS = { length: 30, vagueTiming: 20, wordiness: 18, jargon: 16, specificity: 16 };

  let importedRuleProfile = null;
  let disabledRuleIds = new Set();
  let profileValidation = null;


  /* ═══ TGC:LENS-PACK v1 · generalized grammar, confusables, spelling ledger · added by theguide-shell-v2 ═══ */
  const TGC_LENS_PACK = [
    /* — articles by sound — */
    { id:"lens.article.a_before_vowel", category:"grammar", subtype:"article", label:"Article a/an", severity:"high", confidence:0.9,
      pattern:/\ba (?!(?:user|users|unique|unit|units|union|university|universal|useful|usual|utility|unicorn|uniform|unanimous|one|once|european|eulogy|ubiquitous)\b)([aeiou][a-z]+|hour|hourly|honest|honestly|honou?r|heir)\b/g,
      replacement:"an $1", message:"Use “an” before a vowel sound." },
    { id:"lens.article.an_before_consonant", category:"grammar", subtype:"article", label:"Article a/an", severity:"high", confidence:0.9,
      pattern:/\ban (?!(?:hour|hourly|honest|honestly|honou?r|heir|[aeiou]))([a-z]+)\b/g,
      replacement:"a $1", message:"Use “a” before a consonant sound." },
    { id:"lens.article.an_usound", category:"grammar", subtype:"article", label:"Article a/an", severity:"high", confidence:0.9,
      pattern:/\ban (user|users|unique|unit|units|union|university|universal|useful|usual|utility|unicorn|uniform|unanimous|european|one|once)\b/gi,
      replacement:"a $1", message:"“U” here sounds like “you” · use “a”." },
    /* — its / it's — */
    { id:"lens.confusion.its_contraction", category:"grammar", subtype:"confusion", label:"its → it's", severity:"high", confidence:0.86,
      pattern:/\bits (been|not|going|a|the|about|important|possible|likely|okay|ok|fine|hard|easy|worth|better|best|still|already|only|just|really|very|too|because|what|why|how|now)\b/gi,
      replacement:"it's $1", message:"“It's” = it is / it has." },
    { id:"lens.confusion.its_possessive", category:"grammar", subtype:"confusion", label:"it's → its", severity:"high", confidence:0.88,
      pattern:/\bit's (own|way|name|place|value|size|shape|purpose|core|source|meaning|colou?r)\b/gi,
      replacement:"its $1", message:"Possessive “its” has no apostrophe." },
    /* — your / you're — */
    { id:"lens.confusion.your_youre", category:"grammar", subtype:"confusion", label:"your → you're", severity:"high", confidence:0.85,
      pattern:/\byour (going|coming|getting|being|doing|having|taking|making|looking|trying|working|thinking|gonna|not|so|right|wrong|sure|able|almost|nearly|already|all set|good to go)\b/gi,
      replacement:"you're $1", message:"“You're” = you are." },
    { id:"lens.confusion.youre_your", category:"grammar", subtype:"confusion", label:"you're → your", severity:"high", confidence:0.85,
      pattern:/\byou're (team|order|account|name|email|phone|address|package|refund|invoice|appointment|subscription|password|details|request|ticket|item|card|balance|delivery)\b/gi,
      replacement:"your $1", message:"Possessive “your” before a noun." },
    /* — their / there / they're — */
    { id:"lens.confusion.their_there", category:"grammar", subtype:"confusion", label:"their → there", severity:"high", confidence:0.9,
      pattern:/\btheir (is|are|was|were|will be|won't|isn't|aren't)\b/gi,
      replacement:"there $1", message:"“There” for existence; “their” is possessive." },
    { id:"lens.confusion.there_their", category:"grammar", subtype:"confusion", label:"there → their", severity:"medium", confidence:0.8,
      pattern:/\bthere (team|house|car|order|account|name|email|manager|boss|side|turn|own|kids|children|parents|stuff|things)\b/gi,
      replacement:"their $1", message:"Possessive “their” before a noun." },
    { id:"lens.contraction.theyre", category:"grammar", subtype:"contraction", label:"Missing apostrophe", severity:"high", confidence:0.97,
      pattern:/\btheyre\b/gi, replacement:"they're", message:"“They're” needs an apostrophe." },
    /* — then / than — */
    { id:"lens.confusion.comparative_then", category:"grammar", subtype:"confusion", label:"then → than", severity:"high", confidence:0.9,
      pattern:/\b(better|worse|more|less|rather|bigger|smaller|faster|slower|easier|harder|greater|higher|lower|cheaper|stronger|older|younger|larger|longer|shorter|sooner|later|fewer|other) then\b/gi,
      replacement:"$1 than", message:"Comparisons take “than”." },
    { id:"lens.confusion.sequence_than", category:"grammar", subtype:"confusion", label:"than → then", severity:"medium", confidence:0.82,
      pattern:/\b(and|back|since|until|by) than\b/gi,
      replacement:"$1 then", message:"Time sequence takes “then”." },
    /* — to / too — */
    { id:"lens.confusion.to_too", category:"grammar", subtype:"confusion", label:"to → too", severity:"high", confidence:0.86,
      pattern:/\bto (much|many|late|soon|early|often|expensive|big|small|long|far|fast|slow|hard|easy|difficult|good|bad|hot|cold|busy|tired|old|young|complicated)\b/gi,
      replacement:"too $1", message:"“Too” = excessively / also." },
    { id:"lens.confusion.too_to", category:"grammar", subtype:"confusion", label:"too → to", severity:"medium", confidence:0.82,
      pattern:/\btoo (be|go|do|get|make|see|know|have|take|come|give|find|help|start|try|use|send|call|check)\b/gi,
      replacement:"to $1", message:"Infinitives take “to”." },
    /* — loose / lose — */
    { id:"lens.confusion.loose_lose", category:"grammar", subtype:"confusion", label:"loose → lose", severity:"high", confidence:0.88,
      pattern:/\bloose (weight|money|track|time|hope|it|him|her|them|patience|interest|sleep|control|access|data|everything|my mind)\b/gi,
      replacement:"lose $1", message:"“Lose” = misplace/fail; “loose” = not tight." },
    { id:"lens.spelling.loosing", category:"grammar", subtype:"spelling", label:"Spelling", severity:"high", confidence:0.96,
      pattern:/\bloosing\b/gi, replacement:"losing", message:"“Losing” has one o." },
    /* — affect / effect — */
    { id:"lens.confusion.adverb_effect", category:"grammar", subtype:"confusion", label:"effect → affect", severity:"medium", confidence:0.84,
      pattern:/\b(negatively|positively|greatly|directly|badly|really) effect\b/gi,
      replacement:"$1 affect", message:"The verb is “affect”." },
    { id:"lens.confusion.an_affect_on", category:"grammar", subtype:"confusion", label:"affect → effect", severity:"medium", confidence:0.84,
      pattern:/\ban affect on\b/gi, replacement:"an effect on", message:"The noun is “effect”." },
    /* — agreement — */
    { id:"lens.agreement.pronoun_dont", category:"grammar", subtype:"agreement", label:"Agreement", severity:"high", confidence:0.92,
      pattern:/\b(he|she|it) don'?t\b/gi, replacement:"$1 doesn't", message:"He/she/it takes “doesn't”." },
    { id:"lens.agreement.plural_doesnt", category:"grammar", subtype:"agreement", label:"Agreement", severity:"high", confidence:0.92,
      pattern:/\b(they|we|you) doesn'?t\b/gi, replacement:"$1 don't", message:"They/we/you take “don't”." },
    { id:"lens.agreement.he_she_have", category:"grammar", subtype:"agreement", label:"Agreement", severity:"medium", confidence:0.8,
      pattern:/\b(he|she) have\b/gi, replacement:"$1 has", message:"He/she takes “has”." },
    { id:"lens.agreement.i_is", category:"grammar", subtype:"agreement", label:"Agreement", severity:"high", confidence:0.95,
      pattern:/\bI is\b/g, replacement:"I am", message:"“I am.”" },
    { id:"lens.agreement.i_has", category:"grammar", subtype:"agreement", label:"Agreement", severity:"high", confidence:0.9,
      pattern:/\bI has\b/g, replacement:"I have", message:"“I have.”" },
    { id:"lens.agreement.you_was", category:"grammar", subtype:"agreement", label:"Agreement", severity:"high", confidence:0.92,
      pattern:/\b(you|we|they) was\b/gi, replacement:"$1 were", message:"Plural subjects take “were”." },
    { id:"lens.agreement.theres_plural", category:"grammar", subtype:"agreement", label:"Agreement", severity:"medium", confidence:0.8,
      pattern:/\bthere's (two|three|four|five|six|many|several|multiple|some|a few|lots of|plenty of)\b/gi,
      replacement:"there are $1", message:"Plural takes “there are”." },
    /* — who's / whose — */
    { id:"lens.confusion.whos_whose", category:"grammar", subtype:"confusion", label:"who's → whose", severity:"medium", confidence:0.82,
      pattern:/\bwho's (car|house|team|order|turn|idea|name|phone|fault|responsibility|account)\b/gi,
      replacement:"whose $1", message:"Possessive “whose”." },
    { id:"lens.confusion.whose_whos", category:"grammar", subtype:"confusion", label:"whose → who's", severity:"medium", confidence:0.82,
      pattern:/\bwhose (going|coming|responsible|there|calling|asking|handling|next)\b/gi,
      replacement:"who's $1", message:"“Who's” = who is." },
    /* — missing apostrophes (non-words, safe) — */
    { id:"lens.contraction.isnt",   category:"grammar", subtype:"contraction", label:"Missing apostrophe", severity:"high", confidence:0.97, pattern:/\bisnt\b/gi,   replacement:"isn't",   message:"Apostrophe needed." },
    { id:"lens.contraction.arent",  category:"grammar", subtype:"contraction", label:"Missing apostrophe", severity:"high", confidence:0.97, pattern:/\barent\b/gi,  replacement:"aren't",  message:"Apostrophe needed." },
    { id:"lens.contraction.wasnt",  category:"grammar", subtype:"contraction", label:"Missing apostrophe", severity:"high", confidence:0.97, pattern:/\bwasnt\b/gi,  replacement:"wasn't",  message:"Apostrophe needed." },
    { id:"lens.contraction.werent", category:"grammar", subtype:"contraction", label:"Missing apostrophe", severity:"high", confidence:0.97, pattern:/\bwerent\b/gi, replacement:"weren't", message:"Apostrophe needed." },
    { id:"lens.contraction.hasnt",  category:"grammar", subtype:"contraction", label:"Missing apostrophe", severity:"high", confidence:0.97, pattern:/\bhasnt\b/gi,  replacement:"hasn't",  message:"Apostrophe needed." },
    { id:"lens.contraction.havent", category:"grammar", subtype:"contraction", label:"Missing apostrophe", severity:"high", confidence:0.97, pattern:/\bhavent\b/gi, replacement:"haven't", message:"Apostrophe needed." },
    { id:"lens.contraction.didnt",  category:"grammar", subtype:"contraction", label:"Missing apostrophe", severity:"high", confidence:0.97, pattern:/\bdidnt\b/gi,  replacement:"didn't",  message:"Apostrophe needed." },
    { id:"lens.contraction.thats",  category:"grammar", subtype:"contraction", label:"Missing apostrophe", severity:"high", confidence:0.95, pattern:/\bthats\b/gi,  replacement:"that's",  message:"Apostrophe needed." },
    { id:"lens.contraction.theres", category:"grammar", subtype:"contraction", label:"Missing apostrophe", severity:"high", confidence:0.95, pattern:/\btheres\b/gi, replacement:"there's", message:"Apostrophe needed." },
    { id:"lens.contraction.whats",  category:"grammar", subtype:"contraction", label:"Missing apostrophe", severity:"high", confidence:0.95, pattern:/\bwhats\b/gi,  replacement:"what's",  message:"Apostrophe needed." },
    { id:"lens.contraction.hes",    category:"grammar", subtype:"contraction", label:"Missing apostrophe", severity:"high", confidence:0.95, pattern:/\bhes\b/gi,    replacement:"he's",    message:"Apostrophe needed." },
    { id:"lens.contraction.shes",   category:"grammar", subtype:"contraction", label:"Missing apostrophe", severity:"high", confidence:0.95, pattern:/\bshes\b/gi,   replacement:"she's",   message:"Apostrophe needed." },
    { id:"lens.contraction.weve",   category:"grammar", subtype:"contraction", label:"Missing apostrophe", severity:"high", confidence:0.96, pattern:/\bweve\b/gi,   replacement:"we've",   message:"Apostrophe needed." },
    { id:"lens.contraction.youve",  category:"grammar", subtype:"contraction", label:"Missing apostrophe", severity:"high", confidence:0.96, pattern:/\byouve\b/gi,  replacement:"you've",  message:"Apostrophe needed." },
    { id:"lens.contraction.youll",  category:"grammar", subtype:"contraction", label:"Missing apostrophe", severity:"high", confidence:0.96, pattern:/\byoull\b/gi,  replacement:"you'll",  message:"Apostrophe needed." },
    { id:"lens.contraction.theyll", category:"grammar", subtype:"contraction", label:"Missing apostrophe", severity:"high", confidence:0.96, pattern:/\btheyll\b/gi, replacement:"they'll", message:"Apostrophe needed." },
    { id:"lens.contraction.theyve", category:"grammar", subtype:"contraction", label:"Missing apostrophe", severity:"high", confidence:0.96, pattern:/\btheyve\b/gi, replacement:"they've", message:"Apostrophe needed." },
    { id:"lens.contraction.couldve",  category:"grammar", subtype:"contraction", label:"Missing apostrophe", severity:"high", confidence:0.95, pattern:/\bcouldve\b/gi,  replacement:"could've",  message:"Apostrophe needed." },
    { id:"lens.contraction.wouldve",  category:"grammar", subtype:"contraction", label:"Missing apostrophe", severity:"high", confidence:0.95, pattern:/\bwouldve\b/gi,  replacement:"would've",  message:"Apostrophe needed." },
    { id:"lens.contraction.shouldve", category:"grammar", subtype:"contraction", label:"Missing apostrophe", severity:"high", confidence:0.95, pattern:/\bshouldve\b/gi, replacement:"should've", message:"Apostrophe needed." },
    /* — spelling ledger (non-words, safe fixes) — */
    { id:"lens.spelling.becuase",     category:"grammar", subtype:"spelling", label:"Spelling", severity:"high", confidence:0.97, pattern:/\bbecuase\b/gi,      replacement:"because",      message:"Spelling." },
    { id:"lens.spelling.thier",       category:"grammar", subtype:"spelling", label:"Spelling", severity:"high", confidence:0.97, pattern:/\bthier\b/gi,        replacement:"their",        message:"Spelling." },
    { id:"lens.spelling.freind",      category:"grammar", subtype:"spelling", label:"Spelling", severity:"high", confidence:0.97, pattern:/\bfreind(s?|ly)\b/gi, replacement:"friend$1",     message:"I before e." },
    { id:"lens.spelling.beleive",     category:"grammar", subtype:"spelling", label:"Spelling", severity:"high", confidence:0.97, pattern:/\b(?:beleive|belive|beleave)([ds])?\b/gi, replacement:"believe$1", message:"Spelling." },
    { id:"lens.spelling.acheive",     category:"grammar", subtype:"spelling", label:"Spelling", severity:"high", confidence:0.97, pattern:/\bacheive(d|s|ment)?\b/gi, replacement:"achieve$1", message:"Spelling." },
    { id:"lens.spelling.calender",    category:"grammar", subtype:"spelling", label:"Spelling", severity:"high", confidence:0.95, pattern:/\bcalender\b/gi,     replacement:"calendar",     message:"Spelling." },
    { id:"lens.spelling.collegue",    category:"grammar", subtype:"spelling", label:"Spelling", severity:"high", confidence:0.97, pattern:/\bcollegues?\b/gi,   replacement:"colleague",    message:"Spelling." },
    { id:"lens.spelling.embarass",    category:"grammar", subtype:"spelling", label:"Spelling", severity:"high", confidence:0.97, pattern:/\bembarass(ed|ing|ment)?\b/gi, replacement:"embarrass$1", message:"Two r, two s." },
    { id:"lens.spelling.enviroment",  category:"grammar", subtype:"spelling", label:"Spelling", severity:"high", confidence:0.97, pattern:/\benviroments?\b/gi, replacement:"environment",  message:"Spelling." },
    { id:"lens.spelling.goverment",   category:"grammar", subtype:"spelling", label:"Spelling", severity:"high", confidence:0.97, pattern:/\bgoverments?\b/gi,  replacement:"government",   message:"Spelling." },
    { id:"lens.spelling.gaurantee",   category:"grammar", subtype:"spelling", label:"Spelling", severity:"high", confidence:0.97, pattern:/\bgaurantee[ds]?\b/gi, replacement:"guarantee",  message:"Spelling." },
    { id:"lens.spelling.happend",     category:"grammar", subtype:"spelling", label:"Spelling", severity:"high", confidence:0.97, pattern:/\bhappend\b/gi,      replacement:"happened",     message:"Spelling." },
    { id:"lens.spelling.immediatly",  category:"grammar", subtype:"spelling", label:"Spelling", severity:"high", confidence:0.97, pattern:/\bimmediatly\b/gi,   replacement:"immediately",  message:"Spelling." },
    { id:"lens.spelling.independant", category:"grammar", subtype:"spelling", label:"Spelling", severity:"high", confidence:0.97, pattern:/\bindependant\b/gi,  replacement:"independent",  message:"Spelling." },
    { id:"lens.spelling.neccessary",  category:"grammar", subtype:"spelling", label:"Spelling", severity:"high", confidence:0.97, pattern:/\b(neccessary|necesary)\b/gi, replacement:"necessary", message:"One c, two s." },
    { id:"lens.spelling.noticable",   category:"grammar", subtype:"spelling", label:"Spelling", severity:"high", confidence:0.97, pattern:/\bnoticable\b/gi,    replacement:"noticeable",   message:"Spelling." },
    { id:"lens.spelling.occured",     category:"grammar", subtype:"spelling", label:"Spelling", severity:"high", confidence:0.97, pattern:/\boccur(ed|ing)\b/gi, replacement:"occurr$1",    message:"Double r." },
    { id:"lens.spelling.occurence",   category:"grammar", subtype:"spelling", label:"Spelling", severity:"high", confidence:0.97, pattern:/\boccurences?\b/gi,  replacement:"occurrence",   message:"Spelling." },
    { id:"lens.spelling.prefered",    category:"grammar", subtype:"spelling", label:"Spelling", severity:"high", confidence:0.96, pattern:/\bprefer(ed|ing)\b/gi, replacement:"preferr$1",  message:"Double r." },
    { id:"lens.spelling.realy",       category:"grammar", subtype:"spelling", label:"Spelling", severity:"high", confidence:0.96, pattern:/\brealy\b/gi,        replacement:"really",       message:"Spelling." },
    { id:"lens.spelling.reccomend",   category:"grammar", subtype:"spelling", label:"Spelling", severity:"high", confidence:0.97, pattern:/\brec(c?omm?end)(ed|ing|ation)?\b/gi, replacement:"recommend$2", message:"One c, two m." },
    { id:"lens.spelling.remeber",     category:"grammar", subtype:"spelling", label:"Spelling", severity:"high", confidence:0.97, pattern:/\bremeber\b/gi,      replacement:"remember",     message:"Spelling." },
    { id:"lens.spelling.sucess",      category:"grammar", subtype:"spelling", label:"Spelling", severity:"high", confidence:0.97, pattern:/\bsucess(ful|fully)?\b/gi, replacement:"success$1", message:"Double c." },
    { id:"lens.spelling.successfull", category:"grammar", subtype:"spelling", label:"Spelling", severity:"high", confidence:0.96, pattern:/\bsuccessfull\b/gi,  replacement:"successful",   message:"One l." },
    { id:"lens.spelling.suprise",     category:"grammar", subtype:"spelling", label:"Spelling", severity:"high", confidence:0.97, pattern:/\bsuprise[ds]?\b/gi, replacement:"surprise",     message:"Spelling." },
    { id:"lens.spelling.truely",      category:"grammar", subtype:"spelling", label:"Spelling", severity:"high", confidence:0.97, pattern:/\btruely\b/gi,       replacement:"truly",        message:"Spelling." },
    { id:"lens.spelling.unfortunatly",category:"grammar", subtype:"spelling", label:"Spelling", severity:"high", confidence:0.97, pattern:/\bunfortunatly\b/gi, replacement:"unfortunately", message:"Spelling." },
    { id:"lens.spelling.untill",      category:"grammar", subtype:"spelling", label:"Spelling", severity:"high", confidence:0.97, pattern:/\buntill\b/gi,       replacement:"until",        message:"One l." },
    { id:"lens.spelling.wierd",       category:"grammar", subtype:"spelling", label:"Spelling", severity:"high", confidence:0.97, pattern:/\bwierd\b/gi,        replacement:"weird",        message:"Spelling." },
    { id:"lens.spelling.writting",    category:"grammar", subtype:"spelling", label:"Spelling", severity:"high", confidence:0.96, pattern:/\bwritting\b/gi,     replacement:"writing",      message:"One t." },
    { id:"lens.spelling.arguement",   category:"grammar", subtype:"spelling", label:"Spelling", severity:"high", confidence:0.97, pattern:/\barguements?\b/gi,  replacement:"argument",     message:"Spelling." },
    { id:"lens.spelling.buisness",    category:"grammar", subtype:"spelling", label:"Spelling", severity:"high", confidence:0.97, pattern:/\bbuisness(es)?\b/gi, replacement:"business$1",  message:"Spelling." },
    { id:"lens.spelling.greatful",    category:"grammar", subtype:"spelling", label:"Spelling", severity:"high", confidence:0.97, pattern:/\bgreatful(ly)?\b/gi, replacement:"grateful$1",  message:"Spelling." },
    { id:"lens.spelling.payed",       category:"grammar", subtype:"spelling", label:"Spelling", severity:"high", confidence:0.95, pattern:/\bpayed\b/gi,        replacement:"paid",         message:"Past tense of pay is paid." },
    { id:"lens.spelling.tomorow",     category:"grammar", subtype:"spelling", label:"Spelling", severity:"high", confidence:0.97, pattern:/\b(tomorow|tommorrow)\b/gi, replacement:"tomorrow", message:"Spelling." },
    { id:"lens.spelling.wich",        category:"grammar", subtype:"spelling", label:"Spelling", severity:"high", confidence:0.96, pattern:/\bwich\b/gi,         replacement:"which",        message:"Spelling." },
    { id:"lens.spelling.teh",         category:"grammar", subtype:"spelling", label:"Typo", severity:"high", confidence:0.95, pattern:/\bteh\b/gi,          replacement:"the",          message:"Typo." },
    { id:"lens.spelling.adn",         category:"grammar", subtype:"spelling", label:"Typo", severity:"high", confidence:0.95, pattern:/\badn\b/gi,          replacement:"and",          message:"Typo." },
    { id:"lens.spelling.taht",        category:"grammar", subtype:"spelling", label:"Typo", severity:"high", confidence:0.95, pattern:/\btaht\b/gi,         replacement:"that",         message:"Typo." },
    { id:"lens.spelling.definetly",   category:"grammar", subtype:"spelling", label:"Spelling", severity:"high", confidence:0.97, pattern:/\bdefin(?:ate|et|it|at)ly\b/gi, replacement:"definitely", message:"Spelling." },
    { id:"lens.spelling.probly",      category:"grammar", subtype:"spelling", label:"Spelling", severity:"high", confidence:0.95, pattern:/\bprobly\b/gi,       replacement:"probably",     message:"Spelling." },
    { id:"lens.compound.aswell",      category:"grammar", subtype:"spelling", label:"Two words", severity:"high", confidence:0.95, pattern:/\baswell\b/gi,      replacement:"as well",      message:"Two words." },
    { id:"lens.compound.incase",      category:"grammar", subtype:"spelling", label:"Two words", severity:"high", confidence:0.94, pattern:/\bincase\b/gi,      replacement:"in case",      message:"Two words." },
    { id:"lens.compound.infact",      category:"grammar", subtype:"spelling", label:"Two words", severity:"high", confidence:0.95, pattern:/\binfact\b/gi,      replacement:"in fact",      message:"Two words." },
    { id:"lens.compound.eachother",   category:"grammar", subtype:"spelling", label:"Two words", severity:"high", confidence:0.95, pattern:/\beachother\b/gi,   replacement:"each other",   message:"Two words." },
    { id:"lens.compound.atleast",     category:"grammar", subtype:"spelling", label:"Two words", severity:"high", confidence:0.95, pattern:/\batleast\b/gi,     replacement:"at least",     message:"Two words." },
    /* — punctuation — */
    { id:"lens.punctuation.period_no_space", category:"grammar", subtype:"punctuation", label:"Missing space", severity:"medium", confidence:0.85,
      pattern:/([a-z]{2,})\.(?!(?:com|net|org|io|club|co|uk|za|de|dev|app|html|js|css|json|png|jpe?g|gif|pdf|md|txt|zip)\b)([A-Za-z][a-z]{2,})/g, replacement:"$1. $2", message:"Space after a full stop." },
    /* — double negative (flag only) — */
    { id:"lens.grammar.double_negative", category:"grammar", subtype:"agreement", label:"Double negative", severity:"medium", confidence:0.8,
      pattern:/\b(don't|can't|won't|didn't|doesn't) (have|know|see|do|get|want|need) (no|nothing|nobody|nowhere)\b/gi,
      replacement:null, message:"Double negative · consider “any/anything”." },
    /* — register (informal shorthand) — */
    { id:"lens.informal.gonna", category:"tone", subtype:"informal", label:"Informal", severity:"low", confidence:0.9, pattern:/\bgonna\b/gi,  replacement:"going to",  message:"Informal register." },
    { id:"lens.informal.wanna", category:"tone", subtype:"informal", label:"Informal", severity:"low", confidence:0.9, pattern:/\bwanna\b/gi,  replacement:"want to",   message:"Informal register." },
    { id:"lens.informal.gotta", category:"tone", subtype:"informal", label:"Informal", severity:"low", confidence:0.9, pattern:/\bgotta\b/gi,  replacement:"have to",   message:"Informal register." },
    { id:"lens.informal.kinda", category:"tone", subtype:"informal", label:"Informal", severity:"low", confidence:0.88, pattern:/\bkinda\b/gi, replacement:"somewhat",  message:"Informal register." },
    { id:"lens.informal.dunno", category:"tone", subtype:"informal", label:"Informal", severity:"low", confidence:0.9, pattern:/\bdunno\b/gi,  replacement:"don't know", message:"Informal register." },
    { id:"lens.informal.cuz",   category:"tone", subtype:"informal", label:"Informal", severity:"low", confidence:0.88, pattern:/\b(cuz|coz|bcuz|bc)\b/gi, replacement:"because", message:"Informal register." },
    { id:"lens.informal.ur",    category:"tone", subtype:"informal", label:"Shorthand", severity:"low", confidence:0.9, pattern:/\bur\b/gi,    replacement:"your",      message:"Chat shorthand." },
    { id:"lens.informal.pls",   category:"tone", subtype:"informal", label:"Shorthand", severity:"low", confidence:0.9, pattern:/\b(pls|plz)\b/gi, replacement:"please",  message:"Chat shorthand." },
    { id:"lens.informal.thx",   category:"tone", subtype:"informal", label:"Shorthand", severity:"low", confidence:0.9, pattern:/\b(thx|tnx|ty)\b/gi, replacement:"thanks", message:"Chat shorthand." }
  ];

  /* ═══ TGC:LENS-PUNCT · punctuation beyond spacing ═══
     The pack shipped six punctuation rules, all of them about whitespace around a
     mark. These are about the mark itself: the ones that change how a sentence is
     read, not how it is typeset. */
  const TGC_LENS_PUNCT = [
    { id:"lens.punct.question_mark_missing", category:"grammar", subtype:"punctuation", label:"Missing question mark", severity:"medium", confidence:0.82,
      pattern:/((?:^|[.!?]\s+|\n)(?:Can|Could|Would|Will|Should|Do|Does|Did|Are|Is|Was|Were|Have|Has|May|Shall) (?:you|I|we|they|he|she|it)[^.!?\n,]{2,80})\./g,
      replacement:"$1?", message:"This reads as a question · end it with “?”." },
    { id:"lens.punct.intro_adverb_comma", category:"grammar", subtype:"punctuation", label:"Missing comma", severity:"low", confidence:0.84,
      pattern:/((?:^|[.!?]\s+|\n)(?:However|Therefore|Unfortunately|Fortunately|Additionally|Furthermore|Moreover|Meanwhile|Otherwise|Alternatively|Nevertheless|Consequently|Firstly|Secondly)) (?![,\s])/g,
      replacement:"$1, ", message:"An opening adverb takes a comma." },
    { id:"lens.punct.greeting_comma", category:"grammar", subtype:"punctuation", label:"Missing comma", severity:"low", confidence:0.8,
      pattern:/\b(Hi|Hello|Hey|Morning|Afternoon) ([A-Z][a-z]+) (I|We|Thanks|Thank|Just|Sorry|Apologies|Your|Happy|Hope|Please)\b/g,
      replacement:"$1 $2, $3", message:"A greeting takes a comma before the message." },
    { id:"lens.punct.decade_apostrophe", category:"grammar", subtype:"punctuation", label:"Stray apostrophe", severity:"low", confidence:0.9,
      pattern:/\b((?:19|20)\d0)'s\b/g, replacement:"$1s", message:"A decade is a plural, not a possessive." },
    { id:"lens.punct.thanks_apostrophe", category:"grammar", subtype:"punctuation", label:"Stray apostrophe", severity:"medium", confidence:0.94,
      pattern:/\b(thank|regard|cheer)'s\b/gi, replacement:"$1s", message:"Plural, not possessive." },
    { id:"lens.punct.double_hyphen", category:"grammar", subtype:"punctuation", label:"Double hyphen", severity:"low", confidence:0.88,
      /* the span is the dashes only · swallowing the neighbouring letters as context
         would block whatever fix sits immediately before it in a rewrite */
      pattern:/[ \t]*--[ \t]*/g, replacement:" — ", message:"Use an em dash." },
    { id:"lens.punct.long_ellipsis", category:"grammar", subtype:"punctuation", label:"Long ellipsis", severity:"low", confidence:0.9,
      pattern:/\.{4,}/g, replacement:"…", message:"An ellipsis is three dots." },
    { id:"lens.punct.repeated_comma", category:"grammar", subtype:"punctuation", label:"Repeated comma", severity:"low", confidence:0.92,
      pattern:/,{2,}/g, replacement:",", message:"One comma is enough." },
    { id:"lens.punct.mixed_terminal", category:"grammar", subtype:"punctuation", label:"Mixed end marks", severity:"low", confidence:0.85,
      pattern:/\?!+|!\?+/g, replacement:"?", message:"Pick one end mark." },
    { id:"lens.punct.colon_spacing", category:"grammar", subtype:"punctuation", label:"Colon spacing", severity:"low", confidence:0.9,
      pattern:/([a-z]):([A-Za-z])/g, replacement:"$1: $2", message:"Add a space after the colon." },
    { id:"lens.punct.semicolon_spacing", category:"grammar", subtype:"punctuation", label:"Semicolon spacing", severity:"low", confidence:0.9,
      pattern:/;([A-Za-z])/g, replacement:"; $1", message:"Add a space after the semicolon." }
  ];

  /* ═══ TGC:LENS-STYLE · how the sentence is built ═══
     Style is a subtype of clarity, not a category of its own. A passive clause or a
     buried verb is not incorrect — it is harder to read, which is what clarity
     already measures. Keeping it here means the score, the presets and the digest
     need no new axis to understand it. */
  const TGC_LENS_STYLE = [
    /* — buried verbs — */
    { id:"lens.style.nominal.make_decision", category:"clarity", subtype:"style", label:"Buried verb", severity:"low", confidence:0.86, pattern:/\bmake a decision\b/gi, replacement:"decide", message:"The verb is buried in a noun." },
    { id:"lens.style.nominal.make_recommendation", category:"clarity", subtype:"style", label:"Buried verb", severity:"low", confidence:0.86, pattern:/\bmake a recommendation\b/gi, replacement:"recommend", message:"The verb is buried in a noun." },
    { id:"lens.style.nominal.provide_explanation", category:"clarity", subtype:"style", label:"Buried verb", severity:"low", confidence:0.86, pattern:/\bprovide an explanation\b/gi, replacement:"explain", message:"The verb is buried in a noun." },
    { id:"lens.style.nominal.provide_confirmation", category:"clarity", subtype:"style", label:"Buried verb", severity:"low", confidence:0.86, pattern:/\bprovide confirmation\b/gi, replacement:"confirm", message:"The verb is buried in a noun." },
    { id:"lens.style.nominal.conduct_investigation", category:"clarity", subtype:"style", label:"Buried verb", severity:"low", confidence:0.86, pattern:/\bconduct an investigation\b/gi, replacement:"investigate", message:"The verb is buried in a noun." },
    { id:"lens.style.nominal.carry_out_assessment", category:"clarity", subtype:"style", label:"Buried verb", severity:"low", confidence:0.84, pattern:/\bcarry out an assessment\b/gi, replacement:"assess", message:"The verb is buried in a noun." },
    { id:"lens.style.nominal.give_consideration", category:"clarity", subtype:"style", label:"Buried verb", severity:"low", confidence:0.86, pattern:/\bgive consideration to\b/gi, replacement:"consider", message:"The verb is buried in a noun." },
    { id:"lens.style.nominal.take_into_consideration", category:"clarity", subtype:"style", label:"Buried verb", severity:"low", confidence:0.86, pattern:/\btake into consideration\b/gi, replacement:"consider", message:"The verb is buried in a noun." },
    { id:"lens.style.nominal.make_adjustment", category:"clarity", subtype:"style", label:"Buried verb", severity:"low", confidence:0.84, pattern:/\bmake an adjustment\b/gi, replacement:"adjust", message:"The verb is buried in a noun." },
    { id:"lens.style.nominal.reach_conclusion", category:"clarity", subtype:"style", label:"Buried verb", severity:"low", confidence:0.84, pattern:/\breach a conclusion\b/gi, replacement:"conclude", message:"The verb is buried in a noun." },
    /* — saying it twice — */
    { id:"lens.style.redundant.absolutely_essential", category:"clarity", subtype:"style", label:"Says it twice", severity:"low", confidence:0.9, pattern:/\babsolutely essential\b/gi, replacement:"essential", message:"“Essential” already means this." },
    { id:"lens.style.redundant.advance_planning", category:"clarity", subtype:"style", label:"Says it twice", severity:"low", confidence:0.88, pattern:/\badvance planning\b/gi, replacement:"planning", message:"Planning is always in advance." },
    { id:"lens.style.redundant.basic_fundamentals", category:"clarity", subtype:"style", label:"Says it twice", severity:"low", confidence:0.9, pattern:/\bbasic fundamentals\b/gi, replacement:"fundamentals", message:"Fundamentals are basic." },
    { id:"lens.style.redundant.close_proximity", category:"clarity", subtype:"style", label:"Says it twice", severity:"low", confidence:0.88, pattern:/\bin close proximity to\b/gi, replacement:"near", message:"Shorter and plainer." },
    { id:"lens.style.redundant.end_result", category:"clarity", subtype:"style", label:"Says it twice", severity:"low", confidence:0.88, pattern:/\bend result\b/gi, replacement:"result", message:"A result is already the end." },
    { id:"lens.style.redundant.final_outcome", category:"clarity", subtype:"style", label:"Says it twice", severity:"low", confidence:0.88, pattern:/\bfinal outcome\b/gi, replacement:"outcome", message:"An outcome is already final." },
    { id:"lens.style.redundant.exact_same", category:"clarity", subtype:"style", label:"Says it twice", severity:"low", confidence:0.86, pattern:/\bexact same\b/gi, replacement:"same", message:"“Same” carries it." },
    { id:"lens.style.redundant.each_and_every", category:"clarity", subtype:"style", label:"Says it twice", severity:"low", confidence:0.88, pattern:/\beach and every\b/gi, replacement:"every", message:"One of the two is enough." },
    { id:"lens.style.redundant.past_history", category:"clarity", subtype:"style", label:"Says it twice", severity:"low", confidence:0.9, pattern:/\bpast history\b/gi, replacement:"history", message:"History is already past." },
    { id:"lens.style.redundant.future_plans", category:"clarity", subtype:"style", label:"Says it twice", severity:"low", confidence:0.86, pattern:/\bfuture plans\b/gi, replacement:"plans", message:"Plans are already future." },
    { id:"lens.style.redundant.revert_back", category:"clarity", subtype:"style", label:"Says it twice", severity:"low", confidence:0.92, pattern:/\brevert back\b/gi, replacement:"revert", message:"“Revert” already means back." },
    { id:"lens.style.redundant.return_back", category:"clarity", subtype:"style", label:"Says it twice", severity:"low", confidence:0.92, pattern:/\breturn back\b/gi, replacement:"return", message:"“Return” already means back." },
    { id:"lens.style.redundant.repeat_again", category:"clarity", subtype:"style", label:"Says it twice", severity:"low", confidence:0.88, pattern:/\brepeat (it )?again\b/gi, replacement:"repeat $1", message:"“Repeat” already means again." },
    { id:"lens.style.redundant.plan_ahead", category:"clarity", subtype:"style", label:"Says it twice", severity:"low", confidence:0.84, pattern:/\bplan ahead\b/gi, replacement:"plan", message:"Planning is always ahead." },
    { id:"lens.style.redundant.join_together", category:"clarity", subtype:"style", label:"Says it twice", severity:"low", confidence:0.86, pattern:/\b(join|combine|merge) together\b/gi, replacement:"$1", message:"“Together” is already in the verb." },
    { id:"lens.style.redundant.period_of_time", category:"clarity", subtype:"style", label:"Says it twice", severity:"low", confidence:0.84, pattern:/\ba period of time\b/gi, replacement:"a period", message:"A period is a length of time." },
    { id:"lens.style.redundant.actual_fact", category:"clarity", subtype:"style", label:"Says it twice", severity:"low", confidence:0.9, pattern:/\b(actual|true) fact\b/gi, replacement:"fact", message:"A fact is already true." },
    { id:"lens.style.redundant.added_bonus", category:"clarity", subtype:"style", label:"Says it twice", severity:"low", confidence:0.88, pattern:/\badded bonus\b/gi, replacement:"bonus", message:"A bonus is already added." },
    { id:"lens.style.redundant.brief_summary", category:"clarity", subtype:"style", label:"Says it twice", severity:"low", confidence:0.84, pattern:/\bbrief summary\b/gi, replacement:"summary", message:"A summary is already brief." },
    /* — padding — */
    { id:"lens.style.intensifier", category:"clarity", subtype:"style", label:"Empty intensifier", severity:"low", confidence:0.62,
      pattern:/\b(?:very|really|extremely|incredibly) ([a-z]+)\b/gi, replacement:"$1", message:"The adjective is stronger on its own." },
    { id:"lens.style.filler_opener", category:"clarity", subtype:"style", label:"Filler opener", severity:"low", confidence:0.7,
      pattern:/((?:^|[.!?]\s+|\n))(?:Basically|Actually|Obviously|Essentially|Honestly),? /g, replacement:"$1", message:"This opener adds nothing." },
    { id:"lens.style.expletive_there", category:"clarity", subtype:"style", label:"Empty subject", severity:"low", confidence:0.6,
      pattern:/(?:^|[.!?]\s+|\n)There (?:is|are|was|were) (?!(?:no|nothing|nobody|none|any|little|much)\b)/g, replacement:null, message:"“There is” hides the real subject · name it." }
  ];

  const TGC_LENS_STRUCT = [

    {
      /* Two complete clauses welded by a comma. Only the classic shape is flagged —
         both halves opening with a pronoun subject — because the general case
         cannot be told from a legitimate dependent clause without a parser. */
      id:"lens.punct.comma_splice", category:"grammar", subtype:"punctuation", label:"Comma splice", severity:"medium", confidence:0.72,
      run({ text, protectedSpans, push }) {
        const re = /(?:^|[.!?]\s+|\n)(?:I|We|You|They|He|She|It)\s+([^.!?\n,]{6,70}),\s+(?:i|we|you|they|he|she|it|I)\s+(?:will|can|could|would|should|have|has|had|am|is|are|was|were|do|does|did|need|want|think|know)\b/g;
        let m;
        while ((m = re.exec(text)) !== null) {
          const comma = text.indexOf(",", m.index);
          if (comma < 0) continue;
          push({ ruleId:this.id, category:this.category, subtype:this.subtype, label:this.label,
            severity:this.severity, confidence:this.confidence,
            start:comma, end:comma+1, excerpt:",", replacement:null,
            message:"Comma splice · use a full stop, a semicolon, or add “and”." }, protectedSpans);
        }
      }
    },
    {
      /* A bracket or quote opened and never closed reads as a dropped thought. */
      id:"lens.punct.unbalanced_pair", category:"grammar", subtype:"punctuation", label:"Unclosed pair", severity:"medium", confidence:0.9,
      run({ text, protectedSpans, push }) {
        const say = (idx, msg) => {
          if (idx < 0) return;
          push({ ruleId:this.id, category:this.category, subtype:this.subtype, label:this.label,
            severity:this.severity, confidence:this.confidence,
            start:idx, end:idx+1, excerpt:text[idx], replacement:null, message:msg }, protectedSpans);
        };
        [["(", ")", "bracket"], ["[", "]", "square bracket"], ["“", "”", "quote"]].forEach(([open, close, name]) => {
          const o = text.split(open).length - 1, c = text.split(close).length - 1;
          if (o === c) return;
          say(text.lastIndexOf(o > c ? open : close), o > c ? ("This " + name + " is never closed.") : ("This " + name + " is never opened."));
        });
        if ((text.match(/"/g) || []).length % 2 === 1) say(text.lastIndexOf('"'), "Odd number of quotation marks.");
      }
    },
    {
      /* Passive voice hides who acted. In a reply that is often the whole problem:
         “your booking was cancelled” never says by whom. Flag only — turning a
         passive into an active needs the missing actor, which the text does not have.

         Present tense is deliberately excluded. “The report is attached” and “the
         slot is confirmed” are states, not hidden actions, and they are how normal
         business writing describes a settled fact — flagging them was the pack's
         loudest false positive. Past, perfect and progressive forms stay in, and an
         explicit “… by …” pulls the present tense back in because that one really
         is a passive. */
      id:"lens.style.passive_voice", category:"clarity", subtype:"style", label:"Passive voice", severity:"low", confidence:0.68,
      run({ text, protectedSpans, push }) {
        const ADJ = /^(interested|excited|pleased|delighted|tired|involved|related|located|based|committed|dedicated|experienced|limited|closed|open|prepared|used|supposed|allowed)$/;
        const re = /\b(is|are|was|were|been|being|be)\s+((?:[a-z]+ly\s+)?)([a-z]+(?:ed|en)|done|sent|made|taken|given|seen|written|held|kept|paid|built|found|shown|told|put|set|lost|left|dealt)\b( by\b)?/gi;
        let m, flagged = 0;
        while ((m = re.exec(text)) !== null && flagged < 5) {
          if (ADJ.test(m[3].toLowerCase())) continue;
          if (/^(?:is|are)$/i.test(m[1]) && !m[4]) continue;   /* a state, not a hidden actor */
          flagged++;
          push({ ruleId:this.id, category:this.category, subtype:this.subtype, label:this.label,
            severity:this.severity, confidence:this.confidence,
            start:m.index, end:m.index+m[0].length, excerpt:m[0], replacement:null,
            message:"Passive · say who did it." }, protectedSpans);
        }
      }
    },
    {
      /* Three sentences in a row opening with the same word — usually “I” — reads
         as a list of the writer's own actions rather than an answer. */
      id:"lens.style.opener_repeat", category:"clarity", subtype:"style", label:"Repeated opener", severity:"low", confidence:0.78,
      run({ text, protectedSpans, push }) {
        const sentences = sentenceList(text);
        if (sentences.length < 3) return;
        const first = s => (String(s).trim().match(/^[A-Za-z']+/) || [""])[0].toLowerCase();
        let run = 1;
        for (let i = 1; i < sentences.length; i++) {
          const w = first(sentences[i]);
          if (w && w === first(sentences[i-1])) run++; else run = 1;
          if (run === 3) {
            const start = text.indexOf(sentences[i-2]);
            if (start < 0) continue;
            push({ ruleId:this.id, category:this.category, subtype:this.subtype, label:this.label,
              severity:this.severity, confidence:this.confidence,
              start, end:start + sentences[i-2].length, excerpt:sentences[i-2].slice(0,50),
              replacement:null, message:"Three sentences in a row open with “" + w + "” · vary the entry." }, protectedSpans);
            run = 1;
          }
        }
      }
    },
    {
      id:"lens.spelling.unknown_word", category:"grammar", subtype:"spelling", label:"Possible misspelling", severity:"medium", confidence:0.72,
      run({ text, protectedSpans, push }) {
        const D = window.__TGC_LENS_DICT;
        if (!D) {
          /* Only reach for the ~500 KB ledger once there is real prose to check —
             an empty editor must never cost a download. */
          if (!TGC_IN_SELFTEST && window.__tgcLoadLensDict && /[A-Za-z]{3,}\s+[A-Za-z]{3,}/.test(text || '')) window.__tgcLoadLensDict();
          return;
        }
        if (!D._bits) {
          try {
            const bin = atob(D.b64), u = new Uint8Array(bin.length);
            for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i);
            D._bits = u;
            D._common = D.common.split(" ");
            D._rank = new Map(D._common.map((w, i) => [w, i]));
            D._cset = new Set(D._common);
          } catch (e) { return; }
        }
        const fnv = (s, seed) => { let x = seed >>> 0; for (let i = 0; i < s.length; i++) { x ^= s.charCodeAt(i); x = Math.imul(x, 16777619) >>> 0; } return x >>> 0; };
        const inDict = (w) => { const h1 = fnv(w, 2166136261), h2 = fnv(w, 668265263) | 1;
          for (let i = 0; i < D.k; i++) { const b = ((h1 + Math.imul(i, h2)) >>> 0) % D.m; if (!(D._bits[b >> 3] & (1 << (b & 7)))) return false; } return true; };
        const AB = "abcdefghijklmnopqrstuvwxyz";
        const edits1 = (w) => { const out = new Set();
          for (let i = 0; i <= w.length; i++) { const L = w.slice(0, i), R = w.slice(i);
            if (R) out.add(L + R.slice(1));
            if (R.length > 1) out.add(L + R[1] + R[0] + R.slice(2));
            for (const c of AB) { if (R) out.add(L + c + R.slice(1)); out.add(L + c + R); } }
          out.delete(w); return [...out]; };
        const CONTRACTION_OK = /^(?:won't|can't|shan't|ain't|o'clock|y'all|ma'am)$/;
        const re = /[A-Za-z]+(?:'[A-Za-z]+)*/g;
        let m, flagged = 0;
        while ((m = re.exec(text)) !== null && flagged < 8) {
          const raw = m[0], start = m.index, end = start + raw.length;
          if (raw.length < 4 || raw.length > 18) continue;
          if (/[A-Z]/.test(raw)) continue;                               /* proper nouns & acronyms */
          const prev = text[start - 1] || "", nxt = text[end] || "";
          if (prev === "." || prev === "@" || prev === "/" || prev === "#" || prev === "-") continue;
          if ((nxt === "." && /[A-Za-z]/.test(text[end + 1] || "")) || nxt === "@" || nxt === "/" || nxt === "-") continue;
          let w = raw.toLowerCase();
          if (w.includes("'")) {
            if (CONTRACTION_OK.test(w)) continue;
            w = w.replace(/n't$|'(?:ll|ve|re|d|s|m)$/, "");
            if (w.length < 4) continue;
          }
          if (inDict(w)) continue;
          const cands = edits1(w);
          const fromCommon = cands.filter(c => D._cset.has(c)).sort((a, b) => D._rank.get(a) - D._rank.get(b));
          const fromDict = fromCommon.length ? [] : cands.filter(c => !D._cset.has(c) && c.length > 3 && inDict(c)).slice(0, 2);
          const sugg = fromCommon.concat(fromDict).slice(0, 3);
          const fix = (fromCommon.length && raw === w) ? fromCommon[0] : null;   /* auto-fix only for confident, unmodified tokens */
          flagged++;
          push({ ruleId: this.id, category: this.category, subtype: this.subtype, label: this.label,
            severity: this.severity, confidence: this.confidence,
            start, end, excerpt: raw, replacement: fix,
            message: sugg.length ? ("Unknown word · did you mean " + sugg.join(", ") + "?") : "Not in the dictionary." }, protectedSpans);
        }
      }
    },
    {
      id:"lens.capitalization.sentence_start", category:"grammar", subtype:"capitalization", label:"Capital letter", severity:"high", confidence:0.9,
      run({ text, protectedSpans, push }) {
        const re = /(^|[.!?]\s+)([a-z])/g;
        let m;
        while ((m = re.exec(text)) !== null) {
          const idx = m.index + m[1].length;
          const ch = text[idx];
          if (ch === "i" && /^(?:\s|'m|'ll|'ve|'d\b)/.test(text.slice(idx+1))) continue; /* covered by the i rule */
          push({ ruleId:this.id, category:this.category, subtype:this.subtype, label:this.label,
            severity:this.severity, confidence:this.confidence,
            start:idx, end:idx+1, excerpt:ch, replacement:ch.toUpperCase(),
            message:"Sentences start with a capital." }, protectedSpans);
        }
      }
    },
    {
      id:"lens.punctuation.missing_terminal", category:"grammar", subtype:"punctuation", label:"Missing end mark", severity:"low", confidence:0.7,
      run({ text, protectedSpans, push }) {
        const t = text.trimEnd();
        if (t.length < 24) return;
        const last = t[t.length-1];
        if (/[.!?…:;)\]"'”]/.test(last)) return;
        const tailWords = t.split(/[.!?]\s+/).pop() || "";
        if (tailWords.trim().split(/\s+/).length < 4) return;
        push({ ruleId:this.id, category:this.category, subtype:this.subtype, label:this.label,
          severity:this.severity, confidence:this.confidence,
          start:Math.max(0,t.length-1), end:t.length, excerpt:last, replacement:null,
          message:"Consider ending with punctuation." }, protectedSpans);
      }
    },
    {
      id:"lens.tone.all_caps", category:"tone", subtype:"shouting", label:"All caps", severity:"low", confidence:0.75,
      run({ text, protectedSpans, push }) {
        const ok = /^(ASAP|FYI|HTML|HTTP|HTTPS|JSON|GDPR|LGTM|AWOL|IMHO|IMO|VIP|FAQ|CEO|CTO|CFO|USA|EU|UK|OTP|PIN|API|URL|SKU|ETA|EOD|COB|RSVP|DIY|NASA)$/;
        const re = /\b[A-Z]{4,}\b/g;
        let m;
        while ((m = re.exec(text)) !== null) {
          if (ok.test(m[0])) continue;
          push({ ruleId:this.id, category:this.category, subtype:this.subtype, label:this.label,
            severity:this.severity, confidence:this.confidence,
            start:m.index, end:m.index+m[0].length, excerpt:m[0], replacement:null,
            message:"All caps reads as shouting." }, protectedSpans);
        }
      }
    }
  ];

  const REGEX_RULES = [
    ...TGC_LENS_PACK,
    ...TGC_LENS_PUNCT,
    ...TGC_LENS_STYLE,
    { id:"grammar.agreement.we_has", category:"grammar", subtype:"agreement", label:"Subject-verb agreement", severity:"high", confidence:0.96, pattern:/\bwe has\b/gi, replacement:"we have", message:"Subject and verb disagree." },
    { id:"grammar.article.an_update", category:"grammar", subtype:"article", label:"Article before vowel sound", severity:"high", confidence:0.94, pattern:/\bthere is a update\b/gi, replacement:"there is an update", message:"Use 'an' before a vowel sound." },
    { id:"grammar.agreement.team_responds", category:"grammar", subtype:"agreement", label:"Collective noun agreement", severity:"medium", confidence:0.78, pattern:/\bteam respond\b/gi, replacement:"team responds", message:"Singular collective noun needs a matching verb here." },
    { id:"grammar.capitalization.first_person_i", category:"grammar", subtype:"capitalization", label:"First-person pronoun", severity:"medium", confidence:0.92, pattern:/\bi\b/g, replacement:"I", message:"Capitalize the first-person pronoun." },
    { id:"grammar.duplicate.repeated_word", category:"grammar", subtype:"duplicate", label:"Repeated word", severity:"high", confidence:0.96, pattern:/\b([A-Za-z]+)\s+\1\b/gi, replacement:"$1", message:"Repeated word." },
    { id:"grammar.spacing.double_space", category:"grammar", subtype:"spacing", label:"Extra spacing", severity:"low", confidence:0.99, pattern:/ {2,}/g, replacement:" ", message:"Extra spacing." },
    { id:"grammar.verb_modal.of_have", category:"grammar", subtype:"verb_form", label:"Modal verb form", severity:"high", confidence:0.96, pattern:/\b(should|could|would|must) of\b/gi, replacement:"$1 have", message:"Use 'have' after this modal verb." },
    { id:"grammar.confusion.your_welcome", category:"grammar", subtype:"confusion", label:"Your / you're", severity:"high", confidence:0.92, pattern:/\byour welcome\b/gi, replacement:"you're welcome", message:"Use the contraction for 'you are' here." },
    { id:"grammar.confusion.bare_with_me", category:"grammar", subtype:"confusion", label:"Bear / bare", severity:"high", confidence:0.94, pattern:/\b(bare with me|please bare with me)\b/gi, replacement:"please bear with me", message:"Use 'bear with me' for waiting or patience." },
    { id:"grammar.verb.be_advised", category:"grammar", subtype:"verb_form", label:"Be advised", severity:"medium", confidence:0.88, pattern:/\bplease be advise\b/gi, replacement:"please be advised", message:"Use the past participle in this phrase." },
    { id:"grammar.number.any_questions", category:"grammar", subtype:"number", label:"Question / questions", severity:"medium", confidence:0.84, pattern:/\bany question\b/gi, replacement:"any questions", message:"Use the plural form after 'any' in this phrase." },
    { id:"grammar.comparative.more_better", category:"grammar", subtype:"comparative", label:"Double comparative", severity:"high", confidence:0.95, pattern:/\bmore better\b/gi, replacement:"better", message:"Use one comparative form." },
    { id:"grammar.confusion.less_than", category:"grammar", subtype:"confusion", label:"Then / than", severity:"medium", confidence:0.78, pattern:/\bless then\b/gi, replacement:"less than", message:"Use 'than' for comparison." },
    { id:"grammar.contraction.cant", category:"grammar", subtype:"contraction", label:"Missing apostrophe", severity:"medium", confidence:0.90, pattern:/\bcant\b/gi, replacement:"can't", message:"Use the apostrophe in this contraction." },
    { id:"grammar.contraction.dont", category:"grammar", subtype:"contraction", label:"Missing apostrophe", severity:"medium", confidence:0.90, pattern:/\bdont\b/gi, replacement:"don't", message:"Use the apostrophe in this contraction." },
    { id:"grammar.contraction.im", category:"grammar", subtype:"contraction", label:"Missing apostrophe", severity:"medium", confidence:0.90, pattern:/\bim\b/gi, replacement:"I'm", message:"Use the apostrophe and capital letter in this contraction." },
    { id:"grammar.contraction.youre", category:"grammar", subtype:"contraction", label:"Missing apostrophe", severity:"medium", confidence:0.90, pattern:/\byoure\b/gi, replacement:"you're", message:"Use the contraction for 'you are'." },
    { id:"grammar.contraction.ive", category:"grammar", subtype:"contraction", label:"Missing apostrophe", severity:"medium", confidence:0.88, pattern:/\bive\b/gi, replacement:"I've", message:"Use the apostrophe and capital letter in this contraction." },
    { id:"grammar.punctuation.space_before_mark", category:"grammar", subtype:"punctuation", label:"Space before punctuation", severity:"low", confidence:0.96, pattern:/\s+([,.!?])/g, replacement:"$1", message:"Remove the space before punctuation." },
    { id:"grammar.punctuation.comma_spacing", category:"grammar", subtype:"punctuation", label:"Comma spacing", severity:"low", confidence:0.94, pattern:/,([A-Za-z])/g, replacement:", $1", message:"Add a space after the comma." },
    { id:"grammar.confusion.its_been", category:"grammar", subtype:"confusion", label:"Its / it's", severity:"medium", confidence:0.82, pattern:/\bits been\b/gi, replacement:"it's been", message:"Use 'it's' for 'it has'." },
    { id:"grammar.agreement.there_are_multiple", category:"grammar", subtype:"agreement", label:"There is / there are", severity:"medium", confidence:0.86, pattern:/\bthere is (several|many|multiple)\b/gi, replacement:"there are $1", message:"Use plural agreement for several, many, or multiple items." },
    { id:"grammar.spelling.alot", category:"grammar", subtype:"spelling", label:"Spelling", severity:"medium", confidence:0.94, pattern:/\balot\b/gi, replacement:"a lot", message:"Use the two-word form." },
    { id:"grammar.spelling.recieve", category:"grammar", subtype:"spelling", label:"Spelling", severity:"medium", confidence:0.94, pattern:/\brecieve\b/gi, replacement:"receive", message:"Correct the spelling." },
    { id:"grammar.spelling.definately", category:"grammar", subtype:"spelling", label:"Spelling", severity:"medium", confidence:0.95, pattern:/\bdefinately\b/gi, replacement:"definitely", message:"Correct the spelling." },
    { id:"grammar.spelling.seperate", category:"grammar", subtype:"spelling", label:"Spelling", severity:"medium", confidence:0.94, pattern:/\bseperate\b/gi, replacement:"separate", message:"Correct the spelling." },
    { id:"grammar.spelling.accomodate", category:"grammar", subtype:"spelling", label:"Spelling", severity:"medium", confidence:0.94, pattern:/\baccomodate\b/gi, replacement:"accommodate", message:"Correct the spelling." },
    { id:"grammar.spelling.tommorow", category:"grammar", subtype:"spelling", label:"Spelling", severity:"medium", confidence:0.94, pattern:/\btommorow\b/gi, replacement:"tomorrow", message:"Correct the spelling." },
    { id:"grammar.contraction.couldnt", category:"grammar", subtype:"contraction", label:"Missing apostrophe", severity:"medium", confidence:0.88, pattern:/\bcouldnt\b/gi, replacement:"couldn't", message:"Use the apostrophe in this contraction." },
    { id:"grammar.contraction.wouldnt", category:"grammar", subtype:"contraction", label:"Missing apostrophe", severity:"medium", confidence:0.88, pattern:/\bwouldnt\b/gi, replacement:"wouldn't", message:"Use the apostrophe in this contraction." },
    { id:"grammar.contraction.shouldnt", category:"grammar", subtype:"contraction", label:"Missing apostrophe", severity:"medium", confidence:0.88, pattern:/\bshouldnt\b/gi, replacement:"shouldn't", message:"Use the apostrophe in this contraction." },
    { id:"grammar.contraction.wont", category:"grammar", subtype:"contraction", label:"Missing apostrophe", severity:"medium", confidence:0.88, pattern:/\bwont\b/gi, replacement:"won't", message:"Use the apostrophe in this contraction." },
    { id:"grammar.contraction.doesnt", category:"grammar", subtype:"contraction", label:"Missing apostrophe", severity:"medium", confidence:0.88, pattern:/\bdoesnt\b/gi, replacement:"doesn't", message:"Use the apostrophe in this contraction." },
    { id:"grammar.punctuation.sentence_spacing", category:"grammar", subtype:"punctuation", label:"Sentence spacing", severity:"low", confidence:0.90, pattern:/([.!?])([A-Za-z])/g, replacement:"$1 $2", message:"Add a space after the punctuation mark." },
    { id:"grammar.punctuation.repeated_marks", category:"grammar", subtype:"punctuation", label:"Repeated punctuation", severity:"low", confidence:0.86, pattern:/([!?]){2,}/g, replacement:"$1", message:"Use one punctuation mark unless emphasis is intentional." },
    { id:"tone.robotic.as_per", category:"tone", subtype:"robotic", label:"Procedural wording", severity:"medium", confidence:0.74, pattern:/\bas per\b/gi, replacement:"following", message:"This sounds procedural. Use plainer wording." },
    { id:"tone.defensive.as_you_know", category:"tone", subtype:"defensive", label:"Defensive opener", severity:"medium", confidence:0.78, pattern:/\bas you know\b/gi, replacement:"to confirm", message:"This can sound defensive. Use a neutral opener." },
    { id:"tone.blame.you_should_have", category:"tone", subtype:"blame", label:"Blame framing", severity:"high", confidence:0.80, pattern:/\byou should have\b/gi, replacement:"the usual next step is to", message:"Avoid making the reader feel at fault." },
    { id:"tone.blame.you_failed_to", category:"tone", subtype:"blame", label:"Blame wording", severity:"high", confidence:0.86, pattern:/\byou failed to\b/gi, replacement:"we do not have", message:"Avoid direct blame wording." },
    { id:"tone.escalation.calm_down", category:"tone", subtype:"escalation", label:"Escalating phrase", severity:"high", confidence:0.92, pattern:/\bcalm down\b/gi, replacement:null, message:"This phrase is likely to escalate the conversation." },
    { id:"tone.passive_aggressive.obviously", category:"tone", subtype:"passive_aggressive", label:"Passive-aggressive wording", severity:"medium", confidence:0.76, pattern:/\bobviously\b/gi, replacement:"", message:"This word can read as dismissive." },
    { id:"tone.command.you_need_to", category:"tone", subtype:"imperative", label:"Hard instruction", severity:"medium", confidence:0.74, pattern:/(^|[.!?]\s+)you need to\b/gi, replacement:"$1please", message:"This can sound like an order. Soften the instruction." },
    { id:"tone.dismissive.not_my_problem", category:"tone", subtype:"dismissive", label:"Dismissive wording", severity:"high", confidence:0.94, pattern:/\b(that'?s not my problem|not my problem)\b/gi, replacement:null, message:"This dismisses the reader's issue. Rewrite manually." },
    { id:"tone.accusatory.you_are_wrong", category:"tone", subtype:"accusatory", label:"Accusatory wording", severity:"high", confidence:0.90, pattern:/\byou are wrong\b/gi, replacement:"I can clarify this", message:"Avoid telling the reader they are wrong." },
    { id:"tone.robotic.kindly", category:"tone", subtype:"robotic", label:"Over-formal wording", severity:"low", confidence:0.64, pattern:/\bkindly\b/gi, replacement:"please", message:"This can sound stiff in chat." },
    { id:"tone.absolute.no_way", category:"tone", subtype:"absolute", label:"Absolute refusal", severity:"high", confidence:0.86, pattern:/\b(no way|impossible)\b/gi, replacement:null, message:"This refusal may feel abrupt. Offer a clear alternative." },
    { id:"tone.command.you_must", category:"tone", subtype:"imperative", label:"Hard instruction", severity:"medium", confidence:0.76, pattern:/(^|[.!?]\s+)you must\b/gi, replacement:"$1please", message:"This can sound forceful. Use a softer instruction." },
    { id:"tone.command.you_have_to", category:"tone", subtype:"imperative", label:"Hard instruction", severity:"medium", confidence:0.74, pattern:/(^|[.!?]\s+)you have to\b/gi, replacement:"$1please", message:"This can sound like pressure. Use a softer instruction." },
    { id:"tone.defensive.i_told_you", category:"tone", subtype:"defensive", label:"Defensive phrasing", severity:"medium", confidence:0.82, pattern:/\bi told you\b/gi, replacement:"I mentioned", message:"This can sound defensive. Use a calmer reminder." },
    { id:"tone.accusatory.you_claim", category:"tone", subtype:"accusatory", label:"Accusatory phrasing", severity:"medium", confidence:0.80, pattern:/\byou claim\b/gi, replacement:"you mentioned", message:"This can sound doubtful or accusatory." },
    { id:"tone.apology.sorry_for_inconvenience", category:"tone", subtype:"apology", label:"Apology phrasing", severity:"low", confidence:0.78, pattern:/\bsorry for inconvenience\b/gi, replacement:"I'm sorry for the inconvenience", message:"Use the complete apology phrase." },
    { id:"tone.command.be_patient", category:"tone", subtype:"imperative", label:"Hard instruction", severity:"medium", confidence:0.76, pattern:/\bplease be patient\b/gi, replacement:"thanks for your patience", message:"This can sound like an order. Acknowledge patience instead." },
    { id:"tone.dismissive.nothing_i_can_do", category:"tone", subtype:"dismissive", label:"Dead-end wording", severity:"high", confidence:0.86, pattern:/\bnothing (i|we) can do\b/gi, replacement:null, message:"This closes the conversation down. Offer the nearest useful option." },
    { id:"tone.blame.you_did_not", category:"tone", subtype:"blame", label:"Blame wording", severity:"medium", confidence:0.78, pattern:/\byou did not send\b/gi, replacement:"we haven't received", message:"Avoid direct blame wording." },
    { id:"clarity.specificity.very_soon", category:"clarity", subtype:"specificity", label:"Vague timing", severity:"medium", confidence:0.72, pattern:/\bvery soon\b/gi, replacement:"as soon as I have the update", message:"Vague timing weakens trust." },
    { id:"clarity.wordiness.in_order_to", category:"clarity", subtype:"wordiness", label:"Wordy phrase", severity:"low", confidence:0.86, pattern:/\bin order to\b/gi, replacement:"to", message:"Shorten this phrase." },
    { id:"clarity.wordiness.due_to_fact", category:"clarity", subtype:"wordiness", label:"Wordy cause phrase", severity:"medium", confidence:0.88, pattern:/\bdue to the fact that\b/gi, replacement:"because", message:"Use the shorter cause phrase." },
    { id:"clarity.wordiness.moment_in_time", category:"clarity", subtype:"wordiness", label:"Wordy time phrase", severity:"low", confidence:0.88, pattern:/\bat this moment in time\b/gi, replacement:"now", message:"Use the shorter time phrase." },
    { id:"clarity.wordiness.please_note_that", category:"clarity", subtype:"wordiness", label:"Unneeded preface", severity:"low", confidence:0.70, pattern:/\bplease note that\b/gi, replacement:"", message:"This preface is often unnecessary." },
    { id:"clarity.phrase.provide_me_with", category:"clarity", subtype:"wordiness", label:"Wordy request", severity:"low", confidence:0.72, pattern:/\bprovide me with\b/gi, replacement:"send me", message:"Use a simpler request phrase." },
    { id:"clarity.wordiness.in_the_event_that", category:"clarity", subtype:"wordiness", label:"Wordy condition", severity:"low", confidence:0.88, pattern:/\bin the event that\b/gi, replacement:"if", message:"Use the shorter condition phrase." },
    { id:"clarity.wordiness.with_regards_to", category:"clarity", subtype:"wordiness", label:"Wordy topic phrase", severity:"low", confidence:0.84, pattern:/\bwith regards to\b/gi, replacement:"about", message:"Use a shorter topic phrase." },
    { id:"clarity.wordiness.prior_to", category:"clarity", subtype:"wordiness", label:"Wordy time phrase", severity:"low", confidence:0.90, pattern:/\bprior to\b/gi, replacement:"before", message:"Use the shorter time phrase." },
    { id:"clarity.wordiness.at_later_date", category:"clarity", subtype:"wordiness", label:"Wordy date phrase", severity:"low", confidence:0.82, pattern:/\bat a later date\b/gi, replacement:"later", message:"Use the shorter time phrase." },
    { id:"clarity.jargon.backend", category:"clarity", subtype:"jargon", label:"Internal jargon", severity:"medium", confidence:0.76, pattern:/\bbackend\b/gi, replacement:"system", message:"Use plain wording instead of internal jargon." },
    { id:"clarity.hedging.just", category:"clarity", subtype:"hedging", label:"Removable softener", severity:"low", confidence:0.62, pattern:/\bjust\b/gi, replacement:"", message:"This softener is usually removable." },
    { id:"clarity.wordiness.i_wanted_to_let_you_know", category:"clarity", subtype:"wordiness", label:"Wordy update opener", severity:"low", confidence:0.82, pattern:/\bi wanted to let you know that\b/gi, replacement:"to update you,", message:"Open the update more directly." },
    { id:"clarity.wordiness.in_regards_to", category:"clarity", subtype:"wordiness", label:"Wordy topic phrase", severity:"low", confidence:0.84, pattern:/\bin regards to\b/gi, replacement:"about", message:"Use a shorter topic phrase." },
    { id:"clarity.wordiness.in_relation_to", category:"clarity", subtype:"wordiness", label:"Wordy topic phrase", severity:"low", confidence:0.84, pattern:/\bin relation to\b/gi, replacement:"about", message:"Use a shorter topic phrase." },
    { id:"clarity.wordiness.earliest_convenience", category:"clarity", subtype:"wordiness", label:"Stiff timing phrase", severity:"low", confidence:0.78, pattern:/\bat your earliest convenience\b/gi, replacement:"when you can", message:"Use a simpler timing phrase." },
    { id:"clarity.wordiness.at_this_point_in_time", category:"clarity", subtype:"wordiness", label:"Wordy time phrase", severity:"low", confidence:0.88, pattern:/\bat this point in time\b/gi, replacement:"now", message:"Use the shorter time phrase." },
    { id:"clarity.wordiness.going_forward", category:"clarity", subtype:"wordiness", label:"Wordy future phrase", severity:"low", confidence:0.70, pattern:/\bgoing forward\b/gi, replacement:"from now on", message:"Use a more direct future phrase." },
    { id:"clarity.wordiness.basically", category:"clarity", subtype:"wordiness", label:"Filler word", severity:"low", confidence:0.64, pattern:/\bbasically\b/gi, replacement:"", message:"This filler word is often removable." },
    { id:"clarity.wordiness.actually", category:"clarity", subtype:"wordiness", label:"Filler word", severity:"low", confidence:0.62, pattern:/\bactually\b/gi, replacement:"", message:"This filler word is often removable." },
    { id:"clarity.wordiness.i_think_that", category:"clarity", subtype:"wordiness", label:"Wordy qualifier", severity:"low", confidence:0.70, pattern:/\bi think that\b/gi, replacement:"I think", message:"Shorten this qualifier." },
    { id:"clarity.wordiness.in_process_of", category:"clarity", subtype:"wordiness", label:"Wordy action phrase", severity:"low", confidence:0.82, pattern:/\bin the process of\b/gi, replacement:"", message:"Use the active verb directly." },
    { id:"clarity.wordiness.timely_manner", category:"clarity", subtype:"wordiness", label:"Stiff timing phrase", severity:"low", confidence:0.84, pattern:/\bin a timely manner\b/gi, replacement:"promptly", message:"Use a shorter timing phrase." },
    { id:"clarity.wordiness.position_to", category:"clarity", subtype:"wordiness", label:"Wordy ability phrase", severity:"low", confidence:0.84, pattern:/\bin a position to\b/gi, replacement:"able to", message:"Use a shorter ability phrase." },
    { id:"clarity.wordiness.purpose_of", category:"clarity", subtype:"wordiness", label:"Wordy purpose phrase", severity:"low", confidence:0.84, pattern:/\bfor the purpose of\b/gi, replacement:"for", message:"Use a shorter purpose phrase." }
  ];

  const STRUCTURAL_RULES = [
    ...TGC_LENS_STRUCT,
    {
      id:"clarity.length.long_sentence", category:"clarity", subtype:"long_sentence", label:"Long sentence", severity:"medium", confidence:0.70,
      run({ text, protectedSpans, push }) {
        sentenceList(text).forEach(sentence => {
          if (wordsOf(sentence).length <= 26) return;
          const start = text.indexOf(sentence);
          push({ ruleId:this.id, category:this.category, subtype:this.subtype, label:this.label, start, end:start+sentence.length, message:"Long sentence. Split it for readability.", replacement:null, severity:this.severity, confidence:this.confidence, excerpt:sentence.slice(0,70)+(sentence.length>70?"...":"") }, protectedSpans);
        });
      }
    },
    {
      id:"tone.apology.repeated", category:"tone", subtype:"over_apology", label:"Repeated apology", severity:"medium", confidence:0.76,
      run({ text, lower, protectedSpans, push }) {
        const apologyCount = (lower.match(/\b(sorry|apologise|apologize)\b/g)||[]).length;
        if (apologyCount <= 1) return;
        const start = lower.indexOf("sorry", lower.indexOf("sorry")+1);
        push({ ruleId:this.id, category:this.category, subtype:this.subtype, label:this.label, start, end:start+5, message:"Repeated apology. Keep one apology, then move to ownership.", replacement:null, severity:this.severity, confidence:this.confidence, excerpt:"sorry" }, protectedSpans);
      }
    },
    {
      id:"clarity.structure.overloaded_commas", category:"clarity", subtype:"sentence_flow", label:"Overloaded sentence", severity:"medium", confidence:0.70,
      run({ text, protectedSpans, push }) {
        sentenceList(text).forEach(sentence => {
          const commaCount = (sentence.match(/,/g) || []).length;
          if (commaCount < 3 || wordsOf(sentence).length < 18) return;
          const start = text.indexOf(sentence);
          push({ ruleId:this.id, category:this.category, subtype:this.subtype, label:this.label, start, end:start+sentence.length, message:"This sentence carries too many linked ideas. Split it into shorter steps.", replacement:null, severity:this.severity, confidence:this.confidence, excerpt:sentence.slice(0,70)+(sentence.length>70?"...":"") }, protectedSpans);
        });
      }
    },
    {
      id:"clarity.structure.repeated_sentence_start", category:"clarity", subtype:"sentence_flow", label:"Repeated sentence start", severity:"low", confidence:0.68,
      run({ text, protectedSpans, push }) {
        const sentences = sentenceList(text);
        const starts = sentences.map(sentence => wordsOf(sentence).slice(0, 2).join(" ").toLowerCase());
        for (let i = 1; i < sentences.length; i++) {
          if (!starts[i] || starts[i].length < 4 || starts[i] !== starts[i - 1]) continue;
          const start = text.indexOf(sentences[i]);
          push({ ruleId:this.id, category:this.category, subtype:this.subtype, label:this.label, start, end:start+Math.min(sentences[i].length, 70), message:"Several sentences start the same way. Vary the opening to improve flow.", replacement:null, severity:this.severity, confidence:this.confidence, excerpt:sentences[i].slice(0,70)+(sentences[i].length>70?"...":"") }, protectedSpans);
          break;
        }
      }
    }
  ];

  const RULE_REGISTRY = REGEX_RULES.concat(STRUCTURAL_RULES);
  const RULE_ID_SET   = new Set(RULE_REGISTRY.map(r => r.id));
  const PROFILE_PRESET_DEFS = [
    { id:"balanced", name:"Balanced", note:"Grammar, clarity, and tone", disableCategories:[] },
    { id:"mechanics", name:"Mechanics", note:"Grammar and punctuation only", disableCategories:["clarity", "tone"] },
    { id:"concise", name:"Concise", note:"Grammar plus clarity", disableCategories:["tone"] },
    { id:"tone_guard", name:"Tone guard", note:"Grammar plus tone", disableCategories:["clarity"] }
  ];
  const RULE_TESTS = [
    /* — P · punctuation beyond spacing (F3) — */
    { id: "P-001", ruleId: "lens.punct.question_mark_missing", input: "Can you send the reference number.", expectedReplacement: "Can you send the reference number?" },
    { id: "P-002", ruleId: "lens.punct.intro_adverb_comma", input: "However I can check the booking today.", expectedReplacement: "However, " },
    { id: "P-003", ruleId: "lens.punct.greeting_comma", input: "Hi Marcus I have checked the booking.", expectedReplacement: "Hi Marcus, I" },
    { id: "P-004", ruleId: "lens.punct.decade_apostrophe", input: "The system dates from the 1990's and still runs.", expectedReplacement: "1990s" },
    { id: "P-005", ruleId: "lens.punct.thanks_apostrophe", input: "Thank's for waiting on this.", expectedReplacement: "Thanks" },
    { id: "P-006", ruleId: "lens.punct.double_hyphen", input: "The slot moved -- the team confirmed it.", expectedReplacement: " — " },
    { id: "P-007", ruleId: "lens.punct.long_ellipsis", input: "I will check this....", expectedReplacement: "…" },
    { id: "P-008", ruleId: "lens.punct.repeated_comma", input: "I checked the file,, and it is fine.", expectedReplacement: "," },
    { id: "P-009", ruleId: "lens.punct.mixed_terminal", input: "Can you confirm the slot?!", expectedReplacement: "?" },
    { id: "P-010", ruleId: "lens.punct.colon_spacing", input: "Please note:the slot has moved.", expectedReplacement: "e: t" },
    { id: "P-011", ruleId: "lens.punct.semicolon_spacing", input: "I checked the file;it is fine.", expectedReplacement: "; i" },
    { id: "P-012", ruleId: "lens.punct.comma_splice", input: "I checked the booking today, I will send the confirmation.", expectedReplacement: null },
    { id: "P-013", ruleId: "lens.punct.unbalanced_pair", input: "I checked the booking (the second one and it is confirmed.", expectedReplacement: null },
    /* — S · style, a subtype of clarity (F3) — */
    { id: "S-001", ruleId: "lens.style.nominal.make_decision", input: "We will make a decision tomorrow.", expectedReplacement: "decide" },
    { id: "S-002", ruleId: "lens.style.nominal.provide_explanation", input: "I can provide an explanation for the delay.", expectedReplacement: "explain" },
    { id: "S-003", ruleId: "lens.style.nominal.take_into_consideration", input: "I will take into consideration your notes.", expectedReplacement: "consider" },
    { id: "S-004", ruleId: "lens.style.nominal.conduct_investigation", input: "The team will conduct an investigation today.", expectedReplacement: "investigate" },
    { id: "S-005", ruleId: "lens.style.redundant.end_result", input: "The end result is the same either way.", expectedReplacement: "result" },
    { id: "S-006", ruleId: "lens.style.redundant.revert_back", input: "I will revert back to you shortly.", expectedReplacement: "revert" },
    { id: "S-007", ruleId: "lens.style.redundant.each_and_every", input: "I check each and every booking myself.", expectedReplacement: "every" },
    { id: "S-008", ruleId: "lens.style.redundant.past_history", input: "The past history of this account is clean.", expectedReplacement: "history" },
    { id: "S-009", ruleId: "lens.style.redundant.actual_fact", input: "The actual fact is the slot moved.", expectedReplacement: "fact" },
    { id: "S-010", ruleId: "lens.style.redundant.exact_same", input: "This is the exact same booking reference.", expectedReplacement: "same" },
    { id: "S-011", ruleId: "lens.style.intensifier", input: "This is very important for the customer.", expectedReplacement: "important" },
    { id: "S-012", ruleId: "lens.style.filler_opener", input: "Basically the slot moved to Thursday.", expectedReplacement: "" },
    { id: "S-013", ruleId: "lens.style.expletive_there", input: "There are two options open to you now.", expectedReplacement: null },
    { id: "S-014", ruleId: "lens.style.passive_voice", input: "Your booking was cancelled by the system overnight.", expectedReplacement: null },
    { id: "S-015", ruleId: "lens.style.opener_repeat", input: "I checked the booking. I called the team. I will send the file.", expectedReplacement: null },
    { id: "G-001", ruleId: "grammar.agreement.we_has", input: "We has checked the booking.", expectedReplacement: "we have" },
    { id: "G-002", ruleId: "grammar.article.an_update", input: "There is a update on your account.", expectedReplacement: "there is an update" },
    { id: "G-003", ruleId: "grammar.agreement.team_responds", input: "The team respond today.", expectedReplacement: "team responds" },
    { id: "G-004", ruleId: "grammar.capitalization.first_person_i", input: "i can check this now.", expectedReplacement: "I" },
    { id: "G-005", ruleId: "grammar.duplicate.repeated_word", input: "I am sorry sorry for the delay.", expectedReplacement: "sorry" },
    { id: "G-006", ruleId: "grammar.spacing.double_space", input: "I can  check this.", expectedReplacement: " " },
    { id: "G-007", ruleId: "grammar.verb_modal.of_have", input: "You should of received the update.", expectedReplacement: "should have" },
    { id: "G-008", ruleId: "grammar.confusion.your_welcome", input: "Your welcome.", expectedReplacement: "you're welcome" },
    { id: "G-009", ruleId: "grammar.confusion.bare_with_me", input: "Please bare with me.", expectedReplacement: "please bear with me" },
    { id: "G-010", ruleId: "grammar.verb.be_advised", input: "Please be advise that the slot changed.", expectedReplacement: "please be advised" },
    { id: "G-011", ruleId: "grammar.number.any_questions", input: "Let me know if you have any question.", expectedReplacement: "any questions" },
    { id: "G-012", ruleId: "grammar.comparative.more_better", input: "This is more better for the customer.", expectedReplacement: "better" },
    { id: "G-013", ruleId: "grammar.confusion.less_than", input: "This takes less then five minutes.", expectedReplacement: "less than" },
    { id: "G-014", ruleId: "grammar.contraction.cant", input: "I cant open the file.", expectedReplacement: "can't" },
    { id: "G-015", ruleId: "grammar.contraction.dont", input: "I dont have the reference.", expectedReplacement: "don't" },
    { id: "G-016", ruleId: "grammar.contraction.im", input: "im checking this now.", expectedReplacement: "I'm" },
    { id: "G-017", ruleId: "grammar.contraction.youre", input: "youre welcome.", expectedReplacement: "you're" },
    { id: "G-018", ruleId: "grammar.contraction.ive", input: "ive checked the update.", expectedReplacement: "I've" },
    { id: "G-019", ruleId: "grammar.punctuation.space_before_mark", input: "I can help , and I will check.", expectedReplacement: "," },
    { id: "G-020", ruleId: "grammar.punctuation.comma_spacing", input: "Thanks,I can check this.", expectedReplacement: ", I" },
    { id: "G-021", ruleId: "grammar.confusion.its_been", input: "Its been updated.", expectedReplacement: "it's been" },
    { id: "G-022", ruleId: "grammar.agreement.there_are_multiple", input: "There is multiple options available.", expectedReplacement: "there are multiple" },
    { id: "G-023", ruleId: "grammar.spelling.alot", input: "This helps alot.", expectedReplacement: "a lot" },
    { id: "G-024", ruleId: "grammar.spelling.recieve", input: "You will recieve the file today.", expectedReplacement: "receive" },
    { id: "G-025", ruleId: "grammar.spelling.definately", input: "This is definately ready.", expectedReplacement: "definitely" },
    { id: "G-026", ruleId: "grammar.spelling.seperate", input: "Please send a seperate copy.", expectedReplacement: "separate" },
    { id: "G-027", ruleId: "grammar.spelling.accomodate", input: "We can accomodate that request.", expectedReplacement: "accommodate" },
    { id: "G-028", ruleId: "grammar.spelling.tommorow", input: "I will update you tommorow.", expectedReplacement: "tomorrow" },
    { id: "G-029", ruleId: "grammar.contraction.couldnt", input: "I couldnt open the attachment.", expectedReplacement: "couldn't" },
    { id: "G-030", ruleId: "grammar.contraction.wouldnt", input: "I wouldnt change this yet.", expectedReplacement: "wouldn't" },
    { id: "G-031", ruleId: "grammar.contraction.shouldnt", input: "This shouldnt take long.", expectedReplacement: "shouldn't" },
    { id: "G-032", ruleId: "grammar.contraction.wont", input: "This wont affect the update.", expectedReplacement: "won't" },
    { id: "G-033", ruleId: "grammar.contraction.doesnt", input: "This doesnt match the file.", expectedReplacement: "doesn't" },
    { id: "G-034", ruleId: "grammar.punctuation.sentence_spacing", input: "Thanks.I can check this.", expectedReplacement: ". I" },
    { id: "G-035", ruleId: "grammar.punctuation.repeated_marks", input: "Can you send this??", expectedReplacement: "?" },
    { id: "C-001", ruleId: "clarity.specificity.very_soon", input: "This should be resolved very soon.", expectedReplacement: "as soon as I have the update" },
    { id: "C-002", ruleId: "clarity.wordiness.in_order_to", input: "I need this in order to help.", expectedReplacement: "to" },
    { id: "C-003", ruleId: "clarity.wordiness.due_to_fact", input: "This changed due to the fact that the slot moved.", expectedReplacement: "because" },
    { id: "C-004", ruleId: "clarity.wordiness.moment_in_time", input: "At this moment in time, I do not have the file.", expectedReplacement: "now" },
    { id: "C-005", ruleId: "clarity.wordiness.please_note_that", input: "Please note that the booking is confirmed.", expectedReplacement: "" },
    { id: "C-006", ruleId: "clarity.phrase.provide_me_with", input: "Please provide me with the reference.", expectedReplacement: "send me" },
    { id: "C-007", ruleId: "clarity.hedging.just", input: "I just need the reference number.", expectedReplacement: "" },
    { id: "C-008", ruleId: "clarity.length.long_sentence", input: "I can check the booking now and confirm the slot because the previous appointment was changed by the team and the new time needs to be verified before I send it to you.", expectedReplacement: null },
    { id: "C-009", ruleId: "clarity.wordiness.in_the_event_that", input: "In the event that this changes, I will update you.", expectedReplacement: "if" },
    { id: "C-010", ruleId: "clarity.wordiness.with_regards_to", input: "With regards to your booking, I can help.", expectedReplacement: "about" },
    { id: "C-011", ruleId: "clarity.wordiness.prior_to", input: "Please send this prior to the appointment.", expectedReplacement: "before" },
    { id: "C-012", ruleId: "clarity.wordiness.at_later_date", input: "We can check this at a later date.", expectedReplacement: "later" },
    { id: "C-013", ruleId: "clarity.jargon.backend", input: "The backend is still updating.", expectedReplacement: "system" },
    { id: "C-014", ruleId: "clarity.wordiness.i_wanted_to_let_you_know", input: "I wanted to let you know that the file is ready.", expectedReplacement: "to update you," },
    { id: "C-015", ruleId: "clarity.wordiness.in_regards_to", input: "In regards to your message, I can help.", expectedReplacement: "about" },
    { id: "C-016", ruleId: "clarity.wordiness.in_relation_to", input: "In relation to the update, I can confirm it.", expectedReplacement: "about" },
    { id: "C-017", ruleId: "clarity.wordiness.earliest_convenience", input: "Please reply at your earliest convenience.", expectedReplacement: "when you can" },
    { id: "C-018", ruleId: "clarity.wordiness.at_this_point_in_time", input: "At this point in time, I do not have the file.", expectedReplacement: "now" },
    { id: "C-019", ruleId: "clarity.wordiness.going_forward", input: "Going forward, I will update you here.", expectedReplacement: "from now on" },
    { id: "C-020", ruleId: "clarity.structure.overloaded_commas", input: "I can check this now, confirm the update, review the reference, and send the next step once I have checked the details.", expectedReplacement: null },
    { id: "C-021", ruleId: "clarity.structure.repeated_sentence_start", input: "I can check this now. I can confirm the reference after that.", expectedReplacement: null },
    { id: "C-022", ruleId: "clarity.wordiness.basically", input: "Basically, I can check this.", expectedReplacement: "" },
    { id: "C-023", ruleId: "clarity.wordiness.actually", input: "I actually checked this already.", expectedReplacement: "" },
    { id: "C-024", ruleId: "clarity.wordiness.i_think_that", input: "I think that this is ready.", expectedReplacement: "I think" },
    { id: "C-025", ruleId: "clarity.wordiness.in_process_of", input: "We are in the process of checking this.", expectedReplacement: "" },
    { id: "C-026", ruleId: "clarity.wordiness.timely_manner", input: "I will reply in a timely manner.", expectedReplacement: "promptly" },
    { id: "C-027", ruleId: "clarity.wordiness.position_to", input: "I am in a position to confirm this.", expectedReplacement: "able to" },
    { id: "C-028", ruleId: "clarity.wordiness.purpose_of", input: "This is for the purpose of checking the file.", expectedReplacement: "for" },
    { id: "T-001", ruleId: "tone.robotic.as_per", input: "As per our process, I will update you.", expectedReplacement: "following" },
    { id: "T-002", ruleId: "tone.defensive.as_you_know", input: "As you know, this was already sent.", expectedReplacement: "to confirm" },
    { id: "T-003", ruleId: "tone.blame.you_should_have", input: "You should have sent this earlier.", expectedReplacement: "the usual next step is to" },
    { id: "T-004", ruleId: "tone.blame.you_failed_to", input: "You failed to send the document.", expectedReplacement: "we do not have" },
    { id: "T-005", ruleId: "tone.escalation.calm_down", input: "Please calm down.", expectedReplacement: null },
    { id: "T-006", ruleId: "tone.passive_aggressive.obviously", input: "Obviously, this was already handled.", expectedReplacement: "" },
    { id: "T-007", ruleId: "tone.apology.repeated", input: "Sorry, I am sorry this happened.", expectedReplacement: null },
    { id: "T-008", ruleId: "tone.command.you_need_to", input: "You need to send the reference.", expectedReplacement: "please" },
    { id: "T-009", ruleId: "tone.dismissive.not_my_problem", input: "That is not my problem.", expectedReplacement: null },
    { id: "T-010", ruleId: "tone.accusatory.you_are_wrong", input: "You are wrong about this.", expectedReplacement: "I can clarify this" },
    { id: "T-011", ruleId: "tone.robotic.kindly", input: "Kindly send the reference.", expectedReplacement: "please" },
    { id: "T-012", ruleId: "tone.absolute.no_way", input: "No way, that is impossible.", expectedReplacement: null },
    { id: "T-013", ruleId: "tone.command.you_must", input: "You must send the reference.", expectedReplacement: "please" },
    { id: "T-014", ruleId: "tone.command.you_have_to", input: "You have to send the reference.", expectedReplacement: "please" },
    { id: "T-015", ruleId: "tone.defensive.i_told_you", input: "I told you this was updated.", expectedReplacement: "I mentioned" },
    { id: "T-016", ruleId: "tone.accusatory.you_claim", input: "You claim the payment was made.", expectedReplacement: "you mentioned" },
    { id: "T-017", ruleId: "tone.apology.sorry_for_inconvenience", input: "Sorry for inconvenience.", expectedReplacement: "I'm sorry for the inconvenience" },
    { id: "T-018", ruleId: "tone.command.be_patient", input: "Please be patient while I check.", expectedReplacement: "thanks for your patience" },
    { id: "T-019", ruleId: "tone.dismissive.nothing_i_can_do", input: "There is nothing I can do.", expectedReplacement: null },
    { id: "T-020", ruleId: "tone.blame.you_did_not", input: "You did not send the reference.", expectedReplacement: "we haven't received" }
  ];

  function isPlainObject(v) { return Boolean(v) && typeof v==="object" && !Array.isArray(v); }
  function safeProfileText(v, fb) { const t=typeof v==="string"?v.trim():""; return t?t.slice(0,120):fb; }
  function uniqueStrings(arr) {
    if (!Array.isArray(arr)) return [];
    const seen=new Set(); arr.forEach(v=>{ if(typeof v==="string"){const c=v.trim();if(c)seen.add(c);}});
    return Array.from(seen);
  }
  function buildContractMetadata() {
    return { app:APP_NAME, appVersion:APP_VERSION, engine:ENGINE_ID, engineContractVersion:ENGINE_CONTRACT_VERSION, ruleProfileSchemaVersion:RULE_PROFILE_SCHEMA_VERSION, testReportSchemaVersion:TEST_REPORT_SCHEMA_VERSION, offline:true, externalDependencies:false };
  }
  function exportProfileValidation(v) {
    const s=v||defaultProfileValidation();
    return { valid:s.valid, status:s.status, errors:s.errors.slice(), warnings:s.warnings.slice(), acceptedDisabledRuleIds:s.acceptedDisabledRuleIds.slice(), rejectedDisabledRuleIds:s.rejectedDisabledRuleIds.slice(), unknownRuleIds:s.unknownRuleIds.slice(), duplicateRuleIds:s.duplicateRuleIds.slice() };
  }
  function validateRuleProfile(profile) {
    const errors=[], warnings=[], unknownRuleIds=[], duplicateRuleIds=[], disabledFromRules=[];
    if (!isPlainObject(profile)) {
      errors.push("Profile must be a JSON object.");
      return { valid:false, status:"invalid", profileId:"invalid-profile", profileName:"Invalid profile", schemaVersion:"unknown", acceptedDisabledRuleIds:[], rejectedDisabledRuleIds:[], unknownRuleIds, duplicateRuleIds, errors, warnings };
    }
    if ("rules" in profile && !Array.isArray(profile.rules)) errors.push("rules must be an array.");
    if ("disabledRuleIds" in profile && !Array.isArray(profile.disabledRuleIds)) errors.push("disabledRuleIds must be an array.");
    if (!("rules" in profile) && !("disabledRuleIds" in profile)) errors.push("Profile must include rules or disabledRuleIds.");
    const seen=new Set();
    if (Array.isArray(profile.rules)) {
      profile.rules.forEach((rule,i)=>{
        if (!isPlainObject(rule)){errors.push("rules["+i+"] must be an object.");return;}
        const id=safeProfileText(rule.id,"");
        if (!id){errors.push("rules["+i+"].id is required.");return;}
        if (seen.has(id)) duplicateRuleIds.push(id); seen.add(id);
        if (!RULE_ID_SET.has(id)) unknownRuleIds.push(id);
        if (rule.category&&!RULE_CATEGORIES.includes(rule.category)) warnings.push("Rule "+id+" has unknown category "+rule.category+".");
        if (rule.severity&&!RULE_SEVERITIES.includes(rule.severity)) warnings.push("Rule "+id+" has unknown severity "+rule.severity+".");
        if (rule.confidence!=null&&(typeof rule.confidence!=="number"||rule.confidence<0||rule.confidence>1)) warnings.push("Rule "+id+" confidence must be 0-1.");
        if (rule.enabled===false||rule.disabled===true) disabledFromRules.push(id);
      });
    }
    const requested=uniqueStrings(uniqueStrings(profile.disabledRuleIds).concat(disabledFromRules));
    const accepted=requested.filter(id=>RULE_ID_SET.has(id));
    const rejected=requested.filter(id=>!RULE_ID_SET.has(id));
    const uUnk=uniqueStrings(unknownRuleIds), uDup=uniqueStrings(duplicateRuleIds);
    if (uUnk.length) warnings.push("Profile references unknown rules: "+uUnk.join(", ")+".");
    if (uDup.length) warnings.push("Profile contains duplicate rules: "+uDup.join(", ")+".");
    if (rejected.length) warnings.push("Ignored unknown disabled rules: "+rejected.join(", ")+".");
    return { valid:errors.length===0, status:errors.length?"invalid":warnings.length?"warning":"valid", profileId:safeProfileText(profile.id,"imported-profile"), profileName:safeProfileText(profile.name,"Imported profile"), schemaVersion:safeProfileText(profile.schemaVersion||profile.version,"legacy"), acceptedDisabledRuleIds:accepted, rejectedDisabledRuleIds:rejected, unknownRuleIds:uUnk, duplicateRuleIds:uDup, errors, warnings };
  }
  function defaultProfileValidation() {
    return validateRuleProfile({ id:RULE_PROFILE_ID, name:"MirrorFlow Assist Local Default", schemaVersion:RULE_PROFILE_SCHEMA_VERSION, disabledRuleIds:Array.from(disabledRuleIds), rules:RULE_REGISTRY.map(r=>({id:r.id})) });
  }
  function profilePresetDisabledIds(preset) {
    const disabledCategories = Array.isArray(preset && preset.disableCategories) ? preset.disableCategories : [];
    return RULE_REGISTRY.filter(rule => disabledCategories.includes(rule.category)).map(rule => rule.id);
  }
  function getProfilePresetDef(id) {
    return PROFILE_PRESET_DEFS.find(preset => preset.id === id) || PROFILE_PRESET_DEFS[0];
  }
  function buildPresetProfile(id) {
    const preset = getProfilePresetDef(id);
    const disabled = profilePresetDisabledIds(preset);
    return {
      id: RULE_PROFILE_ID + "-" + preset.id,
      name: preset.name,
      schemaVersion: RULE_PROFILE_SCHEMA_VERSION,
      source: "preset",
      presetId: preset.id,
      disabledRuleIds: disabled,
      rules: RULE_REGISTRY.map(rule => ({ id:rule.id, enabled:!disabled.includes(rule.id) }))
    };
  }
  function getProfilePresets() {
    return PROFILE_PRESET_DEFS.map(preset => {
      const disabled = profilePresetDisabledIds(preset);
      return {
        id: preset.id,
        name: preset.name,
        note: preset.note,
        disabledRuleIds: disabled,
        activeRuleCount: RULE_REGISTRY.length - disabled.length,
        disabledRuleCount: disabled.length
      };
    });
  }
  function markCustomProfile() {
    if (importedRuleProfile) {
      importedRuleProfile = Object.assign({}, importedRuleProfile, { id:RULE_PROFILE_ID + "-custom", name:"Custom", source:"custom", presetId:null });
    }
    profileValidation = null;
  }
  function getDisabledRuleSet(s) { return s instanceof Set ? s : disabledRuleIds; }
  function getActiveRegexRules(s) { const d=getDisabledRuleSet(s); return REGEX_RULES.filter(r=>!d.has(r.id)); }
  function getActiveStructuralRules(s) { const d=getDisabledRuleSet(s); return STRUCTURAL_RULES.filter(r=>!d.has(r.id)); }
  function getActiveRules(s) { const d=getDisabledRuleSet(s); return RULE_REGISTRY.filter(r=>!d.has(r.id)); }
  function buildRuleProfile(ruleState, validationState, profileMeta) {
    const d=getDisabledRuleSet(ruleState);
    const v=validationState||profileValidation||defaultProfileValidation();
    const m=profileMeta||importedRuleProfile||{};
    return { id:m.id||v.profileId||RULE_PROFILE_ID, name:m.name||v.profileName||"MirrorFlow Assist Local Default", schemaVersion:RULE_PROFILE_SCHEMA_VERSION, version:RULE_PROFILE_SCHEMA_VERSION, engine:ENGINE_ID, engineContractVersion:ENGINE_CONTRACT_VERSION, imported:Boolean(profileMeta?profileMeta.imported:importedRuleProfile), source:m.source||(importedRuleProfile?"imported":"local"), presetId:m.presetId||null, valid:v.valid, validation:exportProfileValidation(v), disabledRuleIds:Array.from(d), activeRuleIds:getActiveRules(d).map(r=>r.id), categories:RULE_CATEGORIES.slice(), rules:RULE_REGISTRY.map(r=>({id:r.id,category:r.category,subtype:r.subtype,label:r.label,severity:r.severity,confidence:r.confidence,note:r.note,enabled:!d.has(r.id),applySafe:r.replacement!==null&&r.replacement!==undefined})) };
  }
  function wordsOf(text) { return (text.match(/[A-Za-z0-9']+/g)||[]); }
  function sentenceList(text) { return text.split(/(?<=[.!?])\s+/).map(s=>s.trim()).filter(Boolean); }
  function syllableCount(word) {
    const clean=String(word).toLowerCase().replace(/[^a-z]/g,"");
    if (!clean) return 0;
    const groups=clean.replace(/e\b/,"").match(/[aeiouy]+/g);
    return Math.max(1,groups?groups.length:1);
  }
  function clamp(v,mn,mx) { return Math.max(mn,Math.min(mx,v)); }
  function countPattern(text,pat) { return (String(text||"").match(pat)||[]).length; }
  function buildClarityComponent(id,label,weight,rawScore,evidence,rec) {
    const score=clamp(Math.round(rawScore),0,weight);
    return { id, label, weight, score, impact:weight?Math.round((score/weight)*100):0, evidence, recommendation:rec };
  }
  function buildClarityScore(text, issues, metrics) {
    if (!metrics.wordCount) {
      const components = {
        length:buildClarityComponent("length","Reading length",CLARITY_SCORE_WEIGHTS.length,0,{grade:0,avgSentenceLength:0,longSentences:0},"Split long sentences and keep chat replies under one main idea per sentence."),
        vagueTiming:buildClarityComponent("vagueTiming","Vague timing",CLARITY_SCORE_WEIGHTS.vagueTiming,0,{issues:0,terms:0},"Replace vague timing with a concrete update point or next action."),
        wordiness:buildClarityComponent("wordiness","Wordiness",CLARITY_SCORE_WEIGHTS.wordiness,0,{issues:0},"Apply safe phrase cuts where the replacement does not change meaning."),
      jargon:buildClarityComponent("jargon","Internal jargon",CLARITY_SCORE_WEIGHTS.jargon,0,{issues:0},"Translate internal system language into plain wording."),
        specificity:buildClarityComponent("specificity","Specificity",CLARITY_SCORE_WEIGHTS.specificity,0,{vagueReferents:0,concreteAnchors:0,nextStepAnchors:0},"Name the exact item, next step, owner, or timing anchor.")
      };
      return { model:CLARITY_MODEL_VERSION, score:0, quality:100, level:"Clear", risk:"Low", weights:Object.assign({},CLARITY_SCORE_WEIGHTS), components, recommendations:[] };
    }
    const clarityIssues=issues.filter(i=>i.category==="clarity");
    const wordinessIssues=clarityIssues.filter(i=>i.subtype==="wordiness"||i.subtype==="hedging");
    const jargonIssues=clarityIssues.filter(i=>i.subtype==="jargon");
    const vagueTimingIssues=clarityIssues.filter(i=>i.ruleId==="clarity.specificity.very_soon");
    const vagueTimingTerms=countPattern(text,/\b(soon|shortly|asap|when possible|at some point|later)\b/gi);
    const vagueReferents=countPattern(text,/\b(this|that|it|thing|things|stuff|issue|problem|matter)\b/gi);
    const concreteAnchors=countPattern(text,/\b(\d+|today|tomorrow|monday|tuesday|wednesday|thursday|friday|saturday|sunday|reference|ref|booking|order|ticket|case|slot|appointment|refund|document|account)\b/gi);
    const nextStepAnchors=countPattern(text,/\b(send|check|confirm|update|call|reply|attach|verify|approve|book|cancel|change|resolve)\b/gi);
    const specificityPressure=(vagueReferents*3)+(concreteAnchors?0:8)+(nextStepAnchors?0:5);
    const avgSentenceLength=metrics.avgSentenceLength||0;
    const lengthPressure=(metrics.longSentences*12)+Math.max(0,avgSentenceLength-18)*1.4+Math.max(0,metrics.grade-9)*2.2;
    const components = {
      length:buildClarityComponent("length","Reading length",CLARITY_SCORE_WEIGHTS.length,lengthPressure,{grade:metrics.grade,avgSentenceLength,longSentences:metrics.longSentences},"Split long sentences and keep chat replies under one main idea per sentence."),
      vagueTiming:buildClarityComponent("vagueTiming","Vague timing",CLARITY_SCORE_WEIGHTS.vagueTiming,(vagueTimingIssues.length*12)+(Math.max(0,vagueTimingTerms-vagueTimingIssues.length)*6),{issues:vagueTimingIssues.length,terms:vagueTimingTerms},"Replace vague timing with a concrete update point or next action."),
      wordiness:buildClarityComponent("wordiness","Wordiness",CLARITY_SCORE_WEIGHTS.wordiness,wordinessIssues.length*5,{issues:wordinessIssues.length},"Apply safe phrase cuts where the replacement does not change meaning."),
      jargon:buildClarityComponent("jargon","Internal jargon",CLARITY_SCORE_WEIGHTS.jargon,jargonIssues.length*10,{issues:jargonIssues.length},"Translate internal system language into plain wording."),
      specificity:buildClarityComponent("specificity","Specificity",CLARITY_SCORE_WEIGHTS.specificity,specificityPressure,{vagueReferents,concreteAnchors,nextStepAnchors},"Name the exact item, next step, owner, or timing anchor.")
    };
    const score=Object.values(components).reduce((sum,item)=>sum+item.score,0);
    const recommendations=Object.values(components).filter(item=>item.score>0).sort((a,b)=>b.score-a.score).slice(0,3).map(item=>item.recommendation);
    return { model:CLARITY_MODEL_VERSION, score, quality:100-score, level:score>=62?"Dense":score>=38?"Heavy":score>=18?"Watch":"Clear", risk:score>=62?"High":score>=38?"Medium":"Low", weights:Object.assign({},CLARITY_SCORE_WEIGHTS), components, recommendations };
  }
  function buildWritingQuality(issues, clarityScore, tone, metrics) {
    const activeIssues = issues || [];
    const byCategory = RULE_CATEGORIES.reduce((acc, cat) => {
      acc[cat] = activeIssues.filter(issue => issue.category === cat).length;
      return acc;
    }, {});
    const severityWeight = { high:18, medium:9, low:4 };
    const issuePressure = activeIssues.reduce((sum, issue) =>
      sum + (severityWeight[issue.severity] || 6) * (issue.confidence || 0.8), 0);
    const clarityPressure = Math.min(24, Math.round((clarityScore?.score || 0) * 0.35));
    const tonePressure = Math.min(24, Math.round((tone?.score || 0) * 0.45));
    const mechanicsPressure = Math.min(18, byCategory.grammar * 4);
    const totalPressure = Math.min(92, Math.round(issuePressure + clarityPressure + tonePressure + mechanicsPressure));
    const score = metrics.wordCount ? clamp(100 - totalPressure, 0, 100) : 0;
    const weighted = RULE_CATEGORIES.map(category => ({
      category,
      weight: activeIssues
        .filter(issue => issue.category === category)
        .reduce((sum, issue) => sum + (severityWeight[issue.severity] || 6), 0)
    })).sort((a, b) => b.weight - a.weight);
    const primary = weighted[0] && weighted[0].weight > 0 ? weighted[0].category : "clean";
    const highRisk = activeIssues.some(issue => issue.severity === "high");
    const nextAction = !metrics.wordCount ? "Start with text" :
      highRisk && byCategory.grammar ? "Fix mechanics first" :
      highRisk && byCategory.tone ? "Soften high-risk tone" :
      primary === "clarity" ? "Tighten clarity" :
      primary === "tone" ? "Polish tone" :
      primary === "grammar" ? "Fix mechanics" :
      "Ready to use";
    return {
      score,
      state:!metrics.wordCount?"Blank":score>=90?"Clean":score>=76?"Polish":score>=60?"Needs edit":"Heavy",
      primary,
      nextAction,
      issuePressure:Math.round(issuePressure),
      clarityPressure,
      tonePressure,
      mechanicsPressure,
      counts:byCategory
    };
  }
  function protectSpans(text) {
    const spans=[];
    [{ type:"placeholder", re:/\{\{[^}]+\}\}/g },{ type:"url", re:/\b(?:https?:\/\/|www\.)[^\s]+/gi },{ type:"email", re:/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi },{ type:"ticket", re:/\b[A-Z]{2,}-\d{3,}\b/g }]
      .forEach(({type,re})=>{ let m; while((m=re.exec(text))) spans.push({type,start:m.index,end:m.index+m[0].length,text:m[0]}); });
    return spans.sort((a,b)=>a.start-b.start);
  }
  function spansOverlap(as,ae,bs,be) { return as<be&&bs<ae; }
  function isProtected(start,end,spans) { return spans.some(s=>spansOverlap(start,end,s.start,s.end)); }
  function addIssue(issues, protectedSpans, issue) {
    if (issue.start!=null&&issue.end!=null&&isProtected(issue.start,issue.end,protectedSpans)) return;
    issues.push(Object.assign({ id:"iss_"+(issues.length+1), severity:"medium", confidence:0.8, replacement:null, applySafe:issue.replacement!==null&&issue.replacement!==undefined, status:"active" }, issue));
  }
  function applyReplacement(value, rule) {
    if (rule.replacement===null||rule.replacement===undefined) return null;
    const flags=rule.pattern.flags.replace("g","");
    return String(value).replace(new RegExp(rule.pattern.source,flags),rule.replacement);
  }
  function issueFromRegexRule(rule, match) {
    return { ruleId:rule.id, category:rule.category, subtype:rule.subtype, label:rule.label, start:match.index, end:match.index+match[0].length, message:rule.message, replacement:applyReplacement(match[0],rule), severity:rule.severity, confidence:rule.confidence, excerpt:match[0] };
  }
  function normalizeRewriteText(value) {
    return String(value || "")
      .replace(/[ \t]+([,.;:!?])/g, "$1")
      .replace(/([([{])\s+/g, "$1")
      .replace(/\s+([)\]}])/g, "$1")
      .replace(/[ \t]{2,}/g, " ")
      .replace(/[ \t]+\n/g, "\n")
      .replace(/\n[ \t]+/g, "\n")
      .replace(/\n{3,}/g, "\n\n")
      .trim()
      .replace(/(^|[.!?]\s+|\n+)([a-z])/g, (_, lead, first) => lead + first.toUpperCase());
  }
  function canApplyIssue(issue) {
    return issue && issue.applySafe &&
      issue.replacement !== null && issue.replacement !== undefined &&
      Number.isFinite(issue.start) && Number.isFinite(issue.end) &&
      issue.end >= issue.start;
  }
  function applyIssueSet(text, issues, predicate) {
    const source = String(text || "");
    let next = source;
    let floor = source.length + 1;
    const appliedRuleIds = [];
    const canShareBoundary = issue =>
      issue && issue.subtype === "punctuation" &&
      issue.start < floor && issue.end === floor + 1;
    (issues || [])
      .filter(canApplyIssue)
      .filter(issue => !predicate || predicate(issue))
      .sort((a, b) => (b.start - a.start) || (b.end - a.end))
      .forEach(issue => {
        if (issue.end > floor && !canShareBoundary(issue)) return;
        if (next.slice(issue.start, issue.end) !== issue.excerpt) return;
        next = next.slice(0, issue.start) + String(issue.replacement) + next.slice(issue.end);
        floor = issue.start;
        appliedRuleIds.push(issue.ruleId);
      });
    return { text:normalizeRewriteText(next), appliedRuleIds:appliedRuleIds.reverse() };
  }
  function buildRewriteImpact(appliedRuleIds, issues) {
    const applied = (appliedRuleIds || []).map(id => (issues || []).find(issue => issue.ruleId === id)).filter(Boolean);
    const counts = RULE_CATEGORIES.reduce((acc, cat) => {
      acc[cat] = applied.filter(issue => issue.category === cat).length;
      return acc;
    }, {});
    const parts = RULE_CATEGORIES
      .filter(cat => counts[cat] > 0)
      .map(cat => cat.charAt(0).toUpperCase() + cat.slice(1) + " " + counts[cat]);
    return {
      counts,
      label:parts.length ? parts.join(" · ") : "No category shift",
      high:applied.filter(issue => issue.severity === "high").length,
      safe:applied.every(issue => issue.applySafe)
    };
  }
  function buildRewritePreviews(text, issues) {
    const base = String(text || "").trim();
    const variants = [
      {
        id:"clean",
        title:"Clean pass",
        intent:"Fix grammar, mechanics, and safe clarity edits.",
        test:issue => issue.category === "grammar" ||
          (issue.category === "clarity" && ["wordiness", "hedging", "jargon"].includes(issue.subtype))
      },
      {
        id:"shorter",
        title:"Shorter",
        intent:"Cut wordiness and removable softeners.",
        test:issue => issue.category === "grammar" ||
          (issue.category === "clarity" && ["wordiness", "hedging", "style"].includes(issue.subtype))
      },
      {
        id:"softer",
        title:"Softer tone",
        intent:"Reduce hard, defensive, or accusatory wording.",
        test:issue => issue.category === "grammar" || issue.category === "tone"
      }
    ];
    const seen = new Set();
    return variants.map(variant => {
      const applied = applyIssueSet(text, issues, variant.test);
      if (!applied.appliedRuleIds.length || applied.text === base || seen.has(applied.text)) return null;
      seen.add(applied.text);
      return {
        id:variant.id,
        title:variant.title,
        intent:variant.intent,
        source:"deterministic_rules",
        changes:applied.appliedRuleIds.length,
        appliedRuleIds:applied.appliedRuleIds,
        impact:buildRewriteImpact(applied.appliedRuleIds, issues),
        text:applied.text
      };
    }).filter(Boolean);
  }
  /* set while the fixture suite runs · keeps self-tests from fetching the ledger */
  let TGC_IN_SELFTEST = false;
  function runRuleRegistry(text, protectedSpans, ruleState) {
    const issues=[], lower=text.toLowerCase();
    const push=(issue,spans)=>addIssue(issues,spans||protectedSpans,issue);
    getActiveRegexRules(ruleState).forEach(rule=>{
      const flags=rule.pattern.flags.includes("g")?rule.pattern.flags:rule.pattern.flags+"g";
      const pat=new RegExp(rule.pattern.source,flags);
      let m; while((m=pat.exec(text))) push(issueFromRegexRule(rule,m),protectedSpans);
    });
    getActiveStructuralRules(ruleState).forEach(rule=>rule.run({text,lower,protectedSpans,push}));
    return issues;
  }
  function resolveEngineContext(context) {
    const safeCtx=isPlainObject(context)?context:{};
    if (safeCtx.ruleProfile) {
      const v=validateRuleProfile(safeCtx.ruleProfile);
      return { context:safeCtx, disabledRuleIds:new Set(v.valid?v.acceptedDisabledRuleIds:[]), profileValidation:v, profileMeta:{id:v.profileId,name:v.profileName,schemaVersion:v.schemaVersion,source:"context",imported:false} };
    }
    return { context:safeCtx, disabledRuleIds, profileValidation:profileValidation||defaultProfileValidation(), profileMeta:importedRuleProfile||null };
  }
  function analyzeText(text, context) {
    const es=resolveEngineContext(context);
    const protectedSpans=protectSpans(text);
    const lower=text.toLowerCase();
    const issues=runRuleRegistry(text,protectedSpans,es.disabledRuleIds);
    const words=wordsOf(text), sentences=sentenceList(text);
    const syllables=words.reduce((sum,w)=>sum+syllableCount(w),0);
    const sentenceCount=Math.max(1,sentences.length), wordCount=words.length;
    const grade=wordCount?Math.max(0,Math.round((0.39*(wordCount/sentenceCount))+(11.8*(syllables/wordCount))-15.59)):0;
    const avgSentenceLength=sentenceCount?Math.round(wordCount/sentenceCount):0;
    const longSentences=sentences.filter(s=>wordsOf(s).length>20).length;
    const clarityScore=buildClarityScore(text,issues,{grade,wordCount,sentenceCount,avgSentenceLength,longSentences});
    const apologyCount=(lower.match(/\b(sorry|apologise|apologize)\b/g)||[]).length;
    const roboticCount=(lower.match(/\b(as per|process|procedure|escalate internally|backend)\b/g)||[]).length;
    const frustrationWords=(lower.match(/\b(unfortunately|cannot|unable|delay|issue|problem)\b/g)||[]).length;
    const toneScore=apologyCount*10+roboticCount*14+frustrationWords*5;
    const tone={ primary:toneScore>32?"Risky":toneScore>16?"Formal":"Neutral", risk:toneScore>32?"High":toneScore>16?"Medium":"Low", apologyCount, roboticCount, score:Math.min(100,toneScore) };
    const quality=buildWritingQuality(issues,clarityScore,tone,{wordCount,grade,avgSentenceLength,longSentences});
    return {
      engine:ENGINE_ID, contract:buildContractMetadata(), offline:true,
      context:Object.assign({channel:"writing",dialect:"en-GB"},es.context),
      contextBridge:{ ping:null, issues:0 },
      protectedSpans, issues:issues.sort((a,b)=>a.start-b.start),
      rules:{ profile:buildRuleProfile(es.disabledRuleIds,es.profileValidation,es.profileMeta), active:getActiveRules(es.disabledRuleIds).map(r=>({id:r.id,category:r.category,label:r.label,severity:r.severity})), disabled:Array.from(es.disabledRuleIds), categories:RULE_CATEGORIES.slice() },
      rewrites:buildRewritePreviews(text,issues),
      quality,
      tone,
      clarity:{ model:clarityScore.model, score:clarityScore.score, quality:clarityScore.quality, level:clarityScore.level, risk:clarityScore.risk, grade, words:wordCount, sentences:sentences.length, avgSentenceLength, longSentences, readability:grade<=9?"Good":grade<=12?"Heavy":"Dense", weights:clarityScore.weights, components:clarityScore.components, recommendations:clarityScore.recommendations }
    };
  }
  function runRuleTests() {
    /* flag the fixture suite so the spelling rule never reaches for the ledger over it */
    TGC_IN_SELFTEST = true;
    try { return runRuleTestsInner(); } finally { TGC_IN_SELFTEST = false; }
  }
  function runRuleTestsInner() {
    const results = RULE_TESTS.map(test => {
      if (disabledRuleIds.has(test.ruleId)) {
        return {
          id: test.id,
          ruleId: test.ruleId,
          passed: false,
          skipped: true,
          issuePass: false,
          replacementPass: false,
          matched: 0,
          expectedReplacement: test.expectedReplacement,
          actualReplacements: []
        };
      }
      const analysis = analyzeText(test.input, { source: "rule_test" });
      const matches = analysis.issues.filter(issue => issue.ruleId === test.ruleId);
      const issuePass = matches.length > 0;
      const replacementPass = test.expectedReplacement === undefined
        ? true
        : matches.some(issue => issue.replacement === test.expectedReplacement);
      return {
        id: test.id,
        ruleId: test.ruleId,
        passed: issuePass && replacementPass,
        skipped: false,
        issuePass,
        replacementPass,
        matched: matches.length,
        expectedReplacement: test.expectedReplacement,
        actualReplacements: matches.map(issue => issue.replacement)
      };
    });
    const activeResults = results.filter(result => !result.skipped);
    return {
      schemaVersion: TEST_REPORT_SCHEMA_VERSION,
      contract: buildContractMetadata(),
      total: results.length,
      active: activeResults.length,
      skipped: results.filter(result => result.skipped).length,
      passed: activeResults.filter(result => result.passed).length,
      failed: activeResults.filter(result => !result.passed).length,
      results
    };
  }

  window.MirrorFlowAssistEngine = {
    analyzeText,
    contract: buildContractMetadata(),
    rules: RULE_REGISTRY,
    tests: RULE_TESTS,
    buildRuleProfile,
    validateRuleProfile,
    runRuleTests,
    isRuleDisabled: (id) => disabledRuleIds.has(id),
    disableRule: (id) => { if (RULE_ID_SET.has(id)) { disabledRuleIds.add(id); markCustomProfile(); return true; } return false; },
    enableRule:  (id) => { if (RULE_ID_SET.has(id)) markCustomProfile(); disabledRuleIds.delete(id); return true; },
    getDisabledRules: () => Array.from(disabledRuleIds),
    getProfilePresets,
    applyProfilePreset: (id) => {
      const profile = buildPresetProfile(id);
      const v = validateRuleProfile(profile);
      if (v.valid) {
        importedRuleProfile = { id:v.profileId, name:v.profileName, schemaVersion:v.schemaVersion, source:"preset", presetId:profile.presetId, importedAt:new Date().toISOString() };
        disabledRuleIds = new Set(v.acceptedDisabledRuleIds);
        profileValidation = v;
      }
      return { valid:v.valid, status:v.status, profile, validation:v };
    },
    resetProfile: () => { disabledRuleIds = new Set(); importedRuleProfile = null; profileValidation = null; },
    importProfile: (profileData) => {
      const profile = (profileData && profileData.ruleProfile) ? profileData.ruleProfile : profileData;
      const v = validateRuleProfile(profile);
      if (v.valid) {
        importedRuleProfile = { id: v.profileId, name: v.profileName, schemaVersion: v.schemaVersion, source:safeProfileText(profile && profile.source, "imported"), presetId:safeProfileText(profile && profile.presetId, "") || null, importedAt: new Date().toISOString() };
        disabledRuleIds = new Set(v.acceptedDisabledRuleIds);
        profileValidation = v;
      }
      return v;
    },
    exportProfile: () => buildRuleProfile(disabledRuleIds, profileValidation || defaultProfileValidation(), importedRuleProfile)
  };
  })();
