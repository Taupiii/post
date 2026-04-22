-- CreateTable
CREATE TABLE "Post" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "mediaUrl" TEXT,
    "mediaType" TEXT,
    "igDescription" TEXT,
    "igDate" DATETIME,
    "igPublished" BOOLEAN NOT NULL DEFAULT false,
    "igRetries" INTEGER NOT NULL DEFAULT 0,
    "ttDescription" TEXT,
    "ttDate" DATETIME,
    "ttPublished" BOOLEAN NOT NULL DEFAULT false,
    "ttRetries" INTEGER NOT NULL DEFAULT 0,
    "ytDescription" TEXT,
    "ytDate" DATETIME,
    "ytPublished" BOOLEAN NOT NULL DEFAULT false,
    "ytRetries" INTEGER NOT NULL DEFAULT 0
);
