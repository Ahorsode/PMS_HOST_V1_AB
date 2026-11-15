-- Farm country: chosen at onboarding (and once by owners of existing farms).
-- It sets the currency farm records are shown in (farm_settings.currency) and
-- whether plans are priced in Ghana cedis (Ghana) or US dollars (elsewhere).
ALTER TABLE "farms" ADD COLUMN IF NOT EXISTS "country" TEXT;
