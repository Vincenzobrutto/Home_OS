CREATE TYPE "GenesisStep" AS ENUM ('WELCOME', 'HOUSE_INFO', 'DOCUMENTS', 'SCAN', 'REVIEW', 'RESULTS');

ALTER TABLE "houses"
ADD COLUMN "genesis_step" "GenesisStep" NOT NULL DEFAULT 'WELCOME';

UPDATE "houses"
SET "genesis_step" = CASE "genesis_status"::text
  WHEN 'IN_PROGRESS' THEN 'HOUSE_INFO'::"GenesisStep"
  WHEN 'PROCESSING' THEN 'SCAN'::"GenesisStep"
  WHEN 'COMPLETED' THEN 'RESULTS'::"GenesisStep"
  ELSE 'WELCOME'::"GenesisStep"
END;
