import Text "mo:core/Text";
import List "mo:core/List";
import Float "mo:core/Float";
import Time "mo:core/Time";
import Array "mo:core/Array";
import Nat "mo:core/Nat";
import Runtime "mo:core/Runtime";
import Int "mo:core/Int";
import Map "mo:core/Map";
import Principal "mo:core/Principal";
import Order "mo:core/Order";
import Char "mo:core/Char";
import Nat32 "mo:core/Nat32";

import OutCall "mo:caffeineai-http-outcalls/outcall";

import MixinAuthorization "mo:caffeineai-authorization/MixinAuthorization";
import AccessControl "mo:caffeineai-authorization/access-control";


// AI Invest Canister
// with data migration


actor {
  // Authentication system with role-based access control
  let accessControlState = AccessControl.initState();
  include MixinAuthorization(accessControlState);

  // User profile type
  public type UserProfile = {
    name : Text;
  };

  let userProfiles = Map.empty<Principal, UserProfile>();

  module Asset {
    public func compare(asset1 : Asset, asset2 : Asset) : Order.Order {
      Text.compare(asset1.ticker, asset2.ticker);
    };
  };

  type Asset = {
    ticker : Text;
    name : Text;
    allocation : Float;
    rupeeAmount : Float;
    reason : Text;
    riskScore : Nat;
  };

  type Query = {
    budget : Float;
    riskLevel : Text;
    timestamp : Time.Time;
    suggestions : [Asset];
  };

  module Query {
    public func compareByTimestamp(query1 : Query, query2 : Query) : Order.Order {
      Int.compare(query1.timestamp, query2.timestamp);
    };
  };

  type PortfolioEntry = {
    id : Nat;
    stockName : Text;
    quantity : Float;
    buyPrice : Float;
    addedAt : Time.Time;
    sector : Text;
  };

  module PortfolioEntry {
    public func compare(entry1 : PortfolioEntry, entry2 : PortfolioEntry) : Order.Order {
      Nat.compare(entry1.id, entry2.id);
    };
  };

  var currentId = 0;
  let queries = Map.empty<Principal, List.List<Query>>();
  let portfolio = Map.empty<Principal, List.List<PortfolioEntry>>();

  // ─── Daily Insight types & cache ───────────────────────────────────────────

  type DailyInsight = {
    ticker : Text;
    name : Text;
    reason : Text;
    riskLevel : Text;
    cachedDate : Text;
    fetchedAt : Int;
  };

  // Global daily cache – one insight for the entire calendar day (UTC)
  var dailyInsightCache : ?DailyInsight = null;
  var dailyInsightDate : Text = "";

  // ─── Manual price overrides: (Principal, ticker) -> price ──────────────────
  // Key = principalText # "|" # ticker
  let manualPrices = Map.empty<Text, Float>();

  // Alpha Vantage API key
  let alphaVantageKey = "V7RPZ2EBNWQ7P4VF";

  // Build Alpha Vantage GLOBAL_QUOTE URL for a given ticker
  func buildAlphaVantageUrl(ticker : Text) : Text {
    "https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=" # ticker # "&apikey=" # alphaVantageKey;
  };

  // Extract a quoted string value after a given key in raw JSON text
  // e.g. extractJsonStringValue(json, "05. price") -> "3456.75"
  func extractJsonStringValue(json : Text, needle : Text) : ?Text {
    let fullKey = "\"" # needle # "\"";
    let jsonChars = json.toArray();
    let keyChars = fullKey.toArray();
    let jLen = jsonChars.size();
    let kLen = keyChars.size();

    var i = 0;
    label search loop {
      if (i + kLen > jLen) break search;
      var match = true;
      var ki = 0;
      label inner loop {
        if (ki >= kLen) break inner;
        if (jsonChars[i + ki] != keyChars[ki]) { match := false; break inner };
        ki += 1;
      };
      if (match) {
        // skip whitespace and colon after key
        var j = i + kLen;
        while (j < jLen and (jsonChars[j] == ' ' or jsonChars[j] == ':')) { j += 1 };
        // expect opening quote
        if (j < jLen and jsonChars[j].toNat32() == 34) {
          j += 1;
          var result = "";
          label vloop loop {
            if (j >= jLen) break vloop;
            let c = jsonChars[j];
            if (c.toNat32() == 34) break vloop;
            result #= Text.fromChar(c);
            j += 1;
          };
          return ?result;
        };
      };
      i += 1;
    };
    null;
  };

  // Parse a decimal string like "3456.75" into a Float
  func parseFloatFromText(s : Text) : Float {
    let chars = s.toArray();
    var intPart : Float = 0.0;
    var fracPart : Float = 0.0;
    var fracDiv : Float = 10.0;
    var inFrac = false;
    var valid = false;
    for (c in chars.vals()) {
      if (c == '.') {
        inFrac := true;
      } else if (c >= '0' and c <= '9') {
        let digitNat32 = c.toNat32() - '0'.toNat32();
        let digit = (digitNat32.toNat() : Int).toFloat();
        if (inFrac) {
          fracPart += digit / fracDiv;
          fracDiv *= 10.0;
        } else {
          intPart := intPart * 10.0 + digit;
        };
        valid := true;
      };
    };
    if (valid) intPart + fracPart else 0.0;
  };

  // Fetch live stock price from Alpha Vantage for a given ticker
  // Returns the latest price as Float, or 0.0 on any error
  func fetchLivePrice(ticker : Text) : async Float {
    let url = buildAlphaVantageUrl(ticker);
    try {
      let body = await OutCall.httpGetRequest(url, [], transform);
      switch (extractJsonStringValue(body, "05. price")) {
        case (?priceStr) { parseFloatFromText(priceStr) };
        case (null) { 0.0 };
      };
    } catch (_) {
      0.0;
    };
  };

  // Strip .NSE or .BSE suffix from a ticker for sector lookup
  func stripTickerSuffix(ticker : Text) : Text {
    switch (ticker.stripEnd(#text ".NSE")) {
      case (?t) { t };
      case (null) {
        switch (ticker.stripEnd(#text ".BSE")) {
          case (?t) { t };
          case (null) { ticker };
        };
      };
    };
  };

  // Map a ticker symbol to its market sector
  // Returns "Other" for unrecognized tickers
  func lookupSector(base : Text) : Text {
    switch (base) {
      // IT
      case ("TCS") "IT";
      case ("INFY") "IT";
      case ("WIPRO") "IT";
      case ("HCLTECH") "IT";
      case ("TECHM") "IT";
      case ("MPHASIS") "IT";
      case ("LTTS") "IT";
      case ("PERSISTENT") "IT";
      case ("COFORGE") "IT";
      case ("HEXAWARE") "IT";
      // Banking
      case ("HDFCBANK") "Banking";
      case ("ICICIBANK") "Banking";
      case ("KOTAKBANK") "Banking";
      case ("SBIN") "Banking";
      case ("AXISBANK") "Banking";
      case ("INDUSINDBK") "Banking";
      case ("BANDHANBNK") "Banking";
      case ("FEDERALBNK") "Banking";
      case ("IDFCFIRSTB") "Banking";
      case ("RBLBANK") "Banking";
      // Finance
      case ("BAJFINANCE") "Finance";
      case ("BAJAJFINSV") "Finance";
      case ("CHOLAFIN") "Finance";
      case ("M&MFIN") "Finance";
      case ("MUTHOOTFIN") "Finance";
      case ("IIFL") "Finance";
      case ("LICHOUSFIN") "Finance";
      // Energy
      case ("RELIANCE") "Energy";
      case ("ONGC") "Energy";
      case ("IOC") "Energy";
      case ("BPCL") "Energy";
      case ("HPCL") "Energy";
      case ("GAIL") "Energy";
      case ("NTPC") "Energy";
      case ("POWERGRID") "Energy";
      case ("ADANIGREEN") "Energy";
      case ("TATAPOWER") "Energy";
      // Pharma
      case ("SUNPHARMA") "Pharma";
      case ("DRREDDY") "Pharma";
      case ("CIPLA") "Pharma";
      case ("DIVISLAB") "Pharma";
      case ("AUROPHARMA") "Pharma";
      case ("LUPIN") "Pharma";
      case ("TORNTPHARM") "Pharma";
      case ("BIOCON") "Pharma";
      case ("ALKEM") "Pharma";
      case ("IPCALAB") "Pharma";
      // FMCG
      case ("HINDUNILVR") "FMCG";
      case ("ITC") "FMCG";
      case ("NESTLE") "FMCG";
      case ("BRITANNIA") "FMCG";
      case ("DABUR") "FMCG";
      case ("MARICO") "FMCG";
      case ("EMAMILTD") "FMCG";
      case ("COLPAL") "FMCG";
      case ("GODREJCP") "FMCG";
      case ("TATACONSUM") "FMCG";
      // Auto
      case ("MARUTI") "Auto";
      case ("M&M") "Auto";
      case ("TATAMOTORS") "Auto";
      case ("BAJAJ-AUTO") "Auto";
      case ("HEROMOTOCO") "Auto";
      case ("EICHERMOT") "Auto";
      case ("ASHOKLEY") "Auto";
      case ("TVSMOTOR") "Auto";
      case ("BOSCHLTD") "Auto";
      case ("MOTHERSON") "Auto";
      // Metals
      case ("TATASTEEL") "Metals";
      case ("JSWSTEEL") "Metals";
      case ("HINDALCO") "Metals";
      case ("VEDL") "Metals";
      case ("COALINDIA") "Metals";
      case ("NMDC") "Metals";
      case ("SAIL") "Metals";
      case ("JINDALSTEL") "Metals";
      case ("APL") "Metals";
      case ("RATNAMANI") "Metals";
      // Telecom
      case ("BHARTIARTL") "Telecom";
      case ("IDEA") "Telecom";
      case ("TATACOMM") "Telecom";
      case ("MTNL") "Telecom";
      // Real Estate
      case ("DLF") "Real Estate";
      case ("GODREJPROP") "Real Estate";
      case ("OBEROIRLTY") "Real Estate";
      case ("PHOENIXLTD") "Real Estate";
      case ("PRESTIGE") "Real Estate";
      // Mutual Fund/ETF
      case ("NIFTY50") "Mutual Fund/ETF";
      case ("SENSEX") "Mutual Fund/ETF";
      case ("GOLDBEES") "Mutual Fund/ETF";
      case ("JUNIORBEES") "Mutual Fund/ETF";
      case ("LIQUIDBEES") "Mutual Fund/ETF";
      case (_) "Other";
    };
  };

  // User Profile Functions
  public query ({ caller }) func getCallerUserProfile() : async ?UserProfile {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can access profiles");
    };
    userProfiles.get(caller);
  };

  public query ({ caller }) func getUserProfile(user : Principal) : async ?UserProfile {
    if (caller != user and not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Can only view your own profile");
    };
    userProfiles.get(user);
  };

  public shared ({ caller }) func saveCallerUserProfile(profile : UserProfile) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can save profiles");
    };
    userProfiles.add(caller, profile);
  };

  func getLowRiskAssets(budget : Float) : [Asset] {
    let assets = List.empty<Asset>();
    assets.add({
      ticker = "NIFTYBEES";
      name = "Nifty 50 Index Fund";
      allocation = 50.0;
      rupeeAmount = budget * 0.5;
      reason = "Tracks India's top 50 companies. Stable and diversified for long-term wealth building.";
      riskScore = 3;
    });
    assets.add({
      ticker = "HDFCMID";
      name = "HDFC Mid-Cap Opportunities Fund";
      allocation = 30.0;
      rupeeAmount = budget * 0.3;
      reason = "Exposure to India's growing mid-size companies with reasonable stability.";
      riskScore = 4;
    });
    assets.add({
      ticker = "SBILIQUID";
      name = "SBI Liquid Fund";
      allocation = 20.0;
      rupeeAmount = budget * 0.2;
      reason = "Highly liquid debt fund for capital preservation and steady returns.";
      riskScore = 2;
    });
    assets.toArray();
  };

  func getMediumRiskAssets(budget : Float) : [Asset] {
    let assets = List.empty<Asset>();
    assets.add({
      ticker = "NIFTYBEES";
      name = "Nifty 50 Index Fund";
      allocation = 40.0;
      rupeeAmount = budget * 0.4;
      reason = "Core large-cap exposure to India's top companies for steady growth.";
      riskScore = 5;
    });
    assets.add({
      ticker = "HDFCMID";
      name = "HDFC Mid-Cap Opportunities Fund";
      allocation = 35.0;
      rupeeAmount = budget * 0.35;
      reason = "India's mid-cap segment offers higher growth potential over large caps.";
      riskScore = 6;
    });
    assets.add({
      ticker = "TATADIGI";
      name = "Tata Digital India Fund";
      allocation = 25.0;
      rupeeAmount = budget * 0.25;
      reason = "Focused on Indian IT and tech sector stocks with strong digital economy growth.";
      riskScore = 7;
    });
    assets.toArray();
  };

  func getHighRiskAssets(budget : Float) : [Asset] {
    let assets = List.empty<Asset>();
    assets.add({
      ticker = "TATADIGI";
      name = "Tata Digital India Fund";
      allocation = 40.0;
      rupeeAmount = budget * 0.4;
      reason = "High growth potential from India's booming IT sector and digital transformation.";
      riskScore = 9;
    });
    assets.add({
      ticker = "NIPSMALL";
      name = "Nippon India Small Cap Fund";
      allocation = 35.0;
      rupeeAmount = budget * 0.35;
      reason = "Exposure to small-cap Indian companies with potential for outsized returns.";
      riskScore = 10;
    });
    assets.add({
      ticker = "HDFCMID";
      name = "HDFC Mid-Cap Opportunities Fund";
      allocation = 25.0;
      rupeeAmount = budget * 0.25;
      reason = "Aggressive mid-cap allocation for higher growth in India's expanding economy.";
      riskScore = 8;
    });
    assets.toArray();
  };

  func getUserQueryHistoryInternal(caller : Principal) : List.List<Query> {
    switch (queries.get(caller)) {
      case (?userQueries) { userQueries };
      case (null) { List.empty<Query>() };
    };
  };

  func getUserPortfolioInternal(caller : Principal) : List.List<PortfolioEntry> {
    switch (portfolio.get(caller)) {
      case (?userPortfolio) { userPortfolio };
      case (null) { List.empty<PortfolioEntry>() };
    };
  };

  public query func transform(input : OutCall.TransformationInput) : async OutCall.TransformationOutput {
    OutCall.transform(input);
  };

  // Fetch real-time stock price from Alpha Vantage
  // Returns 0.0 if ticker not found or API error
  public shared ({ caller }) func getStockPrice(ticker : Text) : async Float {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized");
    };
    // Check if user has a manual override first
    let key = caller.toText() # "|" # ticker;
    switch (manualPrices.get(key)) {
      case (?manualPrice) { manualPrice };
      case (null) { await fetchLivePrice(ticker) };
    };
  };

  // Save a manual price override for a ticker (persists per user)
  public shared ({ caller }) func saveManualPrice(ticker : Text, price : Float) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized");
    };
    let key = caller.toText() # "|" # ticker;
    manualPrices.add(key, price);
  };

  // Remove manual price override (restores live price fetching)
  public shared ({ caller }) func clearManualPrice(ticker : Text) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized");
    };
    let key = caller.toText() # "|" # ticker;
    manualPrices.remove(key);
  };

  // Get manual price override for a ticker (null = no override)
  public query ({ caller }) func getManualPrice(ticker : Text) : async ?Float {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized");
    };
    let key = caller.toText() # "|" # ticker;
    manualPrices.get(key);
  };

  // Suggest a market sector for a given NSE/BSE ticker
  // Strips .NSE/.BSE suffix before matching; returns "Other" for unknown tickers
  public query ({ caller }) func suggestSector(ticker : Text) : async Text {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized");
    };
    let base = stripTickerSuffix(ticker.toUpper());
    lookupSector(base);
  };

  public shared ({ caller }) func getInvestmentSuggestions(budget : Float, riskLevel : Text) : async [Asset] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can get investment suggestions");
    };

    if (budget <= 0.0) {
      Runtime.trap("Budget must be a positive number");
    };

    var selectedAssets : [Asset] = [];
    switch (riskLevel) {
      case ("Low") { selectedAssets := getLowRiskAssets(budget) };
      case ("Medium") { selectedAssets := getMediumRiskAssets(budget) };
      case ("High") { selectedAssets := getHighRiskAssets(budget) };
      case (_) {
        Runtime.trap("Invalid risk level. Must be 'Low', 'Medium', or 'High'.");
      };
    };

    let queried : Query = {
      budget;
      riskLevel;
      timestamp = Time.now();
      suggestions = selectedAssets;
    };

    let userQueryHistory = getUserQueryHistoryInternal(caller);
    userQueryHistory.add(queried);
    queries.add(caller, userQueryHistory);

    selectedAssets;
  };

  public query ({ caller }) func getQueries(numQueries : Nat) : async [Query] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can access query history");
    };
    let userQueryHistory = getUserQueryHistoryInternal(caller);
    if (userQueryHistory.isEmpty()) { Runtime.trap("No queries found.") };
    let queryArray = userQueryHistory.toArray().reverse();
    let count = if (numQueries > queryArray.size()) { queryArray.size() } else {
      numQueries;
    };
    Array.tabulate<Query>(count, func(i) { queryArray[i] });
  };

  public query ({ caller }) func getQueryHistory() : async [Query] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can access query history");
    };
    getUserQueryHistoryInternal(caller).toArray().sort(Query.compareByTimestamp);
  };

  public shared ({ caller }) func deleteQuery(timestamp : Time.Time) : async Bool {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can delete query history");
    };
    let userQueryHistory = getUserQueryHistoryInternal(caller);
    if (userQueryHistory.isEmpty()) {
      return false;
    };
    let filtered = userQueryHistory.filter(func(q : Query) : Bool { q.timestamp != timestamp });
    if (filtered.size() == userQueryHistory.size()) {
      false;
    } else {
      queries.add(caller, filtered);
      true;
    };
  };

  public shared ({ caller }) func clearQueryHistory() : async Bool {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can clear query history");
    };
    let userQueryHistory = getUserQueryHistoryInternal(caller);
    if (userQueryHistory.isEmpty()) {
      return false;
    };
    queries.add(caller, List.empty<Query>());
    true;
  };

  public shared ({ caller }) func addInvestment(stockName : Text, quantity : Float, buyPrice : Float, sector : Text) : async PortfolioEntry {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can add investments");
    };
    let resolvedSector = if (sector == "") { "Other" } else { sector };
    let entry : PortfolioEntry = {
      id = currentId;
      stockName;
      quantity;
      buyPrice;
      addedAt = Time.now();
      sector = resolvedSector;
    };
    let userPortfolio = getUserPortfolioInternal(caller);
    userPortfolio.add(entry);
    portfolio.add(caller, userPortfolio);
    currentId += 1;
    entry;
  };

  public query ({ caller }) func getInvestments() : async [PortfolioEntry] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can access investments");
    };
    getUserPortfolioInternal(caller).toArray().sort();
  };

  public shared ({ caller }) func deleteInvestment(id : Nat) : async Bool {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can delete investments");
    };
    let userPortfolio = getUserPortfolioInternal(caller);
    if (userPortfolio.isEmpty()) {
      return false;
    };
    let filteredPortfolio = userPortfolio.filter(func(entry) { entry.id != id });
    if (filteredPortfolio.size() == userPortfolio.size()) {
      false;
    } else {
      portfolio.add(caller, filteredPortfolio);
      true;
    };
  };

  // ─── Daily Insight helpers ──────────────────────────────────────────────────

  // Derive a "YYYY-MM-DD" UTC date string from Time.now() nanoseconds
  func nanosToDateString(nanos : Int) : Text {
    let seconds : Int = nanos / 1_000_000_000;
    // Days since Unix epoch
    let days : Int = seconds / 86400;
    // Gregorian calendar computation
    var z : Int = days + 719468;
    let era : Int = (if (z >= 0) z else z - 146096) / 146097;
    let doe : Int = z - era * 146097;
    let yoe : Int = (doe - doe / 1460 + doe / 36524 - doe / 146096) / 365;
    let y : Int = yoe + era * 400;
    let doy : Int = doe - (365 * yoe + yoe / 4 - yoe / 100);
    let mp : Int = (5 * doy + 2) / 153;
    let d : Int = doy - (153 * mp + 2) / 5 + 1;
    let m : Int = mp + (if (mp < 10) 3 else -9);
    let year : Int = y + (if (m <= 2) 1 else 0);

    let yStr = year.toText();
    let mStr = if (m < 10) { "0" # m.toText() } else { m.toText() };
    let dStr = if (d < 10) { "0" # d.toText() } else { d.toText() };
    yStr # "-" # mStr # "-" # dStr;
  };

  // Build the Gemini API request JSON body
  func buildGeminiBody() : Text {
    let prompt = "You are a financial advisor for Indian market beginners. Suggest ONE investment for today. "
      # "Output ONLY valid JSON with no markdown, no explanation, just this structure: "
      # "{\"ticker\":\"NIFTYBEES.NSE\",\"name\":\"Nippon India Nifty 50 BeES\","
      # "\"reason\":\"Two sentence reason here.\",\"riskLevel\":\"Low\"} "
      # "Rules: ticker must be NSE/BSE format (e.g. NIFTYBEES.NSE), "
      # "name is the full fund/stock name, "
      # "reason is max 2 sentences suitable for beginners, "
      # "riskLevel is exactly one of: Low, Medium, High. "
      # "Prefer index funds or ETFs for safety. Indian market focus only.";
    "{\"contents\":[{\"parts\":[{\"text\":\"" # prompt # "\"}]}]}";
  };

  // Parse the insight JSON embedded in Gemini candidates[0].content.parts[0].text
  // Handles both candidates and choices response shapes
  func parseGeminiInsight(responseBody : Text, todayDate : Text) : DailyInsight {
    // Try to find the text field from candidates[0].content.parts[0].text
    let innerJson : Text = switch (extractJsonStringValue(responseBody, "text")) {
      case (?t) { t };
      case (null) { "" };
    };
    // Now parse the inner JSON for ticker, name, reason, riskLevel
    let ticker = switch (extractJsonStringValue(innerJson, "ticker")) {
      case (?t) { t };
      case (null) { "NIFTYBEES.NSE" };
    };
    let name = switch (extractJsonStringValue(innerJson, "name")) {
      case (?n) { n };
      case (null) { "Nippon India Nifty 50 BeES" };
    };
    let reason = switch (extractJsonStringValue(innerJson, "reason")) {
      case (?r) { r };
      case (null) { "Tracks India's top 50 companies. A safe, diversified choice for long-term beginners." };
    };
    let riskLevel = switch (extractJsonStringValue(innerJson, "riskLevel")) {
      case (?rl) { rl };
      case (null) { "Low" };
    };
    {
      ticker;
      name;
      reason;
      riskLevel;
      cachedDate = todayDate;
      fetchedAt = Time.now();
    };
  };

  // Hardcoded fallback insight when Gemini is unavailable
  func fallbackInsight(todayDate : Text) : DailyInsight {
    {
      ticker = "NIFTYBEES.NSE";
      name = "Nippon India Nifty 50 BeES";
      reason = "Tracks India's top 50 companies via a single low-cost ETF, providing instant diversification. Ideal for beginners starting their long-term wealth creation journey.";
      riskLevel = "Low";
      cachedDate = todayDate;
      fetchedAt = Time.now();
    };
  };

  // Transform callback for the Gemini HTTP outcall
  public query func transformDailyInsight(input : OutCall.TransformationInput) : async OutCall.TransformationOutput {
    OutCall.transform(input);
  };

  // Fetch a fresh daily insight from Google Gemini
  func fetchDailyInsightFromGemini(todayDate : Text) : async DailyInsight {
    let geminiKey = "AIzaSyBqugHbeFVkVG_AmEcb_DTqI9lcC5NWmyo";
    let url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=" # geminiKey;
    let body = buildGeminiBody();
    let headers : [OutCall.Header] = [{ name = "Content-Type"; value = "application/json" }];
    try {
      let responseBody = await OutCall.httpPostRequest(url, headers, body, transformDailyInsight);
      let insight = parseGeminiInsight(responseBody, todayDate);
      // Validate ticker is non-empty, else fall back
      if (insight.ticker == "") {
        fallbackInsight(todayDate);
      } else {
        insight;
      };
    } catch (_) {
      fallbackInsight(todayDate);
    };
  };

  // ─── Public Daily Insight API ───────────────────────────────────────────────

  // Returns one AI-generated daily investment suggestion.
  // Cached globally for the full calendar day (UTC). No auth required.
  public shared func getDailyInsight() : async DailyInsight {
    let todayDate = nanosToDateString(Time.now());
    if (dailyInsightDate == todayDate) {
      switch (dailyInsightCache) {
        case (?cached) { return cached };
        case (null) {};
      };
    };
    // Cache miss or stale date – fetch fresh from Gemini
    let insight = await fetchDailyInsightFromGemini(todayDate);
    dailyInsightCache := ?insight;
    dailyInsightDate := todayDate;
    insight;
  };

  // Clears the daily cache and fetches a fresh insight immediately.
  // No auth required – anyone can trigger a manual refresh.
  public shared func refreshDailyInsight() : async DailyInsight {
    let todayDate = nanosToDateString(Time.now());
    let insight = await fetchDailyInsightFromGemini(todayDate);
    dailyInsightCache := ?insight;
    dailyInsightDate := todayDate;
    insight;
  };
};
