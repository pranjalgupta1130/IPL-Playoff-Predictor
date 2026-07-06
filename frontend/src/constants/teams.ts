/** Official IPL team abbreviations */
export const IPL_TEAM_SHORT_NAMES: Record<string, string> = {
  "Chennai Super Kings": "CSK",
  "Mumbai Indians": "MI",
  "Royal Challengers Bengaluru": "RCB",
  "Kolkata Knight Riders": "KKR",
  "Sunrisers Hyderabad": "SRH",
  "Rajasthan Royals": "RR",
  "Punjab Kings": "PBKS",
  "Delhi Capitals": "DC",
  "Lucknow Super Giants": "LSG",
  "Gujarat Titans": "GT",
};

export function getTeamShortName(fullName: string): string {
  return IPL_TEAM_SHORT_NAMES[fullName] ?? fullName;
}
