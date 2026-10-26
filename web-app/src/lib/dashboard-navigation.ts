export type NavigationUser = { role?: string; accountType?: string } | null;
const residentPages = ["Overview", "Identify waste", "My history", "Plans", "Pickups", "Rewards", "Discovery Points", "Waste quiz", "Settings"];
const helperPages = ["Helper dashboard", "Helper collections", "Helper earnings", "Service area", "Settings"];
export function dashboardPage(requested: string | null, user: NavigationUser) {
  const fallback = user?.accountType === "helper" ? "Helper dashboard" : "Overview";
  // A signed-out direct link shows the sign-in screen; APIs still enforce the role.
  if (requested === "Operations" && (!user || user.role === "admin")) return requested;
  if (requested === "Collection route" && (!user || ["admin", "collector"].includes(user.role || ""))) return requested;
  if (requested && (user?.accountType === "helper" ? helperPages : residentPages).includes(requested)) return requested;
  return fallback;
}
