import { NextResponse } from "next/server";

const DEFAULT_PATHS = ["*"];

function parseCsv(value: string | undefined, fallback: string[]) {
  const items = value
    ?.split(",")
    .map((item) => item.trim())
    .filter(Boolean);

  return items && items.length > 0 ? Array.from(new Set(items)) : fallback;
}

export function GET() {
  const appIds = parseCsv(process.env.APPLE_APP_SITE_ASSOCIATION_APP_IDS, []);
  const paths = parseCsv(process.env.APPLE_APP_SITE_ASSOCIATION_PATHS, DEFAULT_PATHS);

  if (appIds.length === 0) {
    return NextResponse.json(
      {
        error: "APPLE_APP_SITE_ASSOCIATION_APP_IDS is not configured",
        example: "TEAMID.com.risknova.mobile",
      },
      { status: 404 },
    );
  }

  return NextResponse.json(
    {
      applinks: {
        apps: [],
        details: appIds.map((appID) => ({
          appID,
          paths,
        })),
      },
      webcredentials: {
        apps: appIds,
      },
    },
    {
      headers: {
        "Cache-Control": "public, max-age=3600, s-maxage=3600",
        "Content-Type": "application/json",
      },
    },
  );
}
