const SITE_URL = "ioniq.demo.hu/";

export const getSiteUrl = () => {
  return `${window.location.protocol}//${SITE_URL}`;
};

export const DISABLE_AUTHORIZATION = true;

export const ENABLED_PAGES = {
  apps: "apps",
  actions: "actions",
  backups: "backups",
};
export const FETCH_INTERVAL = 60000;
