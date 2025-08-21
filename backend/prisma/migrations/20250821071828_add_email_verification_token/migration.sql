-- Create EmailVerificationToken table
CREATE TABLE "EmailVerificationToken" (
	"id" TEXT PRIMARY KEY,
	"userId" TEXT NOT NULL UNIQUE,
	"tokenHash" TEXT NOT NULL UNIQUE,
	"expiresAt" TIMESTAMP(3) NOT NULL,
	"consumedAt" TIMESTAMP(3),
	"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT "EmailVerificationToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "EmailVerificationToken_expiresAt_idx" ON "EmailVerificationToken"("expiresAt");