-- İki taraflı taşıma / CMR onayı (yük sahibi + taşıyıcı).
ALTER TABLE auction_sessions
  ADD COLUMN IF NOT EXISTS "transportOwnerConfirmedAt" timestamptz,
  ADD COLUMN IF NOT EXISTS "transportCarrierConfirmedAt" timestamptz;
