export type MetaInsight = {
  date_start?: string;
  date_stop?: string;
  spend?: string;
  impressions?: string;
  clicks?: string;
  ctr?: string;
  cpc?: string;
  cpm?: string;
};

export type MetaAlert = {
  metric: "spend" | "ctr" | "cpc";
  direction: "above" | "below";
  actual: number;
  threshold: number;
  dateStart?: string;
  dateStop?: string;
};

export type MetaInsightsReport = {
  insights: MetaInsight[];
  alerts: MetaAlert[];
  thresholdsConfigured: boolean;
};

export class MetaMonitoringError extends Error {
  constructor(
    message: string,
    readonly status: number
  ) {
    super(message);
  }
}

function readThreshold(name: string): number | undefined {
  const value = process.env[name]?.trim();
  if (!value) return undefined;

  const threshold = Number(value);
  if (!Number.isFinite(threshold) || threshold < 0) {
    throw new MetaMonitoringError("Meta alert threshold configuration is invalid.", 500);
  }

  return threshold;
}

export async function getMetaInsightsReport(): Promise<MetaInsightsReport> {
  const accessToken = process.env.META_ACCESS_TOKEN?.trim();
  const accountId = process.env.META_AD_ACCOUNT_ID?.trim();

  if (!accessToken || !accountId) {
    throw new MetaMonitoringError("Meta API environment variables are not configured.", 500);
  }

  if (!/^(act_)?\d+$/.test(accountId)) {
    throw new MetaMonitoringError("META_AD_ACCOUNT_ID is invalid.", 400);
  }

  const thresholds = {
    maxSpend: readThreshold("META_ALERT_MAX_SPEND"),
    minCtr: readThreshold("META_ALERT_MIN_CTR"),
    maxCpc: readThreshold("META_ALERT_MAX_CPC"),
  };

  const url = new URL(
    `https://graph.facebook.com/v24.0/${encodeURIComponent(accountId)}/insights`
  );
  url.searchParams.set(
    "fields",
    "date_start,date_stop,spend,impressions,clicks,ctr,cpc,cpm"
  );
  url.searchParams.set("date_preset", "last_7d");
  url.searchParams.set("level", "account");

  let response: Response;
  try {
    response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      cache: "no-store",
    });
  } catch {
    throw new MetaMonitoringError("Meta insights request failed.", 502);
  }

  if (!response.ok) {
    throw new MetaMonitoringError("Meta insights request failed.", response.status);
  }

  let insights: MetaInsight[];
  try {
    const result = (await response.json()) as { data?: MetaInsight[] };
    insights = result.data ?? [];
  } catch {
    throw new MetaMonitoringError("Meta insights response was invalid.", 502);
  }

  const alerts: MetaAlert[] = [];
  for (const insight of insights) {
    const spend = Number(insight.spend);
    const ctr = Number(insight.ctr);
    const cpc = Number(insight.cpc);

    if (thresholds.maxSpend !== undefined && Number.isFinite(spend) && spend > thresholds.maxSpend) {
      alerts.push({
        metric: "spend",
        direction: "above",
        actual: spend,
        threshold: thresholds.maxSpend,
        dateStart: insight.date_start,
        dateStop: insight.date_stop,
      });
    }

    if (thresholds.minCtr !== undefined && Number.isFinite(ctr) && ctr < thresholds.minCtr) {
      alerts.push({
        metric: "ctr",
        direction: "below",
        actual: ctr,
        threshold: thresholds.minCtr,
        dateStart: insight.date_start,
        dateStop: insight.date_stop,
      });
    }

    if (thresholds.maxCpc !== undefined && Number.isFinite(cpc) && cpc > thresholds.maxCpc) {
      alerts.push({
        metric: "cpc",
        direction: "above",
        actual: cpc,
        threshold: thresholds.maxCpc,
        dateStart: insight.date_start,
        dateStop: insight.date_stop,
      });
    }
  }

  return {
    insights,
    alerts,
    thresholdsConfigured: Object.values(thresholds).some((value) => value !== undefined),
  };
}
