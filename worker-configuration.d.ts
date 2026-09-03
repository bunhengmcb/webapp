declare namespace Cloudflare {
  interface Env {
    DB: D1Database;
    BUCKET: R2Bucket;
    ASSETS: Fetcher;
    IMAGES: ImagesBinding;
    ENVIRONMENT?: "local" | "staging" | "production";
    RELEASE_VERSION?: string;
    BOOTSTRAP_REGISTRATION_TOKEN?: string;
  }
}
