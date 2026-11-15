// Gemeinsame Hilfen für die Push-Schnittstellen (nur auf dem Server benutzt).
//
// Die Empfänger-Daten (Geräte-Adresse und Schlüssel) dürfen nicht an angemeldete Nutzer gehen.
// Deshalb ruft der Server die "_srv"-Funktionen der Datenbank auf und schickt dabei ein Geheimnis mit,
// das nur der Server kennt (Vercel-Umgebungsvariable PUSH_RPC_SECRET).
// Solange die Variable fehlt, laufen die bisherigen Funktionen weiter (Übergangszeit).

export async function pushTargets(supabase, name, args) {
  const secret = process.env.PUSH_RPC_SECRET
  if (secret) return supabase.rpc(`${name}_srv`, { p_secret: secret, ...args })
  return supabase.rpc(name, args)
}

// Entfernt ein Gerät, das der Push-Dienst als abgemeldet meldet (404/410).
export async function dropSubscription(supabase, endpoint) {
  const secret = process.env.PUSH_RPC_SECRET
  if (secret) return supabase.rpc('drop_push_subscription_srv', { p_secret: secret, p_endpoint: endpoint })
  return supabase.rpc('drop_push_subscription', { p_endpoint: endpoint })
}
